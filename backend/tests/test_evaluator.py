import os
import sys
# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.evaluator import Evaluator

def test_evaluator():
    # Initialize the evaluator
    evaluator = Evaluator()
    
    # Test data
    course_content = {
        "pdf_path": os.path.join("course_content", "ArtificialIntelligence_2_IntelligentAgents-2.pdf")
    }
    audio_file_path = "test_audio.mp3"  # You'll need to provide this file
    
    try:
        # Run the evaluation
        score, feedback = evaluator.evaluate(course_content, audio_file_path)
        
        # Print results
        print("\n=== Evaluation Results ===")
        print(f"Score: {score:.2f}")
        print("\nFeedback:")
        print(feedback)
        
    except Exception as e:
        print(f"Error during evaluation: {str(e)}")

if __name__ == "__main__":
    test_evaluator() 