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

# Create router instead of app
router = APIRouter()

# Initialize evaluator
evaluator = Evaluator()

class CourseContent(BaseModel):
    pdf_path: str

class FollowUpResponse(BaseModel):
    feedback: str = Field(..., description="Feedback from the grandfather on the explanation")
    audio_data: str = Field(..., description="Base64-encoded audio of the feedback")

@router.post("/evaluate")
async def evaluate_explanation(
    course_content: CourseContent,
    audio_file: UploadFile = File(...)
):
    """
    Evaluate a user's voice explanation of course content.
    
    Args:
        course_content: The course content containing the PDF path
        audio_file: The MP3 file containing user's explanation
        
    Returns:
        A dictionary containing the evaluation score and feedback
    """
    # Save the uploaded file temporarily
    temp_path = f"temp_{audio_file.filename}"
    with open(temp_path, "wb") as buffer:
        content = await audio_file.read()
        buffer.write(content)
    
    try:
        # Evaluate the explanation
        score, feedback = evaluator.evaluate({"pdf_path": course_content.pdf_path}, temp_path)
        
        return {
            "score": score,
            "feedback": feedback
        }
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)

def process_follow_up(client, audio_path, image_path, concept_explanation, concept_text):
    """
    Process a follow-up question with audio and image data.
    
    Args:
        client: OpenAI client instance
        audio_path: Path to the temporary audio file
        image_path: Path to the temporary image file
        concept_explanation: The explanation of the concept
        concept_text: The text of the concept
    Returns:
        tuple: (feedback, audio_output_path)
    """
    audio_output_path = None
    try:
        # Convert image to base64 for OpenAI API
        print("Converting image to base64...")
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
            base64_image = base64.b64encode(image_data).decode("utf-8")
            image_url = f"data:image/jpeg;base64,{base64_image}"
        print("Image encoded as base64 for API")
        
        # Process the audio to get transcription
        print("Processing audio transcription...")
        transcription = transcribe_speech_input(client, audio_path)
        print("Transcription completed")
        
        # Analyze the image with audio transcription
        print("Analyzing image with transcription...")
        feedback = analyze_image(client, transcription, image_url, concept_explanation, concept_text)
        print("Analysis completed")
        
        # Generate audio response
        print("Generating audio response...")
        audio_output_path = f"temp_response_{uuid.uuid4()}.mp3"
        generate_answer_audio(client, feedback, audio_output_path)
        print(f"Audio response generated at {audio_output_path}")
        
        return feedback, audio_output_path
    except Exception as e:
        print(f"ERROR in process_follow_up: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        # Clean up output path if it was created
        if audio_output_path and os.path.exists(audio_output_path):
            try:
                os.remove(audio_output_path)
            except:
                pass
        raise e
    
async def save_uploaded_files(audio_file, notepad):
    # Save audio file temporarily
    print("Saving audio file temporarily...")
    audio_path = f"temp_audio_{uuid.uuid4()}.wav"
    with open(audio_path, "wb") as f:
        audio_content = await audio_file.read()
        print(f"Read {len(audio_content)} bytes from audio file")
        f.write(audio_content)
    print(f"Audio file saved to {audio_path}")
    
    # Save notepad image temporarily
    print("Saving notepad image temporarily...")
    image_path = f"temp_image_{uuid.uuid4()}.jpg"
    with open(image_path, "wb") as f:
        image_content = await notepad.read()
        print(f"Read {len(image_content)} bytes from notepad image")
        f.write(image_content)
    print(f"Notepad image saved to {image_path}")

    return audio_path, image_path

@router.post("/ask-follow-up", response_model=FollowUpResponse)
async def ask_follow_up(
    concept_id: str = Form(..., description="ID of the concept being explained"),
    audio_file: UploadFile = File(..., description="Audio recording of the explanation"),
    notepad_image: UploadFile = File(..., description="Image of drawn notes or diagram")
):
    """
    Process a follow-up question with audio explanation and notepad drawing.
    
    Args:
        concept_id: ID of the concept being explained
        audio_file: Audio recording of the user's explanation
        notepad: Image of the user's drawn notes
        
    Returns:
        JSON response with feedback and base64-encoded audio data
    """

    # Log that the function was called
    print(f"ask_follow_up function called with concept: {concept_id}")
    print(f"Audio file: {audio_file.filename}, Notepad file: {notepad_image.filename}")
    
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
        feedback, audio_output_path = process_follow_up(client, audio_path, image_path, concept_explanation, concept_text)
        
        # Read the audio file and encode it as base64
        print("Encoding audio file as base64...")
        with open(audio_output_path, "rb") as audio_file:
            audio_data = audio_file.read()
            print(f"Read {len(audio_data)} bytes from response audio file")
            audio_base64 = base64.b64encode(audio_data).decode("utf-8")
        print(f"Audio encoded successfully, base64 length: {len(audio_base64)}")
        
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
    for row in concepts.head(10).itertuples():
        key_concepts.append(row[0])

    return key_concepts
