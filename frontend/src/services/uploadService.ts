export const uploadAndPlayAudio = async ({
                                             audioFile,
                                             imageFile,
                                             conceptText
                                         }: {
    audioFile: File,
    imageFile: File,
    conceptText: string
}) => {
    // Create FormData with exact parameter names matching the backend
    const formData = new FormData();
    formData.append('concept_id', conceptText);
    formData.append('audio_file', audioFile);
    formData.append('notepad_image', imageFile);
    

    try {
        const response = await fetch('http://localhost:8000/api/ask-follow-up', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Upload failed: ${response.status}`, errorText);
            throw new Error(`Failed to upload: ${response.status} ${errorText}`);
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);

        // Clean up the object URL after the audio finishes playing
        audio.addEventListener('ended', () => {
            URL.revokeObjectURL(audioUrl);
            console.log('Audio playback finished, URL revoked');
        });

        // Optional: also revoke if there's an error playing
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
