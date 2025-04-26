import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface Lecture {
  id: string;
  title: string;
}

interface LectureListProps {
  onLectureSelect: (lecture: Lecture) => void;
}

export function LectureList({ onLectureSelect }: LectureListProps) {
  // Dummy lectures
  const [lectures] = useState<Lecture[]>([
    { id: '1', title: 'Machine Learning Lecture I' },
    { id: '2', title: 'Machine Learning Lecture II' },
    { id: '3', title: 'Deep Learning' },
    { id: '4', title: 'Fundamentals of AI' },
    { id: '5', title: 'Neural Networks' },
    { id: '6', title: 'Computer Vision' },
    { id: '7', title: 'Natural Language Processing' },
    { id: '8', title: 'Reinforcement Learning' },
  ]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="relative bg-white p-6 rounded-3xl shadow-lg mb-8">
        <div className="absolute left-0 top-1/2 -translate-x-4 -translate-y-1/2 w-8 h-8 bg-white transform rotate-45" />
        <p className="text-3xl font-handwriting relative z-10">
          Choose a lecture you want to explain to me
        </p>
      </div>

      {/* Scrollable Lecture List */}
      <div className="flex-1 overflow-y-auto pr-4 -mr-4 mb-4">
        <div className="space-y-4">
          {lectures.map((lecture) => (
            <button
              key={lecture.id}
              onClick={() => onLectureSelect(lecture)}
              className="w-full text-left p-6 rounded-2xl font-handwriting text-2xl transition-colors hover:bg-opacity-90"
              style={{
                backgroundColor: getRandomColor(lecture.id),
                color: 'white',
              }}
            >
              {lecture.title}
            </button>
          ))}
        </div>
      </div>

      {/* Fixed Add Button */}
      <div className="sticky bottom-0 left-0 right-0 bg-gray-300 rounded-2xl p-4 mt-4">
        <button 
          onClick={() => {/* TODO: Implement file upload */}}
          className="w-full h-16 bg-white rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}

// Function to generate consistent colors based on lecture ID
function getRandomColor(id: string): string {
  const colors = [
    '#4285f4', // Google Blue
    '#5cb85c', // Bootstrap Green
    '#d9534f', // Bootstrap Red
    '#f4b400', // Google Yellow
    '#0f9d58', // Google Green
    '#db4437', // Google Red
    '#4285f4', // Google Blue
    '#f4b400', // Google Yellow
  ];
  
  return colors[parseInt(id) - 1] || colors[0];
} 