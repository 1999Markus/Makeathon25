"use client";

import { useState, useRef, useEffect } from "react";
import { DrawingCanvas } from "../components/DrawingCanvas";
import Image from "next/image";
import { ArrowLeft } from 'lucide-react';
import { cn } from "@/lib/utils";
import { PDFUploader } from "@/components/PDFUploader";
import {evaluateExplanation} from "@/services/evaluateScore";

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
  const [conceptExplanationCount, setConceptExplanationCount] = useState<number>(0);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [lectures, setLectures] = useState<Lecture[]>([]);

  // Ref for the panel to handle click outside
  const conceptsPanelRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

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

  // Aktualisiere die Opa-Bild-Anzeige basierend auf taskProgress
  useEffect(() => {
    if (showLoadingScreen) {
      // Während des Loading-Screens immer das "thinking" Bild anzeigen
      setOpaImage('a_opa_thinking.png');
    } else if (isRecordingAudio) {
      // Während der Audioaufnahme immer opa_listening anzeigen
      setOpaImage('a_opa_listening.png');
    } else if (taskProgress <= 25) {
      setOpaImage('a_opa_sad.png');
    } else if (taskProgress <= 50) {
      setOpaImage('a_opa_mediumsad.png');
    } else if (taskProgress <= 90) {
      setOpaImage('a_opa_mediumhappy.png');
    } else {
      setOpaImage('a_opa_veryhappy_.png');
    }
  }, [taskProgress, isRecordingAudio, showLoadingScreen]);

  // Zeige Konfetti, wenn der Score 95 oder höher ist
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    
    if (taskProgress >= 95) {
      // Konfetti anzeigen
      setShowConfetti(true);
      
      // Nach 5 Sekunden ausblenden
      timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
    } else {
      // Konfetti ausblenden, wenn der Score unter 95 fällt
      setShowConfetti(false);
    }
    
    // Timer bereinigen, wenn die Komponente unmounted wird
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
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
            id: c?.[0] ?? `${index}`,
            title: c?.[1] ?? "Untitled Concept",
            description: c?.[2] ?? "No description available",
          }));
        } else {
          concepts = [{ id: '1', title: "No Concepts", description: "No text available." }];
        }

      } catch (error) {
        concepts = [{id: '1', title: "No Concepts", description: "No text available."}]
        console.error('Error fetching concepts:', error);
      }
      const lecturesData: Lecture[] = [
        { id: '1', title: 'Machine Learning', concepts },
        { id: '3', title: 'Deep Learning', concepts },
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
    setConceptExplanationCount(0); // Reset concept count for new lecture
    setShowLoadingScreen(false); // Reset loading screen
  };

  const handleConceptSelect = (concept: Concept) => {
    setSelectedConcept(concept);
    setIsConceptsPanelOpen(false);
    setOpaQuestion(null);
    setHasStartedExplaining(false);
    setConceptExplanationCount(0); // Reset concept count for new concept
    setShowLoadingScreen(false); // Reset loading screen
  };

  // --- Concept Navigation Logic ---
  const currentConceptIndex = selectedLecture?.concepts.findIndex(c => c.id === selectedConcept?.id) ?? -1;
  const totalConcepts = selectedLecture?.concepts.length ?? 0;

  const handleNextConcept = () => {
    if (!selectedLecture || totalConcepts <= 1 || currentConceptIndex === -1) return;
    const nextIndex = (currentConceptIndex + 1) % totalConcepts;
    setSelectedConcept(selectedLecture.concepts[nextIndex]);
    // Reset explanation state when navigating to a new concept
    setHasStartedExplaining(false);
    setOpaQuestion(null);
    setConceptExplanationCount(0); // Reset concept count when changing concept
  };

  const handlePreviousConcept = () => {
    if (!selectedLecture || totalConcepts <= 1 || currentConceptIndex === -1) return;
    const prevIndex = (currentConceptIndex - 1 + totalConcepts) % totalConcepts;
    setSelectedConcept(selectedLecture.concepts[prevIndex]);
  };

  const canNavigateConcepts = totalConcepts > 1;
  // --- End Concept Navigation Logic ---

  // Array von möglichen Feedback-Nachrichten
  const feedbackMessages = [
    "Great job! I particularly liked how you explained the core concept in simple terms. That made it much easier for me to understand.",
    "Thank you for your explanation. I now understand the basic idea, though I still have some questions about the practical applications.",
    "That was very clear! The drawing really helped me visualize how this concept works in practice.",
    "I appreciate your patience. This was a difficult concept, but you broke it down nicely for me.",
    "Well done! Your explanation was structured and easy to follow. I especially liked your examples.",
    "Interesting explanation! I can see you have a good grasp of this topic. Maybe next time you could explain a bit more about why this is important?",
    "Thank you for your clear explanation. The way you connected this to real-world examples made it much more relatable for me."
  ];

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
            <h3 className="text-lg mb-2 text-center text-gray-700">Upload new lecture slides</h3>
            <div className="h-16 relative">
              <PDFUploader 
                onUploadSuccess={(message) => {
                  setLectures([...lectures, { id: '4', title: 'Fundamentals of AI', concepts: lectures[0].concepts }]);
                }}
                onUploadError={(error) => {
                  alert(`Upload failed: ${error}`);
                  // Error handling
                }}
              />
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
              setShowLoadingScreen(false); // Reset loading screen when going back to lectures
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to lectures
          </button>

          {/* Header and New Overview Box Container - Moved higher */}
          <div className="relative mt-4">
            {/* Existing Header (Lecture Title) - Ausgeblendet */}
            {/* <div className="flex items-center justify-between">
              <div className="text-gray-600">
                {selectedLecture?.title || "Lecture"}
              </div>
            </div> */}

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
            <div className="absolute top-20 left-5 w-[400px] z-50">
              <div className="relative bg-white p-8 rounded-3xl shadow-lg">
                {/* Speech bubble tail pointing right */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 w-6 h-6 bg-white transform -translate-x-3 rotate-45" />
                <div className="relative z-10">
                  <p className="text-lg mt-2">
                    {showingFeedback ? feedbackMessage : 
                      ((opaQuestion ? opaQuestion : 
                          `Please explain the concept of ${selectedConcept?.title.toLowerCase() || 'this concept'} to me`
                        )
                      )
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Drawing Area Container */}
            <div className="relative flex flex-col items-center">
              {/* Konfetti-Animation */}
              {showConfetti && (
                <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
                  {Array.from({ length: 50 }).map((_, i) => {
                    const colors = ['#ff577f', '#ff884b', '#ffd384', '#9999ff', '#4c9a52', '#6886c5', '#ffac4b'];
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const isCircle = Math.random() > 0.5;
                    const size = 5 + Math.random() * 10;
                    const left = Math.random() * 100;
                    const animationDuration = 3 + Math.random() * 3;
                    const delay = Math.random() * 2;
                    const startPosition = -50 - Math.random() * 100; // Starte oberhalb des sichtbaren Bereichs
                    
                    return (
                      <div 
                        key={i}
                        style={{
                          position: 'absolute',
                          left: `${left}%`,
                          top: `${startPosition}px`,
                          width: `${size}px`,
                          height: `${size}px`,
                          backgroundColor: color,
                          borderRadius: isCircle ? '50%' : '0',
                          opacity: 0.8,
                          transform: `rotate(${Math.random() * 360}deg)`,
                          animation: `confettiFall ${animationDuration}s linear forwards, confettiSway ${animationDuration/2}s ease-in-out infinite alternate`,
                          animationDelay: `${delay}s`,
                        }}
                      />
                    );
                  })}
                  
                  <style jsx global>{`
                    @keyframes confettiFall {
                      from { transform: translateY(0) rotate(0deg); }
                      to { transform: translateY(100vh) rotate(360deg); }
                    }
                    
                    @keyframes confettiSway {
                      from { margin-left: -25px; }
                      to { margin-left: 25px; }
                    }
                  `}</style>
                </div>
              )}
              
              {/* Grandpa Image with Animation */}
              <div className={`absolute ${opaImage === 'a_opa_veryhappy_.png' ? 'top-[-0px]' : 'top-[20px]'} left-1/2 -translate-x-1/2 w-[700px] h-[300px] z-50`}>
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
              
              {/* Drawing Canvas and Controls */}
              <div className="w-[900px] mx-auto mt-[300px] relative flex items-center">
                <div className="flex-1">
                  {!isDrawingEnabled && !showLoadingScreen && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                      {/* Halbdurchsichtiger Overlay für die Zeichenfläche */}
                      <div className="absolute inset-0 bg-black/50 rounded-3xl"></div>
                      
                      {conceptExplanationCount < 3 ? (
                        // Normal continue button when count < 3
                        <button
                          onClick={() => {
                            setIsDrawingEnabled(true);
                            // Only reset the question when starting to explain a new concept, not when continuing
                            if (!hasStartedExplaining && !opaQuestion) {
                              setOpaQuestion(null);
                            }
                          }}
                          className="bg-[#4285f4] hover:bg-[#3b78e7] text-white text-lg py-4 px-8 rounded-lg shadow-lg transform transition-transform hover:scale-105 z-10 mb-4"
                        >
                          {hasStartedExplaining || opaQuestion ? 'Continue explaining to grandpa' : 'Start explaining to grandpa'}
                        </button>
                      ) : showingFeedback ? (
                        // Button to proceed after feedback
                        <button
                          onClick={() => {
                            setShowingFeedback(false);
                            setConceptExplanationCount(0);
                            // Force canvas to clear by incrementing the key
                            setCanvasKey(prev => prev + 1);

                            // Check if there are more concepts
                            if (currentConceptIndex !== -1 && totalConcepts > 1) {
                              // Move to next concept
                              handleNextConcept();
                            } else {
                              // Reset current concept to initial state if no more concepts
                              setHasStartedExplaining(false);
                              setOpaQuestion(null);
                            }
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white text-lg py-4 px-8 rounded-lg shadow-lg transform transition-transform hover:scale-105 z-10 mb-4"
                        >
                          Next Concept
                        </button>
                      ) : (
                        // Get feedback button after 3 explanations
                          <div className="w-0 h-0" />
                      )}
                      
                      {/* Next Concept Button innerhalb des Overlays - immer anzeigen, ggf. deaktivieren */}
                      {(hasStartedExplaining || opaQuestion) && !showingFeedback && (
                        <button
                          onClick={() => {
                            // Reset drawing state
                            setIsDrawingEnabled(false);
                            // Reset all explanations and questions
                            setHasStartedExplaining(false);
                            setOpaQuestion(null);
                            // Force canvas to clear by incrementing the key
                            setCanvasKey(prev => prev + 1);
                            
                            // Check if there are more concepts
                            if (currentConceptIndex !== -1 && totalConcepts > 1) {
                              // Move to next concept
                              handleNextConcept();
                            } else {
                              // Reset current concept to initial state if no more concepts
                              setConceptExplanationCount(0);
                            }
                          }}
                          disabled={!canNavigateConcepts}
                          className={`py-3 px-6 rounded-lg shadow-md transform transition-transform z-10 ${
                            canNavigateConcepts 
                              ? 'bg-[#4285f4] hover:bg-[#3b78e7] text-white hover:scale-105' 
                              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          }`}
                        >
                          Next Concept
                        </button>
                      )}
                    </div>
                  )}

                  {/* Loading Screen */}
                  {showLoadingScreen && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer"
                      onClick={() => {
                        setShowLoadingScreen(false);
                        // Increment the explanation count
                        setConceptExplanationCount(prev => prev + 1);
                        // Zufällige Rückfrage vom Opa auswählen
                        const randomQuestionIndex = Math.floor(Math.random() * followUpQuestions.length);
                        setOpaQuestion(followUpQuestions[randomQuestionIndex]);
                      }}
                    >
                      <div className="absolute inset-0 bg-black/80 rounded-3xl"></div>
                      <div className="relative z-10 text-white text-center">
                        <div className="text-xl">Give me a second to think about it.</div>
                      </div>
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
                    onProcessingStart={() => {
                      setShowLoadingScreen(true);
                      setIsDrawingEnabled(false); // Disable drawing immediately
                      console.log("Processing started, showing loading screen.");
                    }}
                    onDone={(feedbackText) => { // Expect the feedback string directly
                      setShowLoadingScreen(false); // Hide loading screen when done
                      setConceptExplanationCount(prev => prev + 1);

                      evaluateExplanation(selectedConcept?.id || '1').then((result) => {
                        setTaskProgress(result)
                      }).catch((ignored) => {})

                      if (feedbackText) {
                        setOpaQuestion(feedbackText); // Set the speech bubble to the feedback text
                        console.log("Processing finished. Displaying feedback:", feedbackText);
                      } else {
                        // Fallback if no feedback (e.g., error during upload or empty feedback)
                        const randomQuestionIndex = Math.floor(Math.random() * followUpQuestions.length);
                        setOpaQuestion(followUpQuestions[randomQuestionIndex]);
                        console.log("Processing finished. Displaying random fallback question.");
                      }
                    }}
                    onAudioStatusChange={(isRecording) => {
                      setIsRecordingAudio(isRecording);
                      console.log(`Audio recording status: ${isRecording ? 'active' : 'inactive'}`);
                    }}
                    conceptText={selectedConcept?.id || '1'}
                    conceptExplanationCount={conceptExplanationCount}
                  />
                </div>

                {/* Progress Bar - Positioned between canvas and right edge */}
                <div 
                  className="absolute right-[-150px] top-0 h-full w-20 bg-white/80 backdrop-blur-sm shadow-lg flex flex-col items-center justify-center p-4 rounded-2xl"
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
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Button for Concepts Panel */}
        <button
          ref={toggleButtonRef}
          onClick={() => setIsConceptsPanelOpen(!isConceptsPanelOpen)}
          className={cn(
            "fixed right-0 top-1/2 -translate-y-1/2 bg-[#4285f4] text-white p-2 rounded-l-xl transition-transform z-50",
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
            "fixed right-0 top-0 h-screen w-[300px] bg-white shadow-lg flex flex-col transition-transform duration-300 z-50",
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
