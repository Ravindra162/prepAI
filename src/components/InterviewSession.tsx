import { useState, useMemo, useEffect, useRef } from 'react';
import { useInterview } from '../contexts/InterviewContext';
import { CheckCircle, Code } from 'lucide-react';
import { ResizablePanels } from './ResizablePanels';
import { VideoInterface } from './VideoInterface';
import { ResizableVideoChatPanels } from './ResizableVideoChatPanels';
import { ResizableCodingPanels } from './ResizableCodingPanels';
import { TimerDisplay } from './TimerDisplay';
import { VoiceControls } from './VoiceControls';
import { InterviewEvaluation } from './InterviewEvaluation';
import { useVoiceQueue } from '../hooks/useVoiceQueue';
import { memo } from 'react';

export const InterviewSession = memo(function InterviewSession() {
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
    interviewStartTime,
    actions,
    INTERVIEW_PHASES
  } = useInterview();

  const [newMessage, setNewMessage] = useState('');
  
  // Voice queue for speaking interviewer messages
  const { processNewMessage: speakMessage, isEnabled: voiceEnabled } = useVoiceQueue({
    enabled: true,
    autoSpeakNewMessages: true
  });
  
  // Track the last processed message to avoid duplicate speaking
  const lastMessageCountRef = useRef(0);

  // Process new interviewer messages for voice synthesis
  useEffect(() => {
    if (!voiceEnabled) return;

    const currentMessageCount = messages.length;
    
    // Only process if we have new messages
    if (currentMessageCount > lastMessageCountRef.current) {
      // Check for new interviewer messages
      const newMessages = messages.slice(lastMessageCountRef.current);
      
      newMessages.forEach((message, index) => {
        if (message.type === 'interviewer') {
          // Create a unique ID for this message
          const messageId = `${message.timestamp.getTime()}_${lastMessageCountRef.current + index}`;
          speakMessage(message.content, messageId);
        }
      });
      
      lastMessageCountRef.current = currentMessageCount;
    }
  }, [messages, voiceEnabled, speakMessage]);

  // Memoize computed values to prevent unnecessary recalculations
  const phaseInfo = useMemo(() => {
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
  }, [phase, INTERVIEW_PHASES]);

  const shouldShowEditor = useMemo(() => 
    currentProblem && (
      phase === INTERVIEW_PHASES.CODING || 
      phase === INTERVIEW_PHASES.TESTING || 
      phase === INTERVIEW_PHASES.CONCLUSION ||
      (currentProblem && testResults)
    ),
    [currentProblem, phase, testResults, INTERVIEW_PHASES]
  );

  // Remove debug logging to prevent unnecessary re-renders
  // console.log('🎯 InterviewSession render:', {
  //   phase,
  //   phaseType: typeof phase,
  //   phaseValues: INTERVIEW_PHASES,
  //   hasProblem: !!currentProblem,
  //   problemTitle: currentProblem?.title,
  //   testResults: testResults ? `${testResults.passedTests}/${testResults.totalTests}` : 'none',
  //   codeLength: code.length,
  //   shouldShowEditor
  // });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    actions.sendMessage(newMessage);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (phase === INTERVIEW_PHASES.COMPLETED && evaluation) {
    return (
      <InterviewEvaluation
        evaluation={evaluation}
        candidateInfo={candidateInfo || { name: 'Candidate', email: '' }}
        sessionSummary={{
          duration: interviewDuration,
          problemsSolved: currentProblem ? 1 : 0,
          codeExecutions: 0, // This would need to be tracked in context
          hintsUsed: 0, // This would need to be tracked in context
          testsPassed: testResults?.passedTests || 0,
          totalTests: testResults?.totalTests || 0
        }}
        onStartNewInterview={() => {
          // This would need to be implemented to reset the interview state
          window.location.reload();
        }}
        onBackToHome={() => {
          // This would need to navigate back to the home page
          window.location.href = '/';
        }}
      />
    );
  }

  // Show loading/completion message if completed but no evaluation yet
  if (phase === INTERVIEW_PHASES.COMPLETED) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Interview Completed!
          </h1>
          <p className="text-gray-600 mb-4">
            Processing your evaluation...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
            {/* Voice Controls */}
            <VoiceControls className="flex-shrink-0" />
            {/* Video Interface - Compact */}
            <VideoInterface isCompact={true} />
            {/* Timer - Optimized to prevent re-renders */}
            <TimerDisplay
              startTime={interviewStartTime}
              isActive={true}
            />
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
              handleKeyPress={handleKeyPress}
              onRequestHint={actions.requestHint}
              onEndInterview={() => actions.endInterview()}
              phase={phase}
              INTERVIEW_PHASES={INTERVIEW_PHASES}
            />
          }
          rightPanel={
            shouldShowEditor ? (
              <ResizableCodingPanels
                currentProblem={currentProblem}
                code={code}
                language={language}
                testResults={testResults}
                isExecuting={isExecuting}
                currentPhase={phase}
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
});
