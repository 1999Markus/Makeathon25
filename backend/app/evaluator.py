from typing import Dict, Tuple, List, Optional
import os
from pathlib import Path
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
    
    def evaluate(self, 
                concept: Dict,
                chat_history: str) -> float:
        """
        Evaluate the user's overall understanding of a concept based on the conversation history.
        
        Args:
            concept (Dict): The concept being explained, containing 'title' and 'description' (expected answer).
            chat_history (str): The complete conversation history between the user (grandchild) and the AI (grandpa).
            
        Returns:
            float: A score between 0 and 100 representing the user's understanding demonstrated in the history.
        """
        
        # Prepare the evaluation prompt
        evaluation_prompt = f"""You are an AI evaluator assessing a student's understanding of a concept based on their conversation with their AI grandpa.
        
        Concept to explain: {concept['title']}
        Expected key points/explanation: {concept['description']}
        
        Conversation History (USER = grandchild, GRANDPA = AI):
        --- START HISTORY ---
        {chat_history}
        --- END HISTORY ---
        
        Based ONLY on the grandchild's (USER) contributions in the above Conversation History, evaluate how well they have demonstrated understanding of the key points in the Expected Explanation.
        Consider the entire history. Did the grandchild eventually cover the necessary points, even if prompted by the grandpa?
        
        Provide a score from 0 to 100% representing the overall understanding demonstrated by the grandchild throughout the conversation.
        A score of 100 means the grandchild fully explained all key aspects by the end of the conversation.
        A score of 0 means the grandchild showed no understanding of the key aspects.
        
        Format your response ONLY as:
        SCORE: [number between 0 and 100]"""
        
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert evaluator. Provide only the score as requested."}, # Simplified system message
                {"role": "user", "content": evaluation_prompt}
            ],
            temperature=0.5 # Slightly reduced temperature for more consistent scoring
        )
        
        # Parse the response
        result = response.choices[0].message.content.strip()
        
        # Extract score
        try:
            score_str = result.split("SCORE:")[1].strip()
            score = float(score_str)
            # Clamp score between 0 and 100
            score = max(0.0, min(100.0, score))
            print(f"Evaluator raw result: {result}, Parsed score: {score}") # Debug log
        except (IndexError, ValueError) as e:
            print(f"Error parsing score from response: '{result}'. Error: {e}")
            score = 0.0 # Default score on parsing error
        
        return score