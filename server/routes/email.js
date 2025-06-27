import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// Subscribe to daily emails
router.post('/subscribe', [
  body('sheetIds').isArray().notEmpty(),
  body('dailyProblems').isInt({ min: 1, max: 10 }),
  body('preferredTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sheetIds, dailyProblems, preferredTime } = req.body;
    const userId = req.user.id;

    // Update user preferences
    await pool.query(
      `INSERT INTO user_preferences (user_id, email_notifications, daily_problems, preferred_time, selected_sheets, updated_at)
       VALUES ($1, true, $2, $3, $4, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET 
         email_notifications = true,
         daily_problems = $2,
         preferred_time = $3,
         selected_sheets = $4,
         updated_at = NOW()`,
      [userId, dailyProblems, preferredTime, JSON.stringify(sheetIds)]
    );

    res.json({ message: 'Successfully subscribed to daily emails' });
    console.log(`✅ User ${req.user.email || req.user.id} subscribed to daily emails`);
  } catch (error) {
    console.error('Email subscription error:', error);
    res.status(500).json({ error: 'Failed to subscribe to emails' });
  }
});

// Unsubscribe from daily emails
router.post('/unsubscribe', async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `UPDATE user_preferences 
       SET email_notifications = false, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    res.json({ message: 'Successfully unsubscribed from daily emails' });
    console.log(`✅ User ${req.user.email || req.user.id} unsubscribed from daily emails`);
  } catch (error) {
    console.error('Email unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from emails' });
  }
});

// Get email preferences
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        emailNotifications: false,
        dailyProblems: 3,
        preferredTime: '09:00',
        selectedSheets: []
      });
    }

    const prefs = result.rows[0];
    
    res.json({
      emailNotifications: prefs.email_notifications,
      dailyProblems: prefs.daily_problems,
      preferredTime: prefs.preferred_time,
      selectedSheets: JSON.parse(prefs.selected_sheets || '[]')
    });
  } catch (error) {
    console.error('Get email preferences error:', error);
    res.status(500).json({ error: 'Failed to get email preferences' });
  }
});

// Send test email (admin only)
router.post('/test', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, subject, content } = req.body;

    await sendEmail(email, subject, content);

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Get email logs (admin only)
router.get('/logs', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT el.*, u.email as recipient_email, u.name as recipient_name
       FROM email_logs el
       LEFT JOIN users u ON el.user_id = u.id
       ORDER BY el.sent_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Get email logs error:', error);
    res.status(500).json({ error: 'Failed to get email logs' });
  }
});

// Get subscription status
router.get('/subscription-status', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT email_notifications FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    const isSubscribed = result.rows.length > 0 ? result.rows[0].email_notifications : false;
    
    res.json({ 
      isSubscribed,
      message: isSubscribed ? 'User is subscribed to daily emails' : 'User is not subscribed to daily emails'
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Update subscription status only
router.put('/subscription', async (req, res) => {
  try {
    const { emailNotifications } = req.body;
    const userId = req.user.id;

    if (typeof emailNotifications !== 'boolean') {
      return res.status(400).json({ error: 'emailNotifications must be a boolean value' });
    }

    // Update or create user preferences with subscription status
    await pool.query(
      `INSERT INTO user_preferences (user_id, email_notifications, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET 
         email_notifications = $2,
         updated_at = NOW()`,
      [userId, emailNotifications]
    );

    const action = emailNotifications ? 'subscribed to' : 'unsubscribed from';
    res.json({ 
      message: `Successfully ${action} daily emails`,
      isSubscribed: emailNotifications
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Test email subscription check (development/admin only)
router.get('/test-subscriptions', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, up.email_notifications, up.daily_problems, 
              up.preferred_time, up.selected_sheets
       FROM users u
       LEFT JOIN user_preferences up ON u.id = up.user_id
       ORDER BY u.created_at DESC
       LIMIT 20`
    );

    const users = result.rows.map(user => ({
      ...user,
      selected_sheets: user.selected_sheets ? JSON.parse(user.selected_sheets) : [],
      is_subscribed: Boolean(user.email_notifications)
    }));

    res.json({ 
      message: 'Current user subscription status',
      users: users,
      total_subscribed: users.filter(u => u.is_subscribed).length,
      total_users: users.length
    });
  } catch (error) {
    console.error('Test subscriptions error:', error);
    res.status(500).json({ error: 'Failed to get subscription test data' });
  }
});

export default router;