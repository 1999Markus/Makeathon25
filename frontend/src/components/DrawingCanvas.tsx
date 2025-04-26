import { useRef, useEffect, useState } from 'react';
import { Pen, Eraser, Trash2 } from 'lucide-react';

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
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

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

              {/* Center with drawing tools */}
              <div className="flex gap-3 items-center">
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
                onClick={onDone}
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
