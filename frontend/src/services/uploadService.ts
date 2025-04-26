export const uploadAndPlayAudio = async ({ 
    audioFile,
    imageFile, 
    conceptText 
}: {
    audioFile: File,
    imageFile: File,
    conceptText: string
}) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('image', imageFile);
    formData.append('concept', conceptText);
  
    try {
      const response = await fetch('https://your-backend-endpoint.com/upload', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error('Failed to upload');
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
  