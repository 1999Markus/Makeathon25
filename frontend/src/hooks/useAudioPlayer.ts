// src/hooks/useAudioPlayer.ts

import { useState, useCallback, useRef } from 'react';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((blob: Blob) => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
    }

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.src = audioUrl;
    audio.load();

    audio.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((err) => {
        setError(err);
        URL.revokeObjectURL(audioUrl);
      });

    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = (e) => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
      setError(new Error('Failed to play audio.'));
    };

    audioRef.current = audio;
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  return {
    play,
    stop,
    isPlaying,
    error,
  };
}
