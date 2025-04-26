"use client";

import { useState } from "react";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { GrandmaDisplay, type GrandmaEmotion } from "@/components/GrandmaDisplay";
import { LectureList } from "@/components/LectureList";
import Image from "next/image";

type AppState = 'welcome' | 'lectureSelect' | 'drawing';

interface Lecture {
  id: string;
  title: string;
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [grandmaEmotion, setGrandmaEmotion] = useState<GrandmaEmotion>('happy');

  const handleLectureSelect = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setAppState('drawing');
  };

  if (appState === 'welcome') {
    return (
      <div className="min-h-screen bg-[#e6f7ff] p-8 flex items-center justify-center">
        <div className="max-w-4xl w-full flex items-start">
          {/* Left side with Grandma */}
          <div className="w-[400px] h-[400px] relative flex-shrink-0">
            <Image
              src="/happy_grandma.png"
              alt="Happy Grandma"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          
          {/* Right side with speech bubble and button */}
          <div className="flex-1 flex flex-col gap-8 ml-4">
            {/* Speech Bubble */}
            <div className="relative bg-white p-6 rounded-3xl shadow-lg mt-8">
              <div className="absolute left-0 top-1/2 -translate-x-4 -translate-y-1/2 w-8 h-8 bg-white transform rotate-45" />
              <p className="text-3xl font-handwriting relative z-10">
                Welcome back my dear. Let's get it started!
              </p>
            </div>

            {/* Button */}
            <button
              onClick={() => setAppState('lectureSelect')}
              className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-2xl font-handwriting py-4 px-8 rounded-2xl shadow-lg transform transition-transform hover:scale-105 w-full text-center"
            >
              Start explaining to your granny
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'lectureSelect') {
    return (
      <div className="min-h-screen bg-[#e6f7ff] p-8 flex">
        <div className="w-[400px] h-[400px] relative flex-shrink-0">
          <Image
            src="/happy_grandma.png"
            alt="Happy Grandma"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        
        <div className="flex-1 ml-4">
          <LectureList onLectureSelect={handleLectureSelect} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <div className="max-w-6xl w-full text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">
          {selectedLecture?.title || "Concept to Explain"}
        </h1>
      </div>
      
      <div className="flex gap-8 justify-center items-start w-full max-w-6xl">
        <div className="flex-1">
          <DrawingCanvas 
            isEnabled={true}
            onStart={() => {}}
            onCancel={() => setAppState('lectureSelect')}
          />
        </div>
        
        <div className="w-[300px] flex flex-col">
          <div className="h-[45px]" />
          <GrandmaDisplay 
            emotion={grandmaEmotion}
            onEmotionChange={setGrandmaEmotion}
          />
        </div>
      </div>
    </div>
  );
}
