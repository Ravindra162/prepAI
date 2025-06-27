import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { requireAdmin } from '../middleware/auth.js';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

// Configure multer for file uploads
const upload = multer({ dest: 'server/uploads/' });

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    // Get user stats
    const userStats = await pool.query(
      `SELECT 
         COUNT(*) as total_users,
         COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_month,
         COUNT(CASE WHEN last_login >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_users_week
       FROM users WHERE role = 'user'`
    );

    // Get sheet stats
    const sheetStats = await pool.query(
      `SELECT 
         COUNT(*) as total_sheets,
         COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_sheets_month
       FROM sheets WHERE is_active = true`
    );

    // Get problem stats
    const problemStats = await pool.query(
      `SELECT 
         COUNT(*) as total_problems,
         COUNT(CASE WHEN pp.status = 'solved' THEN 1 END) as total_solved
       FROM problems p
       LEFT JOIN problem_progress pp ON p.id = pp.problem_id
       WHERE p.is_active = true`
    );

    // Get code execution stats
    const codeStats = await pool.query(
      `SELECT 
         COUNT(*) as total_executions,
         COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as executions_week
       FROM code_executions`
    );

    // Get daily user growth for chart
    const growthData = await pool.query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as new_users
       FROM users 
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
         AND role = 'user'
       GROUP BY DATE(created_at)
       ORDER BY date`
    );

    res.json({
      users: userStats.rows[0],
      sheets: sheetStats.rows[0],
      problems: problemStats.rows[0],
      codeExecutions: codeStats.rows[0],
      growthData: growthData.rows
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// User management
router.get('/users', async (req, res) => {
  try {
    const { search, status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT u.id, u.email, u.name, u.role, u.created_at, u.last_login, u.is_active,
             COUNT(DISTINCT pp.problem_id) as problems_solved
      FROM users u
      LEFT JOIN problem_progress pp ON u.id = pp.user_id AND pp.status = 'solved'
      WHERE u.role = 'user'
    `;
    
    const queryParams = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (status === 'active') {
      query += ` AND u.is_active = true`;
    } else if (status === 'inactive') {
      query += ` AND u.is_active = false`;
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    res.json({
      users: result.rows.map(user => ({
        ...user,
        problemsSolved: parseInt(user.problems_solved) || 0
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Toggle user status
router.patch('/users/:id/status', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 AND role = \'user\' RETURNING is_active',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User status updated',
      isActive: result.rows[0].is_active
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Get users with email preferences
router.get('/users-with-preferences', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.is_active,
        u.created_at,
        u.last_login,
        COALESCE(up.email_notifications, false) as email_notifications,
        COALESCE(up.daily_problems, 3) as daily_problems,
        COALESCE(up.preferred_time, '09:00') as preferred_time,
        CASE 
          WHEN up.selected_sheets IS NOT NULL AND up.selected_sheets != '[]' AND up.selected_sheets != 'null'
          THEN up.selected_sheets::text
          ELSE '[]'
        END as selected_sheets_raw
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.role = 'user'
      ORDER BY u.created_at DESC
    `);

    // Parse selected_sheets for each user
    const users = result.rows.map(user => {
      let selectedSheets = [];
      try {
        if (user.selected_sheets_raw && user.selected_sheets_raw !== '[]' && user.selected_sheets_raw !== 'null') {
          selectedSheets = JSON.parse(user.selected_sheets_raw);
        }
      } catch (error) {
        console.error('Failed to parse selected_sheets for user:', user.id, error);
        selectedSheets = [];
      }

      return {
        ...user,
        selected_sheets: selectedSheets
      };
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users with preferences error:', error);
    res.status(500).json({ error: 'Failed to get users with preferences' });
  }
});

// Sheet management
router.get('/sheets', async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT s.*, 
             COUNT(p.id) as problem_count,
             COUNT(DISTINCT pp.user_id) as user_count
      FROM sheets s
      LEFT JOIN problems p ON s.id = p.sheet_id AND p.is_active = true
      LEFT JOIN problem_progress pp ON s.id = pp.sheet_id
      WHERE s.is_active = true
    `;
    
    const queryParams = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (s.title ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    query += ` GROUP BY s.id ORDER BY s.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    
    res.json({
      sheets: result.rows.map(sheet => ({
        ...sheet,
        tags: JSON.parse(sheet.tags || '[]'),
        problemCount: parseInt(sheet.problem_count) || 0,
        userCount: parseInt(sheet.user_count) || 0
      }))
    });
  } catch (error) {
    console.error('Get admin sheets error:', error);
    res.status(500).json({ error: 'Failed to get sheets' });
  }
});

// Create sheet
router.post('/sheets', [
  body('title').trim().isLength({ min: 3 }),
  body('description').trim().isLength({ min: 10 }),
  body('difficulty').isIn(['beginner', 'intermediate', 'advanced']),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, difficulty, estimatedTime, author, tags } = req.body;

    const result = await pool.query(
      `INSERT INTO sheets (title, description, difficulty, estimated_time, author, tags, created_by, created_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), true)
       RETURNING *`,
      [title, description, difficulty, estimatedTime, author, JSON.stringify(tags || []), req.user.id]
    );

    const sheet = result.rows[0];
    
    res.status(201).json({
      message: 'Sheet created successfully',
      sheet: {
        ...sheet,
        tags: JSON.parse(sheet.tags || '[]')
      }
    });
  } catch (error) {
    console.error('Create sheet error:', error);
    res.status(500).json({ error: 'Failed to create sheet' });
  }
});

// Upload problems via CSV
router.post('/sheets/:id/problems/upload', upload.single('csv'), async (req, res) => {
  try {
    const sheetId = req.params.id;
    const csvFile = req.file;

    if (!csvFile) {
      return res.status(400).json({ error: 'CSV file required' });
    }

    // Verify sheet exists
    const sheetResult = await pool.query(
      'SELECT id FROM sheets WHERE id = $1 AND is_active = true',
      [sheetId]
    );

    if (sheetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const problems = [];
    
    // Parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFile.path)
        .pipe(csv())
        .on('data', (row) => {
          problems.push({
            title: row.title,
            step_no: parseInt(row.step_no) || 1,
            sl_no_in_step: parseInt(row.sl_no_in_step) || 1,
            head_step_no: row.head_step_no || 'General',
            post_link: row.post_link || '',
            yt_link: row.yt_link || '',
            cs_link: row.cs_link || '',
            gfg_link: row.gfg_link || '',
            lc_link: row.lc_link || '',
            difficulty: parseInt(row.difficulty) || 1,
            ques_topic: row.ques_topic || '[]',
            plus_link: row.plus_link || null,
            editorial_link: row.editorial_link || null
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Insert problems
    const insertPromises = problems.map(problem => 
      pool.query(
        `INSERT INTO problems (sheet_id, title, step_no, sl_no_in_step, head_step_no, 
                              post_link, yt_link, cs_link, gfg_link, lc_link, difficulty, 
                              ques_topic, plus_link, editorial_link, created_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), true)`,
        [sheetId, problem.title, problem.step_no, problem.sl_no_in_step, 
         problem.head_step_no, problem.post_link, problem.yt_link, problem.cs_link,
         problem.gfg_link, problem.lc_link, problem.difficulty, problem.ques_topic,
         problem.plus_link, problem.editorial_link]
      )
    );

    await Promise.all(insertPromises);

    // Clean up uploaded file
    fs.unlinkSync(csvFile.path);

    res.json({
      message: `Successfully uploaded ${problems.length} problems`,
      count: problems.length
    });
  } catch (error) {
    console.error('Upload problems error:', error);
    res.status(500).json({ error: 'Failed to upload problems' });
  }
});

// Analytics
router.get('/analytics', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    let interval = '30 days';
    if (timeRange === '7d') interval = '7 days';
    else if (timeRange === '90d') interval = '90 days';
    else if (timeRange === '1y') interval = '1 year';

    // User engagement metrics
    const engagementResult = await pool.query(
      `SELECT 
         COUNT(DISTINCT u.id) as daily_active_users,
         AVG(session_duration.avg_duration) as avg_session_duration,
         COUNT(DISTINCT ce.id) as code_executions,
         ROUND(AVG(completion_rate.rate), 2) as completion_rate
       FROM users u
       LEFT JOIN code_executions ce ON u.id = ce.user_id AND ce.created_at >= CURRENT_DATE - INTERVAL '${interval}'
       LEFT JOIN (
         SELECT user_id, AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_duration
         FROM problem_progress 
         WHERE created_at >= CURRENT_DATE - INTERVAL '${interval}'
         GROUP BY user_id
       ) session_duration ON u.id = session_duration.user_id
       LEFT JOIN (
         SELECT pp.user_id, 
                COUNT(CASE WHEN pp.status = 'solved' THEN 1 END)::float / COUNT(*)::float * 100 as rate
         FROM problem_progress pp
         WHERE pp.created_at >= CURRENT_DATE - INTERVAL '${interval}'
         GROUP BY pp.user_id
       ) completion_rate ON u.id = completion_rate.user_id
       WHERE u.last_login >= CURRENT_DATE - INTERVAL '${interval}'`
    );

    // Daily activity data
    const activityResult = await pool.query(
      `SELECT 
         DATE(pp.created_at) as date,
         COUNT(DISTINCT pp.user_id) as active_users,
         COUNT(CASE WHEN pp.status = 'solved' THEN 1 END) as problems_solved
       FROM problem_progress pp
       WHERE pp.created_at >= CURRENT_DATE - INTERVAL '${interval}'
       GROUP BY DATE(pp.created_at)
       ORDER BY date`
    );

    // Top performing sheets
    const topSheetsResult = await pool.query(
      `SELECT 
         s.title,
         COUNT(DISTINCT pp.user_id) as user_count,
         COUNT(CASE WHEN pp.status = 'solved' THEN 1 END) as problems_solved,
         ROUND(AVG(CASE WHEN pp.status = 'solved' THEN 1.0 ELSE 0.0 END) * 100, 2) as completion_rate
       FROM sheets s
       LEFT JOIN problem_progress pp ON s.id = pp.sheet_id 
         AND pp.created_at >= CURRENT_DATE - INTERVAL '${interval}'
       WHERE s.is_active = true
       GROUP BY s.id, s.title
       ORDER BY user_count DESC
       LIMIT 10`
    );

    const engagement = engagementResult.rows[0];
    const dailyActivity = activityResult.rows;
    const topSheets = topSheetsResult.rows;

    res.json({
      engagement: {
        dailyActiveUsers: parseInt(engagement.daily_active_users) || 0,
        avgSessionDuration: parseFloat(engagement.avg_session_duration) || 0,
        codeExecutions: parseInt(engagement.code_executions) || 0,
        completionRate: parseFloat(engagement.completion_rate) || 0
      },
      dailyActivity,
      topSheets
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics data' });
  }
});

export default router;