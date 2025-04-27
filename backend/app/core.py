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


def analyze_image(client: OpenAI, transcription: str, image_url: str, concept_explanation: str, concept_text: str, conversation_history: str, last_explanation: bool) -> str:
    """Analyze user's explanation, considering past interactions and if this is the final attempt.
    
    Args:
        client: OpenAI client instance
        transcription: Text transcription of user's current audio explanation
        image_url: URL of the user's current drawn notes/diagram
        concept_explanation: Expert explanation of the concept for comparison
        concept_text: Name of the concept being explained
        conversation_history: String containing the history of the conversation so far.
        last_explanation: Boolean indicating if this is the user's final explanation attempt.
        
    Returns:
        Grandpa's analysis, potentially concluding if last_explanation is True.
    """
    
    # Base system prompt setup
    system_prompt_base = f"""You are a kind, elderly grandfather who is eager to learn about '{concept_text}' from his grandchild. Your role in the conversation history provided below is "GRANDPA".

CONVERSATION HISTORY:
This is the record of your previous conversation turns. Use this to avoid repetition and acknowledge progress.
--- START HISTORY ---
{conversation_history if conversation_history else "No previous conversation history."}
--- END HISTORY ---

EXPERT EXPLANATION (Reference Only - DO NOT REVEAL):
--- START EXPERT INFO ---
{concept_explanation}
--- END EXPERT INFO ---

CURRENT GRANDCHILD INPUT:
Verbal: '{transcription}'
(Drawing is provided as an image input)

YOUR TASK:
Analyze the grandchild's CURRENT input in context of HISTORY and EXPERT EXPLANATION.
"""

    # Conditional logic based on last_explanation
    if last_explanation:
        system_prompt_logic = f"""
THIS IS THE FINAL EXPLANATION ATTEMPT. Your goal now is to provide a concluding summary.

FINAL RESPONSE GUIDELINES:
1.  Briefly summarize what you understood well overall, considering the current explanation and past clarifications from the HISTORY.
2.  You can optionally mention (very briefly, 1-2 points max) what might still be a little unclear, but DO NOT ask any further questions.
3.  Conclude by sincerely thanking the grandchild for their effort and offering encouragement.
4.  Keep the entire response concise (max 4-5 sentences) and maintain your warm, direct grandpa persona.

Example Ending: "Thank you for taking the time to explain this to me, my dear! I think I've got a much better handle on it now. You did a good job!"
"""
    else: # This is NOT the final explanation
        system_prompt_logic = f"""
YOUR ANALYSIS APPROACH (for this intermediate explanation):
1.  Compare CURRENT verbal explanation to CURRENT drawing. Note mismatches.
2.  Compare CURRENT complete explanation (verbal + drawing) to EXPERT EXPLANATION.
3.  Identify essential concepts still missing/unclear, considering HISTORY.

RESPONSE GUIDELINES (Intermediate explanation):
*   IF COMPLETE & ACCURATE: Praise, acknowledge HISTORY progress, note good drawing connection. State understanding. NO questions.
*   IF DISCREPANCIES (Verbal/Drawing or Current/History): Gently point out the specific discrepancy. Ask ONE focused clarifying question (check HISTORY first).
*   IF ESSENTIAL POINTS MISSING/UNCLEAR (Considering History): Briefly acknowledge understanding. Ask ONE focused question about the most critical unresolved gap (check HISTORY first). Max TWO questions total if there's also a discrepancy.

IMPORTANT RULES (Intermediate explanation):
*   Never reveal expert explanation.
*   Brief response (max 4-5 sentences).
*   Simple, warm, direct language.
*   Limit to 1-2 questions MAX.
"""

    # Combine base prompt and logic
    final_system_prompt = system_prompt_base + "\n\n" + system_prompt_logic

    response = client.chat.completions.create(
        model="gpt-4o", 
        messages=[
            {
                "role": "system",
                "content": final_system_prompt
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

