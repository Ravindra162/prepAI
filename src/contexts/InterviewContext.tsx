import { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { playTTSAudio, AudioData } from '../utils/audioManager';

interface CandidateInfo {
  name: string;
  email: string;
  experience?: string;
  skills?: string[];
}

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

interface TestResult {
  testIndex: number;
  passed: boolean;
  input: any;
  expected: any;
  actual: any;
  error?: string;
  codeContext?: {
    userCode: string;
    language: string;
    testCase: {
      input: any;
      expectedOutput: any;
    };
    errorMessage: string;
    analysisPrompt: string;
  };
}

interface ExecutionResults {
  success: boolean;
  testResults: TestResult[];
  totalTests: number;
  passedTests: number;
  executionTime: number;
  error?: string;
}

interface InterviewStatus {
  duration: number;
  remaining: number;
  progress: number;
  phase: string;
  shouldConclude: boolean;
}

export const INTERVIEW_PHASES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting', 
  INTRODUCTION: 'introduction',
  PROBLEM_PRESENTATION: 'problem-presentation',
  CODING: 'coding',
  TESTING: 'testing',
  CONCLUSION: 'conclusion',
  COMPLETED: 'completed'
} as const;

type InterviewPhase = typeof INTERVIEW_PHASES[keyof typeof INTERVIEW_PHASES];

