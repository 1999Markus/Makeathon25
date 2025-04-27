from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
import uuid
from pydantic import BaseModel, Field
from typing import Optional
from .core import analyze_image, generate_answer_audio, transcribe_speech_input
from openai import OpenAI
from .evaluator import Evaluator
import base64
from .config import settings
import traceback
import pandas as pd
import datetime

# Create router instead of app
router = APIRouter()

# Initialize evaluator
evaluator = Evaluator()

class EvaluationResponse(BaseModel):
    score: float = Field(..., description="Evaluation score between 0 and 100")

class FollowUpResponse(BaseModel):
    feedback: str = Field(..., description="Feedback from the grandfather on the explanation")
    audio_data: str = Field(..., description="Base64-encoded audio of the feedback")

@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_explanation(
    concept_id: str = Form(...)
):
    """
    Evaluate the user's overall understanding based on conversation history for a specific concept.
    
    Args:
        concept_id (str): The ID of the concept to evaluate.
        
    Returns:
        EvaluationResponse: A dictionary containing the evaluation score.
    """
    print(f"evaluate_explanation function called for concept_id: {concept_id}")
    concept_file_path = "extracted_key_concepts/ArtificialIntelligence_2_IntelligentAgents-2_qa.csv"
    history_file_path = "conversation_history.txt"
    
    try:
        # 1. Read Concepts CSV
        if not os.path.exists(concept_file_path):
            print(f"ERROR: Concepts file not found at {concept_file_path}")
            raise HTTPException(status_code=404, detail="Concepts data not found.")
        
        concepts = pd.read_csv(concept_file_path)
        print(f"Loaded concepts from {concept_file_path}")

        # 2. Retrieve the specific concept
        try:
            concept_id_int = int(concept_id)
            if not (1 <= concept_id_int <= len(concepts)):
                raise ValueError("Concept ID out of range")
            concept_row = concepts.iloc[concept_id_int - 1]
            concept_explanation = concept_row.iloc[0]
            concept_text = concept_row._name[1]
            print(f"Retrieved concept: ID={concept_id}, Title={concept_text}")
            concept = {"title": concept_text, "description": concept_explanation}
        except (ValueError, IndexError) as e:
            print(f"ERROR: Invalid concept_id '{concept_id}'. Error: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid or out-of-range concept_id: {concept_id}")
        
        # 3. Read Conversation History
        conversation_history = ""
        if os.path.exists(history_file_path):
            with open(history_file_path, "r", encoding="utf-8") as f:
                conversation_history = f.read()
                print(f"Loaded conversation history from {history_file_path}")
        else:
            print(f"Warning: Conversation history file not found at {history_file_path}. Evaluating based on empty history.")
            # You might want to return an error or a default score if history is required

        # 4. Call the evaluator function
        print("Calling evaluator...")
        score = evaluator.evaluate(concept=concept, chat_history=conversation_history)
        print(f"Evaluation score received: {score}")
        
        # 5. Return the score
        return EvaluationResponse(score=score)

    except HTTPException as http_exc:
        # Re-raise HTTPException to let FastAPI handle it
        raise http_exc
    except Exception as e:
        print(f"ERROR in evaluate_explanation: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error evaluating explanation: {str(e)}")

