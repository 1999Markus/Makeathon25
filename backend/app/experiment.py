from openai import OpenAI
import requests
from pathlib import Path
import base64
from core import transcribe_speech_input, analyze_image, generate_answer_audio
import pandas as pd


def main():
    # Create OpenAI client instance with API key
    client = OpenAI(
        api_key=""
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



def get_concept(concept_id):
    concepts = pd.read_csv("/Users/markuslohde/Desktop/Makeathon25/backend/extracted_key_concepts/ArtificialIntelligence_2_IntelligentAgents-2_qa.csv")
    concept_row = concepts.iloc[int(concept_id) - 1]
    concept_explanation = concept_row.iloc[0]
    concept_text = concept_row._name[1]


if __name__ == "__main__":
   get_concept("1")
