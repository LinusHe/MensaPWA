import openai
import requests
from PIL import Image
from io import BytesIO
import os
import json
import logging

def generate_image(title, current_date, safe_title, script_dir, output_dir, image_number):
    logging.info(f"Starting image generation for item '{image_number}'")

    # open prompt file and replace {{title}}
    imagePromptFilePath = os.path.join(script_dir, 'image_generator', 'imagePrompt.txt')
    with open(imagePromptFilePath, "r") as prompt_file:
        prompt_text = prompt_file.read()
        prompt_with_title = prompt_text.replace("{{title}}", title)

    logging.info(f"Generating image for item '{image_number}'")
    # Load the plate mask image and generate the image
    plateMaskFilePath = os.path.join(script_dir, 'image_generator', 'plateMask.png')
    with open(plateMaskFilePath, "rb") as image_file:
        image_response = openai.Image.create_edit(
          image=image_file,
          prompt=prompt_with_title,
          size="512x512"
        )
    if image_response:
        image_url = image_response["data"][0]["url"]
        logging.info(f"Image generated: {image_url}")

        # Save the generated image to the same directory as the json file
        image_data = requests.get(image_url).content
        img = Image.open(BytesIO(image_data))
        img.save(f'{output_dir}/{current_date}/{image_number}.jpg')
        logging.info(f"Image saved in {current_date}/{image_number}.jpg")

        # Save the image number to the corresponding entry in the json file
        json_file_path = os.path.join(output_dir, f'{current_date}/menu.json')
        with open(json_file_path, 'r+') as json_file:
            try:
                logging.info(f"Loading JSON data from file: {json_file_path}")
                data = json.load(json_file)
            except Exception as e:
                logging.error(f"Error loading JSON data: {str(e)}")
                raise

            # Update the imageUrl for the current item
            for index, dish in enumerate(data):
                if index == image_number:
                    logging.info(f"Updating imageUrl for item: {dish['title']}")
                    dish['imageUrl'] = f'{image_number}.jpg'
                    break

            # Write the updated data back to the JSON file
            try:
                json_file.seek(0)
                json_file.truncate(0)
                logging.info(f"Writing updated JSON data to file: {json_file_path}")
                json_file.write(json.dumps(data, ensure_ascii=False, indent=4))
            except Exception as e:
                logging.error(f"Error writing JSON data: {str(e)}")
                raise

        logging.info(f"Image URL saved in JSON file for item '{title}'")
    else:
        logging.error("Failed to generate image.")