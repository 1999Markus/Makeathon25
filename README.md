# Makeathon25

Welcome to our Makeathon 2025 - OpenAI Open Track project repository!

## Project Description
*Solution:*
Opa AI is an interactive learning tool that helps users deeply understand their lecture content by explaining it to a simulated "grandpa."
The idea is based on two proven principles:
1. Active retrieval significantly boosts memory retention.
2. If you can explain a topic simply enough that even your grandpa would understand, you have truly mastered it.
   With Opa AI, users explain their lecture material in their own words. A curious grandpa character listens carefully and asks smart, challenging follow-up questions to test the user's understanding and encourage deeper thinking. 
Users interact with Opa AI through two input methods:
1. Speech: They explain concepts out loud, which is transcribed and analyzed using OpenAI’s speech-to-text models.
2. Drawing: They can draw diagrams on a canvas, which Opa AI interprets using vision models to understand and further question the explanation.
   To keep users engaged and motivated, Opa AI includes a gamification system:
* Users receive scores based on the clarity and depth of their explanations.
* Progress is tracked, and users are rewarded for improving their explanation skills over time.
  Opa AI turns learning into an active, fun, and motivating conversation, making it easier for users to truly master their study material.
  *Why did we decide to tackle this problem:*
  As students ourselves, we experienced firsthand how difficult it can be to truly understand and retain complex lecture content. Over time - and through a lot of trial and error - we discovered that active retrieval and simplifying explanations were the most effective ways to deeply learn and remember material.
  However, we realized that there was no intuitive tool that combined these methods in a fun and motivating way. We felt personally attached to solving this problem because having a tool like Opa AI earlier in our studies would have saved us a lot of frustration and made our learning journey much more effective and enjoyable.
  By building Opa AI, we wanted to create the tool we wished we had - one that supports students actively, challenges their understanding, and makes learning a more engaging and rewarding process.
## Team Members
- Markus Löhde
- Florian Fuchs
- Bente Wilhelm
- Niclas Schümann

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.8 or higher)
- pip (Python package manager)
- npm or yarn (Node package manager)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows, use: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   python main.py
   ```
   The backend server will run on http://localhost:8000

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   The frontend will be available at http://localhost:3000

## Technologies Used
- Frontend:
  - TypeScript
  - Tailwind CSS
  - React
  - (Next.js)
- Backend:
  - Python
  - FastAPI
  - Various AI and audio processing libraries

## Development
- The frontend and backend can be developed independently
- The backend API is documented at http://localhost:8000/docs when running
- Frontend development server includes hot-reloading
- Backend includes automatic API documentation with Swagger UI
