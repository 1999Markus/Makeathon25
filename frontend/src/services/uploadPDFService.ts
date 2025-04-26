export async function uploadPDF(file: File): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('pdf', file);
  
    // Konsole-Log zum Debugging
    console.log('Datei zum Upload vorbereitet:', file.name, file.size, 'bytes');
  
    // Mock-Implementierung für Entwicklungszwecke
    // TODO: Ersetzen Sie dies durch einen tatsächlichen API-Aufruf
    return new Promise((resolve) => {
      // Simuliere einen Server-Delay
      setTimeout(() => {
        console.log('PDF hochgeladen (Simulation):', file.name);
        resolve({
          message: `${file.name} wurde erfolgreich verarbeitet (Simulation)`
        });
      }, 1500);
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
  