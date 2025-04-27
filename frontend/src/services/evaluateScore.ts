export async function evaluateExplanation(conceptId: string): Promise<number> {
    const formData = new FormData();
    formData.append('concept_id', conceptId);

    try {
        const response = await fetch('http://localhost:8000/api/evaluate', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Evaluation failed:', errorText);
            throw new Error(`Failed to evaluate: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('Evaluation response:', data);

        return data.score; // Return the score as number
    } catch (error) {
        console.error('Error during evaluation:', error);
        throw error;
    }
}