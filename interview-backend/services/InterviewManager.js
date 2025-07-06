import { v4 as uuidv4 } from 'uuid';

export class InterviewManager {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeouts = new Map();
  }

  async createSession(sessionId, candidateInfo, resumeData) {
    const session = {
      id: sessionId || uuidv4(),
      candidateInfo,
      resumeData,
      status: 'active',
      phase: 'introduction',
      startTime: new Date(),
      lastActivity: new Date(),
      messages: [],
      currentProblem: null,
      currentCode: '',
      language: 'javascript',
      executionHistory: [],
      aiContext: {
        conversationHistory: [],
        candidateProfile: this.analyzeCandidateProfile(resumeData),
        interviewProgress: {
          introduction: false,
          problemExplanation: false,
          codingStarted: false,
          testingPhase: false,
          completed: false
        }
      }
    };

    this.sessions.set(session.id, session);
    this.setSessionTimeout(session.id);
    
    return session;
  }

  async getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  async updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    Object.assign(session, updates);
    session.lastActivity = new Date();
    
    // Reset timeout
    this.setSessionTimeout(sessionId);
    
    return session;
  }

  async deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    this.clearSessionTimeout(sessionId);
  }

  setSessionTimeout(sessionId) {
    // Clear existing timeout
    this.clearSessionTimeout(sessionId);
    
    // Set new timeout for 30 minutes
    const timeout = setTimeout(() => {
      console.log(`Session ${sessionId} timed out`);
      this.deleteSession(sessionId);
    }, 30 * 60 * 1000); // 30 minutes
    
    this.sessionTimeouts.set(sessionId, timeout);
  }

  clearSessionTimeout(sessionId) {
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }
  }

  analyzeCandidateProfile(resumeData) {
    if (!resumeData) return { experience: 'unknown', skills: [], seniority: 'junior' };

    const profile = {
      experience: this.extractExperience(resumeData),
      skills: this.extractSkills(resumeData),
      seniority: this.determineSeniority(resumeData),
      education: this.extractEducation(resumeData),
      projects: this.extractProjects(resumeData),
      companies: this.extractCompanies(resumeData),
      techStack: this.extractTechStack(resumeData)
    };

    return profile;
  }

  extractExperience(resumeData) {
    // Enhanced experience extraction logic
    const text = JSON.stringify(resumeData).toLowerCase();
    
    let totalExperience = 0;
    
    // Look for explicit experience mentions
    const experienceMatches = text.match(/(\d+)\s*(years?|yrs?)\s*(of\s*)?(experience|work|professional)/gi);
    if (experienceMatches && experienceMatches.length > 0) {
      const years = experienceMatches.map(match => {
        const num = match.match(/\d+/);
        return num ? parseInt(num[0]) : 0;
      });
      totalExperience = Math.max(...years);
    }

    // If no explicit experience, try to infer from work history
    if (totalExperience === 0) {
      const workHistory = this.extractWorkHistory(resumeData);
      totalExperience = workHistory.length > 0 ? Math.min(workHistory.length * 1.5, 10) : 0;
    }

    return Math.round(totalExperience);
  }

  extractWorkHistory(resumeData) {
    const text = JSON.stringify(resumeData).toLowerCase();
    const workKeywords = ['developer', 'engineer', 'programmer', 'software', 'intern', 'consultant', 'architect'];
    
    const positions = [];
    workKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        positions.push(...matches);
      }
    });
    
    return [...new Set(positions)]; // Remove duplicates
  }

  extractSkills(resumeData) {
    const text = JSON.stringify(resumeData).toLowerCase();
    const skillCategories = {
      languages: ['javascript', 'python', 'java', 'c++', 'c#', 'typescript', 'go', 'rust', 'swift', 'kotlin', 'php', 'ruby'],
      frontend: ['react', 'angular', 'vue', 'html', 'css', 'sass', 'less', 'bootstrap', 'tailwind', 'material-ui', 'chakra'],
      backend: ['node.js', 'express', 'spring', 'django', 'flask', 'fastapi', 'laravel', 'rails', 'asp.net'],
      databases: ['mongodb', 'postgresql', 'mysql', 'redis', 'cassandra', 'dynamodb', 'sqlite', 'oracle'],
      cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'heroku', 'vercel', 'netlify'],
      tools: ['git', 'github', 'gitlab', 'jenkins', 'circleci', 'webpack', 'babel', 'eslint', 'jest', 'cypress']
    };

    const foundSkills = [];
    Object.values(skillCategories).flat().forEach(skill => {
      if (text.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });

    return foundSkills;
  }

  extractTechStack(resumeData) {
    const skills = this.extractSkills(resumeData);
    const text = JSON.stringify(resumeData).toLowerCase();
    
    const stacks = {
      fullStack: skills.some(s => ['react', 'angular', 'vue'].includes(s.toLowerCase())) && 
                 skills.some(s => ['node.js', 'express', 'django', 'spring'].includes(s.toLowerCase())),
      frontend: skills.some(s => ['react', 'angular', 'vue', 'javascript', 'typescript'].includes(s.toLowerCase())),
      backend: skills.some(s => ['node.js', 'python', 'java', 'django', 'spring'].includes(s.toLowerCase())),
      mobile: skills.some(s => ['react native', 'flutter', 'swift', 'kotlin'].includes(s.toLowerCase())),
      devops: skills.some(s => ['docker', 'kubernetes', 'aws', 'jenkins'].includes(s.toLowerCase()))
    };
    
    return Object.keys(stacks).filter(key => stacks[key]);
  }

  extractCompanies(resumeData) {
    const text = JSON.stringify(resumeData);
    // Look for company indicators (this is a simplified version)
    const companyKeywords = ['inc', 'corp', 'ltd', 'llc', 'technologies', 'systems', 'solutions'];
    const lines = text.split(/[\n\r,]/);
    
    const companies = [];
    lines.forEach(line => {
      if (companyKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        companies.push(line.trim());
      }
    });
    
    return companies.slice(0, 5); // Limit to 5 companies
  }

  determineSeniority(resumeData) {
    const experience = this.extractExperience(resumeData);
    const skills = this.extractSkills(resumeData);
    const text = JSON.stringify(resumeData).toLowerCase();
    
    // Look for senior indicators
    const seniorKeywords = ['senior', 'lead', 'principal', 'staff', 'architect', 'manager'];
    const hasSeniorTitle = seniorKeywords.some(keyword => text.includes(keyword));
    
    if (experience >= 7 || hasSeniorTitle || skills.length >= 12) return 'senior';
    if (experience >= 3 || skills.length >= 6) return 'mid';
    if (experience >= 1 || skills.length >= 3) return 'junior';
    return 'entry';
  }

  extractEducation(resumeData) {
    const text = JSON.stringify(resumeData).toLowerCase();
    const educationLevels = {
      phd: ['phd', 'doctorate', 'ph.d'],
      masters: ['master', 'msc', 'mba', 'm.s', 'ms'],
      bachelors: ['bachelor', 'bsc', 'ba', 'bs', 'b.s', 'b.a'],
      associate: ['associate', 'aa', 'as'],
      certification: ['certified', 'certification', 'certificate']
    };
    
    const foundEducation = [];
    Object.keys(educationLevels).forEach(level => {
      if (educationLevels[level].some(keyword => text.includes(keyword))) {
        foundEducation.push(level);
      }
    });
    
    return foundEducation;
  }

  extractProjects(resumeData) {
    const text = JSON.stringify(resumeData).toLowerCase();
    
    // Count project mentions
    const projectKeywords = ['project', 'built', 'developed', 'created', 'implemented'];
    let projectCount = 0;
    
    projectKeywords.forEach(keyword => {
      const matches = text.match(new RegExp(`\\b${keyword}\\b`, 'gi'));
      if (matches) {
        projectCount += matches.length;
      }
    });
    
    // Look for GitHub or portfolio links
    const hasGithub = text.includes('github');
    const hasPortfolio = text.includes('portfolio') || text.includes('project');
    
    return {
      count: Math.min(projectCount, 20), // Cap at 20
      hasGithub,
      hasPortfolio
    };
  }

  getActiveSessionsCount() {
    return this.sessions.size;
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  getSessionsByStatus(status) {
    return Array.from(this.sessions.values()).filter(session => session.status === status);
  }

  // New monitoring and management methods
  getSessionStatistics() {
    const sessions = Array.from(this.sessions.values());
    const now = new Date();
    
    return {
      total: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      avgDuration: this.calculateAverageDuration(sessions),
      phases: this.getPhaseDistribution(sessions),
      recentActivity: sessions.filter(s => {
        const diff = now - new Date(s.lastActivity);
        return diff < 5 * 60 * 1000; // Last 5 minutes
      }).length
    };
  }

  calculateAverageDuration(sessions) {
    const completedSessions = sessions.filter(s => s.status === 'completed' && s.endTime);
    if (completedSessions.length === 0) return 0;
    
    const totalDuration = completedSessions.reduce((sum, session) => {
      const duration = new Date(session.endTime) - new Date(session.startTime);
      return sum + duration;
    }, 0);
    
    return Math.round(totalDuration / completedSessions.length / (1000 * 60)); // Average in minutes
  }

  getPhaseDistribution(sessions) {
    const phases = {};
    sessions.forEach(session => {
      phases[session.phase] = (phases[session.phase] || 0) + 1;
    });
    return phases;
  }

  // Enhanced session management
  async archiveCompletedSessions() {
    const completedSessions = Array.from(this.sessions.entries()).filter(
      ([_, session]) => session.status === 'completed'
    );
    
    // In a real application, you'd save these to a database
    console.log(`Archiving ${completedSessions.length} completed sessions`);
    
    completedSessions.forEach(([sessionId]) => {
      this.deleteSession(sessionId);
    });
    
    return completedSessions.length;
  }

  // Monitor session health
  async performHealthCheck() {
    const now = new Date();
    const staleThreshold = 25 * 60 * 1000; // 25 minutes
    const stuckThreshold = 5 * 60 * 1000;  // 5 minutes of inactivity
    
    const staleSessions = [];
    const stuckSessions = [];
    
    for (const [sessionId, session] of this.sessions) {
      const sessionAge = now - new Date(session.startTime);
      const lastActivity = now - new Date(session.lastActivity);
      
      if (sessionAge > staleThreshold && session.status === 'active') {
        staleSessions.push(sessionId);
      }
      
      if (lastActivity > stuckThreshold && session.status === 'active') {
        stuckSessions.push(sessionId);
      }
    }
    
    return {
      staleSessions,
      stuckSessions,
      totalSessions: this.sessions.size
    };
  }

  // Get session recommendations for problem difficulty
  getRecommendedDifficulty(session) {
    const profile = session.aiContext?.candidateProfile;
    if (!profile) return 'Easy';
    
    const { seniority, experience, skills } = profile;
    
    if (seniority === 'senior' || experience >= 5 || skills.length >= 10) {
      return 'Hard';
    } else if (seniority === 'mid' || experience >= 2 || skills.length >= 6) {
      return 'Medium';
    }
    
    return 'Easy';
  }

  // Update session progress tracking
  updateInterviewProgress(sessionId, phase, milestone) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    if (!session.aiContext) session.aiContext = {};
    if (!session.aiContext.interviewProgress) session.aiContext.interviewProgress = {};
    
    session.aiContext.interviewProgress[milestone] = true;
    session.phase = phase;
    session.lastActivity = new Date();
    
    return true;
  }

  // Generate session summary for analytics
  generateSessionSummary(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    const duration = session.endTime 
      ? Math.round((new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60))
      : Math.round((new Date() - new Date(session.startTime)) / (1000 * 60));
    
    return {
      sessionId,
      candidateName: session.candidateInfo?.name || 'Unknown',
      duration,
      status: session.status,
      phase: session.phase,
      problemSolved: session.currentProblem?.title || 'None',
      codeExecutions: session.executionHistory?.length || 0,
      messagesExchanged: session.messages?.length || 0,
      candidateProfile: session.aiContext?.candidateProfile,
      finalResults: session.lastExecution?.results,
      evaluation: session.evaluation, // Add AI evaluation
      startTime: session.startTime,
      endTime: session.endTime
    };
  }
}
