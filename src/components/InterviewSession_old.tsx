import { useState } from 'react';
import { useInterview } from '../contexts/InterviewContext';
import { Clock, CheckCircle, MessageSquare, Code, Play } from 'lucide-react';
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
                <>
                  {/* Problem Description - Compact version */}
                  <div className="bg-gray-50 p-3 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {currentProblem.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        currentProblem.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                        currentProblem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {currentProblem.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      {currentProblem.description}
                    </p>
                    <div className="text-xs text-gray-600 mb-2">
                      <strong>Constraints:</strong> {currentProblem.constraints}
                    </div>
                    
                    {/* Show test cases for reference - Compact */}
                    {currentProblem.test_cases && currentProblem.test_cases.length > 0 && (
                      <div className="text-xs text-gray-600">
                        <strong>Test Cases ({currentProblem.test_cases.length} total):</strong>
                        <div className="space-y-1 mt-1 max-h-24 overflow-y-auto">
                          {currentProblem.test_cases.map((testCase, index) => (
                            <div key={index} className="bg-white p-2 rounded border text-xs">
                              <div><strong>Test {index + 1}:</strong></div>
                              <div><strong>Input:</strong> {JSON.stringify(testCase.input)}</div>
                              <div><strong>Expected:</strong> {JSON.stringify(testCase.expected_output)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Code Editor */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between p-3 bg-gray-100 border-b border-gray-200 flex-shrink-0">
                      <LanguageSelector
                        value={language}
                        onChange={actions.setLanguage}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={actions.executeCode}
                          disabled={isExecuting || !code.trim()}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          <Play className="h-4 w-4" />
                          <span>
                            {isExecuting ? 'Running...' : 
                             testResults ? 'Run Tests Again' : 'Run Tests'}
                          </span>
                        </button>
                        {phase === INTERVIEW_PHASES.TESTING && testResults && testResults.passedTests === 0 && (
                          <div className="text-xs text-orange-600 flex items-center">
                            💡 Try debugging your solution
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-h-[200px]">
                      <CodeEditor
                        value={code}
                        onChange={actions.updateCode}
                        language={language}
                      />
                    </div>

                    {/* Test Results - Scrollable section */}
                    {testResults && (
                      <div className="h-80 p-4 bg-gray-50 border-t-2 border-gray-300 flex-shrink-0">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 text-base">📊 Test Results</h4>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${
                              testResults.success ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {testResults.passedTests}/{testResults.totalTests} passed
                            </span>
                            {testResults.success && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                ✨ All tests passed!
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {testResults.passedTests === 0 && testResults.totalTests > 0 && (
                          <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="text-sm text-orange-800">
                              <strong>💡 Debugging tips:</strong>
                              <ul className="mt-1 text-xs list-disc list-inside space-y-1">
                                <li>Check if your function returns the correct data type</li>
                                <li>Verify your algorithm logic with the test cases below</li>
                                <li>Make sure you're handling edge cases properly</li>
                              </ul>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex-1 space-y-3 overflow-y-auto max-h-60 bg-white p-2 rounded border">
                          {testResults.testResults.map((result, index) => (
                            <div
                              key={index}
                              className={`text-xs p-3 rounded-lg border-2 ${
                                result.passed ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-sm">Test Case {index + 1}</span>
                                <span className={`font-bold text-sm px-2 py-1 rounded ${
                                  result.passed ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                                }`}>
                                  {result.passed ? '✓ PASS' : '✗ FAIL'}
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div className="bg-white bg-opacity-80 p-2 rounded border">
                                  <div className="font-semibold text-xs mb-1 text-blue-800">📥 Input:</div>
                                  <div className="font-mono text-xs break-words max-h-24 overflow-y-auto bg-blue-50 p-1 rounded">
                                    {typeof result.input === 'string' ? result.input : JSON.stringify(result.input, null, 2)}
                                  </div>
                                </div>
                                <div className="bg-white bg-opacity-80 p-2 rounded border">
                                  <div className="font-semibold text-xs mb-1 text-purple-800">🎯 Expected Output:</div>
                                  <div className="font-mono text-xs break-words max-h-24 overflow-y-auto bg-purple-50 p-1 rounded">
                                    {typeof result.expected === 'string' ? result.expected : JSON.stringify(result.expected, null, 2)}
                                  </div>
                                </div>
                                <div className="bg-white bg-opacity-80 p-2 rounded border">
                                  <div className="font-semibold text-xs mb-1 text-orange-800">📤 Your Output:</div>
                                  <div className={`font-mono text-xs break-words max-h-24 overflow-y-auto p-1 rounded ${
                                    result.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                  }`}>
                                    {result.actual === null || result.actual === undefined ? 
                                      'No output' : 
                                      (typeof result.actual === 'string' ? result.actual : JSON.stringify(result.actual, null, 2))
                                    }
                                  </div>
                                </div>
                                {result.error && (
                                  <div className="bg-red-100 border border-red-300 p-2 rounded">
                                    <div className="font-semibold text-xs mb-1 text-red-800">Error:</div>
                                    <div className="font-mono text-xs text-red-700 break-words">{result.error}</div>
                                    {result.error.includes('Type mismatch') && (
                                      <div className="mt-1 text-xs text-red-600">
                                        💡 <strong>Tip:</strong> Check that your function returns the correct data type (number, string, array, etc.)
                                      </div>
                                    )}
                                    {result.error.includes('ReferenceError') && (
                                      <div className="mt-1 text-xs text-red-600">
                                        💡 <strong>Tip:</strong> Make sure all variables are properly declared and functions are defined
                                      </div>
                                    )}
                                    {result.error.includes('SyntaxError') && (
                                      <div className="mt-1 text-xs text-red-600">
                                        💡 <strong>Tip:</strong> Check for missing brackets, semicolons, or other syntax issues
                                      </div>
                                    )}
                                  </div>
                                )}
                                {result.codeContext && (
                                  <div className="bg-blue-50 border border-blue-200 p-2 rounded">
                                    <div className="font-semibold text-xs mb-2 text-blue-800">🤖 AI Analysis:</div>
                                    <div className="text-xs text-blue-700 space-y-1">
                                      <div><strong>Language:</strong> {result.codeContext.language}</div>
                                      <div className="bg-blue-100 p-2 rounded mt-2">
                                        <div className="font-semibold text-xs mb-1">Code Context Available</div>
                                        <div className="text-xs text-blue-600">
                                          The AI interviewer has access to your code and can provide specific feedback in the chat.
                                          Feel free to ask for hints or explanations!
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {!result.passed && !result.error && result.actual !== null && (
                                  <div className="bg-yellow-100 border border-yellow-300 p-2 rounded">
                                    <div className="text-xs text-yellow-800">
                                      💡 <strong>Logic Issue:</strong> Your code runs but produces incorrect output. 
                                      Review your algorithm and compare expected vs actual results above.
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 pt-2 border-t border-gray-300 flex justify-between items-center text-xs text-gray-600">
                          <div>
                            Execution time: {testResults.executionTime}ms
                          </div>
                          <div className="flex space-x-4">
                            <span className="text-green-600">✓ {testResults.passedTests} passed</span>
                            <span className="text-red-600">✗ {testResults.totalTests - testResults.passedTests} failed</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : currentProblem && phase === INTERVIEW_PHASES.PROBLEM_PRESENTATION ? (
                <div className="flex-1 p-6 bg-gray-50 overflow-y-auto">
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {currentProblem.title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          currentProblem.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                          currentProblem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {currentProblem.difficulty}
                        </span>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-2">Problem Description</h4>
                        <p className="text-gray-700 leading-relaxed">
                          {currentProblem.description}
                        </p>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-2">Constraints</h4>
                        <p className="text-sm text-gray-600">
                          {currentProblem.constraints}
                        </p>
                      </div>
                      
                      {currentProblem.test_cases && currentProblem.test_cases.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-900 mb-3">Test Cases</h4>
                          <div className="space-y-3">
                            {currentProblem.test_cases.slice(0, 3).map((testCase, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm font-medium text-gray-700 mb-1">
                                  Example {index + 1}:
                                </div>
                                <div className="text-sm text-gray-600">
                                  <div className="mb-1">
                                    <span className="font-medium">Input:</span> {JSON.stringify(testCase.input)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Expected Output:</span> {JSON.stringify(testCase.expected_output)}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {currentProblem.test_cases.length > 3 && (
                              <div className="text-sm text-gray-500 text-center">
                                ... and {currentProblem.test_cases.length - 3} more test cases
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-center text-blue-600 mb-2">
                          <Code className="h-5 w-5 mr-2" />
                          <span className="font-medium">Ready to Code?</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Tell the interviewer when you're ready to start coding to begin the implementation phase.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
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
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}
