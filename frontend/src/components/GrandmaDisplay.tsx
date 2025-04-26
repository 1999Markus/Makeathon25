import React from 'react';
import Image from 'next/image';

export type GrandmaEmotion = 'happy' | 'neutral' | 'sad';

interface GrandmaDisplayProps {
  emotion: GrandmaEmotion;
  onEmotionChange: (emotion: GrandmaEmotion) => void;
}

export function GrandmaDisplay({ emotion, onEmotionChange }: GrandmaDisplayProps) {
  const emotions: GrandmaEmotion[] = ['happy', 'neutral', 'sad'];
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[300px] h-[300px] mb-6">
        <Image
          src={`/${emotion}_grandma.png`}
          alt={`Grandma feeling ${emotion}`}
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
      
      <div className="flex flex-col gap-2">
        <p className="text-center font-medium mb-2">Grandma's Mood</p>
        <div className="flex gap-2">
          {emotions.map((e) => (
            <button
              key={e}
              onClick={() => onEmotionChange(e)}
              className={`px-4 py-2 rounded capitalize ${
                emotion === e
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 