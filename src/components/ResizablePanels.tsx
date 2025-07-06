import { useState, useRef, useEffect, ReactNode } from 'react';

interface ResizablePanelsProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  defaultLeftWidth?: number; // percentage (0-100)
  minLeftWidth?: number; // percentage
  maxLeftWidth?: number; // percentage
  className?: string;
}

export function ResizablePanels({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80,
  className = ''
}: ResizablePanelsProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const newLeftWidth = ((e.clientX - containerRect.left) / containerWidth) * 100;
    
    // Constrain within min/max bounds
    const constrainedWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));
    setLeftWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  // On mobile, stack vertically instead of side by side
  if (isMobile) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {/* Left Panel - Top half on mobile */}
        <div className="flex flex-col h-1/2 border-b border-gray-300">
          {leftPanel}
        </div>

        {/* Right Panel - Bottom half on mobile */}
        <div className="flex flex-col h-1/2">
          {rightPanel}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex h-full ${className}`}>
      {/* Left Panel */}
      <div 
        className="flex flex-col"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </div>

      {/* Resizer */}
      <div
        className={`w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize transition-colors relative group ${
          isDragging ? 'bg-blue-500' : ''
        }`}
        onMouseDown={handleMouseDown}
      >
        {/* Visual indicator */}
        <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
          <div className="w-1 h-8 bg-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          </div>
        </div>
        
        {/* Drag handle dots */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div 
        className="flex flex-col"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPanel}
      </div>
    </div>
  );
}
