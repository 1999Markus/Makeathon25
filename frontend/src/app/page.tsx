"use client";

import { useState, useRef, useEffect } from "react";
import { DrawingCanvas } from "../components/DrawingCanvas";
import { GrandmaDisplay, type GrandmaEmotion } from "@/components/GrandmaDisplay";
import { LectureList } from "@/components/LectureList";
import Image from "next/image";
import { ArrowLeft } from 'lucide-react';
import { cn } from "@/lib/utils";

type AppState = 'welcome' | 'drawing';

interface Concept {
  id: string;
  title: string;
  description: string;
}

interface Lecture {
  id: string;
  title: string;
  concepts: Concept[];
}

// Dummy data for lectures and their concepts
const LECTURES: Lecture[] = [
  {
    id: '1',
    title: 'Machine Learning',
    concepts: [
      { id: '1-1', title: 'Linear Classification', description: 'How to separate data points with a line' },
      { id: '1-2', title: 'Gradient Descent', description: 'Finding the minimum of a function step by step' },
      { id: '1-3', title: 'Overfitting', description: 'When your model learns the noise in the data' },
    ]
  },
  {
    id: '3',
    title: 'Deep Learning',
    concepts: [
      { id: '3-1', title: 'Neural Networks', description: 'Brain-inspired learning machines' },
      { id: '3-2', title: 'Backpropagation', description: 'How neural networks learn from mistakes' },
      { id: '3-3', title: 'Activation Functions', description: 'Adding non-linearity to networks' },
    ]
  },
  {
    id: '4',
    title: 'Fundamentals of AI',
    concepts: [
      { id: '4-1', title: 'Search Algorithms', description: 'Finding paths in a maze of possibilities' },
      { id: '4-2', title: 'Expert Systems', description: 'Making decisions based on rules' },
      { id: '4-3', title: 'Game Theory', description: 'Strategic decision making' },
    ]
  },
  {
    id: '6',
    title: 'Computer Vision',
    concepts: [
      { id: '6-1', title: 'Convolution', description: 'Finding patterns in images' },
      { id: '6-2', title: 'Pooling', description: 'Summarizing image features' },
      { id: '6-3', title: 'Object Detection', description: 'Finding things in images' },
    ]
  },
  {
    id: '7',
    title: 'Natural Language Processing',
    concepts: [
      { id: '7-1', title: 'Tokenization', description: 'Breaking text into pieces' },
      { id: '7-2', title: 'Word Embeddings', description: 'Representing words as numbers' },
      { id: '7-3', title: 'Attention', description: 'Focusing on important words' },
    ]
  },
  {
    id: '8',
    title: 'Reinforcement Learning',
    concepts: [
      { id: '8-1', title: 'Q-Learning', description: 'Learning from rewards and punishments' },
      { id: '8-2', title: 'Policy Gradients', description: 'Learning how to act directly' },
      { id: '8-3', title: 'Exploration vs Exploitation', description: 'Trying new things vs sticking to what works' },
    ]
  },
];

