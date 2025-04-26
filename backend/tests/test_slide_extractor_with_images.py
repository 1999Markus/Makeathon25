from app.slide_extractor_with_images import extract_key_concepts_and_generate_qa
import os
from pathlib import Path

def main():
    # Get all PDF files from course_content directory
    course_content_dir = Path("course_content")
    pdf_files = list(course_content_dir.glob("*.pdf"))
    
    print(f"Found {len(pdf_files)} PDF files to process:")
    for pdf_file in pdf_files:
        print(f"- {pdf_file}")
    
    print("\nStarting PDF analysis...")
    for pdf_file in pdf_files:
        try:
            print(f"\nProcessing: {pdf_file}")
            qa_pairs = extract_key_concepts_and_generate_qa(pdf_file)
            print(f"\nGenerated Q&A pairs for {pdf_file.name}:")
            print(qa_pairs)
        except Exception as e:
            print(f"Error processing {pdf_file}: {str(e)}")

if __name__ == "__main__":
    main() 