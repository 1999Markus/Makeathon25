"use client";

import { useState, useRef, useEffect } from "react";
import { DrawingCanvas } from "../components/DrawingCanvas";
import Image from "next/image";
import { ArrowLeft } from 'lucide-react';
import { cn } from "@/lib/utils";
import { PDFUploader } from "@/components/PDFUploader";

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

export default function Home() {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [isConceptsPanelOpen, setIsConceptsPanelOpen] = useState(false);
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [taskProgress, setTaskProgress] = useState<number>(0);
  const [opaImage, setOpaImage] = useState<string>('a_opa_mediumhappy.png');
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [hasStartedExplaining, setHasStartedExplaining] = useState(false);
  const [opaQuestion, setOpaQuestion] = useState<string | null>(null);
  const [canvasKey, setCanvasKey] = useState<number>(0);

  const [lectures, setLectures] = useState<Lecture[]>([]);

  // Ref for the panel to handle click outside
  const conceptsPanelRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Opa image options
  const opaImages = [
    { src: 'a_opa_mediumhappy.png', label: 'Happy' },
    { src: 'a_opa_mediumsad.png', label: 'Medium Sad' },
    { src: 'a_opa_sad.png', label: 'Sad' },
    { src: 'a_opa_veryhappy_.png', label: 'Very Happy' }
  ];

  // Function to handle switching opa image
  const handleOpaImageChange = (imageSrc: string) => {
    setOpaImage(imageSrc);
  };

  // Handle progress bar drag
  const handleProgressMouseDown = (e: React.MouseEvent) => {
    setIsDraggingProgress(true);
    updateProgressFromMouse(e);
  };

  const handleProgressMouseMove = (e: React.MouseEvent) => {
    if (isDraggingProgress) {
      updateProgressFromMouse(e);
    }
  };

  const handleProgressMouseUp = () => {
    setIsDraggingProgress(false);
  };

  const updateProgressFromMouse = (e: React.MouseEvent) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const height = rect.height;
    const offsetY = e.clientY - rect.top;
    
    // Calculate percentage (inverted because 100% is at the top)
    let percentage = 100 - (offsetY / height * 100);
    
    // Clamp between 0 and 100
    percentage = Math.max(0, Math.min(100, percentage));
    
    setTaskProgress(Math.round(percentage));
  };

  // Add global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingProgress(false);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

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

  // Automatically change Opa image based on progress percentage
  useEffect(() => {
    if (taskProgress <= 25) {
      setOpaImage('a_opa_sad.png');
    } else if (taskProgress <= 50) {
      setOpaImage('a_opa_mediumsad.png');
    } else if (taskProgress <= 90) {
      setOpaImage('a_opa_mediumhappy.png');
    } else {
      setOpaImage('a_opa_veryhappy_.png');
    }
  }, [taskProgress]);

  useEffect(() => {
    async function fetchConcepts() {
      let concepts: Concept[];
      try {
        const response = await fetch('http://localhost:8000/api/get-key-concepts', {
          method: 'GET',
          headers: {
              'Accept': 'application/json',
          },
        });
        const conceptsFromBackend = await response.json();
        if (response.ok) {
          concepts = conceptsFromBackend.map((c: any, index: number) => ({
            id: c.id ?? `concept-${index}`,
            title: c.concept ?? "Untitled Concept",
            description: c.answer ?? "No description available",
          }));
        } else {
          concepts = [{id: '1', title: "No Concepts", description: "No text available."}]
        }

      } catch (error) {
        concepts = [{id: '1', title: "No Concepts", description: "No text available."}]
        console.error('Error fetching concepts:', error);
      }
      const lecturesData: Lecture[] = [
        { id: '1', title: 'Machine Learning', concepts },
        { id: '3', title: 'Deep Learning', concepts },
        { id: '4', title: 'Fundamentals of AI', concepts },
        { id: '6', title: 'Computer Vision', concepts },
        { id: '7', title: 'Natural Language Processing', concepts },
        { id: '8', title: 'Reinforcement Learning', concepts },
      ];

      setLectures(lecturesData);
    }

    fetchConcepts();
  }, []);

  const handleLectureSelect = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setSelectedConcept(lecture.concepts?.[0] || null);

    setAppState('drawing');
    setOpaQuestion(null);
    setHasStartedExplaining(false);
  };

  const handleConceptSelect = (concept: Concept) => {
    setSelectedConcept(concept);
    setIsConceptsPanelOpen(false);
    setOpaQuestion(null);
    setHasStartedExplaining(false);
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

  // Array von möglichen Fragen, die Opa stellen kann
  const followUpQuestions = [
    "Could you explain that part again?",
    "I'm not sure I understand. Can you clarify?",
    "That's interesting! Can you give me more details?",
    "How does this relate to real-world applications?",
    "Can you explain it in a different way?",
    "What happens if we change one of the parameters?",
    "Is there an example that would make this clearer?",
    "Why is this concept important?",
    "How does this connect to what we discussed earlier?",
    "Could you draw a specific example of this?"
  ];

  if (appState === 'welcome') {
    return (
      <div className="min-h-screen bg-[#e6f7ff] p-8 relative">
        {/* Logo */}
        <div className="absolute top-0 right-8 w-36 h-36">
          <Image
            src="/opa_ai_logo.png"
            alt="OPA AI Logo"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
          
        {/* Sprechblase - absolut positioniert */}
        <div className="absolute top-60 left-1/2 -translate-x-[580px] bg-white p-6 rounded-3xl shadow-lg max-w-[350px] min-h-[150px] flex items-center z-20">
          <div className="absolute left-full top-1/3 -translate-y-1/2 w-8 h-8 bg-white transform -translate-x-4 rotate-45" />
          <p className="text-xl relative z-10">
            Welcome back, my dear! Choose a lecture you want to explain to me.
          </p>
        </div>
        
        {/* Opa - absolut positioniert */}
        <div className="absolute top-20 right-1/2 translate-x-[250px] w-[500px] h-[470px] z-10">
          <style jsx>{`
            @keyframes breathing {
              0% { transform: scale(1.000); }
              40% { transform: scale(1.025); }
              60% { transform: scale(1.025); }
              100% { transform: scale(1.000); }
            }
            
            @keyframes eyeMovement {
              0% { transform: translate(0px, 0px); }
              20% { transform: translate(3px, -3px); }
              40% { transform: translate(4px, 0px); }
              60% { transform: translate(3px, 3px); }
              80% { transform: translate(-3px, 2px); }
              100% { transform: translate(0px, 0px); }
            }
            
            .animated-grandpa {
              animation: breathing 3s ease-in-out infinite;
              transform-origin: center bottom;
            }
            
            .animated-eyes {
              position: absolute;
              width: 120px;
              height: 36px;
              left: calc(50% - 5px);
              top: 180px;
              animation: eyeMovement 4.5s ease-in-out infinite;
            }
          `}</style>
          
          <div className="relative w-full h-full animated-grandpa">
            <Image
              src="/a_opa_veryhappy_.png"
              alt="Very Happy Grandpa"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
            
            {/* Invisible element for eye animation */}
            <div className="animated-eyes" />
          </div>
        </div>

        {/* Lecture List - absolut positioniert */}
        <div className="absolute top-[480px] left-1/2 -translate-x-1/2 bg-white rounded-3xl shadow-lg p-6 w-[900px] z-30">
          <div className="grid grid-cols-2 gap-4">
            {lectures.map((lecture) => (
              <button
                key={lecture.id}
                onClick={() => handleLectureSelect(lecture)}
                className="w-full bg-[#4285f4] hover:bg-[#3b78e7] text-white text-xl py-4 px-4 rounded-2xl shadow-lg transform transition-transform hover:scale-105 text-center"
              >
                {lecture.title}
              </button>
            ))}
          </div>
          
          {/* PDF Upload-Bereich */}
          <div className="mt-4 p-2 border-t border-gray-200 pt-3">
            <h3 className="text-lg mb-2 text-center text-gray-700">Upload New Lecture Slides</h3>
            <div className="h-16 relative">
              <PDFUploader 
                onUploadSuccess={(message) => {
                  alert(`Upload successful: ${message}`);
                  // Here you can perform additional actions after successful upload
                }}
                onUploadError={(error) => {
                  alert(`Upload failed: ${error}`);
                  // Error handling
                }}
              />
              
              <div className="mt-1 text-center text-xs text-gray-500">
                Drag and drop your PDF files here to upload
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
        <div className="absolute top-0 right-8 w-36 h-36 z-10">
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
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to lectures
          </button>

          {/* Header and New Overview Box Container - Moved higher */}
          <div className="relative mt-4">
            {/* Existing Header (Lecture Title) */}
            <div className="flex items-center justify-between">
              <div className="text-gray-600">
                {selectedLecture?.title || "Lecture"}
              </div>
            </div>

            {/* Concept Overview Box (Top Middle) - With Navigation */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[300px] bg-white py-3 px-6 rounded-2xl shadow-lg flex items-center gap-4 z-20">
              <button 
                onClick={handlePreviousConcept} 
                disabled={!canNavigateConcepts} 
                className="p-1 text-purple-600 hover:text-purple-800 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-center flex-1">
                <div className="text-xs text-gray-500 font-sans">{selectedLecture?.title || "Lecture"}</div>
                <div className="font-handwriting text-lg text-[#4285f4] leading-tight">
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
                  <p className="text-lg mt-2">
                    {opaQuestion ? opaQuestion : 
                      `Please explain the concept of ${selectedConcept?.title.toLowerCase() || 'this concept'} to me`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Drawing Area Container */}
            <div className="relative flex flex-col items-center">
              {/* Grandpa Image with Animation */}
              <div className={`absolute ${opaImage === 'a_opa_veryhappy_.png' ? 'top-[-0px]' : 'top-[20px]'} left-1/2 -translate-x-1/2 w-[700px] h-[300px] z-10`}>
                <style jsx>{`
                  @keyframes breathing {
                    0% { transform: scale(1.000); }
                    40% { transform: scale(1.025); }
                    60% { transform: scale(1.025); }
                    100% { transform: scale(1.000); }
                  }
                  
                  @keyframes eyeMovement {
                    0% { transform: translate(0px, 0px); }
                    20% { transform: translate(3px, -3px); }
                    40% { transform: translate(4px, 0px); }
                    60% { transform: translate(3px, 3px); }
                    80% { transform: translate(-3px, 2px); }
                    100% { transform: translate(0px, 0px); }
                  }
                  
                  .animated-grandpa {
                    animation: breathing 3s ease-in-out infinite;
                    transform-origin: center bottom;
                  }
                  
                  .animated-eyes {
                    position: absolute;
                    width: 100px;
                    height: 30px;
                    left: calc(50% - 5px);
                    top: 145px;
                    animation: eyeMovement 4.5s ease-in-out infinite;
                  }
                `}</style>
                
                <div className="relative w-full h-full animated-grandpa">
                  <Image
                    src={`/${opaImage}`}
                    alt="Grandpa"
                    fill
                    style={{ 
                      objectFit: 'contain',
                      objectPosition: 'center bottom'
                    }}
                    priority
                  />
                  
                  {/* Invisible element for eye animation */}
                  <div className="animated-eyes" />
                </div>
              </div>
              
              {/* Opa Image Selector Buttons */}
              <div className="absolute top-[80px] right-[20px] flex flex-col gap-2 z-20">
                {opaImages.map((image) => (
                  <button
                    key={image.src}
                    onClick={() => handleOpaImageChange(image.src)}
                    className={`p-2 rounded-full ${opaImage === image.src ? 'bg-[#4285f4] text-white' : 'bg-white text-gray-600'} shadow-md hover:scale-105 transition-all`}
                    title={`Switch to ${image.label} Grandpa`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full bg-cover bg-center" 
                      style={{ backgroundImage: `url('/${image.src}')` }}
                    />
                  </button>
                ))}
              </div>

              {/* Drawing Canvas and Controls */}
              <div className="w-[900px] mx-auto mt-[300px] relative flex items-center">
                <div className="flex-1">
                  {!isDrawingEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg z-30">
                      <button
                        onClick={() => {
                          setIsDrawingEnabled(true);
                          // Only reset the question when starting to explain a new concept, not when continuing
                          if (!hasStartedExplaining && !opaQuestion) {
                            setOpaQuestion(null);
                          }
                        }}
                        className="bg-[#4285f4] hover:bg-[#3b78e7] text-white text-lg py-4 px-8 rounded-lg shadow-lg transform transition-transform hover:scale-105"
                      >
                        {hasStartedExplaining || opaQuestion ? 'Continue explaining to grandpa' : 'Start explaining to grandpa'}
                      </button>
                    </div>
                  )}
                  <DrawingCanvas 
                    key={`drawing-${selectedConcept?.id}-${canvasKey}`}
                    isEnabled={isDrawingEnabled}
                    onStart={() => {
                      setHasStartedExplaining(true);
                    }}
                    onCancel={() => {
                      setIsDrawingEnabled(false);
                    }}
                    onDone={() => {
                      setIsDrawingEnabled(false);
                      // Zufällige Rückfrage vom Opa auswählen
                      const randomQuestionIndex = Math.floor(Math.random() * followUpQuestions.length);
                      setOpaQuestion(followUpQuestions[randomQuestionIndex]);
                    }}
                    concept={selectedConcept?.id || '1'}
                  />
                </div>

                {/* Progress Bar - Positioned between canvas and right edge */}
                <div 
                  className="absolute right-[-100px] top-0 h-full w-20 bg-white/80 backdrop-blur-sm shadow-lg flex flex-col items-center justify-center p-4 rounded-2xl"
                  onMouseMove={handleProgressMouseMove}
                  onMouseUp={handleProgressMouseUp}
                >
                  <div 
                    className="flex-1 w-3 bg-gray-100 rounded-full relative overflow-hidden cursor-pointer"
                    ref={progressBarRef}
                    onMouseDown={handleProgressMouseDown}
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#ff4d4d]/20 to-transparent" />
                    {/* Progress bar */}
                    <div 
                      className="absolute bottom-0 w-3 rounded-full transition-all duration-300"
                      style={{ 
                        height: `${taskProgress}%`,
                        background: `linear-gradient(to top, rgb(255, 0, 0), rgb(${255 - (taskProgress * 2.55)}, ${taskProgress * 2.55}, 0))`
                      }}
                    />
                    {/* Progress indicator */}
                    <div 
                      className={`absolute w-5 h-5 -left-1 rounded-full shadow-md border-2 border-white transition-all duration-300 ${isDraggingProgress ? 'scale-125' : ''}`}
                      style={{ 
                        bottom: `calc(${taskProgress}% - 10px)`,
                        backgroundColor: `rgb(${255 - (taskProgress * 2.55)}, ${taskProgress * 2.55}, 0)`
                      }}
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <span 
                      className="text-lg font-medium"
                      style={{ 
                        color: `rgb(${255 - (taskProgress * 2.55)}, ${taskProgress * 2.55}, 0)`
                      }}
                    >{taskProgress}%</span>
                    <p className="text-xs text-gray-500 mt-1 font-sans">complete</p>
                  </div>
                </div>

                {/* Add the Next Concept button below the drawing canvas */}
                {(hasStartedExplaining || opaQuestion) && canNavigateConcepts && !isDrawingEnabled && (
                  <div className="absolute bottom-[8px] left-1/2 transform -translate-x-1/2 z-50">
                    <button
                      onClick={() => {
                        // Reset drawing state
                        setIsDrawingEnabled(false);
                        // Reset all explanations and questions
                        setHasStartedExplaining(false);
                        setOpaQuestion(null);
                        // Force canvas to clear by incrementing the key
                        setCanvasKey(prev => prev + 1);
                        // Move to next concept
                        handleNextConcept();
                      }}
                      className="bg-[#4285f4] hover:bg-[#3b78e7] text-white py-3 px-6 rounded-lg shadow-md transform transition-transform hover:scale-105"
                    >
                      Next Concept
                    </button>
                  </div>
                )}
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
            <h2 className="text-lg text-center">Choose what to explain</h2>
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
                  <h3 className="text-lg mb-0.5">{concept.title}</h3>
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