export default function Home() {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [grandmaEmotion, setGrandmaEmotion] = useState<GrandmaEmotion>('happy');
  const [isConceptsPanelOpen, setIsConceptsPanelOpen] = useState(false);
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [taskProgress, setTaskProgress] = useState<number>(0);

  // Ref for the panel to handle click outside
  const conceptsPanelRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isConceptsPanelOpen &&
          conceptsPanelRef.current &&
          !conceptsPanelRef.current.contains(event.target as Node) &&
          toggleButtonRef.current &&
          !toggleButtonRef.current.contains(event.target as Node)) {
        setIsConceptsPanelOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isConceptsPanelOpen]);

  const handleLectureSelect = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setSelectedConcept(lecture.concepts?.[0] || null);
    setAppState('drawing');
  };

  const handleConceptSelect = (concept: Concept) => {
    setSelectedConcept(concept);
    setIsConceptsPanelOpen(false);
  };

  // --- Concept Navigation Logic ---
  const currentConceptIndex = selectedLecture?.concepts.findIndex(c => c.id === selectedConcept?.id) ?? -1;
  const totalConcepts = selectedLecture?.concepts.length ?? 0;

  const handleNextConcept = () => {
    if (!selectedLecture || totalConcepts <= 1 || currentConceptIndex === -1) return;
    const nextIndex = (currentConceptIndex + 1) % totalConcepts;
    setSelectedConcept(selectedLecture.concepts[nextIndex]);
  };

  const handlePreviousConcept = () => {
    if (!selectedLecture || totalConcepts <= 1 || currentConceptIndex === -1) return;
    const prevIndex = (currentConceptIndex - 1 + totalConcepts) % totalConcepts;
    setSelectedConcept(selectedLecture.concepts[prevIndex]);
  };

  const canNavigateConcepts = totalConcepts > 1;
  // --- End Concept Navigation Logic ---

  if (appState === 'welcome') {
    return (
      <div className="min-h-screen bg-[#e6f7ff] p-8 flex items-center justify-center relative">
        {/* Logo */}
        <div className="absolute top-8 right-8 w-36 h-36">
          <Image
            src="/opa_ai_logo.png"
            alt="OPA AI Logo"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        
        <div className="max-w-6xl w-full flex items-center gap-8">
          {/* Left side with Grandpa */}
          <div className="w-[400px] h-[400px] relative flex-shrink-0">
            <Image
              src="/a_opa_veryhappy_.png"
              alt="Very Happy Grandpa"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          
          {/* Right side with speech bubble and lecture list */}
          <div className="flex-1 flex flex-col gap-8">
            {/* Speech Bubble */}
            <div className="relative bg-white p-6 rounded-3xl shadow-lg">
              <div className="absolute left-0 top-1/2 -translate-x-4 -translate-y-1/2 w-8 h-8 bg-white transform rotate-45" />
              <p className="text-2xl font-handwriting relative z-10">
                Welcome back! Please choose a lecture you want to explain to me today.
              </p>
            </div>

            {/* Lecture List */}
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <div className="grid grid-cols-2 gap-4">
                {LECTURES.map((lecture) => (
                  <button
                    key={lecture.id}
                    onClick={() => handleLectureSelect(lecture)}
                    className="w-full bg-[#4285f4] hover:bg-[#3b78e7] text-white text-xl font-handwriting py-4 px-4 rounded-2xl shadow-lg transform transition-transform hover:scale-105 text-center"
                  >
                    {lecture.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'drawing') {
    return (
      <div className="h-screen bg-[#e6f7ff] flex overflow-hidden relative">
        {/* Logo */}
        <div className="absolute top-8 right-8 w-36 h-36 z-50">
          <Image
            src="/opa_ai_logo.png"
            alt="OPA AI Logo"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-8">
          {/* Back Navigation */}
          <button
            onClick={() => {
              setAppState('welcome');
              setIsDrawingEnabled(false);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-handwriting text-xl"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to lectures
          </button>

          {/* Header and New Overview Box Container - Moved higher */}
          <div className="relative mt-4">
            {/* Existing Header (Lecture Title) */}
            <div className="flex items-center justify-between">
              <div className="text-gray-600 font-handwriting">
                {selectedLecture?.title || "Lecture"}
              </div>
            </div>

            {/* Concept Overview Box (Top Middle) - With Navigation */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] bg-white p-6 rounded-2xl shadow-lg flex items-center gap-4 z-20">
              <button 
                onClick={handlePreviousConcept} 
                disabled={!canNavigateConcepts} 
                className="p-1 text-purple-600 hover:text-purple-800 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-center flex-1">
                <div className="text-xs text-gray-500 font-sans mb-1">{selectedLecture?.title || "Lecture"}</div>
                <div className="font-handwriting text-lg text-[#4285f4]">
                  {selectedConcept?.title || "Concept"}
                </div>
              </div>
              <button 
                onClick={handleNextConcept} 
                disabled={!canNavigateConcepts} 
                className="p-1 text-purple-600 hover:text-purple-800 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col justify-center items-center relative">
            {/* Left Side - Speech Bubble */}
            <div className="absolute top-20 left-5 w-[400px] z-20">
              <div className="relative bg-white p-8 rounded-3xl shadow-lg">
                {/* Speech bubble tail pointing right */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 w-6 h-6 bg-white transform -translate-x-3 rotate-45" />
                <div className="relative z-10">
                  <p className="text-xl font-handwriting mt-2">
                    Please explain the concept of {selectedConcept?.title.toLowerCase() || 'this concept'} to me
                  </p>
                </div>
              </div>
            </div>

            {/* Drawing Area Container */}
            <div className="relative flex flex-col items-center">
              {/* Grandpa Image */}
              <div className="absolute top-[20px] left-1/2 -translate-x-1/2 w-[700px] h-[300px] z-10">
                <div className="relative w-full h-full">
                  <Image
                    src="/a_opa_mediumhappy.png"
                    alt="Grandpa leaning forward"
                    fill
                    style={{ 
                      objectFit: 'contain',
                      objectPosition: 'center bottom'
                    }}
                    priority
                  />
                </div>
              </div>

              {/* Drawing Canvas and Controls */}
              <div className="w-[900px] mx-auto mt-[300px] relative flex items-center">
                <div className="flex-1">
                  {!isDrawingEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg z-30">
                      <button
                        onClick={() => setIsDrawingEnabled(true)}
                        className="bg-[#4285f4] hover:bg-[#3b78e7] text-white text-xl font-handwriting py-4 px-8 rounded-2xl shadow-lg transform transition-transform hover:scale-105 text-center"
                      >
                        Start explaining to grandpa
                      </button>
                    </div>
                  )}
                  <DrawingCanvas 
                    isEnabled={isDrawingEnabled}
                    onStart={() => {}}
                    onCancel={() => {
                      setIsDrawingEnabled(false);
                    }}
                    onDone={() => {
                      setIsDrawingEnabled(false);
                      setAppState('welcome');
                    }}
                  />
                </div>

                {/* Progress Bar - Positioned between canvas and right edge */}
                <div className="absolute right-[-100px] top-[20px] bottom-[20px] w-20 bg-white/80 backdrop-blur-sm shadow-lg flex flex-col items-center justify-center p-4 rounded-2xl">
                  <div className="flex-1 w-3 bg-gray-100 rounded-full relative overflow-hidden">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#4285f4]/20 to-transparent" />
                    {/* Progress bar */}
                    <div 
                      className="absolute bottom-0 w-3 bg-gradient-to-t from-[#4285f4] to-[#34a853] rounded-full transition-all duration-500"
                      style={{ height: `${taskProgress}%` }}
                    />
                    {/* Energy pulse effect */}
                    <div 
                      className="absolute bottom-0 w-3 h-1 bg-[#34a853] animate-pulse"
                      style={{ bottom: `${taskProgress}%` }}
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <span className="text-xl font-handwriting text-[#4285f4]">{taskProgress}%</span>
                    <p className="text-xs text-gray-500 mt-1 font-sans">complete</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Button for Concepts Panel */}
        <button
          ref={toggleButtonRef}
          onClick={() => setIsConceptsPanelOpen(!isConceptsPanelOpen)}
          className={cn(
            "fixed right-0 top-1/2 -translate-y-1/2 bg-[#4285f4] text-white p-2 rounded-l-xl transition-transform z-20",
            isConceptsPanelOpen && "translate-x-[300px]"
          )}
        >
          <ArrowLeft className={cn(
            "w-6 h-6 transition-transform",
            isConceptsPanelOpen && "rotate-180"
          )} />
        </button>

        {/* Right Side Panel - Concepts */}
        <div
          ref={conceptsPanelRef}
          className={cn(
            "fixed right-0 top-0 h-screen w-[300px] bg-white shadow-lg flex flex-col transition-transform duration-300 z-30",
            isConceptsPanelOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="p-4 bg-[#4285f4] text-white">
            <h2 className="font-handwriting text-xl text-center">Choose what to explain</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-2">
              {selectedLecture?.concepts.map((concept) => (
                <button
                  key={concept.id}
                  onClick={() => handleConceptSelect(concept)}
                  className={cn(
                    "text-left p-3 rounded-lg transition-colors",
                    selectedConcept?.id === concept.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-50 hover:bg-gray-100"
                  )}
                >
                  <h3 className="text-lg font-handwriting mb-0.5">{concept.title}</h3>
                  <p className={cn(
                    "text-sm",
                    selectedConcept?.id === concept.id
                      ? "text-blue-50"
                      : "text-gray-600"
                  )}>
                    {concept.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
