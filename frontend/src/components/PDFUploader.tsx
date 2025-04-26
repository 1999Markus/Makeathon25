import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { uploadPDF } from '@/services/uploadPDFService';

interface PDFUploaderProps {
  onUploadSuccess?: (message: string) => void;
  onUploadError?: (error: string) => void;
}

export function PDFUploader({ onUploadSuccess, onUploadError }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      onUploadError?.('Please drop a PDF file');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadPDF(pdfFiles[0]);
      onUploadSuccess?.(result.message);
    } catch (error) {
      if (error instanceof Error) {
        onUploadError?.(error.message);
      } else {
        onUploadError?.('An unknown error occurred');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex-1 h-full rounded-lg flex items-center justify-center transition-colors text-sm",
        isDragging 
          ? "bg-blue-50 border-2 border-dashed border-blue-500" 
          : "bg-white border-2 border-dashed border-gray-300"
      )}
    >
      <p className="font-handwriting text-gray-500">
        {isUploading ? 'Uploading...' : 'Drop PDF here'}
      </p>
    </div>
  );
} 