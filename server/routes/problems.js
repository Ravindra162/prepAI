import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user stats (must be before /:id route)
router.get('/my-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get overall completion stats
    const statsResult = await pool.query(
      `SELECT 
         COUNT(DISTINCT pp.problem_id) as total_attempted,
         COUNT(DISTINCT CASE WHEN pp.status = 'solved' THEN pp.problem_id END) as total_completed,
         COUNT(DISTINCT CASE WHEN pp.status = 'bookmarked' THEN pp.problem_id END) as total_bookmarked,
         COUNT(DISTINCT pp.sheet_id) as sheets_started
       FROM problem_progress pp
       WHERE pp.user_id = $1`,
      [userId]
    );

    // Get recent completions (last 7 days)
    const recentResult = await pool.query(
      `SELECT DATE(solved_at) as date, COUNT(*) as count
       FROM problem_progress
       WHERE user_id = $1 
         AND status = 'solved' 
         AND solved_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(solved_at)
       ORDER BY date DESC`,
      [userId]
    );

    const stats = statsResult.rows[0];

    res.json({
      totalAttempted: parseInt(stats.total_attempted) || 0,
      totalCompleted: parseInt(stats.total_completed) || 0,
      totalBookmarked: parseInt(stats.total_bookmarked) || 0,
      sheetsStarted: parseInt(stats.sheets_started) || 0,
      recentActivity: recentResult.rows
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// Get problem by ID
router.get('/:id', async (req, res) => {
  try {
    const problemId = req.params.id;
    const userId = req.user?.id; // Optional user ID if authenticated
    
    let query = `
      SELECT p.*, s.title as sheet_title
      FROM problems p
      JOIN sheets s ON p.sheet_id = s.id
      WHERE p.id = $1 AND p.is_active = true
    `;
    
    let params = [problemId];
    
    // If user is authenticated, include their progress
    if (userId) {
      query = `
        SELECT p.*, s.title as sheet_title,
               COALESCE(pp.status, 'not_started') as user_status,
               pp.solved_at,
               pp.updated_at as progress_updated_at
        FROM problems p
        JOIN sheets s ON p.sheet_id = s.id
        LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $2
        WHERE p.id = $1 AND p.is_active = true
      `;
      params = [problemId, userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const problem = result.rows[0];
    
    res.json({
      ...problem,
      topics: JSON.parse(problem.ques_topic || '[]').map(t => t.label || t.value || t),
      isCompleted: problem.user_status === 'solved'
    });
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({ error: 'Failed to get problem' });
  }
});

// Search problems
router.get('/search', async (req, res) => {
  try {
    const { q, difficulty, topic, limit = 20, offset = 0 } = req.query;
    const userId = req.user?.id; // Optional user ID if authenticated
    
    let query = `
      SELECT p.*, s.title as sheet_title
      FROM problems p
      JOIN sheets s ON p.sheet_id = s.id
      WHERE p.is_active = true AND s.is_active = true
    `;
    
    // If user is authenticated, include their progress
    if (userId) {
      query = `
        SELECT p.*, s.title as sheet_title,
               COALESCE(pp.status, 'not_started') as user_status,
               pp.solved_at,
               pp.updated_at as progress_updated_at
        FROM problems p
        JOIN sheets s ON p.sheet_id = s.id
        LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $1
        WHERE p.is_active = true AND s.is_active = true
      `;
    }
    
    const queryParams = userId ? [userId] : [];
    let paramCount = userId ? 2 : 1;

    if (q) {
      query += ` AND p.title ILIKE $${paramCount}`;
      queryParams.push(`%${q}%`);
      paramCount++;
    }

    if (difficulty !== undefined) {
      query += ` AND p.difficulty = $${paramCount}`;
      queryParams.push(parseInt(difficulty));
      paramCount++;
    }

    if (topic) {
      query += ` AND p.ques_topic ILIKE $${paramCount}`;
      queryParams.push(`%${topic}%`);
      paramCount++;
    }

    query += ` ORDER BY p.title LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    res.json({
      problems: result.rows.map(problem => ({
        ...problem,
        topics: JSON.parse(problem.ques_topic || '[]').map(t => t.label || t.value || t),
        isCompleted: problem.user_status === 'solved'
      }))
    });
  } catch (error) {
    console.error('Search problems error:', error);
    res.status(500).json({ error: 'Failed to search problems' });
  }
});

// Get all problems or problems by sheet
router.get('/', async (req, res) => {
  try {
    const { sheet, difficulty, limit, offset = 0 } = req.query;
    const userId = req.user?.id; // Optional user ID if authenticated
    
    // Set default limit: no limit for specific sheet, 50 for general queries
    const defaultLimit = sheet ? 1000 : 50;
    const actualLimit = limit ? parseInt(limit) : defaultLimit;
    
    let query = `
      SELECT p.*, s.title as sheet_title
      FROM problems p
      JOIN sheets s ON p.sheet_id = s.id
      WHERE p.is_active = true AND s.is_active = true
    `;
    
    // If user is authenticated, include their progress
    if (userId) {
      query = `
        SELECT p.*, s.title as sheet_title,
               COALESCE(pp.status, 'not_started') as user_status,
               pp.solved_at,
               pp.updated_at as progress_updated_at
        FROM problems p
        JOIN sheets s ON p.sheet_id = s.id
        LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $1
        WHERE p.is_active = true AND s.is_active = true
      `;
    }
    
    const queryParams = userId ? [userId] : [];
    let paramCount = userId ? 2 : 1;

    if (sheet) {
      query += ` AND p.sheet_id = $${paramCount}`;
      queryParams.push(sheet);
      paramCount++;
    }

    if (difficulty !== undefined) {
      query += ` AND p.difficulty = $${paramCount}`;
      queryParams.push(parseInt(difficulty));
      paramCount++;
    }

    query += ` ORDER BY p.step_no, p.sl_no_in_step LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(actualLimit, offset);

    const result = await pool.query(query, queryParams);
    
    res.json({
      problems: result.rows.map(problem => {
        let topics = [];
        try {
          // Handle different data types for ques_topic
          if (typeof problem.ques_topic === 'string') {
            topics = JSON.parse(problem.ques_topic || '[]').map(t => t.label || t.value || t);
          } else if (Array.isArray(problem.ques_topic)) {
            topics = problem.ques_topic.map(t => t.label || t.value || t);
          } else if (problem.ques_topic) {
            topics = [problem.ques_topic];
          }
        } catch (parseError) {
          console.warn(`Failed to parse ques_topic for problem ${problem.id}:`, parseError.message);
          topics = [];
        }
        
        return {
          ...problem,
          topics,
          isCompleted: problem.user_status === 'solved'
        };
      })
    });
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ error: 'Failed to get problems' });
  }
});

// Mark problem as completed (checked off)
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const problemId = req.params.id;
    const userId = req.user.id;
    const { sheetId, completed = true } = req.body;

    // Verify problem exists and get sheet_id if not provided
    const problemResult = await pool.query(
      'SELECT id, sheet_id, title FROM problems WHERE id = $1 AND is_active = true',
      [problemId]
    );

    if (problemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const problem = problemResult.rows[0];
    const targetSheetId = sheetId || problem.sheet_id;

    // Update or insert progress
    const status = completed ? 'solved' : 'not_started';
    const solvedAt = completed ? new Date() : null;

    const result = await pool.query(
      `INSERT INTO problem_progress (user_id, problem_id, sheet_id, status, solved_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, problem_id)
       DO UPDATE SET 
         status = $4,
         solved_at = $5,
         updated_at = NOW()
       RETURNING *`,
      [userId, problemId, targetSheetId, status, solvedAt]
    );

    // Get updated user stats for this sheet
    const sheetStatsResult = await pool.query(
      `SELECT 
         COUNT(p.id) as total_problems,
         COUNT(CASE WHEN pp.status = 'solved' THEN 1 END) as completed_problems
       FROM problems p
       LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $2
       WHERE p.sheet_id = $1 AND p.is_active = true`,
      [targetSheetId, userId]
    );

    const sheetStats = sheetStatsResult.rows[0];

    res.json({
      message: completed ? 'Problem marked as completed' : 'Problem marked as incomplete',
      progress: result.rows[0],
      problemTitle: problem.title,
      isCompleted: completed,
      sheetProgress: {
        completed: parseInt(sheetStats.completed_problems) || 0,
        total: parseInt(sheetStats.total_problems) || 0,
        percentage: Math.round(((parseInt(sheetStats.completed_problems) || 0) / (parseInt(sheetStats.total_problems) || 1)) * 100)
      }
    });
  } catch (error) {
    console.error('Complete problem error:', error);
    res.status(500).json({ error: 'Failed to update problem completion status' });
  }
});

// Get user's completion status for multiple problems
router.post('/completion-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { problemIds } = req.body;

    if (!problemIds || !Array.isArray(problemIds)) {
      return res.status(400).json({ error: 'problemIds array is required' });
    }

    const result = await pool.query(
      `SELECT problem_id, status, solved_at
       FROM problem_progress 
       WHERE user_id = $1 AND problem_id = ANY($2)`,
      [userId, problemIds]
    );

    // Create a map of problem completion status
    const completionMap = {};
    result.rows.forEach(row => {
      completionMap[row.problem_id] = {
        status: row.status,
        isCompleted: row.status === 'solved',
        solvedAt: row.solved_at
      };
    });

    // Fill in missing problems as not started
    problemIds.forEach(problemId => {
      if (!completionMap[problemId]) {
        completionMap[problemId] = {
          status: 'not_started',
          isCompleted: false,
          solvedAt: null
        };
      }
    });

    res.json({ completionStatus: completionMap });
  } catch (error) {
    console.error('Get completion status error:', error);
    res.status(500).json({ error: 'Failed to get completion status' });
  }
});

// Get user's overall completion statistics
export default router;