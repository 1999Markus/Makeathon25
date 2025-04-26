// src/services/audioRecorderService.ts

class AudioRecorderService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
  
    async startRecording(): Promise<void> {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }
  
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
      this.mediaRecorder = new MediaRecorder(stream);
  
      this.audioChunks = [];
  
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
  
      this.mediaRecorder.start();
      console.log('Recording started');
    }
  
    async stopRecording(): Promise<File> {
      if (!this.mediaRecorder) {
        throw new Error('Recording has not been started');
      }
  
      return new Promise<File>((resolve, reject) => {
        this.mediaRecorder!.onstop = async () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
  
          // Create a File from the Blob, in memory
          const wavFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
  
          resolve(wavFile);
        };
  
        this.mediaRecorder!.onerror = (event) => {
          reject(new Error(`Recording error: ${event.error?.message || 'Unknown error'}`));
        };
  
        this.mediaRecorder!.stop();
        console.log('Recording stopped');
      });
    }
  }
  
  const audioRecorderService = new AudioRecorderService();
  
  export default audioRecorderService;
  