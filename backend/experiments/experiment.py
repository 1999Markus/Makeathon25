from openai import OpenAI
import base64
import requests

def analyze_image(client: OpenAI) -> str:
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": "What's in this image?"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg",
                    },
                },
            ],
        }],
    )
    return response.choices[0].message.content

def generate_audio_response(client: OpenAI, image_analysis: str) -> None:
    url = "https://cdn.openai.com/API/docs/audio/alloy.wav"
    response = requests.get(url)
    response.raise_for_status()
    wav_data = response.content
    encoded_string = base64.b64encode(wav_data).decode('utf-8')

    completion = client.chat.completions.create(
        model="gpt-4o-audio-preview",
        modalities=["text", "audio"],
        audio={"voice": "alloy", "format": "wav"},
        messages=[
            {
                "role": "developer",
                "content": f"This is the analysis of an image that the user passed in: {image_analysis}"
            },
            {
                "role": "user",
                "content": [
                    { 
                        "type": "text",
                        "text": "Do you see a connection between what is in the image and the audio?"
                    },
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": encoded_string,
                            "format": "wav"
                        }
                    },
                ]
            },
        ]
    )

    wav_bytes = base64.b64decode(completion.choices[0].message.audio.data)
    with open("explanation.wav", "wb") as f:
        f.write(wav_bytes)

def main():
    client = OpenAI(api_key="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")
    
    image_analysis = analyze_image(client)
    print(image_analysis)
    
    generate_audio_response(client, image_analysis)

if __name__ == "__main__":
    main()
