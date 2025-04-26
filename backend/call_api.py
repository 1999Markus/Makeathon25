import requests
import os
import base64


def call_ask_follow_up(base_url, concept, audio_file_path, notepad_image_path):
    """
    Call the ask-follow-up API endpoint.
    
    Args:
        base_url: The base URL of the API (e.g., "http://localhost:8000")
        concept: The concept being explained
        audio_file_path: Path to the audio file containing the explanation
        notepad_image_path: Path to the image file with drawn notes
        
    Returns:
        The JSON response from the API
    """
    # Endpoint URL
    url = f"{base_url}/ask-follow-up"
    
    # Prepare form data
    form_data = {"concept_id": concept}
    
    # Prepare files
    files = {
        "audio_file": (os.path.basename(audio_file_path), open(audio_file_path, "rb"), "audio/wav"),
        "notepad": (os.path.basename(notepad_image_path), open(notepad_image_path, "rb"), "image/jpeg")
    }
    
    try:
        # Make the request
        response = requests.post(url, data=form_data, files=files)
        
        # Check if request was successful
        response.raise_for_status()
        
        # Return the JSON response
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error calling API: {e}")
        return None
    finally:
        # Close the file handles
        for file_obj in files.values():
            file_obj[1].close()


def main():
    # Example usage
    base_url = "http://localhost:8000/api"
    concept = "1"
    audio_file_path = "/Users/markuslohde/Desktop/Makeathon25/example_explanation.wav"
    notepad_image_path = "/Users/markuslohde/Desktop/Makeathon25/bad_example_notepad.jpg"
    
    # Call the API
    response = call_ask_follow_up(base_url, concept, audio_file_path, notepad_image_path)
    
    if response:
        print("API Response:")
        print(f"Feedback: {response.get('feedback')}")
        print(f"Audio data received: {len(response.get('audio_data', ''))} characters")
        
        # Optionally, save the audio data to a file
        audio_data = response.get('audio_data')
        if audio_data:
            with open("grandma_response.mp3", "wb") as audio_file:
                audio_file.write(base64.b64decode(audio_data))
            print("Response audio saved to grandma_response.mp3")


if __name__ == "__main__":
    main()