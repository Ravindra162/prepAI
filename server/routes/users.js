import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// Update user profile
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;
    const userId = req.user.id;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    // Update user
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (email) {
      updateFields.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, email, name, role, created_at`;

    const result = await pool.query(query, values);
    const user = result.rows[0];

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        joinDate: user.created_at
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Update user preferences
router.put('/preferences', [
  body('emailNotifications').optional().isBoolean(),
  body('dailyProblems').optional().isInt({ min: 1, max: 10 }),
  body('preferredTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('selectedSheets').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { emailNotifications, dailyProblems, preferredTime, selectedSheets } = req.body;
    const userId = req.user.id;

    // Upsert user preferences
    await pool.query(
      `INSERT INTO user_preferences (user_id, email_notifications, daily_problems, preferred_time, selected_sheets, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         email_notifications = COALESCE($2, user_preferences.email_notifications),
         daily_problems = COALESCE($3, user_preferences.daily_problems),
         preferred_time = COALESCE($4, user_preferences.preferred_time),
         selected_sheets = COALESCE($5, user_preferences.selected_sheets),
         updated_at = NOW()`,
      [userId, emailNotifications, dailyProblems, preferredTime, JSON.stringify(selectedSheets)]
    );

    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Preferences update failed' });
  }
});

// Get user dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user stats
    const statsResult = await pool.query(
      `SELECT 
         COUNT(DISTINCT CASE WHEN pp.status = 'solved' THEN pp.problem_id END) as problems_solved,
         COUNT(DISTINCT CASE WHEN pp.status = 'bookmarked' THEN pp.problem_id END) as bookmarked,
         COUNT(DISTINCT pp.sheet_id) as sheets_started,
         COUNT(DISTINCT ce.id) as code_executions
       FROM problem_progress pp
       LEFT JOIN code_executions ce ON ce.user_id = $1 AND ce.created_at >= CURRENT_DATE - INTERVAL '30 days'
       WHERE pp.user_id = $1`,
      [userId]
    );

    // Get recent activity
    const activityResult = await pool.query(
      `SELECT 
         pp.problem_id,
         p.title as problem_title,
         s.title as sheet_title,
         pp.status,
         pp.updated_at
       FROM problem_progress pp
       JOIN problems p ON pp.problem_id = p.id
       JOIN sheets s ON pp.sheet_id = s.id
       WHERE pp.user_id = $1
       ORDER BY pp.updated_at DESC
       LIMIT 10`,
      [userId]
    );

    // Get weekly progress
    const weeklyResult = await pool.query(
      `SELECT 
         DATE(pp.solved_at) as date,
         COUNT(*) as problems_solved
       FROM problem_progress pp
       WHERE pp.user_id = $1 
         AND pp.status = 'solved'
         AND pp.solved_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(pp.solved_at)
       ORDER BY date`,
      [userId]
    );

    const stats = statsResult.rows[0];
    const recentActivity = activityResult.rows;
    const weeklyProgress = weeklyResult.rows;

    res.json({
      stats: {
        problemsSolved: parseInt(stats.problems_solved) || 0,
        bookmarked: parseInt(stats.bookmarked) || 0,
        sheetsStarted: parseInt(stats.sheets_started) || 0,
        codeExecutions: parseInt(stats.code_executions) || 0
      },
      recentActivity,
      weeklyProgress
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

export default router;