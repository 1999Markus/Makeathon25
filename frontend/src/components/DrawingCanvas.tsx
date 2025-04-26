import { useRef, useEffect, useState } from 'react';

interface DrawingCanvasProps {
  isEnabled: boolean;
  onStart: () => void;
  onCancel: () => void;
}

export function DrawingCanvas({ isEnabled, onStart, onCancel }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

  // Handle canvas resize
  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Get the canvas display size from CSS
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      // If the canvas size doesn't match the display size...
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        // Set the canvas size to match the display size
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        // Reset the context properties after resize
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#000000';
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.lineWidth = 2;
        }
      }
    }

    // Initial setup
    handleResize();

    // Add resize listener
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const toggleEraser = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsErasing(!isErasing);
    if (!isErasing) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 20;
    } else {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Canvas first */}
      <div className="bg-[#333333] rounded-3xl shadow-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-[400px] cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
        />
      </div>

      {/* Controls below */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={toggleEraser}
          className={`px-6 py-2 rounded-lg font-handwriting text-lg transition-colors ${
            !isErasing 
              ? 'bg-[#4285f4] text-white hover:bg-[#3367d6]' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Pen
        </button>
        <button
          onClick={toggleEraser}
          className={`px-6 py-2 rounded-lg font-handwriting text-lg transition-colors ${
            isErasing 
              ? 'bg-[#4285f4] text-white hover:bg-[#3367d6]' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Eraser
        </button>
        <button
          onClick={clearCanvas}
          className="px-6 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-handwriting text-lg transition-colors"
        >
          Clear
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-handwriting text-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
