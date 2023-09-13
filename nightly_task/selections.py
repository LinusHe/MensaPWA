import os
import requests
import json
from datetime import date, timedelta

# Define output directory
script_dir = os.path.dirname(os.path.realpath(__file__))
relativeOutputDir = "./out"
output_dir = os.path.join(script_dir, relativeOutputDir)

# Get today's date
today = date.today()

# Create a set to store the unique selections
selections_set = set()

# Loop over the next 14 days
for i in range(30):
    # Get the date for the current iteration
    current_date = (today + timedelta(days=i)).isoformat()

    # Define URL for the current date
    url = f"https://app.htwk-leipzig.de/api/canteens/01FG1RPGG52ZKR7QABF75DCEP4/menus/{current_date}?page=1&itemsPerPage=30"
    headers = {'accept': 'application/json'}

    # Request data from the API
    response = requests.get(url, headers=headers)

    # If the request was successful
    if response.status_code == 200:
        data = response.json()

        # Iterate over all food items in the data
        for item in data:
            # Check if the item has a selections property and it is not None
            if 'selections' in item and item['selections'] is not None:
                # Add the selections to the set
                selections_set.update(item['selections'])

# Convert the set to a list
selections_list = list(selections_set)

# Write the selections list to a JSON file in the output directory
with open(os.path.join(output_dir, 'selections.json'), 'w', encoding='utf-8') as f:
    json.dump(selections_list, f, ensure_ascii=False, indent=4)