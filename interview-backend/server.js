import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import services
import { InterviewManager } from './services/InterviewManager.js';
import { ProblemService } from './services/ProblemService.js';
import { CodeExecutionService } from './services/CodeExecutionService.js';
// import { GroqService } from './services/GroqService.js';
import { GroqService } from './services/GroqService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.INTERVIEW_PORT || 5001;

// Initialize services
const interviewManager = new InterviewManager();
const problemService = new ProblemService();
const codeExecutionService = new CodeExecutionService();
const groqService = new GroqService(process.env.GROQ_API_KEY, process.env.ELEVENLABS_API_KEY);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AI Interview Backend'
  });
});

// REST API Routes
app.get('/api/problems/random', async (req, res) => {
  try {
    const { difficulty, category } = req.query;
    const problem = await problemService.getRandomProblem(difficulty, category);
    res.json(problem);
  } catch (error) {
    console.error('Error fetching random problem:', error);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

app.get('/api/problems/categories', async (req, res) => {
  try {
    const categories = problemService.getAvailableCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/problems/difficulties', async (req, res) => {
  try {
    const difficulties = problemService.getAvailableDifficulties();
    res.json({ difficulties });
  } catch (error) {
    console.error('Error fetching difficulties:', error);
    res.status(500).json({ error: 'Failed to fetch difficulties' });
  }
});

app.post('/api/code/execute', async (req, res) => {
  try {
    const { code, language, problemId, testCases, templates } = req.body;

    console.log(`Executing code for problem ${problemId} in ${language}`);
    const results = await codeExecutionService.executeCode(code, language, problemId, testCases, templates);
    res.json(results);
  } catch (error) {
    console.error('Error executing code:', error);
    res.status(500).json({ error: 'Code execution failed' });
  }
});

// Analytics endpoints
app.get('/api/analytics/sessions', async (req, res) => {
  try {
    const stats = interviewManager.getSessionStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching session analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/analytics/health', async (req, res) => {
  try {
    const health = await interviewManager.performHealthCheck();
    res.json({
      ...health,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Session management endpoints
app.get('/api/sessions', async (req, res) => {
  try {
    const { status } = req.query;
    const sessions = status 
      ? interviewManager.getSessionsByStatus(status)
      : interviewManager.getAllSessions();
    
    const summaries = sessions.map(session => 
      interviewManager.generateSessionSummary(session.id)
    );
    
    res.json({ sessions: summaries });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await interviewManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const summary = interviewManager.generateSessionSummary(sessionId);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

app.delete('/api/sessions/completed', async (req, res) => {
  try {
    const archivedCount = await interviewManager.archiveCompletedSessions();
    res.json({ 
      message: `Archived ${archivedCount} completed sessions`,
      archivedCount 
    });
  } catch (error) {
    console.error('Error archiving sessions:', error);
    res.status(500).json({ error: 'Failed to archive sessions' });
  }
});

// Create a new interview session
app.post('/api/sessions/create', async (req, res) => {
  try {
    // Generate a unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🆕 Creating new interview session: ${sessionId}`);
    
    // Return the session ID for the client to use
    res.json({ 
      sessionId,
      message: 'Session created successfully',
      interviewUrl: `/interview/session/${sessionId}`
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Interview configuration endpoints
app.get('/api/interview/config', (req, res) => {
  res.json({
    maxDuration: groqService.INTERVIEW_DURATION_LIMIT,
    phaseTimings: groqService.PHASE_TIMINGS,
    supportedLanguages: ['javascript', 'cpp'],
    availablePhases: ['introduction', 'problem-presentation', 'coding', 'testing', 'conclusion']
  });
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id} from ${socket.handshake.address}`);
  console.log(`📊 Total connected clients: ${io.engine.clientsCount}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
    console.log(`📊 Remaining connected clients: ${io.engine.clientsCount}`);
  });

  socket.on('connect_error', (error) => {
    console.error(`🔴 Connection error for ${socket.id}:`, error);
  });
  
  // Join interview session
  socket.on('join-interview', async (data) => {
    try {
      console.log(`🎯 Join interview request from ${socket.id}:`, data);
      const { sessionId, candidateInfo, resumeData } = data;
      
      // Create or join interview session
      const session = await interviewManager.createSession(sessionId, candidateInfo, resumeData);
      socket.join(sessionId);
      console.log(`🏠 Socket ${socket.id} joined room: ${sessionId}`);
      
      // Initialize AI interviewer
      const initialMessage = await groqService.startInterview(candidateInfo, resumeData);
      
      // Update session progress
      interviewManager.updateInterviewProgress(sessionId, 'introduction', 'introduction');
      
      socket.emit('interview-started', {
        sessionId,
        message: initialMessage.message,
        audio: initialMessage.audio,
        phase: 'introduction',
        interviewStatus: groqService.getInterviewStatus(session)
      });
      
      console.log(`Client ${socket.id} joined interview session: ${sessionId}`);
    } catch (error) {
      console.error('Error joining interview:', error);
      socket.emit('error', { message: 'Failed to start interview session' });
    }
  });
  
  // Handle candidate messages
  socket.on('candidate-message', async (data) => {
    try {
      const { sessionId, message, phase } = data;
      console.log(`📨 Candidate message received [${sessionId}]:`, {
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        phase,
        messageLength: message.length,
        timestamp: new Date().toISOString()
      });
      
      const session = await interviewManager.getSession(sessionId);
      
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      // Add message to session history
      const newMessage = { type: 'candidate', content: message, timestamp: new Date() };
      await interviewManager.updateSession(sessionId, {
        messages: [...(session.messages || []), newMessage]
      });
      
      console.log(`💬 CONVERSATION LOG [${sessionId}]:`, {
        candidate: message,
        currentPhase: phase,
        codeLength: session.currentCode?.length || 0,
        hasExecuted: !!session.lastExecution,
        testStatus: session.lastExecution ? 
          `${session.lastExecution.results?.passedTests || 0}/${session.lastExecution.results?.totalTests || 0} tests passed` : 
          'No tests run',
        timestamp: new Date().toISOString()
      });
      
      console.log(`${'='.repeat(80)}`);
      console.log(`🎯 CANDIDATE [${sessionId}]: "${message}"`);
      console.log(`${'='.repeat(80)}`);
      
      // Process message with AI
      console.log(`🤖 Processing AI response for session [${sessionId}]...`);
      const response = await groqService.processMessage(message, session, phase);
      
      console.log(`✅ AI response generated [${sessionId}]:`, {
        messagePreview: response.message.substring(0, 100) + (response.message.length > 100 ? '...' : ''),
        phase: response.phase,
        action: response.action,
        timeRemaining: response.timeRemaining,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🤖 CONVERSATION LOG [${sessionId}]:`, {
        interviewer: response.message,
        newPhase: response.phase,
        action: response.action,
        timestamp: new Date().toISOString()
      });
      
      console.log(`${'='.repeat(80)}`);
      console.log(`🤖 INTERVIEWER [${sessionId}]: "${response.message}"`);
      console.log(`📊 PHASE: ${response.phase} | ACTION: ${response.action || 'none'}`);
      console.log(`${'='.repeat(80)}`);
      
      // Update session with AI response
      const aiMessage = { type: 'interviewer', content: response.message, timestamp: new Date() };
      await interviewManager.updateSession(sessionId, {
        messages: [...(session.messages || []), newMessage, aiMessage],
        phase: response.phase
      });
      
      socket.emit('interviewer-response', {
        message: response.message,
        audio: response.audio,
        phase: response.phase,
        action: response.action,
        timeRemaining: response.timeRemaining,
        interviewStatus: groqService.getInterviewStatus(session)
      });
      
      console.log(`📤 AI response sent to frontend [${sessionId}]`);
      
      // Handle phase transitions and actions
      if (response.action === 'start-coding') {
        console.log(`🎯 Starting coding phase for session [${sessionId}]`);
        
        // Get problem difficulty based on candidate profile or default to Easy
        const difficulty = interviewManager.getRecommendedDifficulty(session) || 'Easy';
        console.log(`📚 Getting ${difficulty} problem for session [${sessionId}]`);
        
        const problem = problemService.getProblemByDifficulty(difficulty) || problemService.getRandomProblem();
        
        if (!problem) {
          console.error(`❌ No problem found for difficulty: ${difficulty}`);
          socket.emit('error', { message: 'Failed to assign problem' });
          return;
        }
        
        console.log(`✅ Problem assigned [${sessionId}]:`, {
          problemId: problem.question_id,
          title: problem.title,
          difficulty: problem.difficulty,
          category: problem.category
        });
        
        // Update session with problem and AI context
        await interviewManager.updateSession(sessionId, { 
          currentProblem: problem,
          phase: 'coding',
          aiContext: {
            ...session.aiContext,
            assignedProblem: {
              id: problem.question_id,
              title: problem.title,
              description: problem.description,
              difficulty: problem.difficulty,
              category: problem.category,
              constraints: problem.constraints,
              assignedAt: new Date().toISOString()
            },
            interviewProgress: {
              ...session.aiContext?.interviewProgress,
              problemAssigned: true,
              codingStarted: true
            }
          }
        });
        
        interviewManager.updateInterviewProgress(sessionId, 'coding', 'codingStarted');
        
        socket.emit('problem-assigned', {
          problem,
          templates: problem.templates,
          recommendedLanguages: ['javascript', 'cpp'] // Based on problem
        });
        
        // Emit phase change to coding
        socket.emit('interviewer-response', {
          message: "Great! You now have access to the code editor. Begin implementing your solution.",
          phase: 'coding',
          action: null,
          timeRemaining: response.timeRemaining,
          interviewStatus: groqService.getInterviewStatus(session)
        });
      }
      
      // Auto-conclude if time is up
      if (response.action === 'force-conclusion') {
        setTimeout(() => {
          socket.emit('force-interview-end', {
            message: 'Time limit reached. Let\'s wrap up the interview.',
            timeUp: true
          });
        }, 1000);
      }
      
    } catch (error) {
      console.error(`❌ Error processing candidate message [${data.sessionId}]:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        sessionId: data.sessionId,
        phase: data.phase
      });
      socket.emit('error', { message: 'Failed to process message. Please try again.' });
    }
  });
  
  // Handle code monitoring (every 10 seconds during coding phase)
  socket.on('code-monitor', async (data) => {
    try {
      const { sessionId, code, language, activity } = data;
      const session = await interviewManager.getSession(sessionId);
      
      if (!session) return;
      
      // Update session with current code state
      await interviewManager.updateSession(sessionId, {
        currentCode: code,
        language,
        lastCodeActivity: new Date(),
        candidateActivity: activity
      });
      
      // Send monitoring data to AI (but don't interrupt candidate)
      await groqService.monitorProgress(session, code, activity);
      
      // Check if candidate needs encouragement
      if (session.needsEncouragement && session.phase === 'coding') {
        const encouragement = await groqService.generateHint(session, code, session.lastExecution?.results);
        
        socket.emit('gentle-encouragement', {
          message: encouragement.message || encouragement,
          audio: encouragement.audio || null,
          type: 'encouragement'
        });
        
        // Reset encouragement flag
        await interviewManager.updateSession(sessionId, {
          needsEncouragement: false,
          recentEncouragement: new Date()
        });
      }
      
      // Emit progress update
      socket.emit('progress-update', {
        codeLength: code.length,
        timeRemaining: groqService.getInterviewStatus(session).remaining,
        phase: session.phase
      });
      
    } catch (error) {
      console.error('Error monitoring code:', error);
    }
  });
  
  // Handle code execution requests
  socket.on('execute-code', async (data) => {
    try {
      const { sessionId, code, language } = data;
      const session = await interviewManager.getSession(sessionId);
      
      console.log(`⚡ Code execution request [${sessionId}]:`, {
        language,
        codeLength: code.length,
        currentPhase: session?.phase,
        hasTestCases: !!session?.currentProblem?.test_cases,
        timestamp: new Date().toISOString()
      });
      
      if (!session || !session.currentProblem) {
        console.error(`❌ Code execution failed [${sessionId}]: No active problem found`);
        socket.emit('error', { message: 'No active problem found' });
        return;
      }
      
      // Enforce phase restriction: only allow code execution in testing phase
      if (session.phase !== 'testing') {
        console.error(`❌ Code execution blocked [${sessionId}]: Phase restriction (current: ${session.phase}, required: testing)`);
        socket.emit('error', { message: 'Code execution is only allowed in the testing phase' });
        return;
      }
      
      console.log(`🔬 Executing code [${sessionId}] for problem: ${session.currentProblem.title}`);
      
      // Execute code with test cases and problem templates
      const results = await codeExecutionService.executeCode(
        code, 
        language, 
        session.currentProblem.question_id,
        session.currentProblem.test_cases,
        session.currentProblem.templates,
        session.currentProblem.title // Pass problem title for validation
      );
      
      console.log(`✅ Code execution completed [${sessionId}]:`, {
        totalTests: results.totalTests,
        passedTests: results.passedTests,
        success: results.success,
        executionTime: results.executionTime,
        timestamp: new Date().toISOString()
      });
      
      // Update session with execution results
      const executionRecord = {
        code,
        language,
        results,
        timestamp: new Date(),
        problemId: session.currentProblem.question_id
      };
      
      await interviewManager.updateSession(sessionId, {
        lastExecution: executionRecord,
        executionHistory: [...(session.executionHistory || []), executionRecord]
      });
      
      console.log(`📊 TEST RESULTS [${sessionId}]:`, {
        testsPassed: `${results.passedTests}/${results.totalTests}`,
        success: results.success,
        executionTime: results.executionTime,
        timestamp: new Date().toISOString()
      });
      
      // Let AI decide the next phase based on test results
      const session_updated = await interviewManager.getSession(sessionId);
      const aiResponse = await groqService.processTestResults(session_updated, results);
      
      console.log(`${'='.repeat(80)}`);
      console.log(`📊 TEST EXECUTION COMPLETED [${sessionId}]`);
      console.log(`Tests: ${results.passedTests}/${results.totalTests} passed`);
      console.log(`AI Feedback: "${aiResponse.message || 'No feedback'}"`);
      console.log(`${'='.repeat(80)}`);
      
      socket.emit('execution-results', {
        ...results,
        interviewStatus: groqService.getInterviewStatus(session_updated)
      });
      
      // Send AI feedback and let it decide phase transitions
      if (aiResponse.message) {
        const feedbackMessage = { type: 'interviewer', content: aiResponse.message, timestamp: new Date() };
        await interviewManager.updateSession(sessionId, {
          messages: [...(session_updated.messages || []), feedbackMessage]
        });
        
        // Let AI determine the next phase based on test results
        const nextPhase = groqService.determinePhaseAfterExecution(session_updated, results);
        await interviewManager.updateSession(sessionId, {
          phase: nextPhase
        });
        
        socket.emit('interviewer-response', {
          message: aiResponse.message,
          audio: aiResponse.audio,
          phase: nextPhase,
          type: 'test-feedback',
          testResults: results
        });
      }
      
    } catch (error) {
      console.error('Error executing code:', error);
      socket.emit('error', { message: 'Code execution failed' });
    }
  });
  
  // Handle interview completion
  socket.on('end-interview', async (data) => {
    try {
      const { sessionId, feedback } = data;
      const session = await interviewManager.getSession(sessionId);
      
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      // Generate final evaluation
      const evaluation = await groqService.generateEvaluation(session);
      
      // Update session as completed
      await interviewManager.updateSession(sessionId, {
        status: 'completed',
        endTime: new Date(),
        evaluation,
        candidateFeedback: feedback
      });
      
      // Generate session summary
      const sessionSummary = interviewManager.generateSessionSummary(sessionId);
      
      socket.emit('interview-completed', {
        evaluation: evaluation.message || evaluation,
        audio: evaluation.audio || null,
        sessionSummary,
        finalMessage: "Thank you for your time today. You'll receive feedback shortly."
      });
      
      console.log(`Interview session ${sessionId} completed`);
    } catch (error) {
      console.error('Error ending interview:', error);
      socket.emit('error', { message: 'Failed to end interview' });
    }
  });
  
  // Handle AI guidance requests
  socket.on('request-hint', async (data) => {
    try {
      const { sessionId, currentCode } = data;
      const session = await interviewManager.getSession(sessionId);
      
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      const hint = await groqService.generateHint(session, currentCode, session.lastExecution?.results);
      
      // Track hint requests
      await interviewManager.updateSession(sessionId, {
        hintsRequested: (session.hintsRequested || 0) + 1
      });
      
      const hintMessage = { type: 'interviewer', content: hint, timestamp: new Date() };
      await interviewManager.updateSession(sessionId, {
        messages: [...(session.messages || []), hintMessage]
      });
      
      socket.emit('interviewer-response', {
        message: hint.message || hint,
        audio: hint.audio || null,
        type: 'hint',
        hintsUsed: session.hintsRequested + 1
      });
      
    } catch (error) {
      console.error('Error generating hint:', error);
      socket.emit('error', { message: 'Failed to generate hint' });
    }
  });

  // Handle language change
  socket.on('change-language', async (data) => {
    try {
      const { sessionId, language } = data;
      const session = await interviewManager.getSession(sessionId);
      
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      await interviewManager.updateSession(sessionId, { language });
      
      // Send new template for the language
      if (session.currentProblem && session.currentProblem.templates[language]) {
        socket.emit('language-changed', {
          language,
          template: session.currentProblem.templates[language].template
        });
      }
      
    } catch (error) {
      console.error('Error changing language:', error);
      socket.emit('error', { message: 'Failed to change language' });
    }
  });

  // Handle session status requests
  socket.on('get-session-status', async (data) => {
    try {
      const { sessionId } = data;
      const session = await interviewManager.getSession(sessionId);
      
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      const status = groqService.getInterviewStatus(session);
      const summary = interviewManager.generateSessionSummary(sessionId);
      
      socket.emit('session-status', {
        ...status,
        sessionSummary: summary
      });
      
    } catch (error) {
      console.error('Error getting session status:', error);
      socket.emit('error', { message: 'Failed to get session status' });
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 AI Interview Backend running on port ${PORT}`);
  console.log(`🤖 Groq AI Service: ${process.env.GROQ_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔌 Socket.IO server ready for connections`);
  console.log(`📍 Server listening on http://localhost:${PORT}`);
});

export default app;
