export const uploadAndPlayAudio = async ({
                                             audioFile,
                                             imageFile,
                                             conceptText
                                         }: {
    audioFile: File,
    imageFile: File,
    conceptText: string
}) => {
    try {
        // Helper to read a file as Base64
        const readFileAsBase64 = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result as string;
                    // Remove the "data:*/*;base64," prefix
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        // Read both files
        const [audioBase64, imageBase64] = await Promise.all([
            readFileAsBase64(audioFile),
            readFileAsBase64(imageFile),
        ]);

        const payload = {
            concept_id: conceptText,
            audio_file: audioBase64,
            notepad: imageBase64,
        };

        console.log('Payload being sent:', payload);

        const response = await fetch('https://localhost:8000/api/ask-follow-up', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to upload');
        }

        const responseData = await response.json();

        console.log('Response received:', responseData);

        const audioBase64Response = responseData.audio_data; // depends on your backend response field
        const feedbackText = responseData.feedback; // depends on backend

        console.log('Feedback:', feedbackText);

        // Decode and play the audio
        const audioBlob = base64ToBlob(audioBase64Response, 'audio/mpeg'); // assuming it's mp3
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.addEventListener('ended', () => {
            URL.revokeObjectURL(audioUrl);
            console.log('Audio playback finished, URL revoked');
        });

        audio.addEventListener('error', () => {
            URL.revokeObjectURL(audioUrl);
            console.error('Error playing audio, URL revoked');
        });

        audio.play();
        console.log('Audio is playing!');

    } catch (error) {
        console.error('Error uploading or playing audio:', error);
    }
};

// Helper to convert base64 to Blob
const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let i = 0; i < byteCharacters.length; i += 1024) {
        const slice = byteCharacters.slice(i, i + 1024);
        const byteNumbers = new Array(slice.length);
        for (let j = 0; j < slice.length; j++) {
            byteNumbers[j] = slice.charCodeAt(j);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, {type: mimeType});
};