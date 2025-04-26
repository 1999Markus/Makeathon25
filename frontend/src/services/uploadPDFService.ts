export async function uploadPDF(file: File): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('pdf', file);
  
    // Konsole-Log zum Debugging
    console.log('Prepared file for upload:', file.name, file.size, 'bytes');

    // TODO: Replace with actual API call
    return new Promise((resolve) => {
      // Simulate server delay
      setTimeout(() => {
        console.log('PDF uploaded (Simulation):', file.name);
        resolve({
          message: `${file.name} was successfully processed (Simulation)`
        });
      }, 3333);
    });
  
    // Reale Implementierung (auskommentiert)
    /*
    try {
      const response = await fetch('http://localhost:3001/api/upload-pdf', {
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
    */
  }
  