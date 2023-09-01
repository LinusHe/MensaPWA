import openai
import requests
from PIL import Image
from io import BytesIO
import os

def generate_image(title, current_date, safe_title, script_dir, output_dir):
    # open prompt file and replace {{title}}
    imagePromptFilePath = os.path.join(script_dir, 'image_generator', 'imagePrompt.txt')
    with open(imagePromptFilePath, "r") as prompt_file:
        prompt_text = prompt_file.read()
        prompt_with_title = prompt_text.replace("{{title}}", title)

    print(f"Generating image for item '{title}'")
    # Load the plate mask image and generate the image
    plateMaskFilePath = os.path.join(script_dir, 'image_generator', 'plateMask.png')
    with open(plateMaskFilePath, "rb") as image_file:
        image_response = openai.Image.create_edit(
          image=image_file,
          prompt=prompt_with_title,
          size="256x256"
        )
    if image_response:
        image_url = image_response["data"][0]["url"]
        print(f"Image generated: {image_url}")

        # Save the generated image to the same directory as the json file
        image_data = requests.get(image_url).content
        img = Image.open(BytesIO(image_data))
        img.save(f'{output_dir}/{current_date}/{safe_title}.jpg')
        print(f"Image saved in {current_date}/{safe_title}.jpg")
    else:
        print("Failed to generate image.")