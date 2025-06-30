import { EdgeTTSClient } from './edgeTTSClient';

interface VoiceQueueItem {
  id: string;
  text: string;
  timestamp: Date;
}

export class VoiceQueueManager {
  private queue: VoiceQueueItem[] = [];
  private isProcessing = false;
  private edgeTTS: EdgeTTSClient;
  private isEnabled = true;
  private spokenMessageIds = new Set<string>();

  constructor() {
    this.edgeTTS = new EdgeTTSClient();
  }

  addMessage(text: string, messageId?: string): void {
    if (!this.isEnabled || !text.trim()) {
      return;
    }

    const id = messageId || this.generateMessageId(text);
    
    // Prevent duplicate messages
    if (this.spokenMessageIds.has(id)) {
      console.log('🔇 Message already spoken, skipping:', text.substring(0, 50) + '...');
      return;
    }

    const queueItem: VoiceQueueItem = {
      id,
      text: text.trim(),
      timestamp: new Date()
    };

    this.queue.push(queueItem);
    console.log('🎤 Added to voice queue:', text.substring(0, 50) + '...');
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log('🎯 Starting voice queue processing, items:', this.queue.length);

    while (this.queue.length > 0 && this.isEnabled) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        console.log('🗣️ Speaking via EdgeTTS:', item.text.substring(0, 50) + '...');
        
        // Mark as spoken before speaking to prevent duplicates
        this.spokenMessageIds.add(item.id);
        
        await this.edgeTTS.speak(item.text, { voice: 'en-US-AriaNeural' });
        
        console.log('✅ EdgeTTS completed for:', item.text.substring(0, 50) + '...');
        
        // Small delay between messages for natural flow
        await this.delay(500);
      } catch (error) {
        console.error('❌ Speech synthesis failed for message:', item.text.substring(0, 50) + '...', error);
        // Remove from spoken set so it can be retried later
        this.spokenMessageIds.delete(item.id);
      }
    }

    this.isProcessing = false;
    console.log('🏁 Voice queue processing completed');
  }

  private generateMessageId(text: string): string {
    // Generate a consistent ID based on text content and timestamp
    const content = text.trim().toLowerCase();
    const hash = this.simpleHash(content);
    return `msg_${hash}_${Date.now()}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
    console.log(enabled ? '🔊 Voice queue enabled' : '🔇 Voice queue disabled');
  }

  stopAll(): void {
    console.log('🛑 Stopping all voice playback');
    this.queue.length = 0; // Clear queue
    this.isProcessing = false;
    this.edgeTTS.stopSpeaking();
    
    // Stop browser TTS as well
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  clearSpokenHistory(): void {
    this.spokenMessageIds.clear();
    console.log('🗑️ Cleared spoken message history');
  }

  getQueueStatus(): { queueLength: number; isProcessing: boolean; isEnabled: boolean } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      isEnabled: this.isEnabled
    };
  }

  destroy(): void {
    this.stopAll();
    this.spokenMessageIds.clear();
  }
}
