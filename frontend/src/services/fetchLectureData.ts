export interface KeyConcept {
    id: string;
    concept: string;
    question: string;
    answer: string;
}

export const fetchKeyConcepts = async (): Promise<KeyConcept[]> => {
    try {
        const response = await fetch('http://localhost:8000/api/get-key-concepts', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch key concepts');
        }

        const keyConcepts: KeyConcept[] = await response.json();
        console.log('Fetched key concepts:', keyConcepts);
        return keyConcepts;
    } catch (error) {
        console.error('Error fetching key concepts:', error);
        throw error;
    }
};
