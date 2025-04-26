import React from 'react';
import { Plus } from 'lucide-react';
import { PDFUploader } from './PDFUploader';

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

interface LectureListProps {
  lectures: Lecture[];
  onLectureSelect: (lecture: Lecture) => void;
}

export function LectureList({ lectures, onLectureSelect }: LectureListProps) {
  const handleUploadSuccess = (message: string) => {
    console.log('Upload success:', message);
    // TODO: Handle successful upload
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // TODO: Handle upload error
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Grid Container with padding for hover effects */}
      <div className="overflow-y-auto max-h-[400px]">
        <div className="grid grid-cols-2 gap-4 p-2">
          {lectures.map((lecture) => (
            <div key={lecture.id} className="p-1">
              <button
                onClick={() => onLectureSelect(lecture)}
                className="w-full text-left p-4 rounded-xl font-handwriting text-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:-translate-y-1 active:scale-[0.98]"
                style={{
                  backgroundColor: getRandomColor(lecture.id),
                  color: 'white',
                }}
              >
                {lecture.title}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Split Add Button with Drag & Drop */}
      <div className="mt-6 bg-gray-100 rounded-xl p-4">
        <div className="flex gap-4 h-12">
          {/* Plus Button Side */}
          <div className="w-12 h-full bg-white rounded-lg flex items-center justify-center">
            <Plus className="w-6 h-6 text-gray-500" />
          </div>
          
          {/* PDF Uploader Side */}
          <PDFUploader 
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </div>
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