import os
import sys
# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.slide_extractor import SlideExtractor

def test_slide_extraction():
    # Initialize the extractor with OpenAI
    extractor = SlideExtractor(use_openai=True)
    
    # Path to your test PDF
    pdf_path = os.path.join("course_content", "ArtificialIntelligence_2_IntelligentAgents-2.pdf")
    
    try:
        print("\n=== Testing Slide Extraction ===")
        print(f"Processing PDF: {pdf_path}")
        
        # Extract slides
        print("\nExtracting slides...")
        slides = extractor.extract_slides(pdf_path)
        print(f"Successfully extracted {len(slides)} slides")
        
        # Display information for first few slides
        for i, slide in enumerate(slides[:3]):  # Show first 3 slides
            print(f"\n--- Slide {slide['slide_num']} ---")
            print("Text content:")
            # Show first 200 characters of text
            text_preview = slide['text'][:200] + "..." if len(slide['text']) > 200 else slide['text']
            print(text_preview)
            print(f"Image data length: {len(slide['image_data'])} bytes")
        
        # Test Q&A generation with ALL slides
        print("\n=== Testing Q&A Generation ===")
        qa_collection = extractor.build_concept_qa(slides)  # Process all slides
        
        print(f"\nGenerated {len(qa_collection)} Q&A items")
        for i, qa_item in enumerate(qa_collection):
            print(f"\nSlide {qa_item['slide']}:")
            print(f"Visual Description: {qa_item['visual_description']}")
            if qa_item['image']:
                print(f"Supporting image saved to: {qa_item['image']}")
            print("-" * 80)
            
    except FileNotFoundError:
        print(f"Error: PDF file not found at {pdf_path}")
        print("Please make sure the PDF file exists in the specified location")
    except Exception as e:
        print(f"Error during slide extraction: {str(e)}")

if __name__ == "__main__":
    test_slide_extraction() 