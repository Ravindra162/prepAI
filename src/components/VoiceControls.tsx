import { useState } from 'react';
import { Volume2, VolumeX, Pause, Play, SkipForward } from 'lucide-react';
import { useVoiceQueue } from '../hooks/useVoiceQueue';

interface VoiceControlsProps {
  className?: string;
}

export function VoiceControls({ className = '' }: VoiceControlsProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const { stopAll, clearHistory, getStatus } = useVoiceQueue({ enabled: isEnabled });
  const [showStatus, setShowStatus] = useState(false);

  const handleToggleVoice = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    
    if (!newEnabled) {
      stopAll();
    }
  };

  const handleStopAll = () => {
    stopAll();
  };

  const handleClearHistory = () => {
    clearHistory();
  };

  const status = getStatus();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Voice Enable/Disable Toggle */}
      <button
        onClick={handleToggleVoice}
        className={`p-2 rounded-lg transition-colors ${
          isEnabled
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        }`}
        title={isEnabled ? 'Disable AI voice' : 'Enable AI voice'}
      >
        {isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>

      {/* Stop Speaking Button */}
      {isEnabled && (
        <button
          onClick={handleStopAll}
          className="p-2 rounded-lg transition-colors bg-red-100 text-red-600 hover:bg-red-200"
          title="Stop speaking"
        >
          <Pause className="h-4 w-4" />
        </button>
      )}

      {/* Clear History Button */}
      {isEnabled && (
        <button
          onClick={handleClearHistory}
          className="p-2 rounded-lg transition-colors bg-orange-100 text-orange-600 hover:bg-orange-200"
          title="Clear spoken message history"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      )}

      {/* Status Indicator */}
      {isEnabled && (
        <div 
          className="relative"
          onMouseEnter={() => setShowStatus(true)}
          onMouseLeave={() => setShowStatus(false)}
        >
          <div className={`w-2 h-2 rounded-full ${
            status.isProcessing ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
          }`} />
          
          {showStatus && (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              Queue: {status.queueLength} | {status.isProcessing ? 'Speaking...' : 'Idle'}
            </div>
          )}
        </div>
      )}

      {/* Voice Status Text */}
      {isEnabled && status.isProcessing && (
        <span className="text-xs text-green-600 animate-pulse">
          Speaking...
        </span>
      )}
    </div>
  );
}
