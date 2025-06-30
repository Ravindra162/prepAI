import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MessageSquare, Video, Send, HelpCircle } from 'lucide-react';
import { VideoInterface } from './VideoInterface';

interface Message {
  type: 'interviewer' | 'candidate';
  content: string;
  timestamp: Date;
  audio?: {
    buffer: ArrayBuffer;
    contentType: string;
    size: number;
  };
}

interface ResizableVideoChatPanelsProps {
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  onRequestHint?: () => void;
  onEndInterview?: () => void;
  phase?: string;
  INTERVIEW_PHASES?: any;
}

export function ResizableVideoChatPanels({
  messages,
  newMessage,
  setNewMessage,
  handleSendMessage,
  handleKeyPress,
  onRequestHint,
  onEndInterview,
  phase,
  INTERVIEW_PHASES
}: ResizableVideoChatPanelsProps) {
  const [videoHeight, setVideoHeight] = useState(40); // Video panel height percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerHeight = containerRect.height;
    const mouseY = e.clientY - containerRect.top;
    const newVideoHeight = Math.min(Math.max((mouseY / containerHeight) * 100, 20), 70);
    setVideoHeight(newVideoHeight);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const chatHeight = useMemo(() => 100 - videoHeight, [videoHeight]);

  return (
    <div ref={containerRef} className="h-full bg-white flex flex-col">
      {/* Video Panel */}
      <div 
        className="bg-gray-50 border-b border-gray-200 overflow-hidden flex flex-col"
        style={{ height: `${videoHeight}%` }}
      >
        {/* Video Header */}
        <div className="p-3 border-b border-gray-200 flex-shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-900">Video Call</h3>
            </div>
          </div>
        </div>
        {/* Video Content */}
        <div className="flex-1 p-3 overflow-hidden">
          <VideoInterface />
        </div>
      </div>
      {/* Resize Handle */}
      <div
        className={`h-2 bg-gray-300 hover:bg-gray-400 cursor-ns-resize flex items-center justify-center relative transition-colors ${
          isDragging ? 'bg-blue-400' : ''
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="w-12 h-1 bg-gray-500 rounded-full"></div>
        {isDragging && (
          <div className="absolute inset-x-0 top-0 bottom-0 bg-blue-400 opacity-50"></div>
        )}
      </div>
      {/* Chat Panel */}
      <div 
        className="bg-white overflow-hidden flex flex-col"
        style={{ height: `${chatHeight}%` }}
      >
        {/* Chat Header */}
        <div className="p-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Interview Chat</h3>
            </div>
            <div className="text-xs text-gray-500">
              {messages.length} messages
            </div>
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'candidate' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg ${
                  message.type === 'candidate'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{message.content}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-8">
              Interview chat will appear here...
            </div>
          )}
        </div>
        {/* Message Input */}
        <div className="p-3 border-t border-gray-200 flex-shrink-0">
          <div className="flex space-x-2">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 min-h-[40px] max-h-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
              placeholder="Type your message..."
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {/* Action Buttons */}
          <div className="flex justify-between mt-2">
            {onRequestHint && (
              <button
                onClick={onRequestHint}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Request Hint</span>
              </button>
            )}
            {onEndInterview && phase !== INTERVIEW_PHASES?.COMPLETED && (
              <button
                onClick={onEndInterview}
                className="text-sm text-red-600 hover:text-red-800 flex items-center space-x-1"
              >
                <span>End Interview</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
