from typing import Dict, Tuple, List, Optional
import os
from pathlib import Path
from .slide_extractor_with_images import extract_key_concepts_and_generate_qa
import openai
from dotenv import load_dotenv
import json

class Evaluator:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in .env file")
        self.client = openai.OpenAI(api_key=api_key)
    
    def evaluate(self, 
                concept: Dict,
                user_answer: str,
                chat_history: str) -> float:
        """
        Evaluate a user's explanation of a concept.
        
        Args:
            concept (Dict): The concept being explained with its expected answer
            user_answer (str): The user's current explanation (text from drawing + audio)
            chat_history (str): Previous conversation history as a text string
            
        Returns:
            float: A score between 0 and 100
        """
        # Prepare the evaluation prompt
        evaluation_prompt = f"""You are an AI evaluator helping a student explain concepts to their grandpa. 
        Evaluate how well the following explanation covers the key points of the concept.
        
        Concept to explain: {concept['title']}
        Expected explanation: {concept['description']}
        
        User's current explanation: {user_answer}
        
        Previous conversation history:
        {chat_history}
        
        Please provide a score from 0 to 100% for this iteration's explanation quality.
        
        Format your response as:
        SCORE: [number between 0 and 100]"""
        
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert at evaluating explanations of academic concepts. Always provide scores between 0 and 100."},
                {"role": "user", "content": evaluation_prompt}
            ],
            temperature=0.7
        )
        
        # Parse the response
        result = response.choices[0].message.content
        
        # Extract score
        score = float(result.split("SCORE:")[1].split("\n")[0].strip())
        
        return score