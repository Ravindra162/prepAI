import cron from 'node-cron';
import pool from '../config/database.js';
import { sendEmail, generateDailyProblemsEmail } from './emailService.js';

export const startEmailScheduler = () => {
  // Run every hour to check for scheduled emails
  cron.schedule('0 * * * *', async () => {
    console.log('🕐 Checking for scheduled emails...');
    await sendDailyEmails();
  });

  console.log('📅 Email scheduler started');
};

const sendDailyEmails = async () => {
  try {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    // Get users who should receive emails at this time
    const usersResult = await pool.query(
      `SELECT u.id, u.name, u.email, up.daily_problems, up.selected_sheets
       FROM users u
       JOIN user_preferences up ON u.id = up.user_id
       WHERE up.email_notifications = true
         AND up.preferred_time = $1
         AND u.is_active = true
         AND u.email IS NOT NULL
         AND u.email != ''
         AND up.selected_sheets IS NOT NULL
         AND up.selected_sheets != '[]'`,
      [`${currentHour.toString().padStart(2, '0')}:${Math.floor(currentMinute / 60) * 60}`]
    );

    console.log(`📧 Found ${usersResult.rows.length} users for email delivery`);

    for (const user of usersResult.rows) {
      try {
        await sendDailyEmailToUser(user);
      } catch (error) {
        console.error(`❌ Failed to send email to ${user.email}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Email scheduler error:', error);
  }
};

const sendDailyEmailToUser = async (user) => {
  try {
    // Double-check subscription status before sending
    const subscriptionCheck = await pool.query(
      'SELECT email_notifications FROM user_preferences WHERE user_id = $1',
      [user.id]
    );
    
    if (subscriptionCheck.rows.length === 0 || !subscriptionCheck.rows[0].email_notifications) {
      console.log(`⚠️ User ${user.email} is not subscribed to email notifications`);
      return;
    }

    const selectedSheets = JSON.parse(user.selected_sheets || '[]');
    
    if (selectedSheets.length === 0) {
      console.log(`⚠️ No sheets selected for user ${user.email}`);
      return;
    }

    // Get problems user hasn't solved yet
    const problemsResult = await pool.query(
      `SELECT p.id, p.title, p.difficulty, p.ques_topic, p.lc_link, p.yt_link
       FROM problems p
       LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $1
       WHERE p.sheet_id = ANY($2)
         AND p.is_active = true
         AND (pp.status IS NULL OR pp.status != 'solved')
       ORDER BY RANDOM()
       LIMIT $3`,
      [user.id, selectedSheets, user.daily_problems]
    );

    if (problemsResult.rows.length === 0) {
      console.log(`⚠️ No unsolved problems found for user ${user.email}`);
      return;
    }

    const problems = problemsResult.rows.map(problem => ({
      ...problem,
      topics: JSON.parse(problem.ques_topic || '[]').map(t => t.label || t.value || t)
    }));

    const emailHtml = generateDailyProblemsEmail(user.name, problems);
    
    await sendEmail(
      user.email,
      `🚀 Your Daily DSA Problems - ${new Date().toLocaleDateString()}`,
      emailHtml,
      user.id
    );

    console.log(`✅ Daily email sent to ${user.email}`);
  } catch (error) {
    console.error(`❌ Error sending daily email to ${user.email}:`, error);
    throw error;
  }
};