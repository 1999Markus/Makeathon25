from app.evaluator import Evaluator
import os

def main():
    # Initialize the evaluator
    evaluator = Evaluator()
    
    # Test with the AI agents PDF
    course_content = {
        "pdf_path": "course_content/ArtificialIntelligence_2_IntelligentAgents-2.pdf"
    }
    
    # Note: You'll need to provide an audio file path here
    audio_file_path = "path_to_your_audio_file.mp3"  # Replace with actual audio file path
    
    try:
        score, feedback = evaluator.evaluate(course_content, audio_file_path)
        print(f"\nEvaluation Score: {score}")
        print(f"\nFeedback:\n{feedback}")
    except Exception as e:
        print(f"Error during evaluation: {str(e)}")

if __name__ == "__main__":
    main() 