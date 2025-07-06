import axios from 'axios';
import { getSystemPrompt } from '../prompts/systemPrompt.js';
import { getUserPrompt } from '../prompts/userPrompt.js';

export class GroqService {
  constructor(apiKey, elevenLabsApiKey = null) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.groq.com/openai/v1';
    this.model = 'mistral-saba-24b';
    this.INTERVIEW_DURATION_LIMIT = 20; // 20 minutes (soft limit for reference)
    
    // ElevenLabs configuration
    this.elevenLabsApiKey = elevenLabsApiKey;
    this.elevenLabsBaseURL = 'https://api.elevenlabs.io/v1';
    this.defaultVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice (professional American female)
    this.voiceSettings = {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.3,
      use_speaker_boost: true
    };
  }

  async startInterview(candidateInfo, resumeData) {
    const systemPrompt = getSystemPrompt(candidateInfo, resumeData);

    const userPrompt = getUserPrompt(candidateInfo, resumeData);
    try {
      const response = await this.callGroqAPI(systemPrompt, userPrompt);
      
      // Generate speech for initial greeting
      let audioBuffer = null;
      try {
        audioBuffer = await this.generateSpeech(response);
      } catch (speechError) {
        console.error('Speech generation failed for interview start:', speechError.message);
      }
      
      return {
        message: response,
        audio: audioBuffer ? {
          buffer: audioBuffer,
          contentType: 'audio/mpeg',
          size: audioBuffer.length
        } : null
      };
    } catch (error) {
      console.error('Error starting interview:', error);
      const fallbackMessage = "Hello! Welcome to your technical interview. I'm excited to work with you today. Could you please start by giving me a brief introduction about yourself and your background?";
      
      // Try to generate speech for fallback message
      let audioBuffer = null;
      try {
        audioBuffer = await this.generateSpeech(fallbackMessage);
      } catch (speechError) {
        console.error('Speech generation failed for fallback:', speechError.message);
      }
      
      return {
        message: fallbackMessage,
        audio: audioBuffer ? {
          buffer: audioBuffer,
          contentType: 'audio/mpeg',
          size: audioBuffer.length
        } : null
      };
    }
  }

  async processMessage(message, session, phase) {
    console.log(`Processing message for session ${session.id}:`, {
      sessionId: session.id,
      phase,
      messageLength: message.length,
      timestamp: new Date().toISOString()
    });
    
    const systemPrompt = this.getSystemPromptForPhase(phase, session);
    const duration = this.getInterviewDuration(session.startTime);
    
    const userPrompt = `Candidate message: "${message}"

Current interview phase: ${phase}
Interview duration so far: ${duration} minutes

=== CANDIDATE'S CURRENT CODE ===
Programming Language: ${session.language || 'javascript'}
${session.currentCode ? 
  `\`\`\`${session.language || 'javascript'}\n${session.currentCode}\n\`\`\`` : 
  'No code written yet'}

Code Status:
- Last modified: ${session.lastCodeActivity ? new Date(session.lastCodeActivity).toLocaleTimeString() : 'Never'}
- Code length: ${session.currentCode ? session.currentCode.length : 0} characters
- Test execution status: ${session.lastExecution ? 
  `TESTS HAVE BEEN RUN - ${session.lastExecution.status}, Passed ${session.lastExecution.results?.passed || 0}/${session.lastExecution.results?.total || 0} tests` : 
  'NO TESTS HAVE BEEN RUN YET'}

=== INTERVIEW CONTEXT ===
- Assigned problem: ${session.aiContext?.assignedProblem ? 
  `${session.aiContext.assignedProblem.title} (${session.aiContext.assignedProblem.difficulty}) - ${session.aiContext.assignedProblem.description}` : 
  'None assigned yet'}
- Current problem in session: ${session.currentProblem ? 
  `${session.currentProblem.title} (${session.currentProblem.difficulty})` : 
  'None'}
- Previous messages: ${session.messages?.slice(-3).map(m => `${m.type}: ${m.content}`).join('\n') || 'None'}

Available phases: introduction, problem-presentation, coding, testing, conclusion