def process_follow_up(client, audio_path, image_path, concept_explanation, concept_text):
    """
    Process a follow-up question with audio and image data.
    
    Args:
        client: OpenAI client instance
        audio_path: Path to the temporary audio file (WebM format)
        image_path: Path to the temporary image file (WebP format)
        concept_explanation: The explanation of the concept
        concept_text: The text of the concept
    Returns:
        tuple: (feedback, audio_output_path, transcription)
    """
    audio_output_path = None
    transcription_text = None
    conversation_history = ""
    history_file_path = "conversation_history.txt"
    
    try:
        # Read conversation history if it exists
        if os.path.exists(history_file_path):
            with open(history_file_path, "r", encoding="utf-8") as f:
                conversation_history = f.read()
                print(f"Loaded conversation history from {history_file_path}")
        else:
            print("Conversation history file not found, starting new history.")
            
        # Convert image to base64 for OpenAI API
        print("Converting image to base64...")
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
            base64_image = base64.b64encode(image_data).decode("utf-8")
            image_url = f"data:image/webp;base64,{base64_image}"
        print("Image encoded as base64 for API")
        
        # Process the audio to get transcription
        print("Processing audio transcription...")
        transcription_obj = transcribe_speech_input(client, audio_path)
        transcription_text = transcription_obj.text # Extract text from the transcription object
        print("Transcription completed")
        
        # Analyze the image with audio transcription and history
        print("Analyzing image with transcription and history...")
        feedback = analyze_image(client, transcription_text, image_url, concept_explanation, concept_text, conversation_history)
        print("Analysis completed")
        
        # Generate audio response
        print("Generating audio response...")
        audio_output_path = f"temp_response_{uuid.uuid4()}.mp3"
        generate_answer_audio(client, feedback, audio_output_path)
        print(f"Audio response generated at {audio_output_path}")
        
        return feedback, audio_output_path, transcription_text
    except Exception as e:
        print(f"ERROR in process_follow_up: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        if audio_output_path and os.path.exists(audio_output_path):
            try: os.remove(audio_output_path)
            except: pass
        raise e
    
async def save_uploaded_files(audio_file, notepad):
    """Save uploaded WebM audio and WebP image files temporarily."""
    # Save audio file temporarily (WebM format)
    print("Saving audio file temporarily...")
    audio_path = f"temp_audio_{uuid.uuid4()}.webm"
    with open(audio_path, "wb") as f:
        audio_content = await audio_file.read()
        print(f"Read {len(audio_content)} bytes from audio file")
        f.write(audio_content)
    print(f"Audio file saved to {audio_path}")
    
    # Save notepad image temporarily (WebP format)
    print("Saving notepad image temporarily...")
    image_path = f"temp_image_{uuid.uuid4()}.webp"
    with open(image_path, "wb") as f:
        image_content = await notepad.read()
        print(f"Read {len(image_content)} bytes from notepad image")
        f.write(image_content)
    print(f"Notepad image saved to {image_path}")

    return audio_path, image_path

def save_conversation_to_history(user_input: str, ai_response: str):
    """
    Save conversation between user and AI to history file.
    
    Args:
        user_input: Transcription of user's speech
        ai_response: AI's response text
        
    Returns:
        Path to the history file
    """
    print("Saving conversation to history file...")
    
    # Format the conversation entry with timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conversation_entry = f"\n\n--- Conversation at {timestamp} ---\n"
    conversation_entry += f"USER: {user_input}\n\n"
    conversation_entry += f"GRANDPA: {ai_response}\n"
    conversation_entry += f"--- End of conversation ---"
    
    # Append to the conversation history file
    history_file_path = "conversation_history.txt"
    
    # Check if file exists, if not create it with a header
    file_exists = os.path.isfile(history_file_path)
    with open(history_file_path, "a", encoding="utf-8") as history_file:
        if not file_exists:
            history_file.write("# Learning Companion Conversation History\n")
            history_file.write("This file contains a record of all conversations between the user and the AI grandpa.\n\n")
        history_file.write(conversation_entry)
    
    print(f"Conversation saved to {history_file_path}")
    return history_file_path

@router.post("/ask-follow-up", response_model=FollowUpResponse)
async def ask_follow_up(
    concept_id: str = Form(..., description="ID of the concept being explained"),
    audio_file: UploadFile = File(..., description="Audio recording of the explanation (WebM format)"),
    notepad_image: UploadFile = File(..., description="Image of drawn notes or diagram (WebP format)")
):
    """
    Process a follow-up question with audio explanation and notepad drawing.
    
    Args:
        concept_id: ID of the concept being explained
        audio_file: Audio recording of the user's explanation (WebM format)
        notepad_image: Image of the user's drawn notes (WebP format)
        
    Returns:
        JSON response with feedback and base64-encoded audio data
    """

    # Log that the function was called
    print(f"ask_follow_up function called with concept: {concept_id}")
    print(f"Audio file: {audio_file.filename} ({audio_file.content_type})")
    print(f"Notepad file: {notepad_image.filename} ({notepad_image.content_type})")
    
    # Create OpenAI client
    print("Creating OpenAI client...")
    client = OpenAI(api_key=settings.openai_api_key)
    print("OpenAI client created successfully")
    
    # Initialize paths as None to handle cleanup in finally block
    audio_path = None
    image_path = None
    audio_output_path = None
    
    try:
        # Save uploaded files
        audio_path, image_path = await save_uploaded_files(audio_file, notepad_image)

        # Retrieve the concept from the database
        concepts = pd.read_csv("extracted_key_concepts/ArtificialIntelligence_2_IntelligentAgents-2_qa.csv")
        concept_row = concepts.iloc[int(concept_id) - 1]
        concept_explanation = concept_row.iloc[0]
        concept_text = concept_row._name[1]
        print(f"Concept explanation: {concept_explanation}")
        print(f"Concept text: {concept_text}")

        # Process the follow-up using extracted function
        feedback, audio_output_path, transcription = process_follow_up(client, audio_path, image_path, concept_explanation, concept_text)
        
        # Read the audio file and encode it as base64
        print("Encoding audio file as base64...")
        with open(audio_output_path, "rb") as audio_file:
            audio_data = audio_file.read()
            print(f"Read {len(audio_data)} bytes from response audio file")
            audio_base64 = base64.b64encode(audio_data).decode("utf-8")
        print(f"Audio encoded successfully, base64 length: {len(audio_base64)}")
        
        # Save the conversation to history file
        save_conversation_to_history(transcription, feedback)
        
        print("Returning response to client")
        return {
            "feedback": feedback,
            "audio_data": audio_base64
        }
        
    except Exception as e:
        print(f"ERROR in ask_follow_up: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")
        
    finally:
        print("Cleaning up temporary files...")
        # Clean up temporary files
        for path in [audio_path, image_path, audio_output_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                    print(f"Removed temporary file: {path}")
                except Exception as e:
                    print(f"Failed to remove temporary file {path}: {str(e)}")
        print("Cleanup completed")

@router.get("/get-key-concepts")
async def get_key_concepts():
    """
    Get the key concepts for the hardcoded course.
    """
    concepts = pd.read_csv("extracted_key_concepts/ArtificialIntelligence_2_IntelligentAgents-2_qa.csv")

    key_concepts = []
    for i, row in concepts.head(10).iterrows():
        key_concepts.append({
            "id": i+1,
            "concept": row.iloc[0],
            "question": row.iloc[1],
            "answer": row.iloc[2],
        })

    return key_concepts
