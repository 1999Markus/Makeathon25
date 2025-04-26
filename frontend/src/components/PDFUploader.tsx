import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { uploadPDF } from '@/services/uploadPDFService';
import { toast } from 'react-hot-toast';

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

    const uploadToastId = toast.loading('Uploading PDF... 📄');
    try {
      const result = await uploadPDF(pdfFiles[0]);
      toast.success(`File was successfully processed! 🎉`, {
        id: uploadToastId, // Replace the loading toast
      });

      onUploadSuccess?.(result.message);
    } catch (error) {
      if (error instanceof Error) {
        toast.error('Failed to upload PDF. ❌', {
          id: uploadToastId,
        });
        onUploadError?.(error.message);
      } else {
        toast.error('Failed to upload PDF. ❌', {
          id: uploadToastId,
        });
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
      <p className="text-gray-500">
        {isUploading ? 'Uploading...' : 'Drop PDF here'}
      </p>
    </div>
  );
} 