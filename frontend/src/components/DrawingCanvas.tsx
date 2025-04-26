import { useRef, useEffect, useState } from 'react';
import { Pen, Eraser, Trash2, Mic } from 'lucide-react';

// Canvas background color constant
const CANVAS_BACKGROUND_COLOR = '#333333';

interface DrawingCanvasProps {
  isEnabled: boolean;
  onStart: () => void;
  onCancel: () => void;
  onDone: () => void;
}

export function DrawingCanvas({ isEnabled, onStart, onCancel, onDone }: DrawingCanvasProps) {
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
    ctx.strokeStyle = '#000000'; // Default to black pen
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
  
  // Save recorded audio
  const saveRecordedAudio = () => {
    if (audioChunksRef.current.length === 0) {
      console.log("No audio data to save");
      return;
    }
    
    try {
      // Create blob from recorded chunks
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });
      
      // Convert to WAV using Audio Context
      convertToWav(audioBlob);
      
    } catch (error) {
      console.error("Error saving audio:", error);
      alert("Failed to save audio recording");
    }
  };
  
  // Convert audio blob to WAV format
  const convertToWav = async (audioBlob: Blob) => {
    try {
      // Create file reader to convert blob to array buffer
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        if (!event.target?.result) {
          throw new Error("Failed to read audio data");
        }
        
        // Create audio context
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContext();
        
        // Decode audio data from the blob
        const arrayBuffer = event.target.result as ArrayBuffer;
        
        // Decode the audio
        audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
          // Convert AudioBuffer to WAV
          const wav = audioBufferToWav(buffer);
          
          // Create blob from WAV data
          const wavBlob = new Blob([wav], { type: 'audio/wav' });
          
          // Create and trigger download
          const audioUrl = URL.createObjectURL(wavBlob);
          const link = document.createElement('a');
          link.href = audioUrl;
          link.download = `explanation_recording_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up
          setTimeout(() => URL.revokeObjectURL(audioUrl), 100);
          audioCtx.close();
          
          console.log("Audio saved as WAV successfully");
        }, (error) => {
          console.error("Error decoding audio data:", error);
          alert("Failed to convert audio to WAV format");
        });
      };
      
      // Start reading the blob as array buffer
      reader.readAsArrayBuffer(audioBlob);
      
    } catch (error) {
      console.error("Error converting to WAV:", error);
      alert("Failed to convert to WAV format");
    }
  };
  
  // Helper function to convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    // Get channel data
    const numOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numOfChannels * 2; // 2 bytes per sample (16-bit)
    const sampleRate = buffer.sampleRate;
    
    // Create buffer for WAV file
    const buffer16Bit = new ArrayBuffer(44 + length);
    const view = new DataView(buffer16Bit);
    
    // WAV header
    // "RIFF" chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true); // ChunkSize
    writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numOfChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * numOfChannels * 2, true); // ByteRate
    view.setUint16(32, numOfChannels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, length, true); // Subchunk2Size
    
    // Write audio data
    let offset = 44;
    let channelData: Float32Array[] = [];
    
    // Get channel data arrays
    for (let i = 0; i < numOfChannels; i++) {
      channelData[i] = buffer.getChannelData(i);
    }
    
    // Interleave channel data and convert to 16-bit PCM
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numOfChannels; channel++) {
        // Convert float range -1.0 to 1.0 into 16-bit PCM
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, value, true);
        offset += 2;
      }
    }
    
    return buffer16Bit;
  };
  
  // Helper function to write string to DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Clean up audio resources
  const cleanupAudio = () => {
    console.log("Cleaning up audio resources");
    
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
      // Set pen color back to black
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
    }
  };

  const handleCancel = () => {
    clearCanvas();
    onCancel();
  };

  const handleDone = () => {
    // Save audio recording before stopping
    saveRecordedAudio();
    
    // Continue with original done action
    onDone();
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
                className="bg-red-500 hover:bg-red-600 text-white font-handwriting px-6 py-2 rounded-lg shadow-md transition-colors"
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
                className="bg-green-500 hover:bg-green-600 text-white font-handwriting px-6 py-2 rounded-lg shadow-md transition-colors"
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
