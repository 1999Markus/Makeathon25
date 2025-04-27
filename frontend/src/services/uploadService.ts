export const uploadAndPlayAudio = async ({
                                             audioFile,
                                             imageFile,
                                             conceptText,
                                             lastExplanation
                                         }: {
    audioFile: File,
    imageFile: File,
    conceptText: string,
    lastExplanation: boolean
}) => {
    const formData = new FormData();
    formData.append('concept_id', conceptText);
    formData.append('audio_file', audioFile);
    formData.append('notepad_image', imageFile);
    formData.append('last_explanation', String(lastExplanation));

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

        const { feedback, audio_data } = await response.json();

        console.log('Feedback:', feedback);

        const audioBlob = base64ToBlob(audio_data, 'audio/wav');
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.play();

        return feedback; // Optionally return feedback text if you want to display it elsewhere

    } catch (error) {
        console.error('Error uploading or playing audio:', error);
    }
};

// Utility: Convert base64 string to Blob
function base64ToBlob(base64: string, mimeType: string) {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: mimeType });
}
