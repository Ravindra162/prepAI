import { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Mic, MicOff, Settings } from 'lucide-react';

interface VideoInterfaceProps {
  isCompact?: boolean;
}

export function VideoInterface({ isCompact = false }: VideoInterfaceProps) {
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleCamera = async () => {
    try {
      if (!isCameraEnabled) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: isMicEnabled 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsCameraEnabled(true);
      } else {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setIsCameraEnabled(false);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const toggleMic = async () => {
    try {
      if (!isMicEnabled && isCameraEnabled && stream) {
        // If camera is already on, we need to get a new stream with audio
        stream.getTracks().forEach(track => track.stop());
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } else if (isMicEnabled && stream) {
        // Turn off mic by getting stream without audio
        stream.getTracks().forEach(track => track.stop());
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: isCameraEnabled, 
          audio: false 
        });
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      }
      setIsMicEnabled(!isMicEnabled);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  if (isCompact) {
    return (
      <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
        {/* AI Avatar - Compact */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm">
            <div className="w-1 h-1 bg-white rounded-full mx-auto mt-0.5 animate-pulse"></div>
          </div>
        </div>
        
        {/* Candidate Video - Compact */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 shadow-lg">
            {isCameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                <CameraOff className="h-3 w-3 text-gray-300" />
              </div>
            )}
          </div>
          {/* Status indicators */}
          <div className="absolute -top-1 -right-1 flex space-x-1">
            {isCameraEnabled && (
              <div className="w-2 h-2 bg-red-500 rounded-full shadow-sm animate-pulse"></div>
            )}
          </div>
        </div>

        {/* Quick Controls */}
        <div className="flex space-x-1">
          <button
            onClick={toggleCamera}
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              isCameraEnabled 
                ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 shadow-lg' 
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
            title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isCameraEnabled ? <Camera className="h-3 w-3" /> : <CameraOff className="h-3 w-3" />}
          </button>
          <button
            onClick={toggleMic}
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              isMicEnabled 
                ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30 shadow-lg' 
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
            title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isMicEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 shadow-2xl border border-gray-700">
      <div className="text-center mb-6">
        <h3 className="text-white font-semibold text-lg mb-2">Interview Session</h3>
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-sm font-medium">Live</span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* AI Interviewer */}
        <div className="text-center">
          <div className="relative mx-auto w-28 h-28 mb-4">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                <span className="text-white text-2xl font-bold">AI</span>
              </div>
            </div>
            {/* Active indicator */}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-900 flex items-center justify-center shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
            {/* Pulse animation */}
            <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping"></div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
            <p className="text-white text-sm font-medium">AI Interviewer</p>
            <p className="text-green-400 text-xs">Speaking...</p>
          </div>
        </div>

        {/* Candidate Video */}
        <div className="text-center">
          <div className="relative mx-auto mb-4">
            <div className="w-40 h-32 rounded-xl overflow-hidden bg-gray-800 shadow-2xl border-2 border-gray-700">
              {isCameraEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                  <div className="text-center">
                    <CameraOff className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-xs">Camera Off</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Status indicators */}
            <div className="absolute top-3 right-3 flex space-x-2">
              {isCameraEnabled && (
                <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg flex items-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>REC</span>
                </div>
              )}
              {isMicEnabled && (
                <div className="bg-green-500 text-white p-1 rounded-full shadow-lg">
                  <Mic className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
            <p className="text-white text-sm font-medium">You</p>
            <p className="text-gray-400 text-xs">
              {isCameraEnabled ? 'Camera On' : 'Camera Off'} • {isMicEnabled ? 'Mic On' : 'Mic Off'}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={toggleCamera}
          className={`group relative p-4 rounded-full transition-all duration-300 transform hover:scale-110 ${
            isCameraEnabled 
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-xl shadow-blue-500/25' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300 shadow-lg'
          }`}
          title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraEnabled ? <Camera className="h-6 w-6" /> : <CameraOff className="h-6 w-6" />}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            </div>
          </div>
        </button>
        
        <button
          onClick={toggleMic}
          className={`group relative p-4 rounded-full transition-all duration-300 transform hover:scale-110 ${
            isMicEnabled 
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-xl shadow-green-500/25' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300 shadow-lg'
          }`}
          title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
            </div>
          </div>
        </button>

        <button
          className="group relative p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 shadow-lg transition-all duration-300 transform hover:scale-110"
          title="Settings"
        >
          <Settings className="h-6 w-6" />
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Settings
            </div>
          </div>
        </button>
      </div>

      {/* Connection Status */}
      <div className="text-center pt-4 border-t border-gray-700">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
          <span className="text-green-400 text-sm font-medium">Connected</span>
          <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
          <span className="text-gray-400 text-xs">Secure Connection</span>
        </div>
      </div>
    </div>
  );
}
