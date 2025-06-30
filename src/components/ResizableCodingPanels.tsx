import { useState, useRef, useEffect } from 'react';
import { Code, Play, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { LanguageSelector } from './LanguageSelector';
import { INTERVIEW_PHASES } from '../contexts/InterviewContext';

interface Problem {
  question_id: number;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  constraints: string;
  test_cases: Array<{
    input: any;
    expected_output: any;
  }>;
  templates: {
    [key: string]: {
      template: string;
      driver_code?: string;
    };
  };
}

interface TestResult {
  testIndex: number;
  passed: boolean;
  input: any;
  expected: any;
  actual: any;
  error?: string;
}

interface ExecutionResults {
  success: boolean;
  testResults: TestResult[];
  totalTests: number;
  passedTests: number;
  executionTime: number;
  error?: string;
}

interface ResizableCodingPanelsProps {
  currentProblem: Problem | null;
  code: string;
  language: string;
  testResults: ExecutionResults | null;
  isExecuting: boolean;
  currentPhase: string;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  onExecuteCode: () => void;
}

export function ResizableCodingPanels({
  currentProblem,
  code,
  language,
  testResults,
  isExecuting,
  currentPhase,
  onCodeChange,
  onLanguageChange,
  onExecuteCode
}: ResizableCodingPanelsProps) {
  const [problemHeight, setProblemHeight] = useState(25); // Problem description height percentage
  const [codeHeight, setCodeHeight] = useState(50); // Code editor height percentage
  const [isDraggingTop, setIsDraggingTop] = useState(false);
  const [isDraggingBottom, setIsDraggingBottom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTopMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingTop(true);
  };

  const handleBottomMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingBottom(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerHeight = containerRect.height;
    const mouseY = e.clientY - containerRect.top;
    const mousePercentage = (mouseY / containerHeight) * 100;

    if (isDraggingTop) {
      // Dragging between problem and code editor
      const newProblemHeight = Math.min(Math.max(mousePercentage, 15), 60);
      setProblemHeight(newProblemHeight);
      // Adjust code height accordingly, but keep test results minimum
      const remainingHeight = 100 - newProblemHeight;
      const testResultsHeight = 100 - newProblemHeight - codeHeight;
      if (testResultsHeight < 20) {
        setCodeHeight(remainingHeight - 20);
      }
    } else if (isDraggingBottom) {
      // Dragging between code editor and test results
      const testResultsHeight = 100 - mousePercentage;
      const newCodeHeight = mousePercentage - problemHeight;
      
      if (newCodeHeight >= 20 && testResultsHeight >= 15) {
        setCodeHeight(newCodeHeight);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDraggingTop(false);
    setIsDraggingBottom(false);
  };

  useEffect(() => {
    if (isDraggingTop || isDraggingBottom) {
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
  }, [isDraggingTop, isDraggingBottom]);

  const testResultsHeight = 100 - problemHeight - codeHeight;

  if (!currentProblem) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Waiting for problem assignment...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full bg-white flex flex-col">
      {/* Problem Description Panel */}
      <div 
        className="bg-gray-50 border-b border-gray-200 overflow-hidden flex flex-col"
        style={{ height: `${problemHeight}%` }}
      >
        {/* Problem Header */}
        <div className="p-3 border-b border-gray-200 flex-shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-900">{currentProblem.title}</h3>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              currentProblem.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
              currentProblem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {currentProblem.difficulty}
            </span>
          </div>
        </div>

        {/* Problem Content */}
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="prose prose-sm max-w-none">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
              <p className="text-sm text-gray-700 whitespace-pre-line">{currentProblem.description}</p>
            </div>
            
            {currentProblem.constraints && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Constraints</h4>
                <p className="text-sm text-gray-700 whitespace-pre-line">{currentProblem.constraints}</p>
              </div>
            )}

            {currentProblem.test_cases && currentProblem.test_cases.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Example Test Cases</h4>
                {currentProblem.test_cases.slice(0, 2).map((testCase, index) => (
                  <div key={index} className="bg-gray-100 p-2 rounded mb-2">
                    <p className="text-xs font-medium text-gray-600">Input:</p>
                    <code className="text-xs">{JSON.stringify(testCase.input)}</code>
                    <p className="text-xs font-medium text-gray-600 mt-1">Expected Output:</p>
                    <code className="text-xs">{JSON.stringify(testCase.expected_output)}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Resize Handle */}
      <div
        className={`h-2 bg-gray-300 hover:bg-gray-400 cursor-ns-resize flex items-center justify-center relative transition-colors ${
          isDraggingTop ? 'bg-green-400' : ''
        }`}
        onMouseDown={handleTopMouseDown}
      >
        <div className="w-12 h-1 bg-gray-500 rounded-full"></div>
        {isDraggingTop && (
          <div className="absolute inset-x-0 top-0 bottom-0 bg-green-400 opacity-50"></div>
        )}
      </div>

      {/* Code Editor Panel */}
      <div 
        className="bg-white overflow-hidden flex flex-col"
        style={{ height: `${codeHeight}%` }}
      >
        {/* Code Editor Header */}
        <div className="p-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Code className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Code Editor</h3>
            </div>
            <div className="flex items-center space-x-3">
              <LanguageSelector
                value={language}
                onChange={onLanguageChange}
              />
              <button
                onClick={onExecuteCode}
                disabled={isExecuting || currentPhase !== INTERVIEW_PHASES.TESTING}
                className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors text-sm ${
                  currentPhase === INTERVIEW_PHASES.TESTING 
                    ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } disabled:cursor-not-allowed`}
                title={currentPhase !== INTERVIEW_PHASES.TESTING ? 'Code testing is only available in the Testing phase' : ''}
              >
                <Play className="h-3 w-3" />
                <span>
                  {isExecuting ? 'Running...' : 'Run Tests'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Code Editor Content */}
        <div className="flex-1 overflow-hidden">
          <CodeEditor
            value={code}
            language={language}
            onChange={onCodeChange}
          />
        </div>
      </div>

      {/* Bottom Resize Handle */}
      <div
        className={`h-2 bg-gray-300 hover:bg-gray-400 cursor-ns-resize flex items-center justify-center relative transition-colors ${
          isDraggingBottom ? 'bg-blue-400' : ''
        }`}
        onMouseDown={handleBottomMouseDown}
      >
        <div className="w-12 h-1 bg-gray-500 rounded-full"></div>
        {isDraggingBottom && (
          <div className="absolute inset-x-0 top-0 bottom-0 bg-blue-400 opacity-50"></div>
        )}
      </div>

      {/* Test Results Panel */}
      <div 
        className="bg-white border-t border-gray-200 overflow-hidden flex flex-col"
        style={{ height: `${testResultsHeight}%` }}
      >
        {/* Test Results Header */}
        <div className="p-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {testResults?.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <h3 className="text-sm font-semibold text-gray-900">Test Results</h3>
            </div>
            {testResults && (
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                <span>{testResults.passedTests}/{testResults.totalTests} passed</span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{testResults.executionTime}ms</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Test Results Content */}
        <div className="flex-1 p-3 overflow-y-auto">
          {!testResults ? (
            <div className="text-center text-gray-500 text-sm py-8">
              Run your code to see test results...
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.passed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Test Case {index + 1}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      result.passed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">Input:</span>
                      <code className="ml-2 bg-gray-100 px-1 rounded">
                        {JSON.stringify(result.input)}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Expected:</span>
                      <code className="ml-2 bg-gray-100 px-1 rounded">
                        {JSON.stringify(result.expected)}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Actual:</span>
                      <code className={`ml-2 px-1 rounded ${
                        result.passed ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {JSON.stringify(result.actual)}
                      </code>
                    </div>
                    {result.error && (
                      <div>
                        <span className="font-medium text-red-600">Error:</span>
                        <code className="ml-2 bg-red-100 px-1 rounded text-red-700">
                          {result.error}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {testResults.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 mb-1">Execution Error</h4>
                  <code className="text-xs text-red-700 whitespace-pre-line">
                    {testResults.error}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
