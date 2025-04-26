export async function askFollowUp(conceptId: string, audioFile: File, imageFile: File): Promise<{ feedback: string; audioData: string }> {
  const formData = new FormData();
  formData.append('concept_id', conceptId);
  formData.append('audio_file', audioFile);
  formData.append('notepad_image', imageFile);

  const response = await fetch('http://localhost:8000/api/ask-follow-up', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to get follow-up response');
  }

  return response.json();
}

export async function calculateScore(conceptId: string, audioFile: File): Promise<{ score: number }> {
  const formData = new FormData();
  formData.append('concept_id', conceptId);
  formData.append('audio_file', audioFile);

  const response = await fetch('http://localhost:8000/api/calculate-score', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to calculate score');
  }

  return response.json();
} 