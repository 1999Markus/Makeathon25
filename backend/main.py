from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS to allow requests from your React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "AI Hackathon API is running!"}


@app.post("/api/predict")
async def predict(data: dict):
    # Placeholder for your AI model integration
    return {"result": "AI prediction will go here", "input_received": data}
