import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get filter options for sheets
router.get('/filters', async (req, res) => {
  try {
    // Get all unique difficulties and tags
    const result = await pool.query(`
      SELECT 
        ARRAY_AGG(DISTINCT difficulty) as difficulties,
        ARRAY_AGG(DISTINCT tag) as tags
      FROM (
        SELECT difficulty, NULL as tag FROM sheets WHERE is_active = true
        UNION ALL
        SELECT NULL as difficulty, jsonb_array_elements_text(tags::jsonb) as tag 
        FROM sheets WHERE is_active = true AND tags IS NOT NULL AND tags != '[]'
      ) combined
    `);
    
    const difficulties = (result.rows[0].difficulties || []).filter(d => d !== null);
    const tags = (result.rows[0].tags || []).filter(t => t !== null).sort();
    
    res.json({
      difficulties: difficulties.sort(),
      tags: tags
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ error: 'Failed to get filter options' });
  }
});

// Get all sheets (public endpoint)
router.get('/', async (req, res) => {
  try {
    const { 
      difficulty, 
      search, 
      tags,
      limit = 20, 
      offset = 0,
      page = 1
    } = req.query;
    
    // Convert page-based pagination to offset-based
    const actualLimit = parseInt(limit);
    const actualOffset = page > 1 ? (parseInt(page) - 1) * actualLimit : parseInt(offset);
    
    // Build the main query
    let query = `
      SELECT s.*, 
             COUNT(p.id) as problem_count,
             COALESCE(AVG(p.difficulty), 0) as avg_difficulty
      FROM sheets s
      LEFT JOIN problems p ON s.id = p.sheet_id
      WHERE s.is_active = true
    `;
    
    const queryParams = [];
    let paramCount = 1;

    if (difficulty && difficulty !== 'all') {
      query += ` AND s.difficulty = $${paramCount}`;
      queryParams.push(difficulty);
      paramCount++;
    }

    if (search && search.trim()) {
      query += ` AND (s.title ILIKE $${paramCount} OR s.description ILIKE $${paramCount} OR s.author ILIKE $${paramCount})`;
      queryParams.push(`%${search.trim()}%`);
      paramCount++;
    }

    if (tags && tags !== 'all') {
      query += ` AND s.tags::text ILIKE $${paramCount}`;
      queryParams.push(`%"${tags}"%`);
      paramCount++;
    }

    query += ` GROUP BY s.id ORDER BY s.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(actualLimit, actualOffset);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM sheets s
      WHERE s.is_active = true
    `;
    
    const countParams = [];
    let countParamCount = 1;

    if (difficulty && difficulty !== 'all') {
      countQuery += ` AND s.difficulty = $${countParamCount}`;
      countParams.push(difficulty);
      countParamCount++;
    }

    if (search && search.trim()) {
      countQuery += ` AND (s.title ILIKE $${countParamCount} OR s.description ILIKE $${countParamCount} OR s.author ILIKE $${countParamCount})`;
      countParams.push(`%${search.trim()}%`);
      countParamCount++;
    }

    if (tags && tags !== 'all') {
      countQuery += ` AND s.tags::text ILIKE $${countParamCount}`;
      countParams.push(`%"${tags}"%`);
      countParamCount++;
    }

    // Execute both queries
    const [result, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams)
    ]);
    
    const totalSheets = parseInt(countResult.rows[0].total) || 0;
    const totalPages = Math.ceil(totalSheets / actualLimit);
    const currentPage = Math.max(1, parseInt(page));
    
    res.json({
      sheets: result.rows.map(sheet => {
        let tags = [];
        try {
          tags = JSON.parse(sheet.tags || '[]');
        } catch (e) {
          console.warn(`Failed to parse tags for sheet ${sheet.id}:`, e.message);
          tags = [];
        }
        
        return {
          ...sheet,
          tags,
          problemCount: parseInt(sheet.problem_count) || 0,
          avgDifficulty: parseFloat(sheet.avg_difficulty) || 0
        };
      }),
      pagination: {
        currentPage,
        totalPages,
        totalSheets,
        limit: actualLimit,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    });
  } catch (error) {
    console.error('Get sheets error:', error);
    res.status(500).json({ error: 'Failed to get sheets' });
  }
});

// Get sheet by ID with problems
router.get('/:id', async (req, res) => {
  try {
    const sheetId = req.params.id;
    
    // Get sheet details
    const sheetResult = await pool.query(
      'SELECT * FROM sheets WHERE id = $1 AND is_active = true',
      [sheetId]
    );

    if (sheetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    // Get problems for this sheet
    // Use null for user_id if no user is authenticated (public access)
    const userId = req.user?.id || null;
    
    const problemsResult = await pool.query(
      `SELECT p.*, 
              COALESCE(pp.status, 'not_started') as user_status,
              pp.solved_at
       FROM problems p
       LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $2
       WHERE p.sheet_id = $1 AND p.is_active = true
       ORDER BY p.step_no, p.sl_no_in_step`,
      [sheetId, userId]
    );

    const sheet = sheetResult.rows[0];
    const problems = problemsResult.rows.map(problem => {
      let topics = [];
      try {
        const parsedTopics = JSON.parse(problem.ques_topic || '[]');
        topics = Array.isArray(parsedTopics) ? parsedTopics.map(t => t.label || t.value || t) : [];
      } catch (e) {
        console.warn(`Failed to parse topics for problem ${problem.id}:`, e.message);
        topics = [];
      }
      
      return {
        ...problem,
        topics,
        solved: problem.user_status === 'solved',
        bookmarked: problem.user_status === 'bookmarked'
      };
    });

    let tags = [];
    try {
      tags = JSON.parse(sheet.tags || '[]');
    } catch (e) {
      console.warn(`Failed to parse tags for sheet ${sheet.id}:`, e.message);
      tags = [];
    }

    res.json({
      ...sheet,
      tags,
      problems,
      solved: problems.filter(p => p.solved).length
    });
  } catch (error) {
    console.error('Get sheet error:', error);
    res.status(500).json({ error: 'Failed to get sheet' });
  }
});

// Get user's progress for a sheet (requires auth)
router.get('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const sheetId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_problems,
         COUNT(CASE WHEN pp.status = 'solved' THEN 1 END) as solved_problems,
         COUNT(CASE WHEN pp.status = 'bookmarked' THEN 1 END) as bookmarked_problems,
         COUNT(CASE WHEN pp.status = 'in_progress' THEN 1 END) as in_progress_problems
       FROM problems p
       LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $2
       WHERE p.sheet_id = $1 AND p.is_active = true`,
      [sheetId, userId]
    );

    const progress = result.rows[0];
    
    res.json({
      totalProblems: parseInt(progress.total_problems) || 0,
      solvedProblems: parseInt(progress.solved_problems) || 0,
      bookmarkedProblems: parseInt(progress.bookmarked_problems) || 0,
      inProgressProblems: parseInt(progress.in_progress_problems) || 0,
      completionPercentage: progress.total_problems > 0 
        ? Math.round((progress.solved_problems / progress.total_problems) * 100)
        : 0
    });
  } catch (error) {
    console.error('Get sheet progress error:', error);
    res.status(500).json({ error: 'Failed to get sheet progress' });
  }
});

export default router;