// src/hooks/useGrandmaSpeech.ts

import { useState, useCallback } from 'react';
import { fetchGrandmaSpeech } from '@/services/grandmaSpeechService';

export function useGrandmaSpeech() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getSpeech = useCallback(async (concept: string): Promise<Blob | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const audioBlob = await fetchGrandmaSpeech(concept);
      return audioBlob;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getSpeech,
    isLoading,
    error,
  };
}
