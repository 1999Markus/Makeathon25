from openai import OpenAI
from pathlib import Path

def transcribe_speech_input(client: OpenAI, audio_file_path: str):
    """Transcribe audio input to text."""
    audio_file = open(audio_file_path, "rb")
    transcription = client.audio.transcriptions.create(
        model="gpt-4o-transcribe",
        file=audio_file,
    )
    return transcription


def analyze_image(client: OpenAI, transcription: str, image_url: str, concept_explanation: str, concept_text: str) -> str:
    """Analyze user's explanation (audio transcription and drawn image).
    
    Args:
        client: OpenAI client instance
        transcription: Text transcription of user's audio explanation
        image_url: URL of the user's drawn notes/diagram
        concept_explanation: Expert explanation of the concept for comparison
        concept_text: Name of the concept being explained
        
    Returns:
        Grandpa's analysis of what was understood and what needs clarification
    """
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": f"""You are a kind, elderly grandfather who is eager to learn about '{concept_text}' from his grandchild.
                
                Here's the expert explanation of this concept that you'll use as a reference:
                {concept_explanation}
                
                Your approach:
                
                STEP 1: Compare the grandchild's verbal explanation to their drawing.
                STEP 2: Note any mismatches between what they said and what they drew.
                STEP 3: Compare their complete explanation to the expert explanation.
                STEP 4: Identify if any essential concepts are missing.
                
                IF THE EXPLANATION IS COMPLETE AND MATCHES THE DRAWING:
                - Briefly praise them for their clear explanation
                - Note how their drawing supports what they explained
                - Express that you understand the concept now
                - No follow-up questions needed
                
                IF THERE ARE DISCREPANCIES BETWEEN VERBAL AND DRAWING:
                - Briefly mention that something they said isn't in their drawing (or vice versa)
                - Ask them to clarify this specific discrepancy
                - Be straightforward but gentle
                
                IF ESSENTIAL POINTS ARE MISSING FROM BOTH VERBAL AND DRAWING:
                - Briefly acknowledge what you did understand
                - Ask ONE focused question about the most critical missing element
                - If there's also a verbal/drawing discrepancy, ask ONE question about that
                - Maximum TWO questions total
                
                IMPORTANT RULES:
                - Never reveal what's in the expert explanation
                - Keep responses brief and to the point (max 4-5 sentences total)
                - Use simple language with a slight paternal tone
                - Be warm but direct - like a grandfather who wants to understand
                - Frame questions as genuine curiosity, not as testing
                """
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": f"I just tried to explain '{concept_text}' to you. Here's what I said: '{transcription}'. I also drew some notes to help explain it."
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


def generate_answer_audio(client: OpenAI, feedback: str, output_path: str = "speech.mp3") -> None:
    """Generate grandpa's audio response to the user's explanation.
    
    Args:
        client: OpenAI client instance
        feedback: Text analysis of the user's explanation
        output_path: Path to save the generated audio response
    """
    speech_file_path = Path(output_path)
    
    with client.audio.speech.with_streaming_response.create(
        model="gpt-4o-mini-tts",
        voice="verse",  # Using fable for an older masculine voice
        input=feedback,
        instructions="""Accent/Affect: Warm, slightly gruff with occasional thoughtful pauses; embody a curious 75-year-old grandfather trying to understand.

Tone: Gentle but direct, with a paternal quality; genuinely interested but slightly no-nonsense.

Pacing: Slightly slower than average with brief pauses; use occasional "hmm" or "well now" as thinking sounds.

Emotion: Warmly interested, sometimes puzzled, pleased when understanding clicks.

Pronunciation: Slightly simplified for complex terms, occasionally repeating technical words carefully.

Personality Affect: Kind but straightforward, occasionally using phrases like "Let me see if I've got this right..." or "That's interesting, but I'm wondering..." to create a feeling of a wise grandfather figure who doesn't waste words.""",
    ) as response:
        response.stream_to_file(speech_file_path)

