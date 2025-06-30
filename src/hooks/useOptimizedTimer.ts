import { useState, useEffect, useRef, useCallback } from 'react';

interface UseOptimizedTimerOptions {
  startTime: Date | null;
  isActive: boolean;
  updateInterval?: number; // How often to update the displayed time (default: 1000ms)
}

export function useOptimizedTimer({ 
  startTime, 
  isActive, 
  updateInterval = 1000 
}: UseOptimizedTimerOptions) {
  const [displayedDuration, setDisplayedDuration] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);

  // Format time without causing re-renders
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (isActive && startTime) {
      intervalRef.current = window.setInterval(() => {
        const currentTime = Date.now();
        const elapsed = Math.floor((currentTime - startTime.getTime()) / 1000);
        
        // Only update state if the displayed time has actually changed
        if (elapsed !== lastUpdateRef.current) {
          lastUpdateRef.current = elapsed;
          setDisplayedDuration(elapsed);
        }
      }, updateInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, startTime, updateInterval]);

  // Calculate current duration without triggering re-renders
  const getCurrentDuration = useCallback(() => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime.getTime()) / 1000);
  }, [startTime]);

  return {
    displayedDuration,
    getCurrentDuration,
    formatTime,
    formattedTime: formatTime(displayedDuration)
  };
}
