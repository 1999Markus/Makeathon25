from openai import OpenAI
import requests
from pathlib import Path
import base64
from core import transcribe_speech_input, analyze_image, generate_answer_audio



def main():
    # Create OpenAI client instance with API key
    client = OpenAI(
        api_key="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"
    )
    
    # Test audio file from OpenAI samples
    audio_url = "https://cdn.openai.com/API/docs/audio/alloy.wav"
    
    # Test image - a sample drawing/notepad image
    image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
    
    # Define output path for the generated audio
    output_path = "grandma_response.mp3"
    
    print("Starting learning companion test...")
    print(f"Audio URL: {audio_url}")
    print(f"Image URL: {image_url}")
    
    # Download and save audio file
    print("Downloading audio file...")
    response = requests.get(audio_url)
    response.raise_for_status()
    with open("temp_audio.wav", "wb") as temp_file:
        temp_file.write(response.content)
    
    # Step 1: Transcribe the user's audio explanation
    print("Transcribing user's explanation...")
    transcription = transcribe_speech_input(client, "temp_audio.wav").text
    print(f"Transcription: {transcription}")
    
    # Step 2: Analyze the image with the transcription context
    print("Analyzing user's explanation and drawing...")
    feedback = analyze_image(client, transcription, image_url)
    print(f"Grandma's feedback: {feedback}")
    
    # Step 3: Generate audio response from grandma
    print("Generating grandma's audio response...")
    text_content = generate_answer_audio(client, feedback, output_path)
    print(f"Generated text: {text_content}")
    print(f"Audio response saved to: {output_path}")
    
    print("Testing complete!")



if __name__ == "__main__":
    main()
