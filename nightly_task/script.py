import os
import requests
import logging
import time
import shutil
from datetime import date, datetime, timedelta
import json
import re
from image_generator.image_generator import generate_image
from nutrition_generator.nutrition_generator import generate_nutrition_completion
from notification_generator.notification_generator import generate_notification_completion

# Get the directory of the current script
script_dir = os.path.dirname(os.path.realpath(__file__))

# Get the current timestamp for logging
timestamp = time.strftime("%Y%m%d-%H%M%S")

# Get the directory of the current script
script_dir = os.path.dirname(os.path.realpath(__file__))

# Define the log file path
log_file_path = os.path.join(script_dir, "logs", f"{timestamp}.log")

# Create the logs directory if it doesn't exist
os.makedirs(os.path.dirname(log_file_path), exist_ok=True)

# Configure logging with file and console output
logging.basicConfig(filename=log_file_path, level=logging.INFO, format="%(asctime)s %(message)s")
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
console_handler.setFormatter(formatter)
logging.getLogger().addHandler(console_handler)

# Define output directory path
relativeOutputDir = "./out"
output_dir = os.path.join(script_dir, relativeOutputDir)

def delete_old_dirs(output_dir):
    """
    Deletes directories older than yesterday from the output directory.
    Skips the 'cache' directory and handles invalid directory names.
    """
    yesterday = date.today() - timedelta(days=1)
    logging.info(f"Yesterday's date: {yesterday}")

    for dir_name in os.listdir(output_dir):
        if dir_name == "cache":
            continue  # Skip cache directory
        try:
            dir_date = datetime.strptime(dir_name, "%Y-%m-%d").date()
            logging.info(f"Parsed directory date: {dir_date}")
            if dir_date < yesterday:
                shutil.rmtree(os.path.join(output_dir, dir_name))
                logging.info(f"Deleted directory: {dir_name}")
        except ValueError:
            logging.warning(f"Directory name {dir_name} can't be parsed as a date, ignoring it")

# Clean up old directories at script start
delete_old_dirs(output_dir)

# Get today's date
today = date.today()

# Process data for the next 5 days
for i in range(5):
    current_date = (today + timedelta(days=i)).isoformat()
    logging.info(f"Processing data for date: {current_date}")

    # Define API URL and headers
    url = f"https://app.htwk-leipzig.de/api/canteens/01FG1RPGG52ZKR7QABF75DCEP4/menus/{current_date}?page=1&itemsPerPage=30"
    headers = {"accept": "application/json"}

    # Fetch data from API
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        new_data = response.json()
        
        # Skip if no menu data available
        if not new_data:
            logging.info(f"No menu for {current_date}.")
            continue

        # Define paths for current date's directory and files
        current_dir = f"{output_dir}/{current_date}"

        # Create the directory if it doesn't exist
        os.makedirs(current_dir, exist_ok=True)

        # Define the path for the menu.json file
        menu_file_path = f"{current_dir}/menu.json"
        notification_file_path = f"{current_dir}/notification.json"

        # Create directory if it doesn't exist
        os.makedirs(current_dir, exist_ok=True)

        # Check if directory and menu file already exist
        if os.path.exists(current_dir) and os.path.exists(menu_file_path):
            # Generate notification if it doesn't exist
            if not os.path.exists(notification_file_path):
                try:
                    logging.info("Generating notification texts")
                    generate_notification_completion(current_date, script_dir, output_dir)
                except Exception as e:
                    logging.error(f"Error while generating notification texts: {str(e)}")

            # Compare existing and new menu titles
            with open(menu_file_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)

            existing_titles = [item["title"] for item in existing_data]
            new_titles = [item["title"] for item in new_data]

            if set(existing_titles) == set(new_titles):
                logging.info("Food titles are the same, skipping iteration.")
                continue

            # Delete old menu and images if titles differ
            logging.info("Food titles are different, deleting existing menu.json file and generated images.")
            os.remove(menu_file_path)
            for file in os.listdir(current_dir):
                if file.endswith(".jpg"):
                    os.remove(os.path.join(current_dir, file))

        # Save new menu data
        with open(menu_file_path, "w", encoding="utf-8") as f:
            json.dump(new_data, f, ensure_ascii=False, indent=4)

        # Process each menu item
        for index, item in enumerate(new_data):
            title = item["title"]
            safe_title = re.sub(r"\W+", "_", title)

            # Generate nutrition information
            try:
                logging.info(f"Generating chat completion for item: {title}")
                generate_nutrition_completion(title, current_date, safe_title, script_dir, output_dir)
            except Exception as e:
                logging.error(f"Skipping item '{title}' due to error: {str(e)}")

            # Generate menu item image
            try:
                logging.info(f"Generating image for item: {title}")
                generate_image(title, current_date, safe_title, script_dir, output_dir, index)
            except Exception as e:
                logging.error(f"Skipping item '{title}' due to error: {str(e)}")
            else:
                logging.info(f"Image generated successfully for item: {title}")

        # Generate notification texts
        try:
            logging.info("Generating notification texts")
            generate_notification_completion(current_date, script_dir, output_dir)
        except Exception as e:
            logging.error(f"Error while generating notification texts: {str(e)}")

logging.info("End of script execution.")
