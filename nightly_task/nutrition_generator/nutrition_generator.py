import openai
import os
import json

def generate_chat_completion(title, current_date, safe_title, script_dir, output_dir):
    print(f"Generating chat completion for item '{title}'")
    
    # Read the system prompt from file
    nutritionalPromtFilePath = os.path.join(script_dir, 'nutrition_generator', 'nutritionalPrompt.txt')
    with open(nutritionalPromtFilePath, 'r') as file:
        systemPrompt = file.read()

    # Create a chat completion with the title of the dish as the content of the user message
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            { "role": "system", "content": systemPrompt },
            {"role": "user", "content": f"{title}"}
        ]
    )

    # Load the existing menu.json file
    with open(f'{output_dir}/{current_date}/menu.json', 'r', encoding='utf-8') as f:
        menu_data = json.load(f)

    # Add the chat completion to the corresponding dish
    for dish in menu_data:
        if dish["title"] == title:
            dish["chat_completion"] = completion.choices[0].message['content']
            break

    # Write back the updated data to menu.json
    with open(f'{output_dir}/{current_date}/menu.json', 'w', encoding='utf-8') as f:
        json.dump(menu_data, f, ensure_ascii=False, indent=4)
    print(f"Response added to {current_date}/menu.json")