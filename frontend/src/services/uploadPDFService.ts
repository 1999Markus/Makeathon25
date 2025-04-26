export async function uploadPDF(file: File): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('pdf', file);
  
    try {
      const response = await fetch('https://localhost:80/your-upload-endpoint', {
        method: 'POST',
        body: formData,
      });

      console.log(response);
  
      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error uploading PDF: ${error.message}`);
      }
      throw new Error('Error uploading PDF: Unknown error');
    }
  }
  