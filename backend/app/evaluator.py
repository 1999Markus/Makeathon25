from typing import Dict, Tuple
import os
from pathlib import Path
from .slide_extractor import SlideExtractor
import openai
from dotenv import load_dotenv

class Evaluator:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in .env file")
        self.client = openai.OpenAI(api_key=api_key)
        self.slide_extractor = SlideExtractor(use_openai=True)
    
    def evaluate(self, course_content: Dict, audio_file_path: str) -> Tuple[float, str]:
        """
        Evaluate a user's voice explanation of course content.
        
        Args:
            course_content (Dict): The expected course content to be explained
            audio_file_path (str): Path to the MP3 file containing user's explanation
            
        Returns:
            Tuple[float, str]: A score (0-1) and feedback message
        """
        # Extract content from the PDF
        pdf_path = course_content.get("pdf_path")
        if not pdf_path:
            return 0.0, "No PDF path provided in course content"
            
        try:
            # Extract and analyze content from PDF
            slides = self.slide_extractor.extract_slides(pdf_path)
            qa_collection = self.slide_extractor.build_concept_qa(slides)
            
            # Transcribe the audio file
            with open(audio_file_path, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )
            
            # Prepare content for evaluation
            key_concepts = []
            for item in qa_collection:
                key_concepts.append({
                    "slide": item["slide"],
                    "concept": item["text"],
                    "visual_description": item["visual_description"]
                })
            
            # Evaluate the explanation
            evaluation_prompt = f"""Evaluate how well the following explanation covers the key concepts from the lecture slides.
            
            Explanation:
            {transcript.text}
            
            Key Concepts:
            {key_concepts}
            
            Please provide:
            1. A score from 0 to 1 (where 1 is perfect)
            2. Detailed feedback on what was covered well and what was missing
            3. Suggestions for improvement
            
            Format your response as:
            SCORE: [number between 0 and 1]
            FEEDBACK: [your feedback]
            SUGGESTIONS: [your suggestions]"""
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert at evaluating explanations of academic content."},
                    {"role": "user", "content": evaluation_prompt}
                ]
            )
            
            # Parse the response
            result = response.choices[0].message.content
            score = float(result.split("SCORE:")[1].split("\n")[0].strip())
            feedback = result.split("FEEDBACK:")[1].split("SUGGESTIONS:")[0].strip()
            suggestions = result.split("SUGGESTIONS:")[1].strip()
            
            return score, f"{feedback}\n\nSuggestions for improvement:\n{suggestions}"
            
        except Exception as e:
            return 0.0, f"Error during evaluation: {str(e)}" 