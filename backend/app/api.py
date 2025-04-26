from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
import uuid
from pydantic import BaseModel
from .core import analyze_image, generate_answer_audio, read_and_transcribe_audio
from openai import OpenAI
from .evaluator import Evaluator
import base64
from .config import settings

# Create router instead of app
router = APIRouter()

# Initialize evaluator
evaluator = Evaluator()

class CourseContent(BaseModel):
    pdf_path: str

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

"""
@router.post("/extract-content")
async def extract_content(pdf_file: UploadFile = File(...)):
    
    Extract and analyze content from a PDF slide.
    
    Args:
        pdf_file: The PDF file containing the slide
        
    Returns:
        A dictionary containing the extracted and analyzed content
    
    # Save the uploaded file temporarily
    temp_path = f"temp_{pdf_file.filename}"
    with open(temp_path, "wb") as buffer:
        content = await pdf_file.read()
        buffer.write(content)
    
    try:
        # Extract and analyze content
        result = pdf_extractor.extract_content(temp_path)
        return result
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)
             
"""

@router.post("/ask-follow-up")
async def ask_follow_up(
    concept: str = Form(...),
    audio_file: UploadFile = File(...),
    notepad: UploadFile = File(...)
):
    """
    Process a follow-up question with audio explanation and notepad drawing.
    
    Args:
        concept: The concept being explained
        audio_file: Audio recording of the user's explanation
        notepad: Image of the user's drawn notes
        
    Returns:
        JSON response with feedback and base64-encoded audio data
    """
    # Create OpenAI client
    client = OpenAI(api_key=settings.openai_api_key)
    
    # Initialize paths as None to handle cleanup in finally block
    audio_path = None
    image_path = None
    audio_output_path = None
    
    try:
        # Save audio file temporarily
        audio_path = f"temp_audio_{uuid.uuid4()}.wav"
        with open(audio_path, "wb") as f:
            f.write(await audio_file.read())
        
        # Save notepad image temporarily
        image_path = f"temp_image_{uuid.uuid4()}.jpg"
        with open(image_path, "wb") as f:
            f.write(await notepad.read())
            
        # Use a file URL for local testing
        image_url = f"file://{os.path.abspath(image_path)}"
        
        # Process the audio to get transcription
        transcription = read_and_transcribe_audio(client, audio_path)
        
        # Analyze the image with audio transcription
        feedback = analyze_image(client, transcription, image_url)
        
        # Generate audio response
        audio_output_path = f"temp_response_{uuid.uuid4()}.mp3"
        generate_answer_audio(client, feedback, audio_output_path)
        
        # Read the audio file and encode it as base64
        with open(audio_output_path, "rb") as audio_file:
            audio_data = audio_file.read()
            audio_base64 = base64.b64encode(audio_data).decode("utf-8")
        
        return {
            "feedback": feedback,
            "audio_data": audio_base64
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")
        
    finally:
        # Clean up temporary files
        for path in [audio_path, image_path, audio_output_path]:
            if path and os.path.exists(path):
                os.remove(path)

    