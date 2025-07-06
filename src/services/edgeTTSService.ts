export class EdgeTTSService {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor() {
    this.initAudioContext();
  }

  private async initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }
  }

  private async connectToEdgeTTS(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use the correct Edge TTS WebSocket endpoint with proper parameters
        const connectionId = this.generateRequestId();
        const websocketUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/realtimestreaming/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${connectionId}`;
        
        console.log('🔗 Connecting to EdgeTTS WebSocket...');
        this.socket = new WebSocket(websocketUrl);

        this.socket.onopen = () => {
          console.log('✅ EdgeTTS WebSocket connected successfully');
          this.isConnected = true;
          resolve();
        };

        this.socket.onerror = (error) => {
          console.error('❌ EdgeTTS WebSocket error:', error);
          this.isConnected = false;
          reject(new Error('Failed to connect to EdgeTTS service'));
        };

        this.socket.onclose = (event) => {
          console.log('🔌 EdgeTTS WebSocket disconnected, code:', event.code, 'reason:', event.reason);
          this.isConnected = false;
        };

        // Set a connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            this.socket?.close();
            reject(new Error('EdgeTTS connection timeout'));
          }
        }, 10000); // 10 second timeout

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  async speak(text: string, voice = 'en-US-AriaNeural'): Promise<void> {
    if (!this.audioContext) {
      await this.initAudioContext();
    }

    try {
      await this.synthesizeViaWebSocket(text, voice);
    } catch (error) {
      console.error('❌ EdgeTTS synthesis failed:', error);
      throw error;
    }
  }

  private async synthesizeViaWebSocket(text: string, voice: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isConnected) {
          await this.connectToEdgeTTS();
        }

        if (!this.socket || !this.isConnected) {
          throw new Error('WebSocket not connected');
        }

        const requestId = this.generateRequestId();
        const audioChunks: ArrayBuffer[] = [];

        this.socket.onmessage = async (event) => {
          if (typeof event.data === 'string') {
            const message = event.data;
            console.log('📨 Received message:', message.substring(0, 100) + '...');
            
            if (message.includes('Path:turn.end')) {
              console.log('🎵 Audio synthesis completed, processing chunks:', audioChunks.length);
              try {
                if (audioChunks.length === 0) {
                  throw new Error('No audio data received');
                }
                
                const audioBuffer = await this.combineAudioChunks(audioChunks);
                console.log('🔊 Playing audio buffer, size:', audioBuffer.byteLength, 'bytes');
                await this.playAudioBuffer(audioBuffer);
                resolve();
              } catch (error) {
                console.error('❌ Audio processing error:', error);
                reject(error);
              }
            }
          } else if (event.data instanceof ArrayBuffer) {
            console.log('📦 Received audio chunk, size:', event.data.byteLength, 'bytes');
            audioChunks.push(event.data);
          } else if (event.data instanceof Blob) {
            console.log('📦 Received audio blob, size:', event.data.size, 'bytes');
            const arrayBuffer = await event.data.arrayBuffer();
            audioChunks.push(arrayBuffer);
          }
        };

        // Send configuration message
        const configMessage = this.createConfigMessage(requestId);
        this.socket.send(configMessage);

        // Send SSML message
        const ssmlMessage = this.createSSMLMessage(requestId, text, voice);
        this.socket.send(ssmlMessage);
      } catch (error) {
        reject(error);
      }
    });
  }

  private createConfigMessage(requestId: string): string {
    const config = {
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: "false",
              wordBoundaryEnabled: "false"
            },
            outputFormat: "webm-24khz-16bit-mono-opus"
          }
        }
      }
    };
    
    return `Path: speech.config\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${new Date().toISOString()}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(config)}`;
  }

  private createSSMLMessage(requestId: string, text: string, voice: string): string {
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'>${this.escapeXml(text)}</voice></speak>`;
    return `Path: ssml\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${new Date().toISOString()}\r\nContent-Type: application/ssml+xml\r\n\r\n${ssml}`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private generateRequestId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private async combineAudioChunks(chunks: ArrayBuffer[]): Promise<ArrayBuffer> {
    if (chunks.length === 0) {
      throw new Error('No audio chunks to combine');
    }
    
    console.log('🔗 Combining', chunks.length, 'audio chunks');
    
    // Skip the first chunk if it contains headers (typical for WebM/binary formats)
    let startIndex = 0;
    if (chunks[0] && chunks[0].byteLength < 1000) {
      // First chunk might be headers, skip it if it's very small
      startIndex = 1;
    }
    
    const relevantChunks = chunks.slice(startIndex);
    if (relevantChunks.length === 0) {
      throw new Error('No valid audio chunks found');
    }
    
    const totalLength = relevantChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of relevantChunks) {
      combined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    console.log('✅ Combined audio size:', combined.buffer.byteLength, 'bytes');
    return combined.buffer;
  }

  private async playAudioBuffer(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        console.log('🔄 Resuming suspended AudioContext');
        await this.audioContext.resume();
      }

      console.log('🎵 Decoding audio data...');
      
      // Try to decode the audio data
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
      } catch (decodeError) {
        console.error('❌ Audio decode failed, trying with different approach:', decodeError);
        
        // If WebM/Opus decode fails, the server might have sent a different format
        // Try with a fresh copy of the data
        const dataCopy = audioData.slice(0);
        audioBuffer = await this.audioContext.decodeAudioData(dataCopy);
      }
      
      console.log('✅ Audio decoded successfully, duration:', audioBuffer.duration, 'seconds');
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      this.currentSource = source;

      return new Promise((resolve, reject) => {
        source.onended = () => {
          console.log('🎵 Audio playback completed');
          this.currentSource = null;
          resolve();
        };

        try {
          console.log('▶️ Starting audio playback');
          source.start();
        } catch (error) {
          console.error('❌ Failed to start audio playback:', error);
          this.currentSource = null;
          reject(error);
        }
      });
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Audio playback failed: ${errorMessage}`);
    }
  }

  stopAudio(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource = null;
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
  }

  disconnect(): void {
    this.stopAudio();
    if (this.socket && this.isConnected) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }
}
