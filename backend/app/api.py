from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from .evaluator import Evaluator
from .pdf_extractor import PDFExtractor
import os
from pydantic import BaseModel

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize evaluator and PDF extractor
evaluator = Evaluator()
pdf_extractor = PDFExtractor()

class CourseContent(BaseModel):
    pdf_path: str

@app.post("/evaluate")
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

@app.post("/extract-content")
async def extract_content(pdf_file: UploadFile = File(...)):
    """
    Extract and analyze content from a PDF slide.
    
    Args:
        pdf_file: The PDF file containing the slide
        
    Returns:
        A dictionary containing the extracted and analyzed content
    """
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
