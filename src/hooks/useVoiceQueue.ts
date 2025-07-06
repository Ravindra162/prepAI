import { useEffect, useRef, useCallback } from 'react';
import { VoiceQueueManager } from '../services/voiceQueueManager';

interface UseVoiceQueueOptions {
  enabled?: boolean;
  autoSpeakNewMessages?: boolean;
}

export function useVoiceQueue(options: UseVoiceQueueOptions = {}) {
  const { enabled = true, autoSpeakNewMessages = true } = options;
  const voiceQueueRef = useRef<VoiceQueueManager | null>(null);
  const lastProcessedMessageRef = useRef<string>('');

  // Initialize voice queue manager
  useEffect(() => {
    voiceQueueRef.current = new VoiceQueueManager();
    
    return () => {
      if (voiceQueueRef.current) {
        voiceQueueRef.current.destroy();
      }
    };
  }, []);

  // Update enabled state
  useEffect(() => {
    if (voiceQueueRef.current) {
      voiceQueueRef.current.setEnabled(enabled);
    }
  }, [enabled]);

  const addToQueue = useCallback((text: string, messageId?: string) => {
    if (voiceQueueRef.current && enabled && autoSpeakNewMessages) {
      voiceQueueRef.current.addMessage(text, messageId);
    }
  }, [enabled, autoSpeakNewMessages]);

  const stopAll = useCallback(() => {
    if (voiceQueueRef.current) {
      voiceQueueRef.current.stopAll();
    }
  }, []);

  const clearHistory = useCallback(() => {
    if (voiceQueueRef.current) {
      voiceQueueRef.current.clearSpokenHistory();
    }
  }, []);

  const getStatus = useCallback(() => {
    return voiceQueueRef.current?.getQueueStatus() || {
      queueLength: 0,
      isProcessing: false,
      isEnabled: false
    };
  }, []);

  // Auto-process new messages
  const processNewMessage = useCallback((message: string, messageId?: string) => {
    if (!message || !message.trim()) return;
    
    // Create a unique ID based on content if not provided
    const id = messageId || `${Date.now()}_${message.substring(0, 20)}`;
    
    // Only process if this is a new message
    if (id !== lastProcessedMessageRef.current) {
      lastProcessedMessageRef.current = id;
      addToQueue(message, id);
    }
  }, [addToQueue]);

  return {
    addToQueue,
    stopAll,
    clearHistory,
    getStatus,
    processNewMessage,
    isEnabled: enabled
  };
}