Provide a brief, natural response based on the candidate's message and current context.`;

    try {
      console.log(`🔥 Calling Groq API for session ${session.id}...`);
      const response = await this.callGroqAPI(systemPrompt, userPrompt);
      
      console.log(`🎯 Groq API response received:`, {
        sessionId: session.id,
        responseLength: response.length,
        responsePreview: response.substring(0, 100) + (response.length > 100 ? '...' : ''),
        timestamp: new Date().toISOString()
      });
      
      // Determine next phase and actions based on AI response and context
      const nextPhase = this.determineNextPhase(response, phase, session);
      const action = this.determineAction(response, phase, duration);
      
      console.log('Phase and action determined:', {
        sessionId: session.id,
        currentPhase: phase,
        nextPhase,
        action,
        timeRemaining: Math.max(0, this.INTERVIEW_DURATION_LIMIT - duration)
      });

      // Generate speech for the AI response
      let audioBuffer = null;
      try {
        audioBuffer = await this.generateSpeech(response);
      } catch (speechError) {
        console.error('Speech generation failed:', speechError.message);
        // Continue without audio - don't break the interview flow
      }
      
      return {
        message: response,
        phase: nextPhase,
        action: action,
        timeRemaining: Math.max(0, this.INTERVIEW_DURATION_LIMIT - duration),
        audio: audioBuffer ? {
          buffer: audioBuffer,
          contentType: 'audio/mpeg',
          size: audioBuffer.length
        } : null
      };
    } catch (error) {
      console.error(`GroqService error for session ${session.id}:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      const fallbackMessage = "I understand. Let's continue with the interview.";
      let fallbackAudio = null;
      try {
        fallbackAudio = await this.generateSpeech(fallbackMessage);
      } catch (speechError) {
        console.error('Fallback speech generation failed:', speechError.message);
      }
      
      return {
        message: fallbackMessage,
        phase: phase,
        action: null,
        timeRemaining: Math.max(0, this.INTERVIEW_DURATION_LIMIT - duration),
        audio: fallbackAudio ? {
          buffer: fallbackAudio,
          contentType: 'audio/mpeg',
          size: fallbackAudio.length
        } : null
      };
    }
  }

  async monitorProgress(session, code, activity) {
    // This function monitors code progress but doesn't interrupt the candidate
    // It updates internal AI context for better assistance when needed
    
    try {
      if (!code || code.trim().length === 0) return;
      
      const analysis = {
        codeLength: code.length,
        hasFunction: /function|def|class/.test(code),
        hasLogic: /if|for|while|return/.test(code),
        hasVariables: /let|const|var|\w+\s*=/.test(code),
        lastActivity: activity,
        timestamp: new Date(),
        progressLevel: this.assessProgressLevel(code)
      };
      
      // Store analysis in session context
      if (!session.aiContext) session.aiContext = {};
      if (!session.aiContext.codeAnalysis) session.aiContext.codeAnalysis = [];
      
      session.aiContext.codeAnalysis.push(analysis);
      
      // Keep only last 10 analyses
      if (session.aiContext.codeAnalysis.length > 10) {
        session.aiContext.codeAnalysis = session.aiContext.codeAnalysis.slice(-10);
      }
      
      // Check if candidate has been idle for too long
      const duration = this.getInterviewDuration(session.startTime);
      const lastCodeActivity = session.lastCodeActivity || session.startTime;
      const idleTime = (Date.now() - new Date(lastCodeActivity).getTime()) / (1000 * 60);
      
      // If idle for more than 5 minutes during coding phase, flag for gentle encouragement
      if (session.phase === 'coding' && idleTime > 5 && !session.recentEncouragement) {
        session.needsEncouragement = true;
      }
      
    } catch (error) {
      console.error('Error monitoring progress:', error);
    }
  }

  assessProgressLevel(code) {
    if (!code || code.trim().length === 0) return 'not_started';
    if (code.length < 50) return 'minimal';
    if (/function|def|class/.test(code) && /return/.test(code)) return 'substantial';
    if (/function|def|class/.test(code)) return 'structure_started';
    return 'basic';
  }

  async processTestResults(session, results) {
    if (!results || results.passedTests === undefined) return { message: null };
    
    const duration = this.getInterviewDuration(session.startTime);
    const systemPrompt = `You are an AI technical interviewer. The candidate has just run their code and got test results. Provide appropriate feedback based on the results and their code.

Guidelines:
- Keep responses brief and supportive
- If all tests pass: Congratulate briefly and ask if they want to discuss anything else or move on
- If some tests fail: Provide ONE clear hint about what might be wrong
- If no tests pass: Suggest they review the problem requirements and try again
- Don't over-analyze working code - focus on helping with failures
- Avoid asking multiple questions about optimizations unless candidate specifically asks
- Keep the flow moving - this is an interview, not a detailed code review session
- Only discuss time/space complexity if tests pass and there's time remaining

Current phase: ${session.phase}
Interview duration: ${duration} minutes (for reference)`;

    // Collect code context from failed tests for better AI analysis
    const codeContexts = results.testResults?.filter(t => !t.passed && t.codeContext)
      .map(t => t.codeContext) || [];
    
    const userPrompt = `Test Results:
- Total tests: ${results.totalTests}
- Passed: ${results.passedTests}
- Success rate: ${Math.round((results.passedTests / results.totalTests) * 100)}%
- Execution time: ${results.executionTime}ms
- Interview duration: ${duration} minutes (for reference)

=== CANDIDATE'S CODE ===
Programming Language: ${session.language || 'javascript'}
${session.currentCode ? 
  `\`\`\`${session.language || 'javascript'}\n${session.currentCode}\n\`\`\`` : 
  'No code available'}

Failed test details:
${results.testResults?.filter(t => !t.passed).map(t => 
  `Test ${t.testIndex + 1}: Expected ${JSON.stringify(t.expected)}, Got ${JSON.stringify(t.actual)}${t.error ? `, Error: ${t.error}` : ''}`
).join('\n') || 'None'}

${codeContexts.length > 0 ? `
Code Analysis Context:
${codeContexts.map((ctx, i) => `
Failed Test ${i + 1}:
${ctx.analysisPrompt}
`).join('\n')}
` : ''}

Execution history: ${session.executionHistory?.length || 0} previous runs

Please provide a BRIEF response about the test results. Keep it under 2 sentences unless tests failed and you need to give a specific hint. Focus on next steps, not detailed analysis.`;

    try {
      const response = await this.callGroqAPI(systemPrompt, userPrompt);
      
      // Generate speech for test feedback
      let audioBuffer = null;
      try {
        audioBuffer = await this.generateSpeech(response);
      } catch (speechError) {
        console.error('Speech generation failed for test feedback:', speechError.message);
      }
      
      return {
        message: response,
        type: 'test-feedback',
        audio: audioBuffer ? {
          buffer: audioBuffer,
          contentType: 'audio/mpeg',
          size: audioBuffer.length
        } : null
      };
    } catch (error) {
      console.error('Error processing test results:', error);
      
      if (results.passedTests === results.totalTests) {
        return { message: "Excellent! All test cases passed. Can you walk me through your approach and explain your thought process?" };
      } else if (results.passedTests === 0) {
        return { message: `I see none of the test cases passed. Let's analyze what might be going wrong. Looking at the expected outputs, what do you think your function should be returning? Feel free to modify your code and try again.` };
      } else {
        return { message: `Good progress! You passed ${results.passedTests} out of ${results.totalTests} test cases. Let's look at the failing test cases - what pattern do you notice in the expected vs actual outputs?` };
      }
    }
  }

  async generateHint(session, currentCode, lastExecutionResults = null) {
    const problem = session.currentProblem;
    if (!problem) return "I'd be happy to help, but it seems there's no active problem. Could you clarify what you need assistance with?";
    
    const systemPrompt = `You are an AI technical interviewer providing a helpful hint. 

Guidelines:
- Provide ONE clear, actionable hint without giving away the solution
- Keep hints brief and focused on the immediate issue
- Avoid asking multiple questions - just give the hint
- Focus on helping them make progress, not perfect understanding
- Don't over-explain or provide academic-level detail
`

;

    // Extract code context from last execution if available
    let codeAnalysis = '';
    if (lastExecutionResults?.testResults) {
      const failedTests = lastExecutionResults.testResults.filter(t => !t.passed && t.codeContext);
      if (failedTests.length > 0) {
        codeAnalysis = `\n\nCode Analysis from Recent Test Execution:\n${failedTests.map(t => t.codeContext.analysisPrompt).join('\n\n')}`;
      }
    }

    const userPrompt = `Problem: ${problem.title}
Description: ${problem.description}
Difficulty: ${problem.difficulty}
Category: ${problem.category}

Current code:
\`\`\`${session.language || 'javascript'}
${currentCode || 'No code written yet'}
\`\`\`

Progress assessment: ${this.assessProgressLevel(currentCode)}
Interview duration: ${this.getInterviewDuration(session.startTime)} minutes (for reference)
${codeAnalysis}

The candidate is asking for a hint. Provide ONE clear, specific hint in 1-2 sentences. Don't ask questions back or over-explain.`;

    try {
      const response = await this.callGroqAPI(systemPrompt, userPrompt);
      
      // Generate speech for hint
      let audioBuffer = null;
      try {
        audioBuffer = await this.generateSpeech(response);
      } catch (speechError) {
        console.error('Speech generation failed for hint:', speechError.message);
      }
      
      return {
        message: response,
        audio: audioBuffer ? {
          buffer: audioBuffer,
          contentType: 'audio/mpeg',
          size: audioBuffer.length
        } : null
      };
    } catch (error) {
      console.error('Error generating hint:', error);
      return {
        message: "Let's think about this step by step. What's the first thing you need to identify in this problem? Sometimes it helps to work through a simple example manually first.",
        audio: null
      };
    }
  }

  async generateEvaluation(session) {
    const duration = this.getInterviewDuration(session.startTime);

    const systemPrompt = `You are an AI technical interviewer providing a final evaluation. Be constructive, balanced, and helpful.

Evaluation criteria:
- Problem understanding and clarification questions
- Coding approach and algorithm choice
- Code quality, structure, and best practices
- Communication skills and thought process explanation
- Problem-solving methodology
- Testing and debugging approach
- Time management and efficiency

Provide a balanced evaluation with specific feedback, strengths observed, areas for improvement, and actionable suggestions. Include relevant code snippets or references if helpful.`;

    const userPrompt = `Interview Session Summary:
Total Duration: ${duration} minutes (Target: ${this.INTERVIEW_DURATION_LIMIT} minutes)
Problem: ${session.currentProblem?.title || 'Not assigned'}
Difficulty: ${session.currentProblem?.difficulty || 'Unknown'}
Category: ${session.currentProblem?.category || 'Unknown'}

Code executions: ${session.executionHistory?.length || 0}
Final test results: ${session.lastExecution ? 
  `${session.lastExecution.results.passedTests}/${session.lastExecution.results.totalTests} tests passed` : 
  'No tests run'}

Final code length: ${session.currentCode?.length || 0} characters
Progress level: ${this.assessProgressLevel(session.currentCode)}

Candidate profile: ${JSON.stringify(session.aiContext?.candidateProfile || {})}
Messages exchanged: ${session.messages?.length || 0}
Hints requested: ${session.hintsRequested || 0}

Interview phases completed:
- Introduction: ${session.aiContext?.interviewProgress?.introduction ? 'Yes' : 'No'}
- Problem Explanation: ${session.aiContext?.interviewProgress?.problemExplanation ? 'Yes' : 'No'}
- Coding: ${session.aiContext?.interviewProgress?.codingStarted ? 'Yes' : 'No'}
- Testing: ${session.aiContext?.interviewProgress?.testingPhase ? 'Yes' : 'No'}

Final submitted code:
\`\`\`${session.language || 'javascript'}
${session.currentCode || 'No code submitted.'}
\`\`\`
Please dont ask any irrelevant information like code execution time or memory , focus on time and space complexity itself

Please provide a comprehensive but concise evaluation focusing on strengths and growth areas.`;

    try {
      const response = await this.callGroqAPI(systemPrompt, userPrompt);
      
      // Generate speech for evaluation
      let audioBuffer = null;
      try {
        audioBuffer = await this.generateSpeech(response);
      } catch (speechError) {
        console.error('Speech generation failed for evaluation:', speechError.message);
      }
      
      return {
        message: response,
        audio: audioBuffer ? {
          buffer: audioBuffer,
          contentType: 'audio/mpeg',
          size: audioBuffer.length
        } : null
      };
    } catch (error) {
      console.error('Error generating evaluation:', error);
      return {
        message: "Thank you for participating in this interview. You demonstrated good problem-solving skills and clear communication throughout the process. Continue practicing coding problems and focus on explaining your thought process. Keep up the great work!",
        audio: null
      };
    }
  }

  getSystemPromptForPhase(phase, session) {
    const duration = this.getInterviewDuration(session.startTime);
    
    const basePrompt = `You are an AI technical interviewer conducting a coding interview. Be professional, encouraging, and CONCISE. Keep responses brief and natural. Current duration: ${duration} minutes (for reference).

IMPORTANT: Keep all responses under 3 sentences unless giving specific help. Avoid over-analyzing or asking multiple questions at once.`;
    
    switch (phase) {
      case 'introduction':
        return `${basePrompt}

Current Phase: Introduction
Goals:
- Make candidate comfortable with warm greeting
- Learn about their background and experience
- Ask targeted questions based on their resume
- Set clear expectations for the interview format
- Transition when you have enough information and sense readiness

Important: If you feel ready to move to problem presentation based on the conversation flow, include "TRANSITION TO problem-presentation" at the end of your response.`;

      case 'problem-presentation':
        return `${basePrompt}

Current Phase: Problem Presentation
Goals:
- Tell the candidate you're ready to assign them a coding problem
- Ask if they're ready to begin the coding phase
- When they confirm readiness, respond with a message that includes the phrase "start coding"
- DO NOT create or describe any specific problems yourself - the system will automatically assign one
- Simply prepare them for the transition to coding

Important: To trigger problem assignment, your response MUST include the exact phrase "start coding" when the candidate is ready.
If you want to transition to coding phase, include "TRANSITION TO coding" at the end of your response.`;

      case 'coding':
        return `${basePrompt}

Current Phase: Coding
Goals:
- A coding problem has been automatically assigned with a code editor interface
- ACTIVELY monitor and discuss the candidate's code as they write it
- The candidate's current code is provided in the context - ALWAYS reference it when giving feedback
- Help with debugging, hints, or clarifications about the ASSIGNED problem
- Ask specific questions about their implementation choices and approach
- Discuss time/space complexity and optimization opportunities

Code Analysis Guidelines:
- When candidate writes code, acknowledge their progress briefly
- Help with syntax errors or logical issues if they exist
- Only provide detailed feedback if candidate is stuck or asks for help
- Avoid asking about minor optimizations - focus on getting working code first
- Don't ask multiple follow-up questions about implementation details
- Keep responses focused and practical rather than academic

Important: The candidate now has access to:
- Problem description and constraints
- Code editor with template code  
- Test cases to run their solution
- Language selection

ALWAYS reference the candidate's current code (shown in context) when providing feedback or asking questions.

If you determine it's time to move to testing (e.g., candidate has written substantial code or wants to test), include "TRANSITION TO testing" at the end of your response.`;

      case 'testing':
        return `${basePrompt}

Current Phase: Testing & Evaluation
Goals:
- The candidate is now in the testing phase where they can run their code
- If test results are provided in context: Review them and provide feedback
- If no test results yet: Encourage them to run tests on their solution
- Focus on practical next steps based on actual test outcomes
- Keep feedback concise and actionable

Testing Phase Guidelines:
- ONLY comment on test results if they are explicitly shown in the context
- If no test execution results are provided, encourage running tests
- Don't assume tests have been run unless you see actual results
- When tests fail: Provide ONE specific hint about the main issue
- When tests pass: Acknowledge success and discuss next steps
- Avoid theoretical discussions - focus on actual results

Important: Check the context carefully for test execution results before making any claims about test outcomes.
If you feel the interview should conclude (based on progress, engagement, or natural flow), include "TRANSITION TO conclusion" at the end of your response.`;

      case 'conclusion':
        return `${basePrompt}

Current Phase: Conclusion
Goals:
- Wrap up the interview professionally
- Provide encouraging final feedback
- Summarize the candidate's performance highlights
- Thank the candidate for their time
- Answer any final questions they may have

Be positive and encouraging regardless of performance. Focus on effort and process over just results.`;

      default:
        return basePrompt;
    }
  }

  determineNextPhase(response, currentPhase, session) {
    // Check if Groq explicitly requested a phase transition
    const transitionMatch = response.match(/TRANSITION TO (\w+(?:-\w+)*)/i);
    if (transitionMatch) {
      const requestedPhase = transitionMatch[1].toLowerCase();
      console.log(`AI requested phase transition to: ${requestedPhase}`);
      return requestedPhase;
    }
    
    // Emergency fallback for extreme time limits (soft enforcement)
    const duration = this.getInterviewDuration(session.startTime);
    if (duration >= 25) { // Very soft emergency limit
      console.log('Emergency time limit reached, forcing conclusion');
      return 'conclusion';
    }
    
    // Stay in current phase if no explicit transition requested
    return currentPhase;
  }

  determineAction(response, phase, duration) {
    // Check for specific actions based on response content
    
    // More comprehensive detection for starting coding phase
    if (phase === 'problem-presentation' || phase === 'introduction') {
      const lowerResponse = response.toLowerCase();
      if (lowerResponse.includes('start coding') || 
          lowerResponse.includes('begin coding') || 
          lowerResponse.includes('let\'s begin') ||
          lowerResponse.includes('ready to code') ||
          (lowerResponse.includes('assign') && lowerResponse.includes('problem')) ||
          lowerResponse.includes('coding phase')) {
        return 'start-coding';
      }
    }
    
    if (response.toLowerCase().includes('test') && response.toLowerCase().includes('code')) {
      return 'run-tests';
    }
    
    if (response.toLowerCase().includes('hint') || response.toLowerCase().includes('help')) {
      return 'provide-hint';
    }
    
    // Very soft time warning - only as a gentle suggestion
    if (duration >= 22 && phase !== 'conclusion') {
      return 'suggest-gentle-conclusion';
    }
    
    return null;
  }

  determinePhaseAfterExecution(session, testResults) {
    // Let AI decide phase transitions based on context, not hardcoded time limits
    // This method now provides a default transition behavior
    
    // Move to testing phase after first code execution if currently in coding
    if (session.phase === 'coding') {
      return 'testing';
    }
    
    // Stay in testing phase to allow iterations and improvements
    // The AI will decide when to conclude based on candidate's progress and engagement
    if (session.phase === 'testing') {
      return 'testing';
    }
    
    return session.phase;
  }

  getInterviewDuration(startTime) {
    return Math.round((Date.now() - new Date(startTime).getTime()) / (1000 * 60));
  }

  async callGroqAPI(systemPrompt, userPrompt) {
    if (!this.apiKey) {
      console.error('Groq API key not configured');
      throw new Error('Groq API key not configured');
    }

    console.log('Making Groq API call:', {
      model: this.model,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 400,
          temperature: 0.7,
          top_p: 0.9
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log('Groq API call successful:', {
        responseLength: response.data.choices[0].message.content.length,
        model: response.data.model,
        usage: response.data.usage,
        timestamp: new Date().toISOString()
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Groq API call failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  shouldAutoConclueInterview(session) {
    const duration = this.getInterviewDuration(session.startTime);
    // Very soft limit - only for extreme cases
    return duration >= 30; // Extended soft limit
  }

  getInterviewStatus(session) {
    const duration = this.getInterviewDuration(session.startTime);
    const softProgress = (duration / this.INTERVIEW_DURATION_LIMIT) * 100;
    
    return {
      duration,
      remaining: Math.max(0, this.INTERVIEW_DURATION_LIMIT - duration),
      progress: Math.min(100, softProgress),
      phase: session.phase,
      shouldConclude: duration >= 30 // Very soft limit
    };
  }

  // ElevenLabs Text-to-Speech Integration
  async generateSpeech(text, voiceId = null) {
    if (!this.elevenLabsApiKey) {
      console.log('ElevenLabs API key not configured, skipping TTS generation');
      return null;
    }

    if (!text || text.trim().length === 0) {
      return null;
    }

    try {
      // Clean text for better TTS (remove markdown, code blocks, etc.)
      const cleanText = this.cleanTextForTTS(text);
      
      if (cleanText.length === 0) {
        console.log('Text cleaning resulted in empty string, skipping TTS');
        return null;
      }

      // Additional validation for text quality
      if (cleanText.length > 1000) {
        console.log('Text too long for TTS, skipping');
        return null;
      }

      const selectedVoiceId = voiceId || this.defaultVoiceId;
      
      console.log('Generating speech with ElevenLabs:', {
        originalLength: text.length,
        cleanedLength: cleanText.length,
        voiceId: selectedVoiceId,
        preview: cleanText.substring(0, 100),
        timestamp: new Date().toISOString()
      });

      const response = await axios.post(
        `${this.elevenLabsBaseURL}/text-to-speech/${selectedVoiceId}`,
        {
          text: cleanText,
          model_id: "eleven_turbo_v2",
          voice_settings: this.voiceSettings
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      console.log('ElevenLabs TTS successful:', {
        audioSize: response.data.byteLength,
        contentType: response.headers['content-type'],
        timestamp: new Date().toISOString()
      });

      // Convert ArrayBuffer to Buffer for Node.js
      return Buffer.from(response.data);
      
    } catch (error) {
      // Special handling for 401 Unauthorized errors
      if (error.response?.status === 401) {
        console.error('ElevenLabs API Key Error:', {
          message: 'Invalid or missing API key',
          status: 401,
          timestamp: new Date().toISOString(),
          hint: 'Check your ELEVENLABS_API_KEY in .env file'
        });
      } else {
        console.error('ElevenLabs TTS error:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          errorDetails: error.response?.data,
          timestamp: new Date().toISOString()
        });
        
        // Log specific message for free tier limitations
        if (error.response?.data?.detail?.message?.includes('unusual activity')) {
          console.log('ℹ️  ElevenLabs Free Tier disabled due to unusual activity detection.');
          console.log('   Consider upgrading to a paid plan at https://elevenlabs.io/pricing');
        }
      }
      
      // Return null on error - don't break the interview flow
      return null;
    }
  }

  cleanTextForTTS(text) {
    if (!text) return '';
    
    // Check for corrupted/garbled text patterns
    const corruptedPatterns = [
      /^[A-Z]+[a-z]*[A-Z]+[a-z]*[A-Z]+[a-z]*/, // Random uppercase/lowercase patterns
      /(\w+)(\1){3,}/, // Repeated words
      /[^\w\s.,!?'"()-]{10,}/, // Long sequences of special characters
      /^[\w-]+[\w-]+[\w-]+[\w-]+[\w-]+[\w-]+/, // Long sequences of hyphenated words
      /\b\w{20,}\b/ // Very long words (likely corrupted)
    ];
    
    // Check if text appears corrupted
    const isCorrupted = corruptedPatterns.some(pattern => pattern.test(text));
    if (isCorrupted) {
      console.log('Detected corrupted text, using fallback message');
      return "I apologize, but there seems to be an issue with my response. Let's continue with the interview.";
    }
    
    // Check text length - if too long, truncate
    if (text.length > 1000) {
      console.log(`Text too long for TTS (${text.length} chars), truncating`);
      text = text.substring(0, 997) + '...';
    }
    
    const cleaned = text
      // Remove markdown code blocks
      .replace(/```[\s\S]*?```/g, ' code block ')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove markdown formatting
      .replace(/[*_~]/g, '')
      // Remove HTML tags if any
      .replace(/<[^>]*>/g, '')
      // Remove repeated dashes or underscores
      .replace(/[-_]{4,}/g, ' ')
      // Clean up multiple spaces and newlines
      .replace(/\s+/g, ' ')
      // Remove extra punctuation sequences
      .replace(/[.]{2,}/g, '.')
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      // Remove any remaining special character sequences
      .replace(/[^\w\s.,!?'"()-]/g, '')
      // Trim whitespace
      .trim();
    
    // Final validation - if cleaned text is too short or still looks corrupted
    if (cleaned.length < 10 || !/[a-z]/.test(cleaned)) {
      return "Let's continue with the interview.";
    }
    
    return cleaned;
  }

  async getAvailableVoices() {
    if (!this.elevenLabsApiKey) {
      return [];
    }

    try {
      const response = await axios.get(
        `${this.elevenLabsBaseURL}/voices`,
        {
          headers: {
            'xi-api-key': this.elevenLabsApiKey
          }
        }
      );

      return response.data.voices.map(voice => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        preview_url: voice.preview_url
      }));
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error.message);
      return [];
    }
  }

  async testTTSConnection() {
    if (!this.elevenLabsApiKey) {
      return { success: false, error: 'ElevenLabs API key not configured' };
    }

    try {
      const testText = "Hello, this is a test of the text-to-speech system.";
      const audioBuffer = await this.generateSpeech(testText);
      
      if (audioBuffer) {
        return { 
          success: true, 
          message: 'ElevenLabs TTS is working correctly',
          audioSize: audioBuffer.length
        };
      } else {
        return { success: false, error: 'Audio generation returned null' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `TTS test failed: ${error.message}` 
      };
    }
  }
}
