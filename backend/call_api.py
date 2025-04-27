import requests
import os
import base64


def call_ask_follow_up(base_url, concept_id, audio_file_path, notepad_image_path, last_explanation: bool = False):
    """
    Call the ask-follow-up API endpoint.
    
    Args:
        base_url: The base URL of the API (e.g., "http://localhost:8000/api")
        concept_id: The ID of the concept being explained
        audio_file_path: Path to the WebM audio file containing the explanation
        notepad_image_path: Path to the WebP image file with drawn notes
        last_explanation: Boolean indicating if this is the final explanation attempt.
        
    Returns:
        The JSON response from the API or None if an error occurred.
    """
    # Endpoint URL
    url = f"{base_url}/ask-follow-up"
    
    # Prepare form data - ensure boolean is sent correctly for Form data
    form_data = {
        "concept_id": concept_id,
        "last_explanation": str(last_explanation).lower() # Send as 'true' or 'false'
    }
    
    # Prepare files with correct MIME types
    files = {
        "audio_file": (os.path.basename(audio_file_path), open(audio_file_path, "rb"), "audio/webm"),
        "notepad_image": (os.path.basename(notepad_image_path), open(notepad_image_path, "rb"), "image/webp")
    }
    
    try:
        # Make the request
        print(f"Calling {url} with concept_id={concept_id}, last_explanation={last_explanation}")
        response = requests.post(url, data=form_data, files=files)
        
        # Check if request was successful
        response.raise_for_status() # Raises HTTPError for bad responses (4xx or 5xx)
        
        # Return the JSON response
        print(f"API call successful (Status: {response.status_code})")
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error calling API: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response body: {e.response.text}")
        return None
    finally:
        # Close the file handles
        for file_obj in files.values():
            file_obj[1].close()


def main():
    # Example usage
    base_url = "http://localhost:8000/api"
    concept_id = "1" # Changed variable name for clarity
    audio_file_path = "example_explanation.webm"
    notepad_image_path = "bad_example_notepad.webp"
    is_last_explanation = True # Set this to True for the final explanation
    
    # Call the API
    response = call_ask_follow_up(
        base_url=base_url, 
        concept_id=concept_id, 
        audio_file_path=audio_file_path, 
        notepad_image_path=notepad_image_path,
        last_explanation=is_last_explanation
    )
    
    if response:
        print("\nAPI Response:")
        print(f"Feedback: {response.get('feedback')}")
        print(f"Audio data received: {len(response.get('audio_data', ''))} characters")
        
        # Optionally, save the audio data to a file
        audio_data = response.get('audio_data')
        if audio_data:
            try:
                with open("grandpa_response.mp3", "wb") as audio_file:
                    audio_file.write(base64.b64decode(audio_data))
                print("Response audio saved to grandpa_response.mp3")
            except base64.binascii.Error as e:
                print(f"Error decoding base64 audio data: {e}")
            except IOError as e:
                print(f"Error writing audio file: {e}")


if __name__ == "__main__":
    main()