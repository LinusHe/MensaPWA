import os
import json
import logging
import requests
import shutil
import re
from PIL import Image
from io import BytesIO
from openai import OpenAI

client = OpenAI()


def get_next_cache_id(cache_dir):
    """
    Searches the cache directory for files starting with a three-digit prefix
    and returns the next available prefix as a string (e.g., "001").
    """
    max_id = 0
    for file in os.listdir(cache_dir):
        match = re.match(r"(\d{3})_.*\.jpg", file)
        if match:
            prefix = int(match.group(1))
            if prefix > max_id:
                max_id = prefix
    next_id = max_id + 1
    return f"{next_id:03d}"


def generate_image(title, current_date, safe_title, script_dir, output_dir, image_number):
    """
    Generates an image for a menu item, using cached images if available.
    If no cached image exists, generates a new image using OpenAI's API.
    
    Args:
        title (str): The title of the menu item
        current_date (str): The current date in ISO format
        safe_title (str): The sanitized title with special characters replaced
        script_dir (str): The directory of the script
        output_dir (str): The output directory for generated files
        image_number (int): The index number of the image
    """
    logging.info(f"Starting image generation for item '{image_number}'")

    # Define the cache directory and ensure it exists
    cache_dir = os.path.join(output_dir, "cache")
    os.makedirs(cache_dir, exist_ok=True)

    # Search for a cached image containing the safe_title
    cached_files = [f for f in os.listdir(cache_dir) if f.endswith(f"_{safe_title}.jpg")]
    if cached_files:
        cache_filename = cached_files[0]
    else:
        new_prefix = get_next_cache_id(cache_dir)
        cache_filename = f"{new_prefix}_{safe_title}.jpg"
    cache_path = os.path.join(cache_dir, cache_filename)

    # Target path in the current date directory
    current_image_path = os.path.join(output_dir, current_date, f"{image_number}.jpg")

    # Check if the image already exists in cache
    if os.path.exists(cache_path):
        logging.info(f"Cached image found for '{title}' ({cache_filename}). Copying from cache.")
        shutil.copy(cache_path, current_image_path)
        update_menu_with_image(output_dir, current_date, safe_title, image_number)
        return

    # Image generation: Get the prompt and replace placeholders
    imagePromptFilePath = os.path.join(script_dir, "image_generator", "imagePrompt.txt")
    with open(imagePromptFilePath, "r") as prompt_file:
        prompt_text = prompt_file.read()
        prompt_with_title = prompt_text.replace("{{title}}", title)

    logging.info(f"Generating image for item '{image_number}'")
    # Get the plate mask image and generate the new image
    plateMaskFilePath = os.path.join(script_dir, "image_generator", "plateMask.png")
    with open(plateMaskFilePath, "rb") as image_file:
        image_response = client.images.edit(
            image=image_file,
            prompt=prompt_with_title,
            size="1024x1024",
        )

    if image_response:
        image_url = image_response.data[0].url
        logging.info(f"Image generated: {image_url}")

        # Load and save the image data
        image_data = requests.get(image_url).content
        img = Image.open(BytesIO(image_data))
        img.save(current_image_path)
        logging.info(f"Image saved in {current_date}/{image_number}.jpg")

        # Update menu.json
        update_menu_with_image(output_dir, current_date, safe_title, image_number)

        # Copy the generated image to the cache
        shutil.copy(current_image_path, cache_path)
        logging.info(f"Image cached at {cache_path}")
    else:
        logging.error("Failed to generate image.")


def update_menu_with_image(output_dir, current_date, safe_title, image_number):
    """
    Updates the menu.json file with the new image URL for the specified menu item.
    
    Args:
        output_dir (str): The output directory containing the menu.json file
        current_date (str): The current date in ISO format
        safe_title (str): The sanitized title with special characters replaced
        image_number (int): The index number of the image
    """
    json_file_path = os.path.join(output_dir, f"{current_date}/menu.json")
    with open(json_file_path, "r+") as json_file:
        try:
            logging.info(f"Loading JSON data from file: {json_file_path}")
            data = json.load(json_file)
        except Exception as e:
            logging.error(f"Error loading JSON data: {str(e)}")
            raise

        # Update the imageUrl for the corresponding entry
        for index, dish in enumerate(data):
            if index == image_number:
                logging.info(f"Updating imageUrl for item: {dish['title']}")
                dish["imageUrl"] = f"{image_number}.jpg"
                break

        try:
            json_file.seek(0)
            json_file.truncate(0)
            logging.info(f"Writing updated JSON data to file: {json_file_path}")
            json_file.write(json.dumps(data, ensure_ascii=False, indent=4))
        except Exception as e:
            logging.error(f"Error writing JSON data: {str(e)}")
            raise
