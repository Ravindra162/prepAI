import express from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import pool from '../config/database.js';

const router = express.Router();

// Execute code
router.post('/execute', [
  body('code').notEmpty(),
  body('language').isIn(['javascript', 'python', 'java', 'cpp', 'c', 'go', 'rust', 'typescript']),
  body('input').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, language, input = '', problemId } = req.body;
    const userId = req.user.id;

    // Language mapping for Piston API
    const languageMap = {
      javascript: { language: 'javascript', version: '18.15.0' },
      python: { language: 'python', version: '3.10.0' },
      java: { language: 'java', version: '15.0.2' },
      cpp: { language: 'cpp', version: '10.2.0' },
      c: { language: 'c', version: '10.2.0' },
      go: { language: 'go', version: '1.16.2' },
      rust: { language: 'rust', version: '1.68.2' },
      typescript: { language: 'typescript', version: '5.0.3' }
    };

    const langConfig = languageMap[language];
    if (!langConfig) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    // Execute code using Piston API
    const pistonResponse = await axios.post('https://emkc.org/api/v2/piston/execute', {
      language: langConfig.language,
      version: langConfig.version,
      files: [{ content: code }],
      stdin: input,
      compile_timeout: 10000,
      run_timeout: 3000,
      compile_memory_limit: -1,
      run_memory_limit: -1
    });

    const result = pistonResponse.data;
    
    // Log execution
    await pool.query(
      `INSERT INTO code_executions (user_id, problem_id, language, code, input, output, error, execution_time, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        userId,
        problemId || null,
        language,
        code,
        input,
        result.run.stdout || '',
        result.run.stderr || '',
        result.run.runtime || 0
      ]
    );

    res.json({
      output: result.run.stdout || '',
      error: result.run.stderr || '',
      exitCode: result.run.code || 0,
      runtime: result.run.runtime || 0,
      memory: result.run.memory || 0
    });
  } catch (error) {
    console.error('Code execution error:', error);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }
    
    res.status(500).json({ error: 'Code execution failed' });
  }
});

// Get execution history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, problemId } = req.query;

    let query = `
      SELECT ce.*, p.title as problem_title
      FROM code_executions ce
      LEFT JOIN problems p ON ce.problem_id = p.id
      WHERE ce.user_id = $1
    `;
    
    const queryParams = [userId];
    let paramCount = 2;

    if (problemId) {
      query += ` AND ce.problem_id = $${paramCount}`;
      queryParams.push(problemId);
      paramCount++;
    }

    query += ` ORDER BY ce.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    res.json({ executions: result.rows });
  } catch (error) {
    console.error('Get execution history error:', error);
    res.status(500).json({ error: 'Failed to get execution history' });
  }
});

// Get execution stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_executions,
         COUNT(CASE WHEN error = '' THEN 1 END) as successful_executions,
         COUNT(DISTINCT language) as languages_used,
         COUNT(DISTINCT problem_id) as problems_attempted,
         AVG(execution_time) as avg_execution_time
       FROM code_executions
       WHERE user_id = $1`,
      [userId]
    );

    const languageStats = await pool.query(
      `SELECT 
         language,
         COUNT(*) as count,
         AVG(execution_time) as avg_time
       FROM code_executions
       WHERE user_id = $1
       GROUP BY language
       ORDER BY count DESC`,
      [userId]
    );

    const stats = result.rows[0];
    
    res.json({
      totalExecutions: parseInt(stats.total_executions) || 0,
      successfulExecutions: parseInt(stats.successful_executions) || 0,
      languagesUsed: parseInt(stats.languages_used) || 0,
      problemsAttempted: parseInt(stats.problems_attempted) || 0,
      avgExecutionTime: parseFloat(stats.avg_execution_time) || 0,
      languageBreakdown: languageStats.rows
    });
  } catch (error) {
    console.error('Get execution stats error:', error);
    res.status(500).json({ error: 'Failed to get execution stats' });
  }
});

export default router;