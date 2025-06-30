// Audio utility functions for handling TTS audio playback

interface AudioData {
  buffer: ArrayBuffer;
  contentType: string;
  size: number;
}

class AudioManager {
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private audioQueue: HTMLAudioElement[] = [];

  /**
   * Play audio from buffer data
   */
  async playAudio(audioData: AudioData): Promise<void> {
    if (!audioData || !audioData.buffer) {
      console.log('No audio data provided');
      return;
    }

    try {
      // Stop current audio if playing
      this.stopCurrentAudio();

      // Create blob from buffer
      const audioBlob = new Blob([audioData.buffer], { 
        type: audioData.contentType 
      });
      
      // Create audio URL
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create audio element
      const audio = new Audio(audioUrl);
      
      // Set up event listeners
      const playPromise = new Promise<void>((resolve, reject) => {
        audio.addEventListener('ended', () => {
          this.onAudioEnded(audioUrl);
          resolve();
        });
        
        audio.addEventListener('error', (error) => {
          console.error('Audio playback error:', error);
          this.onAudioEnded(audioUrl);
          reject(error);
        });
        
        audio.addEventListener('canplaythrough', () => {
          console.log('🔊 Playing TTS audio:', {
            size: audioData.size,
            contentType: audioData.contentType,
            duration: audio.duration
          });
        });
      });

      // Store reference
      this.currentAudio = audio;
      this.isPlaying = true;

      // Start playback
      await audio.play();
      
      return playPromise;
    } catch (error) {
      console.error('Failed to play audio:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  /**
   * Stop current audio playback
   */
  stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.isPlaying = false;
    }
  }

  /**
   * Queue audio for sequential playback
   */
  async queueAudio(audioData: AudioData): Promise<void> {
    // If nothing is playing, play immediately
    if (!this.isPlaying) {
      return this.playAudio(audioData);
    }

    // Otherwise, add to queue (for future enhancement)
    console.log('Audio queuing not implemented yet - playing immediately');
    return this.playAudio(audioData);
  }

  /**
   * Check if audio is currently playing
   */
  isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current audio duration if available
   */
  getCurrentAudioDuration(): number | null {
    return this.currentAudio?.duration || null;
  }

  /**
   * Cleanup when audio ends
   */
  private onAudioEnded(audioUrl: string): void {
    this.isPlaying = false;
    this.currentAudio = null;
    
    // Clean up object URL to free memory
    URL.revokeObjectURL(audioUrl);
  }

  /**
   * Test audio system
   */
  async testAudio(): Promise<boolean> {
    try {
      // Create a simple test tone
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
      
      return true;
    } catch (error) {
      console.error('Audio system test failed:', error);
      return false;
    }
  }

  /**
   * Clean up all audio resources
   */
  cleanup(): void {
    this.stopCurrentAudio();
    this.audioQueue.forEach(audio => {
      audio.pause();
      audio.remove();
    });
    this.audioQueue = [];
  }
}

// Create a singleton instance
export const audioManager = new AudioManager();

// Export types
export type { AudioData };

// Utility function for easy use in components
export const playTTSAudio = (audioData: AudioData | null | undefined): Promise<void> => {
  if (!audioData) {
    return Promise.resolve();
  }
  
  return audioManager.playAudio(audioData);
};

// Hook for audio control in React components
export const useAudioManager = () => {
  return {
    playAudio: audioManager.playAudio.bind(audioManager),
    stopAudio: audioManager.stopCurrentAudio.bind(audioManager),
    isPlaying: audioManager.isAudioPlaying.bind(audioManager),
    testAudio: audioManager.testAudio.bind(audioManager),
    cleanup: audioManager.cleanup.bind(audioManager)
  };
};
