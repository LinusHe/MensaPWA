import os
import requests
import logging
import time
import shutil
from datetime import date, datetime, timedelta
import json
import re  # import the regex module
from image_generator.image_generator import generate_image
from nutrition_generator.nutrition_generator import generate_chat_completion

# Get the directory of the current script
script_dir = os.path.dirname(os.path.realpath(__file__))

# Get the current timestamp
timestamp = time.strftime("%Y%m%d-%H%M%S")

# Get the directory of the current script
script_dir = os.path.dirname(os.path.realpath(__file__))

# Define the log file path
log_file_path = os.path.join(script_dir, 'logs', f'{timestamp}.log')

# Create the logs directory if it doesn't exist
os.makedirs(os.path.dirname(log_file_path), exist_ok=True)

# Set up the logger
logging.basicConfig(filename=log_file_path, level=logging.INFO, format='%(asctime)s %(message)s')

# Add a StreamHandler to the logger to print messages to the console
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)
logging.getLogger().addHandler(console_handler)

# Define output directory
relativeOutputDir = "./out"
output_dir = os.path.join(script_dir, relativeOutputDir)

def delete_old_dirs(output_dir):
    # Get yesterday's date
    yesterday = date.today() - timedelta(days=1)
    logging.info(f"Yesterday's date: {yesterday}")

    # Loop over all directories in the output directory
    for dir_name in os.listdir(output_dir):
        # Try to parse the directory name as a date
        try:
            dir_date = datetime.strptime(dir_name, "%Y-%m-%d").date()
            logging.info(f"Parsed directory date: {dir_date}")
            # If the directory date is older than yesterday, delete the directory
            if dir_date < yesterday:
                shutil.rmtree(os.path.join(output_dir, dir_name))
                logging.info(f"Deleted directory: {dir_name}")
        except ValueError:
            # If the directory name can't be parsed as a date, ignore it
            logging.warning(f"Directory name {dir_name} can't be parsed as a date, ignoring it")
            pass

# Call the function at the start of your script
delete_old_dirs(output_dir)

# Get today's date
today = date.today()
# Loop over the next five days
for i in range(5):
    # Get the date for the current iteration
    current_date = (today + timedelta(days=i)).isoformat()
    logging.info(f"Processing data for date: {current_date}")

    # Define URL for the current date
    url = f"https://app.htwk-leipzig.de/api/canteens/01FG1RPGG52ZKR7QABF75DCEP4/menus/{current_date}?page=1&itemsPerPage=30"
    headers = {'accept': 'application/json'}

    # Request data from the API
    response = requests.get(url, headers=headers)

    # If the request was successful
    if response.status_code == 200:
        new_data = response.json()
        # Check if data is empty or an empty array
        if not new_data:
            logging.info("No menu for " + current_date + ".")
            #skip this iteration
            continue

        # Define the path for the current date's directory
        current_dir = f'{output_dir}/{current_date}'

        # Create the directory if it doesn't exist
        os.makedirs(current_dir, exist_ok=True)

        # Define the path for the menu.json file
        menu_file_path = f'{current_dir}/menu.json'

        # Check if the directory already exists
        if os.path.exists(current_dir):
            # Check if the menu.json file already exists
            if os.path.exists(menu_file_path):
                # Load the existing data
                with open(menu_file_path, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)

                # Extract the titles from the existing and new data
                existing_titles = [item['title'] for item in existing_data]
                new_titles = [item['title'] for item in new_data]

                # Compare the food titles in the existing data with the new data
                if set(existing_titles) == set(new_titles):
                    # If the titles are the same, skip this iteration
                    logging.info("Food titles are the same, skipping iteration.")
                    continue

                # If the titles are different, delete the existing menu.json file and the generated images
                logging.info("Food titles are different, deleting existing menu.json file and generated images.")
                os.remove(menu_file_path)
                for file in os.listdir(current_dir):
                    if file.endswith('.jpg'):
                        os.remove(os.path.join(current_dir, file))

        # Save the new data into a json file
        with open(menu_file_path, 'w', encoding='utf-8') as f:
            json.dump(new_data, f, ensure_ascii=False, indent=4)

        # Iterate over all food items in the new data
        for index, item in enumerate(new_data):
            # Extract the item title
            title = item["title"]

            # Remove any non-alphanumeric characters and replace with underscore
            safe_title = re.sub(r'\W+', '_', title)

            # Call the function to generate chat completion and save the response
            try:
                logging.info(f"Generating chat completion for item: {title}")
                generate_chat_completion(title, current_date, safe_title, script_dir, output_dir)
            except Exception as e:
                # skip chat completion, if there is an Error
                logging.error(f"Skipping item '{title}' due to error: {str(e)}")
            
            # Call the function to generate image and save it
            try:
                logging.info(f"Generating image for item: {title}")
                generate_image(title, current_date, safe_title, script_dir, output_dir, index)
            except Exception as e:
                # skip image, if there is an Error
                logging.error(f"Skipping item '{title}' due to error: {str(e)}")
            else:
                logging.info(f"Image generated successfully for item: {title}")

logging.info("End of script execution.")

