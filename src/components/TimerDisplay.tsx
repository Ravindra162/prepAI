import { memo } from 'react';
import { Clock } from 'lucide-react';
import { useOptimizedTimer } from '../hooks/useOptimizedTimer';

interface TimerDisplayProps {
  startTime: Date | null;
  isActive: boolean;
  className?: string;
}

export const TimerDisplay = memo(function TimerDisplay({ 
  startTime, 
  isActive, 
  className = '' 
}: TimerDisplayProps) {
  const { formattedTime } = useOptimizedTimer({
    startTime,
    isActive,
    updateInterval: 1000 // Update every second, but only this component re-renders
  });

  return (
    <div className={`flex items-center space-x-2 text-gray-600 ${className}`}>
      <Clock className="h-4 w-4" />
      <span className="text-sm font-medium">
        {formattedTime}
      </span>
    </div>
  );
});
