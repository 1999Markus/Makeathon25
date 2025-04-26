import fitz  # PyMuPDF
import os
import base64
from openai import OpenAI
from dotenv import load_dotenv
import io
from PIL import Image
import numpy as np
import cv2

class SlideExtractor:
    def __init__(self, output_dir="relevant_illustrations", use_openai=False):
        """Initialize the SlideExtractor.
        
        Args:
            output_dir (str): Directory to save extracted images
            use_openai (bool): Whether to initialize OpenAI client for Q&A generation
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        self.client = None
        if use_openai:
            # Load environment variables
            load_dotenv()
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY not found in .env file")
            self.client = OpenAI(api_key=api_key)

    def extract_slides(self, pdf_path):
        """Extract text and images from each slide in the PDF."""
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
            
        doc = fitz.open(pdf_path)
        slides = []
        for i, page in enumerate(doc):
            # Get raw text
            raw_text = page.get_text("text")
            
            # Clean and filter the text
            text = self._clean_slide_text(raw_text)
            
            # Get the page as an image
            pix = page.get_pixmap(dpi=150)
            img_data = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            # Convert to numpy array for OpenCV processing
            img_np = np.array(img_data)
            
            # Find potential illustration regions
            illustration_regions = self._find_illustration_regions(img_np)
            
            # Store the original image and detected regions
            img_buffer = io.BytesIO()
            img_data.save(img_buffer, format="PNG")
            img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
            
            slides.append({
                "slide_num": i + 1, 
                "text": text, 
                "image_data": img_base64,
                "illustration_regions": illustration_regions
            })
        return slides

    def _clean_slide_text(self, text):
        """Clean and filter slide text to remove administrative information and focus on key concepts."""
        lines = text.split('\n')
        cleaned_lines = []
        
        # Patterns to filter out
        filter_patterns = [
            r'winter semester \d{4}/\d{2}',
            r'summer semester \d{4}',
            r'\d+ / \d+',  # Page numbers like "1 / 36"
            r'^\s*\d+\s*$',  # Single numbers (likely slide numbers)
            r'^[A-Za-zäöüßÄÖÜ\s]+$',  # Lines with only letters (likely headers)
            r'^[A-Za-zäöüßÄÖÜ\s]+\s+\d+$',  # Headers with numbers
            r'^\s*$',  # Empty lines
        ]
        
        import re
        for line in lines:
            # Skip if line matches any filter pattern
            if any(re.search(pattern, line, re.IGNORECASE) for pattern in filter_patterns):
                continue
                
            # Skip if line is too short (likely part of header/footer)
            if len(line.strip()) < 3:
                continue
                
            cleaned_lines.append(line)
        
        # Join the cleaned lines
        cleaned_text = '\n'.join(cleaned_lines)
        
        # Remove multiple consecutive empty lines
        cleaned_text = re.sub(r'\n\s*\n', '\n', cleaned_text)
        
        return cleaned_text.strip()

    def _find_illustration_regions(self, img_np):
        """Find potential illustration regions in the slide using image processing."""
        # Convert to grayscale
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        
        # Apply adaptive thresholding to find text and graphics
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                     cv2.THRESH_BINARY_INV, 11, 2)
        
        # Apply morphological operations to connect nearby components
        kernel = np.ones((3,3), np.uint8)  # Smaller kernel
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        regions = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Calculate various properties of the region
            area = w * h
            aspect_ratio = w / float(h)
            solidity = cv2.contourArea(contour) / area
            
            # Filter conditions for illustration regions
            min_width = 200  # Increased minimum width
            min_height = 200  # Increased minimum height
            min_area = 30000  # Increased minimum area
            max_area = img_np.shape[0] * img_np.shape[1] * 0.6  # Reduced maximum area to 60%
            
            # Check if the region meets our criteria for an illustration
            if (w > min_width and h > min_height and  # Size constraints
                min_area < area < max_area and  # Area constraints
                0.4 < aspect_ratio < 2.5 and  # Tighter aspect ratio constraints
                solidity > 0.4):  # Higher solidity requirement
                
                # Add minimal padding to the region
                padding = 10  # Reduced padding
                x = max(0, x - padding)
                y = max(0, y - padding)
                w = min(img_np.shape[1] - x, w + 2 * padding)
                h = min(img_np.shape[0] - y, h + 2 * padding)
                
                regions.append((x, y, w, h))
        
        # Sort regions by area (largest first)
        regions = sorted(regions, key=lambda r: r[2] * r[3], reverse=True)
        
        return regions

    def query_openai_vision(self, slide):
        """Query OpenAI's vision model to analyze the slide content."""
        if not self.client:
            raise RuntimeError("OpenAI client not initialized. Set use_openai=True in constructor.")

        response = self.client.chat.completions.create(
            model="gpt-4o",
            max_tokens=800,
            messages=[
                {"role": "system", "content": "You are an expert at analyzing lecture slides and identifying key visual content."},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""Analyze this lecture slide and determine if it contains important visual content:

Text:
{slide['text']}

Image:
Attached below.

Please answer the following:
1. Does this slide contain any graphs, diagrams, or important visual content? Answer YES or NO.
2. If YES, describe the type of visual content (e.g., graph, diagram, flowchart, etc.) and its purpose.
3. If the visual content is essential for understanding the key concepts, mention: 'Essential visual content attached.'

Return your result in plain text, starting directly with your answers."""
                        },
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{slide['image_data']}"}}
                    ]
                }
            ]
        )
        return response.choices[0].message.content

    def build_concept_qa(self, slides):
        """Build Q&A content from the extracted slides."""
        if not self.client:
            raise RuntimeError("OpenAI client not initialized. Set use_openai=True in constructor.")
            
        qa_collection = []
        # Create a text file to store all content
        content_file = os.path.join(self.output_dir, "slide_content.txt")
        
        with open(content_file, 'w', encoding='utf-8') as f:
            f.write("=== Slide Content and Illustrations ===\n\n")
            
            for slide in slides:
                print(f"Processing slide {slide['slide_num']}...")
                result = self.query_openai_vision(slide)
                
                if "YES" in result.upper():
                    # Only save the image if it's marked as essential visual content
                    img_path = None
                    if "Essential visual content attached" in result:
                        # Convert base64 image to PIL Image
                        img_data = base64.b64decode(slide['image_data'])
                        img = Image.open(io.BytesIO(img_data))
                        
                        # If we have detected illustration regions, crop the largest one
                        if slide['illustration_regions']:
                            # Sort regions by area (width * height)
                            regions = sorted(slide['illustration_regions'], 
                                          key=lambda r: r[2] * r[3], 
                                          reverse=True)
                            x, y, w, h = regions[0]  # Take the largest region
                            
                            # Add minimal padding
                            padding = 10  # Reduced padding
                            x = max(0, x - padding)
                            y = max(0, y - padding)
                            w = min(img.width - x, w + 2 * padding)
                            h = min(img.height - y, h + 2 * padding)
                            
                            # Crop the image
                            cropped_img = img.crop((x, y, x + w, y + h))
                            
                            # Save the cropped image
                            img_path = f"{self.output_dir}/slide_{slide['slide_num']}_illustration.png"
                            cropped_img.save(img_path)
                            print(f"Saved illustration from slide {slide['slide_num']}")
                        else:
                            # If no regions detected, save the whole slide
                            img_path = f"{self.output_dir}/slide_{slide['slide_num']}.png"
                            img.save(img_path)
                            print(f"Saved full slide {slide['slide_num']} (no regions detected)")
                    
                    # Extract the description of the visual content
                    lines = result.split('\n')
                    visual_description = ""
                    for line in lines:
                        if line.startswith('2.'):
                            visual_description = line[3:].strip()
                            break
                    
                    # Write content to file
                    f.write(f"\n=== Slide {slide['slide_num']} ===\n")
                    f.write(f"Text Content:\n{slide['text']}\n\n")
                    f.write(f"Visual Description:\n{visual_description}\n")
                    if img_path:
                        f.write(f"Illustration saved at: {img_path}\n")
                    f.write("-" * 80 + "\n")
                    
                    qa_collection.append({
                        "slide": slide['slide_num'],
                        "text": slide['text'],
                        "visual_description": visual_description,
                        "image": img_path
                    })
        
        print(f"\nAll content has been saved to: {content_file}")
        return qa_collection 