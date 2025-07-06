/**
 * Client service for communicating with the dedicated Edge TTS microservice
 * This provides high-quality voice synthesis with fallback to browser TTS
 */

interface EdgeTTSVoice {
  name: string;
  displayName: string;
  gender: string;
  locale: string;
  styleList: string[];
  rolePlayList: string[];
}

interface SynthesisOptions {
  voice?: string;
  rate?: string;
  volume?: string;
  pitch?: string;
}

interface SynthesisResponse {
  success: boolean;
  audio?: string;
  audioUrl?: string; // For raw audio blob URLs
  format?: string;
  voice?: string;
  textLength?: number;
  blobSize?: number; // For debugging
  error?: string;
  message?: string;
}

export class EdgeTTSClient {
  private baseUrl: string;
  private isServiceAvailable: boolean = true;
  private voices: EdgeTTSVoice[] = [];

  constructor(baseUrl: string = `${import.meta.env.VITE_EDGE_TTS_URL}`) {
    this.baseUrl = baseUrl;
    this.checkServiceHealth();
    this.loadVoices();
  }

  /**
   * Check if the Edge TTS service is available
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      } as any);
      
      if (response.ok) {
        const data = await response.json();
        this.isServiceAvailable = data.status === 'OK';
        console.log(this.isServiceAvailable ? '✅ EdThis Weekge TTS service is available' : '⚠️ Edge TTS service health check failed');
      } else {
        this.isServiceAvailable = false;
        console.warn('⚠️ Edge TTS service health check failed with status:', response.status);
      }
    } catch (error) {
      this.isServiceAvailable = false;
      console.warn('⚠️ Edge TTS service is not available, will use browser fallback');
    }
    
    return this.isServiceAvailable;
  }

  /**
   * Load available voices from the service
   */
  async loadVoices(): Promise<EdgeTTSVoice[]> {
    if (!this.isServiceAvailable) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/voices`);
      if (response.ok) {
        const data = await response.json();
        this.voices = data.voices || [];
        console.log(`📋 Loaded ${this.voices.length} Edge TTS voices`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load Edge TTS voices:', error);
    }

    return this.voices;
  }

  /**
   * Get list of available voices
   */
  getVoices(): EdgeTTSVoice[] {
    return this.voices;
  }

  /**
   * Synthesize speech using Edge TTS service with fallback to browser TTS
   */
  async speak(text: string, options: SynthesisOptions = {}): Promise<void> {
    const {
      voice = 'en-US-AriaNeural',
      rate = '0%',
      volume = '0%',
      pitch = '0Hz'
    } = options;

    console.log(`🎤 Attempting to speak: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    // Ensure audio context is ready (for user interaction requirements)
    try {
      // Try to create and play a silent audio to check if audio is allowed
      const testAudio = new Audio();
      testAudio.volume = 0;
      testAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      await testAudio.play();
      testAudio.pause();
    } catch (error) {
      console.warn('⚠️ Audio context not ready, might need user interaction:', error);
    }

    // Try Edge TTS service first
    if (this.isServiceAvailable) {
      try {
        const response = await this.synthesizeWithEdgeTTS(text, voice, rate, volume, pitch);
        if (response.success) {
          if (response.audioUrl) {
            await this.playAudioFromUrl(response.audioUrl, response.format, response.blobSize);
          } else if (response.audio) {
            await this.playAudioFromBase64(response.audio);
          }
          console.log('✅ Edge TTS synthesis and playback completed');
          return;
        }
      } catch (error) {
        console.warn('⚠️ Edge TTS failed, falling back to browser TTS:', error);
        
        // If it's a format error, try one more time with base64 endpoint
        if (error instanceof Error && (error.message.includes('format') || error.message.includes('corrupted') || error.message.includes('too small'))) {
          console.log('🔄 Retrying with base64 endpoint due to audio format/corruption error...');
          try {
            const retryResponse = await fetch(`${this.baseUrl}/api/synthesize/base64`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, voice, rate, volume, pitch }),
              signal: AbortSignal.timeout(15000)
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              if (retryData.success && retryData.audio) {
                await this.playAudioFromBase64(retryData.audio);
                console.log('✅ Edge TTS retry with base64 succeeded');
                return;
              } else {
                console.warn('⚠️ Base64 retry returned no audio data');
              }
            } else {
              console.warn(`⚠️ Base64 retry failed with status: ${retryResponse.status}`);
            }
          } catch (retryError) {
            console.warn('⚠️ Edge TTS retry also failed:', retryError);
          }
        }
        
        this.isServiceAvailable = false; // Temporarily disable for this session
      }
    }

    // Fallback to browser TTS
    console.log('🔄 Using browser TTS fallback');
    await this.speakWithBrowserTTS(text, options);
  }

  /**
   * Synthesize speech using the Edge TTS service
   */
  private async synthesizeWithEdgeTTS(
    text: string, 
    voice: string, 
    rate: string, 
    volume: string, 
    pitch: string
  ): Promise<SynthesisResponse> {
    // Try the raw audio endpoint first (more reliable)
    try {
      console.log('🔄 Trying raw audio endpoint...');
      const response = await fetch(`${this.baseUrl}/api/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
          rate,
          volume,
          pitch
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (response.ok) {
        console.log('✅ Raw audio endpoint succeeded');
        const audioBlob = await response.blob();
        
        // Validate blob size - should be substantial for real audio
        if (audioBlob.size < 1000) { // Audio should be at least 1KB
          console.error(`❌ Audio blob too small: ${audioBlob.size} bytes - likely corrupted`);
          throw new Error(`Audio data too small (${audioBlob.size} bytes), likely corrupted`);
        }
        
        console.log(`🎵 Audio blob size: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
        
        // Validate content type
        const contentType = response.headers.get('content-type') || audioBlob.type;
        if (!contentType.startsWith('audio/')) {
          console.warn(`⚠️ Unexpected content type: ${contentType}`);
          // Don't fail here, just warn - sometimes the content-type header is missing
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        
        return {
          success: true,
          audio: undefined, // We'll use audioUrl instead
          audioUrl: audioUrl,
          format: contentType,
          voice: voice,
          textLength: text.length,
          blobSize: audioBlob.size
        };
      } else {
        console.warn(`⚠️ Raw audio endpoint failed with status: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Raw audio endpoint failed, trying base64:', error);
    }

    // Fallback to base64 endpoint
    console.log('🔄 Trying base64 endpoint...');
    const response = await fetch(`${this.baseUrl}/api/synthesize/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        rate,
        volume,
        pitch
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Edge TTS service returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Base64 endpoint succeeded');
    return result;
  }

  /**
   * Play audio from a blob URL
   */
  private async playAudioFromUrl(audioUrl: string, contentType?: string, blobSize?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio();
        let hasStartedPlaying = false;
        
        // Set up timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          if (!hasStartedPlaying) {
            console.error('⏰ Audio loading timeout');
            URL.revokeObjectURL(audioUrl);
            reject(new Error('Audio loading timeout'));
          }
        }, 10000); // 10 second timeout
        
        // Set up event listeners before setting src
        audio.onloadeddata = () => {
          console.log('🎵 Audio data loaded, ready to play');
        };
        
        audio.oncanplaythrough = () => {
          console.log('🎵 Audio can play through without buffering');
          hasStartedPlaying = true;
          clearTimeout(timeoutId);
          
          // Start playing once audio is ready
          audio.play().catch((playError) => {
            console.error('Audio play() failed:', playError);
            URL.revokeObjectURL(audioUrl);
            reject(playError);
          });
        };
        
        audio.onended = () => {
          console.log('🎵 Audio playback completed');
          clearTimeout(timeoutId);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          console.error('Audio error details:', {
            error: audio.error,
            errorCode: audio.error?.code,
            errorMessage: audio.error?.message,
            networkState: audio.networkState,
            readyState: audio.readyState,
            currentSrc: audio.currentSrc,
            audioFormat: contentType || 'unknown',
            blobSize: blobSize || 'unknown'
          });
          
          clearTimeout(timeoutId);
          URL.revokeObjectURL(audioUrl);
          
          // Provide more specific error messages
          let errorMessage = 'Audio playback failed';
          if (audio.error) {
            switch (audio.error.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = 'Audio playback was aborted';
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = 'Audio network error';
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMessage = 'Audio decode error - unsupported format';
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Audio format not supported by browser';
                break;
            }
          }
          
          reject(new Error(errorMessage));
        };
        
        audio.onloadstart = () => {
          console.log('🎵 Audio loading started');
        };
        
        audio.onprogress = () => {
          console.log('🎵 Audio loading progress...');
        };
        
        // Add stalled event handler
        audio.onstalled = () => {
          console.warn('⚠️ Audio loading stalled');
        };
        
        // Set source after event listeners are in place
        audio.src = audioUrl;
        audio.load(); // Explicitly load the audio
        
      } catch (error) {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      }
    });
  }

  /**
   * Play audio from base64 data
   */
  private async playAudioFromBase64(base64Audio: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Validate base64 length first
        if (!base64Audio || base64Audio.length < 100) {
          throw new Error(`Base64 audio data too small: ${base64Audio?.length || 0} characters`);
        }
        
        console.log(`🔍 Base64 audio length: ${base64Audio.length} characters`);
        
        // Convert base64 to blob with better error handling
        let binaryString: string;
        try {
          binaryString = atob(base64Audio);
        } catch (decodeError) {
          throw new Error(`Base64 decode failed: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}`);
        }
        
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log(`🔍 Decoded audio size: ${bytes.length} bytes`);
        
        // More lenient validation - even small audio files can be valid for short text
        if (bytes.length < 100) {
          throw new Error(`Decoded audio data too small: ${bytes.length} bytes`);
        }
        
        // Validate that this looks like audio data by checking headers
        const isValidAudio = this.validateAudioHeader(bytes);
        if (!isValidAudio) {
          throw new Error('Decoded data does not appear to be valid audio');
        }
        
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        
        const audio = new Audio();
        let hasStartedPlaying = false;
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (!hasStartedPlaying) {
            console.error('⏰ Base64 audio loading timeout');
            URL.revokeObjectURL(audioUrl);
            reject(new Error('Audio loading timeout'));
          }
        }, 15000);
        
        // Set up event listeners before setting src
        audio.onloadeddata = () => {
          console.log('🎵 Base64 audio data loaded, checking duration...');
          
          // More lenient duration validation for short text
          if (audio.duration && audio.duration < 0.05) {
            console.error('⚠️ Base64 audio duration extremely short, likely corrupted');
            clearTimeout(timeoutId);
            URL.revokeObjectURL(audioUrl);
            reject(new Error('Audio file appears to be corrupted (extremely short)'));
            return;
          }
        };
        
        audio.oncanplaythrough = () => {
          console.log('🎵 Base64 audio can play through without buffering');
          hasStartedPlaying = true;
          clearTimeout(timeoutId);
          
          // Start playing once audio is ready
          audio.play().catch((playError) => {
            console.error('Base64 audio play() failed:', playError);
            URL.revokeObjectURL(audioUrl);
            reject(playError);
          });
        };
        
        audio.onended = () => {
          console.log('🎵 Base64 audio playback completed');
          clearTimeout(timeoutId);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = (e) => {
          console.error('Base64 audio playback error:', e);
          console.error('Base64 audio error details:', {
            error: audio.error,
            errorCode: audio.error?.code,
            errorMessage: audio.error?.message,
            networkState: audio.networkState,
            readyState: audio.readyState,
            currentSrc: audio.currentSrc,
            duration: audio.duration,
            blobSize: bytes.length
          });
          clearTimeout(timeoutId);
          URL.revokeObjectURL(audioUrl);
          
          let errorMessage = 'Base64 audio playback failed';
          if (audio.error) {
            switch (audio.error.code) {
              case MediaError.MEDIA_ERR_DECODE:
                errorMessage = 'Base64 audio decode error - corrupted data';
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Base64 audio format not supported';
                break;
              default:
                errorMessage = `Base64 audio error: ${audio.error.message || audio.error.code}`;
            }
          }
          
          reject(new Error(errorMessage));
        };
        
        audio.onloadstart = () => {
          console.log('🎵 Base64 audio loading started');
        };
        
        audio.onprogress = () => {
          console.log('🎵 Base64 audio loading progress...');
        };
        
        audio.onloadedmetadata = () => {
          console.log(`🎵 Base64 audio metadata loaded - duration: ${audio.duration}s`);
          
          // More lenient validation for short audio clips
          if (audio.duration && audio.duration < 0.05) {
            console.error('⚠️ Base64 audio extremely short after metadata load');
            clearTimeout(timeoutId);
            URL.revokeObjectURL(audioUrl);
            reject(new Error('Audio file extremely short after validation'));
            return;
          }
        };
        
        // Set source after event listeners are in place
        audio.src = audioUrl;
        audio.load(); // Explicitly load the audio
        
      } catch (error) {
        console.error('Base64 audio setup error:', error);
        reject(error);
      }
    });
  }

  /**
   * Fallback to browser Speech Synthesis API
   */
  private async speakWithBrowserTTS(text: string, _options: SynthesisOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Browser TTS not supported'));
        return;
      }

      // Stop any current speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      utterance.lang = 'en-US';

      // Try to find a good browser voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Aria') || 
        voice.name.includes('Natural') ||
        voice.name.includes('Google') ||
        (voice.lang.startsWith('en') && voice.localService)
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log('🎤 Using browser voice:', preferredVoice.name);
      }

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        reject(new Error(`Browser TTS error: ${event.error}`));
      };

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Stop all speech synthesis
   */
  stopSpeaking(): void {
    // Stop browser TTS
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    console.log('🛑 All speech synthesis stopped');
  }

  /**
   * Check if service is currently available
   */
  isAvailable(): boolean {
    return this.isServiceAvailable;
  }

  /**
   * Manually re-enable service (useful after network issues)
   */
  async reconnect(): Promise<boolean> {
    return await this.checkServiceHealth();
  }

  /**
   * Get recommended voices for different use cases
   */
  getRecommendedVoices(): { [key: string]: string } {
    return {
      professional: 'en-US-AriaNeural',
      conversational: 'en-US-JennyNeural',
      authoritative: 'en-US-DavisNeural',
      friendly: 'en-US-GuyNeural',
      assistant: 'en-US-JennyNeural'
    };
  }

  /**
   * Validate that the byte array contains valid audio data by checking headers
   */
  private validateAudioHeader(bytes: Uint8Array): boolean {
    if (bytes.length < 12) return false;
    
    // Check for RIFF header (WAV format)
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      // Also check for WAVE format
      if (bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
        console.log('🎵 Detected valid WAV audio header');
        return true;
      }
    }
    
    // Check for MP3 frame header
    if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
      console.log('🎵 Detected valid MP3 audio header');
      return true;
    }
    
    // Check for OGG header
    if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
      console.log('🎵 Detected valid OGG audio header');
      return true;
    }
    
    // Check for WebM header
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
      console.log('🎵 Detected valid WebM audio header');
      return true;
    }
    
    console.warn('⚠️ Unknown audio format, allowing anyway...');
    return true; // Allow unknown formats to be more permissive
  }
}
