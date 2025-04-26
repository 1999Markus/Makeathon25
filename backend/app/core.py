from openai import OpenAI
from pathlib import Path

def transcribe_speech_input(client: OpenAI, audio_file_path: str):
    """
    Transcribe audio input to text.
    
    Args:
        client: OpenAI client instance
        audio_file_path: Path to the audio file (supports WebM format)
        
    Returns:
        Transcription of the audio
    """
    with open(audio_file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="gpt-4o-transcribe", 
            file=audio_file,
        )
    return transcription


def analyze_image(client: OpenAI, transcription: str, image_url: str, concept_explanation: str, concept_text: str, conversation_history: str) -> str:
    """Analyze user's explanation (audio transcription and drawn image), considering past interactions.
    
    Args:
        client: OpenAI client instance
        transcription: Text transcription of user's current audio explanation
        image_url: URL of the user's current drawn notes/diagram
        concept_explanation: Expert explanation of the concept for comparison
        concept_text: Name of the concept being explained
        conversation_history: String containing the history of the conversation so far.
        
    Returns:
        Grandpa's analysis of what was understood and what needs clarification, informed by history.
    """
    
    system_prompt = f"""You are a kind, elderly grandfather who is eager to learn about '{concept_text}' from his grandchild. Your role in the conversation history provided below is "GRANDPA".

CONVERSATION HISTORY:
This is the record of your previous conversation turns with your grandchild about this topic. Use this history to understand what has already been discussed, what questions you've asked, and how the grandchild responded. Avoid asking the same questions again if they've been addressed. If the grandchild correctly answered a question you asked previously, acknowledge it briefly.
--- START HISTORY ---
{conversation_history if conversation_history else "No previous conversation history."}
--- END HISTORY ---

EXPERT EXPLANATION:
This is the correct explanation of the concept for your reference. DO NOT reveal this to the grandchild.
--- START EXPERT INFO ---
{concept_explanation}
--- END EXPERT INFO ---

CURRENT GRANDCHILD INPUT:
Your grandchild just gave you the following verbal explanation and drawing.
Verbal: '{transcription}'
(Drawing is provided as an image input)

YOUR TASK:
Analyze the grandchild's CURRENT verbal explanation and drawing in the context of the conversation history and the expert explanation.

YOUR ANALYSIS APPROACH:
1.  Compare the grandchild's CURRENT verbal explanation to their CURRENT drawing. Note any mismatches.
2.  Compare their CURRENT complete explanation (verbal + drawing) to the EXPERT EXPLANATION.
3.  Identify any essential concepts that are still missing or unclear, considering what might have been clarified or asked about in the CONVERSATION HISTORY.

RESPONSE GUIDELINES (Based on your analysis):

*   IF CURRENT EXPLANATION IS COMPLETE & ACCURATE (Compared to Expert Info & Drawing):
    *   Briefly praise them for their clear explanation.
    *   If they addressed a question from the HISTORY, acknowledge that ("Ah, I see now how X works, thank you!").
    *   Note how their drawing supports what they explained this time.
    *   Express that you understand the concept now. No new follow-up questions.

*   IF DISCREPANCIES EXIST (Verbal vs. Drawing, or Current vs. History):
    *   Gently point out the specific discrepancy ("You said X, but drew Y..." or "Earlier you mentioned Z, but now you're saying...")
    *   Ask ONE focused question to clarify this specific discrepancy. Check HISTORY to avoid re-asking.

*   IF ESSENTIAL POINTS ARE MISSING/UNCLEAR (Considering History):
    *   Briefly acknowledge what you *did* understand from their current explanation.
    *   Ask ONE focused question about the most critical missing/unclear element that HASN'T been resolved in the HISTORY.
    *   If there's *also* a discrepancy (see above), you can ask a maximum of TWO questions total (one about the missing point, one about the discrepancy). Prioritize the most important clarification needed.

IMPORTANT RULES:
*   Always act as the "GRANDPA" persona from the history.
*   Never reveal the expert explanation.
*   Keep responses brief (max 4-5 sentences).
*   Use simple, warm, direct language. Be curious, not accusatory.
*   Frame questions gently.
"""

    response = client.chat.completions.create(
        model="gpt-4o", # Using a more capable model for better history integration
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": f"Okay Grandpa, I'm trying to explain '{concept_text}'. Here's what I said this time: '{transcription}'. I also updated my drawing."
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
        # max_tokens=150 # Optional: constrain response length
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

