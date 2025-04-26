import openai
import fitz  # PyMuPDF
import os
import sys
import base64
from dotenv import load_dotenv
from pathlib import Path
from openai import OpenAI

# Load environment variables from .env file
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

# Check for OpenAI API key
if not os.getenv("OPENAI_API_KEY"):
    print("Error: OPENAI_API_KEY environment variable is not set.")
    print("Please check that your .env file in the backend directory contains the OPENAI_API_KEY variable.")
    sys.exit(1)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# List available models
print("Available models:")
models = client.models.list()
for model in models:
    print(f"- {model.id}")

def extract_text_and_images_from_pdf(file_path):
    """Extract text and images from a PDF."""
    doc = fitz.open(file_path)
    text = ""
    images = []

    for page_number, page in enumerate(doc):
        text += page.get_text()

        image_list = page.get_images(full=True)
        for img_index, img in enumerate(image_list):
            try:
                xref = img[0]
                pix = fitz.Pixmap(doc, xref)
                
                # Convert to RGB if necessary
                if pix.n > 4:  # CMYK
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                elif pix.n == 4:  # RGBA
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                elif pix.n < 3:  # Grayscale
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                
                image_data = pix.tobytes()
                images.append(image_data)
            except Exception as e:
                print(f"Warning: Could not process image {img_index} on page {page_number}: {str(e)}")
                continue

    return text, images

def generate_questions_answers(text, images=None, num_questions=10, model="gpt-4o"):
    """Use OpenAI API to generate question-answer pairs from text + optional images."""
    messages = [
        {"role": "system", "content": """You are an expert educational content analyzer that creates comprehensive question-answer pairs from slide decks.
Your task is to:
1. Identify ALL key concepts, subconcepts, and subcategories from the entire slide deck
2. For each concept, include ALL information from both text and illustrations
3. Give equal importance to text and visual information
4. Ensure NO information from any slide is lost
5. Provide detailed descriptions of ALL visual elements
6. Include ALL subcategories and their relationships
7. Number each Q&A pair sequentially
8. EXCLUDE slides with titles containing 'Tweedback' or 'Learning Outcomes'
9. Integrate examples directly into the concept explanations"""},
        {"role": "user", "content": []}
    ]

    # Add text content
    messages[1]["content"].append({
        "type": "text",
        "text": f"""
Analyze the following slide content and generate comprehensive question-answer pairs that cover ALL concepts, subconcepts, and subcategories.

Guidelines:
- Identify ALL key concepts, subconcepts, and subcategories
- Include ALL information from both text and illustrations
- Ensure NO information from any slide is lost
- Provide detailed descriptions of ALL visual elements
- Include ALL subcategories and their relationships
- Number each Q&A pair sequentially
- EXCLUDE slides with titles containing 'Tweedback' or 'Learning Outcomes'
- Integrate examples directly into the concept explanations

Text Content:
{text}

Output format for each Q&A pair:
1. Q: [Main concept question]
   A: [Comprehensive answer that includes:
      - Detailed explanation of the concept with integrated examples
      - ALL information from relevant illustrations
      - Detailed descriptions of ALL visual elements
      - ALL subcategories and their relationships
      - Context from related concepts
      - Any important visual information]

2. Q: [Next main concept]
   A: [Comprehensive answer with integrated examples and ALL subcategories]

Only return the numbered Q&A pairs, ensuring ALL information is included and ALL subcategories are covered, while excluding slides with titles containing 'Tweedback' or 'Learning Outcomes'.
"""
    })

    # Add images if available
    if images:
        for img_bytes in images:
            # Convert bytes to base64
            base64_image = base64.b64encode(img_bytes).decode('utf-8')
            messages[1]["content"].append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{base64_image}"
                }
            })

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.3,
        max_tokens=4000  # Increased token limit for more comprehensive output
    )

    return response.choices[0].message.content

def extract_key_concepts_and_generate_qa(file_path, num_questions=None):
    """Main method: Extracts text + images, sends to GPT-4 vision."""
    text, images = extract_text_and_images_from_pdf(file_path)
    qa_pairs = generate_questions_answers(text, images=images)
    
    # Save output to file
    output_dir = Path(__file__).resolve().parent.parent / "extracted_key_concepts"
    output_dir.mkdir(exist_ok=True)
    
    # Create filename based on PDF name
    pdf_name = Path(file_path).stem
    output_file = output_dir / f"{pdf_name}_qa.txt"
    
    with open(output_file, "w") as f:
        f.write(qa_pairs)
    
    print(f"\nOutput has been saved to: {output_file}")
    return qa_pairs

# Example usage:
if __name__ == "__main__":
    pdf_files = [
        "course_content/ArtificialIntelligence_2_IntelligentAgents-2.pdf",
        "course_content/Cloud Information Systems_2_foundations.pdf"
    ]
    
    for pdf_path in pdf_files:
        output = extract_key_concepts_and_generate_qa(pdf_path)
        
        # Save output to file
        output_dir = Path(__file__).resolve().parent.parent / "extracted_key_concepts"
        output_dir.mkdir(exist_ok=True)
        
        # Create filename based on PDF name
        pdf_name = Path(pdf_path).stem
        output_file = output_dir / f"{pdf_name}_qa.txt"
        
        with open(output_file, "w") as f:
            f.write(output)
        
        print(f"\nOutput has been saved to: {output_file}")
        print("\nGenerated Q&A pairs:")
        print(output)