interface InterviewContextType {
  socket: Socket | null;
  sessionId: string | null;
  phase: InterviewPhase;
  isConnected: boolean;
  candidateInfo: CandidateInfo | null;
  currentProblem: Problem | null;
  messages: Message[];
  code: string;
  language: string;
  testResults: ExecutionResults | null;
  isExecuting: boolean;
  evaluation: string | null;
  interviewStartTime: Date | null;
  interviewDuration: number;
  timeRemaining: number;
  interviewStatus: InterviewStatus | null;
  hintsUsed: number;
  codeMonitoringActive: boolean;
  actions: {
    connectToInterview: () => void;
    startInterview: (candidateInfo: CandidateInfo, resumeData?: any) => void;
    sendMessage: (message: string) => void;
    updateCode: (newCode: string) => void;
    setLanguage: (newLanguage: string) => void;
    executeCode: () => void;
    requestHint: () => void;
    endInterview: (feedback?: string) => void;
    resetInterview: () => void;
    formatTime: (seconds: number) => string;
  };
  INTERVIEW_PHASES: typeof INTERVIEW_PHASES;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export function InterviewProvider({ children, sessionId: initialSessionId }: { children: ReactNode; sessionId?: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [phase, setPhase] = useState<InterviewPhase>(INTERVIEW_PHASES.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo | null>(null);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [testResults, setTestResults] = useState<ExecutionResults | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [interviewStartTime, setInterviewStartTime] = useState<Date | null>(null);
  const [interviewDuration, setInterviewDuration] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes in seconds
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [codeMonitoringActive, setCodeMonitoringActive] = useState(false);
  
  const codeMonitorInterval = useRef<number | null>(null);
  const lastCodeActivity = useRef(Date.now());

  // Activate code monitoring when entering coding phase
  useEffect(() => {
    if (phase === INTERVIEW_PHASES.CODING || phase === INTERVIEW_PHASES.TESTING) {
      setCodeMonitoringActive(true);
    } else {
      setCodeMonitoringActive(false);
    }
  }, [phase]);

  // Auto-connect when provider mounts
  useEffect(() => {
    connectToInterview();
    
    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Connect to interview backend
  const connectToInterview = () => {
    const backendUrl = import.meta.env.BACKENDIP;
    
    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    setPhase(INTERVIEW_PHASES.CONNECTING);
    
    const interviewSocket = io(backendUrl, {
  path: "/interview-backend/socket.io", // 👈 crucial fix
  transports: ['websocket', 'polling'],
  autoConnect: true,
  forceNew: true,
  timeout: 10000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
    interviewSocket.on('connect', () => {
      setIsConnected(true);
      setSocket(interviewSocket);
      setPhase(INTERVIEW_PHASES.CONNECTING);
      toast.success('Connected to interview backend');
    });

    interviewSocket.on('connect_error', (error) => {
      setIsConnected(false);
      setPhase(INTERVIEW_PHASES.DISCONNECTED);
      toast.error(`Failed to connect: ${error.message}`);
    });

    interviewSocket.on('disconnect', () => {
      setIsConnected(false);
      setPhase(INTERVIEW_PHASES.DISCONNECTED);
      toast('Disconnected from interview backend', {
        icon: '⚠️'
      });
    });

    // Interview event handlers
    interviewSocket.on('interview-started', async (data) => {
      setPhase(data.phase);
      setInterviewStatus(data.interviewStatus);
      
      // Create message with audio support
      const message = await createMessageWithAudio(data.message, data.audio);
      setMessages([message]);
      
      toast.success('Interview started!');
    });

    interviewSocket.on('interviewer-response', async (data) => {
      console.log('📨 Received interviewer-response:', data);
      setPhase(data.phase);
      if (data.timeRemaining !== undefined) {
        setTimeRemaining(data.timeRemaining * 60); // Convert minutes to seconds
      }
      if (data.interviewStatus) {
        setInterviewStatus(data.interviewStatus);
      }
      if (data.hintsUsed !== undefined) {
        setHintsUsed(data.hintsUsed);
      }

      // Create message with audio support
      const message = await createMessageWithAudio(data.message, data.audio);
      setMessages(prev => [...prev, message]);
    });

    interviewSocket.on('problem-assigned', (data) => {
      setCurrentProblem(data.problem);
      setCode(data.problem.templates[language]?.template || '');
      // Don't automatically switch to coding phase - wait for explicit phase transition
      setCodeMonitoringActive(false); // Only activate when actually in coding phase
      toast.success(`Problem assigned: ${data.problem.title}`);
    });

    interviewSocket.on('execution-results', (data) => {
      console.log('🧪 Received execution-results:', data);
      setTestResults(data);
      setIsExecuting(false);
      
      // Update phase if included in execution results
      if (data.phase) {
        console.log('🔄 Updating phase from execution results:', data.phase);
        setPhase(data.phase);
      }
      
      if (data.interviewStatus) {
        setInterviewStatus(data.interviewStatus);
      }
      
      if (data.success) {
        toast.success(`All tests passed! (${data.passedTests}/${data.totalTests})`);
      } else {
        toast.error(`${data.passedTests}/${data.totalTests} tests passed`);
      }
    });

    interviewSocket.on('gentle-encouragement', async (data) => {
      // Create message with audio support
      const message = await createMessageWithAudio(data.message, data.audio);
      setMessages(prev => [...prev, message]);
      
      toast('Gentle guidance from interviewer', { 
        icon: 'ℹ️',
        style: {
          background: '#3b82f6',
          color: '#ffffff'
        }
      });
    });

    interviewSocket.on('progress-update', (data) => {
      if (data.timeRemaining !== undefined) {
        setTimeRemaining(data.timeRemaining * 60);
      }
    });

    interviewSocket.on('language-changed', (data) => {
      setLanguage(data.language);
      setCode(data.template);
      toast.success(`Language changed to ${data.language}`);
    });

    interviewSocket.on('interview-completed', async (data) => {
      // Handle evaluation with audio
      if (data.audio) {
        try {
          await playTTSAudio(data.audio);
        } catch (error) {
          console.error('Failed to play evaluation audio:', error);
        }
      }
      
      setEvaluation(data.evaluation);
      setPhase(INTERVIEW_PHASES.COMPLETED);
      setCodeMonitoringActive(false);
      toast.success('Interview completed!');
    });

    interviewSocket.on('force-interview-end', async (data) => {
      // Create message with audio support
      const message = await createMessageWithAudio(data.message, data.audio);
      setMessages(prev => [...prev, message]);
      
      setTimeout(() => {
        setPhase(INTERVIEW_PHASES.CONCLUSION);
      }, 2000);
      toast('Time limit reached!', {
        icon: '⚠️',
        style: {
          background: '#f59e0b',
          color: '#ffffff'
        }
      });
    });

    interviewSocket.on('error', (data) => {
      console.error('Interview error:', data);
      toast.error(data.message || 'An error occurred');
    });
  };

  // Get current duration without causing re-renders
  const getCurrentDuration = useCallback(() => {
    if (!interviewStartTime) return 0;
    return Math.floor((Date.now() - interviewStartTime.getTime()) / 1000);
  }, [interviewStartTime]);

  // Update interview duration less frequently to avoid re-renders
  useEffect(() => {
    let interval: number;
    if (interviewStartTime && phase !== INTERVIEW_PHASES.COMPLETED) {
      // Update every 10 seconds instead of every second to reduce re-renders
      interval = setInterval(() => {
        const elapsed = getCurrentDuration();
        setInterviewDuration(elapsed);
        setTimeRemaining(Math.max(0, (20 * 60) - elapsed));
      }, 10000); // 10 seconds
      
      // Set initial values immediately
      const elapsed = getCurrentDuration();
      setInterviewDuration(elapsed);
      setTimeRemaining(Math.max(0, (20 * 60) - elapsed));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [interviewStartTime, phase, getCurrentDuration]);

  // Code monitoring during coding phase
  useEffect(() => {
    if (codeMonitoringActive && socket && sessionId && phase === INTERVIEW_PHASES.CODING) {
      codeMonitorInterval.current = setInterval(() => {
        const activityType = Date.now() - lastCodeActivity.current < 5000 ? 'active' : 'idle';
        
        socket.emit('code-monitor', {
          sessionId,
          code,
          language,
          activity: activityType
        });
      }, 10000); // Every 10 seconds

      return () => {
        if (codeMonitorInterval.current) {
          clearInterval(codeMonitorInterval.current);
        }
      };
    }
  }, [codeMonitoringActive, socket, sessionId, phase, code, language]);

  // Track code activity
  useEffect(() => {
    lastCodeActivity.current = Date.now();
  }, [code]);

  // Debug phase changes
  useEffect(() => {
    console.log('🔄 Phase changed to:', phase, {
      currentProblem: currentProblem?.title,
      testResults: testResults ? `${testResults.passedTests}/${testResults.totalTests}` : 'none',
      timestamp: new Date().toISOString()
    });
  }, [phase, currentProblem, testResults]);

  // Helper function to handle audio and create message
  const createMessageWithAudio = async (content: string, audio?: AudioData): Promise<Message> => {
    const message: Message = {
      type: 'interviewer',
      content,
      timestamp: new Date(),
      audio: audio || undefined
    };

    // Play audio if available
    if (audio) {
      try {
        await playTTSAudio(audio);
      } catch (error) {
        console.error('Failed to play TTS audio:', error);
        // Continue without audio - don't break the flow
      }
    }

    return message;
  };

  // Memoize actions to prevent unnecessary re-renders
  const actions = useMemo(() => ({
    connectToInterview,

    startInterview: (candidateInfo: CandidateInfo, resumeData = {}) => {
      if (!socket) {
        toast.error('Please connect to interview backend first');
        return;
      }

      // Use existing sessionId if available, otherwise create new one
      const targetSessionId = sessionId || initialSessionId || `interview_${Date.now()}`;
      setSessionId(targetSessionId);
      setCandidateInfo(candidateInfo);
      setPhase(INTERVIEW_PHASES.INTRODUCTION);
      setInterviewStartTime(new Date());
      setMessages([]);

      socket.emit('join-interview', {
        sessionId: targetSessionId,
        candidateInfo,
        resumeData
      });
    },

    sendMessage: (message: string) => {
      if (!socket || !sessionId) {
        toast.error('Interview session not active');
        return;
      }

      setMessages(prev => [...prev, {
        type: 'candidate',
        content: message,
        timestamp: new Date()
      }]);

      socket.emit('candidate-message', {
        sessionId,
        message,
        phase
      });
    },

    updateCode: (newCode: string) => {
      setCode(newCode);
    },

    setLanguage: (newLanguage: string) => {
      if (!socket || !sessionId) return;

      socket.emit('change-language', {
        sessionId,
        language: newLanguage
      });
    },

    executeCode: () => {
      if (!currentProblem || !socket || !sessionId) {
        toast.error('No active problem to test');
        return;
      }

      setIsExecuting(true);
      
      socket.emit('execute-code', {
        sessionId,
        code,
        language
      });
    },

    requestHint: () => {
      if (!socket || !sessionId) {
        toast.error('Interview session not active');
        return;
      }

      socket.emit('request-hint', {
        sessionId,
        currentCode: code
      });
    },

    endInterview: (feedback = '') => {
      if (!socket || !sessionId) {
        toast.error('No active interview to end');
        return;
      }

      socket.emit('end-interview', {
        sessionId,
        feedback
      });
    },

    resetInterview: () => {
      if (socket) {
        socket.disconnect();
      }
      setSocket(null);
      setSessionId(null);
      setPhase(INTERVIEW_PHASES.DISCONNECTED);
      setIsConnected(false);
      setCandidateInfo(null);
      setCurrentProblem(null);
      setMessages([]);
      setCode('');
      setLanguage('javascript');
      setTestResults(null);
      setIsExecuting(false);
      setEvaluation(null);
      setInterviewStartTime(null);
      setInterviewDuration(0);
      setTimeRemaining(20 * 60);
      setInterviewStatus(null);
      setHintsUsed(0);
      setCodeMonitoringActive(false);
      
      if (codeMonitorInterval.current) {
        clearInterval(codeMonitorInterval.current);
      }
    },

    formatTime: (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }), [socket, sessionId, phase, code, language, currentProblem, initialSessionId]);

  // Memoize the context value to prevent unnecessary re-renders
  const value: InterviewContextType = useMemo(() => ({
    socket,
    sessionId,
    phase,
    isConnected,
    candidateInfo,
    currentProblem,
    messages,
    code,
    language,
    testResults,
    isExecuting,
    evaluation,
    interviewStartTime,
    interviewDuration,
    timeRemaining,
    interviewStatus,
    hintsUsed,
    codeMonitoringActive,
    actions,
    INTERVIEW_PHASES
  }), [
    socket,
    sessionId,
    phase,
    isConnected,
    candidateInfo,
    currentProblem,
    messages,
    code,
    language,
    testResults,
    isExecuting,
    evaluation,
    interviewStartTime,
    interviewDuration,
    timeRemaining,
    interviewStatus,
    hintsUsed,
    codeMonitoringActive,
    actions
  ]);

  // Auto-start interview when socket connects and we have sessionId
  useEffect(() => {
    if (socket && isConnected && initialSessionId && !candidateInfo) {
      // Try to get candidate info from sessionStorage
      const storedCandidateInfo = sessionStorage.getItem('candidateInfo');
      const storedResumeData = sessionStorage.getItem('resumeData');
      
      if (storedCandidateInfo) {
        const candidateData = JSON.parse(storedCandidateInfo);
        const resumeData = storedResumeData ? JSON.parse(storedResumeData) : candidateData;
        
        // Auto-start the interview
        actions.startInterview(candidateData, resumeData);
      } else {
        toast.error('No candidate information found. Please restart from the interview setup.');
      }
    }
  }, [socket, isConnected, initialSessionId, candidateInfo, actions]);

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
}
