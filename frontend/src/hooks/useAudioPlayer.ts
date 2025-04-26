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

/*
EXAMPLE USAGE:
import { useGrandmaSpeech } from '@/hooks/useGrandmaSpeech';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

function ExampleComponent() {
  const { getSpeech, isLoading, error: fetchError } = useGrandmaSpeech();
  const { play, stop, isPlaying, error: playError } = useAudioPlayer();

  const handlePlay = async () => {
    const audioBlob = await getSpeech('banana pancakes');
    if (audioBlob) {
      play(audioBlob);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button onClick={handlePlay} disabled={isLoading || isPlaying}>
        {isLoading ? 'Fetching Grandma...' : isPlaying ? 'Playing...' : 'Play Grandma'}
      </button>
      {isPlaying && (
        <button onClick={stop} className="text-red-500 mt-2">
          Stop
        </button>
      )}
      {fetchError && <p className="text-red-600">Error fetching: {fetchError.message}</p>}
      {playError && <p className="text-red-600">Error playing: {playError.message}</p>}
    </div>
  );
}
*/