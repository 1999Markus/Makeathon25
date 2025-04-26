import { useRef, useEffect, useState } from 'react';
import { Pen, Eraser, Trash2, Mic } from 'lucide-react';
import {uploadAndPlayAudio} from "@/services/uploadService";

// Canvas background color constant
const CANVAS_BACKGROUND_COLOR = '#333333';

interface DrawingCanvasProps {
  isEnabled: boolean;
  onStart: () => void;
  onCancel: () => void;
  onDone: (result?: string) => void;
  concept: string;
  onAudioStatusChange?: (isRecording: boolean) => void;
}

export function DrawingCanvas({ isEnabled, onStart, onCancel, onDone, concept, onAudioStatusChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  
  // Audio visualization states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  // Audio recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Function to set context properties and background
  const setupCanvasContext = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = CANVAS_BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ffffff'; // Default to white pen
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    setIsErasing(false); // Ensure pen is selected initially
  };

  // Initialize audio context
  const initAudio = async () => {
    try {
      console.log("Requesting microphone access...");
      
      // Request microphone access
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Create audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      
      // Create analyzer
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32; // Small for better performance
      analyser.smoothingTimeConstant = 0.2;
      
      // Connect microphone to analyzer
      const source = audioCtx.createMediaStreamSource(audioStream);
      source.connect(analyser);
      
      // Setup data array for visualization
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Create MediaRecorder for recording audio
      const recorder = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm' : 'audio/mp3'
      });
      
      // Clear previous chunks
      audioChunksRef.current = [];
      
      // Save audio data when available
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log(`Recorded chunk: ${event.data.size} bytes`);
        }
      };
      
      // Start recording - collect data every second
      recorder.start(1000);
      console.log("Audio recording started");
      
      // Notify parent component that audio recording has started
      if (onAudioStatusChange) {
        onAudioStatusChange(true);
      }
      
      // Store references
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      mediaRecorderRef.current = recorder;
      setStream(audioStream);
      
      console.log("Audio system initialized");
      
      // Start visualization loop
      visualize();
      
    } catch (error) {
      console.error("Error initializing audio:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  // Clean up audio resources
  const cleanupAudio = () => {
    console.log("Cleaning up audio resources");
    
    // Notify parent component that audio recording has stopped
    if (onAudioStatusChange) {
      onAudioStatusChange(false);
    }
    
    // Stop media recorder if running
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        console.log("Media recorder stopped");
      } catch (error) {
        console.error("Error stopping media recorder:", error);
      }
    }
    
    // Cancel animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop all tracks in the stream
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log("Audio track stopped");
      });
    }
    
    // Close audio context if open
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
        console.log("Audio context closed");
      } catch (error) {
        console.error("Error closing audio context:", error);
      }
    }
    
    // Reset states
    setStream(null);
    setAudioLevel(0);
  };

  // Visualization function that runs in animation frame
  const visualize = () => {
    if (!analyserRef.current || !dataArrayRef.current || !audioCanvasRef.current) {
      console.log("Missing required refs for visualization");
      return;
    }
    
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    
    // Get frequency data
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate audio level (average of all frequencies)
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const avg = sum / dataArray.length || 0;
    
    // Set normalized audio level (0-100)
    setAudioLevel(Math.min(100, avg * 2)); // Amplify for better visualization
    
    // Draw visualization
    drawVisualization();
    
    // Continue loop
    animationRef.current = requestAnimationFrame(visualize);
  };
  
  // Draw audio visualization on canvas
  const drawVisualization = () => {
    // We're no longer using canvas visualization, 
    // but we still use the audioLevel for the pulsing effect
    
    // Continue animation loop
    animationRef.current = requestAnimationFrame(visualize);
  };

  // Setup and cleanup based on isEnabled state
  useEffect(() => {
    if (isEnabled) {
      console.log("Drawing enabled, initializing audio");
      initAudio();
    } else {
      console.log("Drawing disabled, cleaning up audio");
      cleanupAudio();
    }
    
    // Cleanup on unmount
    return () => {
      cleanupAudio();
    };
  }, [isEnabled]);

  // Handle canvas resize and initial setup
  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        setupCanvasContext(canvas, ctx); // Reset context and fill background
      }
    }

    // Initial setup
    const canvas = canvasRef.current;
    if(canvas){
      const ctx = canvas.getContext('2d');
      if(ctx){
         // Ensure initial setup waits for layout
        setTimeout(() => handleResize(), 0);
      }
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setLastX(x);
    setLastY(y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    setLastX(x);
    setLastY(y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with background color instead of clearing to transparent
    ctx.fillStyle = CANVAS_BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const toggleEraser = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newIsErasing = !isErasing;
    setIsErasing(newIsErasing);
    
    if (newIsErasing) {
      // Set eraser color to canvas background
      ctx.strokeStyle = CANVAS_BACKGROUND_COLOR; 
      ctx.lineWidth = 20;
    } else {
      // Set pen color back to white
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
    }
  };

  const handleCancel = () => {
    clearCanvas();
    onCancel();
  };

  const handleDone = async () => {
    try {
      if (!canvasRef.current) {
        console.error("Canvas ref missing");
        return;
      }

      // Stop and save audio recording first
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        // Notify parent component that audio recording has stopped
        if (onAudioStatusChange) {
          onAudioStatusChange(false);
        }
        
        mediaRecorderRef.current.stop();
      }

      // Wait a short time to ensure data is available
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Create the audio File
      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || 'audio/webm'
      });
      const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: audioBlob.type });

      // Create the image File
      const canvas = canvasRef.current;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp'));
      if (!blob) {
        console.error("Failed to create image blob");
        return;
      }
      const imageFile = new File([blob], `drawing_${Date.now()}.webp`, { type: blob.type });

      // Upload using your service and capture the result
      const result = await uploadAndPlayAudio({audioFile, imageFile, conceptText: concept});

      // Continue with original done action, passing the feedback text
      onDone(result); 
    } catch (error) {
      console.error("Error handling done:", error);
      onDone(); // Call onDone without feedback on error
    }
  };

  return (
    <div className="flex flex-col">
      {/* Canvas first */}
      <div className="bg-[#333333] rounded-t-3xl shadow-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-[400px] cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
        />
      </div>

      {/* Controls below in a gray bar */}
      <div className="bg-gray-200 p-3 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center">
          {isEnabled ? (
            <>
              {/* Left side with Cancel button */}
              <button
                onClick={handleCancel}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg shadow-md transition-colors"
              >
                Cancel
              </button>

              {/* Pulsing Microphone Icon */}
              <div 
                className="mx-4 p-2 rounded-full bg-red-100 flex items-center justify-center relative"
                style={{ 
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              >
                <style jsx>{`
                  @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    50% { transform: scale(1.05); box-shadow: 0 0 10px 0 rgba(239, 68, 68, 0.5); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                  }
                  
                  @keyframes vibrate {
                    0% { transform: translateX(0); }
                    25% { transform: translateX(-1px) translateY(-1px); }
                    50% { transform: translateX(1px) translateY(1px); }
                    75% { transform: translateX(-1px) translateY(1px); }
                    100% { transform: translateX(1px) translateY(-1px); }
                  }
                `}</style>
                <Mic 
                  className="h-7 w-7 text-red-600"
                  style={{ animation: 'vibrate 0.2s linear infinite' }}
                />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
              </div>

              {/* Drawing tools */}
              <div className="flex-1 flex gap-3 items-center justify-center">
                <button
                  onClick={toggleEraser}
                  title="Pen"
                  className={`p-3 rounded-lg transition-colors ${
                    !isErasing 
                      ? 'bg-[#4285f4] text-white hover:bg-[#3367d6]' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Pen className="w-5 h-5" />
                </button>
                
                <button
                  onClick={toggleEraser}
                  title="Eraser"
                  className={`p-3 rounded-lg transition-colors ${
                    isErasing 
                      ? 'bg-[#4285f4] text-white hover:bg-[#3367d6]' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Eraser className="w-5 h-5" />
                </button>
                
                <button
                  onClick={clearCanvas}
                  title="Clear"
                  className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Right side with Done button */}
              <button
                onClick={handleDone}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg shadow-md transition-colors"
              >
                I'm done
              </button>
            </>
          ) : (
            <div className="w-full flex justify-center">
              {/* Placeholder to maintain height when buttons are hidden */}
              <div className="h-10" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
