import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings."""
    
    # API configuration
    app_name: str = "Learning Companion API"
    
    # OpenAI API key
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "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")
    
    # Audio and image file settings
    audio_dir: str = "audio_responses"
    temp_dir: str = "temp_files"
    
    # Create necessary directories
    def create_directories(self):
        """Create necessary directories if they don't exist."""
        os.makedirs(self.audio_dir, exist_ok=True)
        os.makedirs(self.temp_dir, exist_ok=True)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Initialize settings
settings = Settings()
settings.create_directories() 