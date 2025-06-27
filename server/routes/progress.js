import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// Update problem progress
router.post('/problem', [
  body('problemId').isUUID(),
  body('sheetId').isUUID(),
  body('status').isIn(['solved', 'in_progress', 'bookmarked', 'not_started'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { problemId, sheetId, status } = req.body;
    const userId = req.user.id;

    // Verify problem exists
    const problemResult = await pool.query(
      'SELECT id FROM problems WHERE id = $1 AND sheet_id = $2 AND is_active = true',
      [problemId, sheetId]
    );

    if (problemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Upsert progress
    const result = await pool.query(
      `INSERT INTO problem_progress (user_id, problem_id, sheet_id, status, solved_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, problem_id)
       DO UPDATE SET 
         status = $4,
         solved_at = CASE WHEN $4 = 'solved' THEN NOW() ELSE problem_progress.solved_at END,
         updated_at = NOW()
       RETURNING *`,
      [userId, problemId, sheetId, status, status === 'solved' ? new Date() : null]
    );

    res.json({
      message: 'Progress updated successfully',
      progress: result.rows[0]
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Bulk update progress for multiple problems
router.post('/bulk', [
  body('updates').isArray().notEmpty(),
  body('updates.*.problemId').isUUID(),
  body('updates.*.sheetId').isUUID(),
  body('updates.*.status').isIn(['solved', 'in_progress', 'bookmarked', 'not_started'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { updates } = req.body;
    const userId = req.user.id;

    const results = [];

    // Process each update
    for (const update of updates) {
      const { problemId, sheetId, status } = update;

      // Verify problem exists
      const problemResult = await pool.query(
        'SELECT id FROM problems WHERE id = $1 AND sheet_id = $2 AND is_active = true',
        [problemId, sheetId]
      );

      if (problemResult.rows.length === 0) {
        results.push({ problemId, error: 'Problem not found' });
        continue;
      }

      // Upsert progress
      const result = await pool.query(
        `INSERT INTO problem_progress (user_id, problem_id, sheet_id, status, solved_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, problem_id)
         DO UPDATE SET 
           status = $4,
           solved_at = CASE WHEN $4 = 'solved' THEN NOW() ELSE problem_progress.solved_at END,
           updated_at = NOW()
         RETURNING *`,
        [userId, problemId, sheetId, status, status === 'solved' ? new Date() : null]
      );

      results.push({ problemId, progress: result.rows[0] });
    }

    res.json({
      message: 'Bulk progress update completed',
      results
    });
  } catch (error) {
    console.error('Bulk update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get user's overall progress
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get overall stats
    const statsResult = await pool.query(
      `SELECT 
         COUNT(DISTINCT CASE WHEN pp.status = 'solved' THEN pp.problem_id END) as total_solved,
         COUNT(DISTINCT CASE WHEN pp.status = 'bookmarked' THEN pp.problem_id END) as total_bookmarked,
         COUNT(DISTINCT pp.sheet_id) as sheets_started,
         COUNT(DISTINCT DATE(pp.solved_at)) as active_days
       FROM problem_progress pp
       WHERE pp.user_id = $1`,
      [userId]
    );

    // Get streak calculation
    const streakResult = await pool.query(
      `WITH daily_solves AS (
         SELECT DATE(solved_at) as solve_date
         FROM problem_progress
         WHERE user_id = $1 AND status = 'solved' AND solved_at IS NOT NULL
         GROUP BY DATE(solved_at)
         ORDER BY DATE(solved_at) DESC
       ),
       streak_calc AS (
         SELECT solve_date,
                solve_date - ROW_NUMBER() OVER (ORDER BY solve_date DESC)::integer as streak_group
         FROM daily_solves
       )
       SELECT COUNT(*) as current_streak
       FROM streak_calc
       WHERE streak_group = (SELECT MAX(streak_group) FROM streak_calc)`,
      [userId]
    );

    // Get recent progress by day
    const dailyResult = await pool.query(
      `SELECT 
         DATE(pp.solved_at) as date,
         COUNT(*) as problems_solved
       FROM problem_progress pp
       WHERE pp.user_id = $1 
         AND pp.status = 'solved'
         AND pp.solved_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(pp.solved_at)
       ORDER BY date DESC`,
      [userId]
    );

    const stats = statsResult.rows[0];
    const streak = streakResult.rows[0];
    const dailyProgress = dailyResult.rows;

    res.json({
      totalSolved: parseInt(stats.total_solved) || 0,
      totalBookmarked: parseInt(stats.total_bookmarked) || 0,
      sheetsStarted: parseInt(stats.sheets_started) || 0,
      activeDays: parseInt(stats.active_days) || 0,
      currentStreak: parseInt(streak.current_streak) || 0,
      dailyProgress
    });
  } catch (error) {
    console.error('Get progress overview error:', error);
    res.status(500).json({ error: 'Failed to get progress overview' });
  }
});

// Get progress for specific sheet
router.get('/sheet/:sheetId', async (req, res) => {
  try {
    const { sheetId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
         p.id,
         p.title,
         p.difficulty,
         p.ques_topic,
         COALESCE(pp.status, 'not_started') as status,
         pp.solved_at,
         pp.updated_at
       FROM problems p
       LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $2
       WHERE p.sheet_id = $1 AND p.is_active = true
       ORDER BY p.step_no, p.sl_no_in_step`,
      [sheetId, userId]
    );

    const problems = result.rows.map(problem => ({
      ...problem,
      topics: JSON.parse(problem.ques_topic || '[]').map(t => t.label || t.value || t)
    }));

    res.json({ problems });
  } catch (error) {
    console.error('Get sheet progress error:', error);
    res.status(500).json({ error: 'Failed to get sheet progress' });
  }
});

// Get completion statistics for a sheet
router.get('/sheet/:sheetId/stats', async (req, res) => {
  try {
    const { sheetId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
         COUNT(p.id) as total_problems,
         COUNT(CASE WHEN pp.status = 'solved' THEN 1 END) as completed_problems,
         COUNT(CASE WHEN pp.status = 'bookmarked' THEN 1 END) as bookmarked_problems,
         COUNT(CASE WHEN pp.status = 'in_progress' THEN 1 END) as in_progress_problems,
         ROUND(
           (COUNT(CASE WHEN pp.status = 'solved' THEN 1 END) * 100.0 / COUNT(p.id)), 2
         ) as completion_percentage
       FROM problems p
       LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $2
       WHERE p.sheet_id = $1 AND p.is_active = true`,
      [sheetId, userId]
    );

    const stats = result.rows[0];

    res.json({
      totalProblems: parseInt(stats.total_problems) || 0,
      completedProblems: parseInt(stats.completed_problems) || 0,
      bookmarkedProblems: parseInt(stats.bookmarked_problems) || 0,
      inProgressProblems: parseInt(stats.in_progress_problems) || 0,
      completionPercentage: parseFloat(stats.completion_percentage) || 0
    });
  } catch (error) {
    console.error('Get sheet stats error:', error);
    res.status(500).json({ error: 'Failed to get sheet statistics' });
  }
});

export default router;