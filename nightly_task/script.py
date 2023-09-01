import os
import requests
from datetime import date
import json
import re  # import the regex module
from image_generator.image_generator import generate_image
from nutrition_generator.nutrition_generator import generate_chat_completion

# Get the directory of the current script
script_dir = os.path.dirname(os.path.realpath(__file__))

# Define output directory
relativeOutputDir = "./out"
output_dir = os.path.join(script_dir, relativeOutputDir)

# Define URL and headers
url = f"https://app.htwk-leipzig.de/api/canteens/01FG1RPGG52ZKR7QABF75DCEP4/menus/{date.today().isoformat()}?page=1&itemsPerPage=30"
headers = {'accept': 'application/json'}

# Request data from the API
response = requests.get(url, headers=headers)

# If the request was successful
if response.status_code == 200:
    data = response.json()
    
    # Get current date as a string
    current_date = date.today().isoformat()

    # Make directory for current date if it doesn't exist
    os.makedirs(f'{output_dir}/{current_date}', exist_ok=True)

    # Save the received data into a json file
    with open(f'{output_dir}/{current_date}/menu.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

    # Iterate over all food items in the data
    for item in data:
        # Extract the item title
        title = item["title"]

        # Remove any non-alphanumeric characters and replace with underscore
        safe_title = re.sub(r'\W+', '_', title)

        # Call the function to generate chat completion and save the response
        generate_chat_completion(title, current_date, safe_title, script_dir, output_dir)
        
        # Call the function to generate image and save it
        try:
            generate_image(title, current_date, safe_title, script_dir, output_dir)
        except Exception as e:
            # skip image, if there is an Error
            print(f"Skipping item '{title}' due to error: {str(e)}")