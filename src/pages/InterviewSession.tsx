import { useParams } from 'react-router-dom';
import { InterviewProvider } from '../contexts/InterviewContext';
import { InterviewSession as InterviewSessionComponent } from '../components/InterviewSession';

function InterviewSessionContent() {
  const { sessionId } = useParams<{ sessionId: string }>();

  if (!sessionId) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Invalid session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">AI Technical Interview</h1>
            <p className="text-blue-100 text-sm">
              Session: {sessionId}
            </p>
          </div>
          <div className="text-blue-100 text-sm">
            Real-time coding interview with AI guidance
          </div>
        </div>
      </div>
      
      {/* Main Content - Full Height */}
      <div className="flex-1 overflow-hidden">
        <InterviewSessionComponent />
      </div>
    </div>
  );
}

export function InterviewSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  
  return (
    <InterviewProvider sessionId={sessionId}>
      <InterviewSessionContent />
    </InterviewProvider>
  );
}
