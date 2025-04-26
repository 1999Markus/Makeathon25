// src/services/grandmaSpeechService.ts

export async function fetchGrandmaSpeech(concept: string): Promise<Blob> {
    const params = new URLSearchParams({ concept });
  
    const response = await fetch(`/grandmaspeech/?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'audio/wav',
      },
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch Grandma's speech: ${response.statusText}`);
    }
  
    const audioBlob = await response.blob();
  
    if (audioBlob.type !== 'audio/wav') {
      throw new Error('Received file is not a WAV audio file.');
    }
  
    return audioBlob;
  }
  