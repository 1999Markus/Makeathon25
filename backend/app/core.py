from openai import OpenAI
import requests
from pathlib import Path
import base64

def transcribe_speech_input(client: OpenAI, audio_file_path: str):
    """Transcribe audio input to text."""
    audio_file = open(audio_file_path, "rb")
    transcription = client.audio.transcriptions.create(
        model="gpt-4o-transcribe",
        file=audio_file,
    )
    return transcription


def analyze_image(client: OpenAI, transcription: str, image_url: str) -> str:
    """Analyze user's explanation (audio transcription and drawn image).

    Args:
        client: OpenAI client instance
        transcription: Text transcription of user's audio explanation
        image_url: URL of the user's drawn notes/diagram

    Returns:
        Grandma's analysis of what was understood and what needs clarification
    """
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": """You are a kind, elderly grandmother who is eager to learn from her grandchild. 
                Your goal is to encourage the user to explain concepts clearly by providing specific feedback.
                
                Your responses should:
                1. Warmly acknowledge what you've understood from their explanation
                2. Identify 1-2 specific areas that were unclear or need more explanation
                3. Ask simple, curious questions to help them clarify those points
                4. Use simple, non-technical language as an elderly person would
                
                This teaching technique helps users refine their understanding by forcing them to rethink and re-explain concepts.""",
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"I just tried to explain a concept to you. Here's what I said: '{transcription}'. I also drew some notes to help explain it which are attached in the image.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url,
                        },
                    },
                ],
            },
        ],
    )
    return response.choices[0].message.content


def generate_answer_audio(
    client: OpenAI, feedback: str, output_path: str = "speech.mp3"
) -> str:
    """Generate grandma's audio response to the user's explanation.

    Args:
        client: OpenAI client instance
        feedback: Text analysis of the user's explanation
        output_path: Path to save the generated audio response
    """
    speech_file_path = Path(output_path)

    with client.audio.speech.with_streaming_response.create(
        model="gpt-4o-mini-tts",
        voice="nova",  # Using nova for an older feminine voice
        input=feedback,
        instructions="""Accent/Affect: Warm, slightly aged, with occasional thoughtful pauses; embody a curious 75-year-old grandmother eager to understand.

Tone: Gentle, encouraging, and patient; never condescending but genuinely trying to understand.

Pacing: Slightly slower than average with natural hesitations as if processing new information; use "hmm" and "I see" occasionally.

Emotion: Warmly interested, slightly confused at technical points, delighted when understanding clicks.

Pronunciation: Slightly simplified for complex terms, sometimes repeating difficult words as if trying to learn them.

Personality Affect: Sweet, attentive, occasionally sharing small personal anecdotes, using gentle phrases like "Oh, that reminds me of..." or "Now, let me make sure I understand correctly..." to create a feeling of genuine conversation.""",
    ) as response:
        response.stream_to_file(speech_file_path)
        

def read_and_transcribe_audio(client: OpenAI, audio_file_path: str) -> str:
    """Read audio from a file and transcribe it to text using streaming.
    
    Args:
        client: OpenAI client instance
        audio_file_path: Path to the audio file to transcribe
        
    Returns:
        Transcribed text from the audio file
    """
    # Open the audio file for transcription
    with open(audio_file_path, "rb") as audio_file:
        # Create a streaming response for the transcription
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=audio_file
        )
        return transcript




def process_audio_image_chain(
    client: OpenAI, audio_url: str, image_url: str, output_path: str = "speech.mp3"
) -> tuple[str, str, str]:
    """
    Process the user's explanation and generate grandma's response.

    Args:
        client: OpenAI client instance
        audio_url: URL of the user's audio explanation
        image_url: URL of the user's drawn notes/diagram
        output_path: Path to save grandma's audio response

    Returns:
        tuple containing (transcription, feedback, output_path)
    """
    # Download and save audio file
    response = requests.get(audio_url)
    response.raise_for_status()
    with open("temp_audio.wav", "wb") as temp_file:
        temp_file.write(response.content)

    # Process chain
    transcription = transcribe_speech_input(client, "temp_audio.wav")
    feedback = analyze_image(client, transcription, image_url)
    generate_answer_audio(client, feedback, output_path)

    return transcription, feedback, output_path

