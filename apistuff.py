import os
import openai
import requests
from datetime import date
from PIL import Image
from io import BytesIO
import json
import re  # import the regex module

# Set OpenAI key
openai.api_key = os.getenv('OPENAI_API_KEY')

# Define URL and headers
url = f"https://app.htwk-leipzig.de/api/canteens/01FG1RPGG52ZKR7QABF75DCEP4/menus/{date.today().isoformat()}?page=1&itemsPerPage=30"
headers = {'accept': 'application/json'}
with open('prompt.txt', 'r') as file:
    systemPrompt = file.read()


def generate_chat_completion(title, current_date, safe_title):
    print(f"Generating chat completion for item '{title}'")
    # Create a chat completion with the title of the dish as the content of the user message
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            { "role": "system", "content": systemPrompt },
            {"role": "user", "content": f"{title}"}
        ]
    )

    # Load the existing menu.json file
    with open(f'{current_date}/menu.json', 'r', encoding='utf-8') as f:
        menu_data = json.load(f)

    # Add the chat completion to the corresponding dish
    for dish in menu_data:
        if dish["title"] == title:
            dish["chat_completion"] = completion.choices[0].message['content']
            break

    # Write back the updated data to menu.json
    with open(f'{current_date}/menu.json', 'w', encoding='utf-8') as f:
        json.dump(menu_data, f, ensure_ascii=False, indent=4)
    print(f"Response added to {current_date}/menu.json")


def generate_image(title, current_date, safe_title):
    print(f"Generating image for item '{title}'")
    with open("plateMask.png", "rb") as image_file:
        image_response = openai.Image.create_edit(
          image=image_file,
          prompt="plate with food " + title,
          size="512x512"
        )
    if image_response:
        image_url = image_response["data"][0]["url"]
        print(f"Image generated: {image_url}")

        # Save the generated image to the same directory as the json file
        image_data = requests.get(image_url).content
        img = Image.open(BytesIO(image_data))
        img.save(f'{current_date}/{safe_title}.jpg')
        print(f"Image saved in {current_date}/{safe_title}.jpg")
    else:
        print("Failed to generate image.")



# Request data from the API
response = requests.get(url, headers=headers)

# If the request was successful
if response.status_code == 200:
    data = response.json()
    
    # Get current date as a string
    current_date = date.today().isoformat()

    # Make directory for current date if it doesn't exist
    os.makedirs(current_date, exist_ok=True)

    # Save the received data into a json file
    with open(f'{current_date}/menu.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

    # Iterate over all food items in the data
    for item in data:
        # Extract the item title
        title = item["title"]

        # Remove any non-alphanumeric characters and replace with underscore
        safe_title = re.sub(r'\W+', '_', title)

        # Call the function to generate chat completion and save the response
        generate_chat_completion(title, current_date, safe_title)
        
        # Call the function to generate image and save it
        generate_image(title, current_date, safe_title)
