import { useState } from 'react';
import { useInterview } from '../contexts/InterviewContext';
import { Clock, CheckCircle, MessageSquare, Code } from 'lucide-react';
import { ResizablePanels } from './ResizablePanels';
import { VideoInterface } from './VideoInterface';
import { ResizableVideoChatPanels } from './ResizableVideoChatPanels';
import { ResizableCodingPanels } from './ResizableCodingPanels';

export function InterviewSession() {
  const {
    phase,
    candidateInfo,
    currentProblem,
    messages,
    code,
    language,
    testResults,
    isExecuting,
    evaluation,
    interviewDuration,
    actions,
    INTERVIEW_PHASES
  } = useInterview();

  const [newMessage, setNewMessage] = useState('');

  // Get the last AI message for voice playback
  const lastAIMessage = messages
    .filter(msg => msg.type === 'interviewer')
    .slice(-1)[0]?.content || '';

  // Debug current state with more details
  console.log('🎯 InterviewSession render:', {
    phase,
    phaseType: typeof phase,
    phaseValues: INTERVIEW_PHASES,
    hasProblem: !!currentProblem,
    problemTitle: currentProblem?.title,
    testResults: testResults ? `${testResults.passedTests}/${testResults.totalTests}` : 'none',
    codeLength: code.length,
    showEditor: currentProblem && (phase === INTERVIEW_PHASES.CODING || phase === INTERVIEW_PHASES.TESTING || phase === INTERVIEW_PHASES.CONCLUSION)
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    actions.sendMessage(newMessage);
    setNewMessage('');
  };

  const handleVoiceToText = (text: string) => {
    setNewMessage(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPhaseDisplay = () => {
    switch (phase) {
      case INTERVIEW_PHASES.INTRODUCTION:
        return { name: 'Introduction', color: 'blue' };
      case INTERVIEW_PHASES.PROBLEM_PRESENTATION:
        return { name: 'Problem Presentation', color: 'purple' };
      case INTERVIEW_PHASES.CODING:
        return { name: 'Coding Phase', color: 'green' };
      case INTERVIEW_PHASES.TESTING:
        return { name: 'Testing & Evaluation', color: 'yellow' };
      case INTERVIEW_PHASES.CONCLUSION:
        return { name: 'Conclusion', color: 'gray' };
      case INTERVIEW_PHASES.COMPLETED:
        return { name: 'Completed', color: 'green' };
      default:
        return { name: 'Unknown', color: 'gray' };
    }
  };

  const phaseInfo = getPhaseDisplay();

  if (phase === INTERVIEW_PHASES.COMPLETED) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Interview Completed!
            </h1>
            <p className="text-gray-600">
              Thank you for participating in the technical interview.
            </p>
          </div>

          {evaluation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">
                Interview Evaluation
              </h2>
              <p className="text-blue-800 whitespace-pre-line">
                {evaluation}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Clock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Total Duration</p>
              <p className="text-xl font-semibold text-gray-900">
                {actions.formatTime(interviewDuration)}
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <MessageSquare className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Messages Exchanged</p>
              <p className="text-xl font-semibold text-gray-900">
                {messages.length}
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Code className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Problem Attempted</p>
              <p className="text-xl font-semibold text-gray-900">
                {currentProblem?.title || 'None'}
              </p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={actions.resetInterview}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start New Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Status Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${phaseInfo.color}-100 text-${phaseInfo.color}-800`}>
              {phaseInfo.name}
            </span>
            {candidateInfo?.name && (
              <span className="text-gray-600 text-sm">
                Interviewing: {candidateInfo.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Video Interface - Compact */}
            <VideoInterface isCompact={true} />
            
            {/* Timer */}
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {actions.formatTime(interviewDuration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanels
          defaultLeftWidth={35}
          minLeftWidth={25}
          maxLeftWidth={60}
          leftPanel={
            <ResizableVideoChatPanels
              messages={messages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleSendMessage={handleSendMessage}
              handleVoiceToText={handleVoiceToText}
              lastAIMessage={lastAIMessage}
              handleKeyPress={handleKeyPress}
              onRequestHint={actions.requestHint}
              onEndInterview={() => actions.endInterview()}
              phase={phase}
              INTERVIEW_PHASES={INTERVIEW_PHASES}
            />
          }
          rightPanel={
            currentProblem && (
              phase === INTERVIEW_PHASES.CODING || 
              phase === INTERVIEW_PHASES.TESTING || 
              phase === INTERVIEW_PHASES.CONCLUSION ||
              (currentProblem && testResults)
            ) ? (
              <ResizableCodingPanels
                currentProblem={currentProblem}
                code={code}
                language={language}
                testResults={testResults}
                isExecuting={isExecuting}
                onCodeChange={actions.updateCode}
                onLanguageChange={actions.setLanguage}
                onExecuteCode={actions.executeCode}
              />
            ) : (
              <div className="h-full bg-white flex items-center justify-center">
                <div className="text-center">
                  <Code className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {phase === INTERVIEW_PHASES.INTRODUCTION ? 
                      'Interview Starting' : 
                      'No Problem Assigned Yet'}
                  </h3>
                  <p className="text-gray-600">
                    {phase === INTERVIEW_PHASES.INTRODUCTION ? 
                      'Continue with the introduction in the chat panel.' :
                      'Continue with the interview chat to receive your coding problem.'}
                  </p>
                </div>
              </div>
            )
          }
        />
      </div>
    </div>
  );
}
