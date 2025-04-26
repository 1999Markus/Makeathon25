from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel
import os

# Import the router from api.py
from .app.api import router
from .app.config import settings

# Create the main FastAPI app
app = FastAPI(
    title="Learning Companion API",
    description="API for the learning companion that provides feedback on user explanations",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create necessary directories
os.makedirs(settings.audio_dir, exist_ok=True)
os.makedirs(settings.temp_dir, exist_ok=True)

# Include the router from api.py
app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "AI Hackathon API is running!"}


@app.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    """Endpoint to handle PDF uploads from frontend."""
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path(__file__).resolve().parent / "uploads"
        upload_dir.mkdir(exist_ok=True)
        
        # Save the uploaded file
        file_path = upload_dir / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process the PDF
        qa_pairs = extract_key_concepts_and_generate_qa(str(file_path))
        
        return {
            "message": "PDF processed successfully",
            "filename": file.filename,
            "qa_pairs_generated": qa_pairs
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        file.file.close()
    
@app.get("/")
async def root():
    """Root endpoint that provides API information."""
    return {
        "message": "Learning Companion API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": [
            "/api/ask-follow-up",
            "/api/evaluate"
        ]
    }
    # If running directly, start the application
if __name__ == "__main__":
    import uvicorn