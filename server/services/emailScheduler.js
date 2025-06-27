import cron from 'node-cron';
import pool from '../config/database.js';
import { sendEmail, generateDailyProblemsEmail } from './emailService.js';

// Helper to get current IST time as a Date object
function getISTDate() {
  const now = new Date();
  // Create a proper IST date using toLocaleString
  const istDateString = now.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata"
  });
  return new Date(istDateString);
}

export const startEmailScheduler = () => {
  // Run every 15 minutes
  cron.schedule('*/1 * * * *', async () => {
    console.log('🕐 Checking for scheduled emails...');
    await sendDailyEmails();
  });

  console.log('📅 Email scheduler started');
};

// For manual testing
export const testEmailSending = async () => {
  console.log('🧪 Testing email sending manually...');
  await sendDailyEmails();
};

const sendDailyEmails = async () => {
  try {
    const istTime = getISTDate();
    const currentISTHour = istTime.getHours();
    const currentISTMinute = istTime.getMinutes();

    console.log(
      `🕐 Current IST time: ${currentISTHour.toString().padStart(2, '0')}:${currentISTMinute
        .toString()
        .padStart(2, '0')}`
    );

    // Create a 15-minute time window (as strings "HH:MM")
    const timeWindows = [];
    for (let i = 0; i < 15; i++) {
      const checkTime = new Date(istTime.getTime() - i * 60 * 1000);
      const hour = checkTime.getHours();
      const minute = checkTime.getMinutes();
      timeWindows.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }

    console.log(`🕐 Checking time windows: ${timeWindows.slice(0, 3).join(', ')}...`);

    // Query users who should receive emails at this time
    const usersResult = await pool.query(
      `SELECT u.id, u.name, u.email, up.daily_problems, 
              up.selected_sheets::text as selected_sheets, up.preferred_time
       FROM users u
       JOIN user_preferences up ON u.id = up.user_id
       WHERE up.email_notifications = true
         AND up.preferred_time = ANY($1)
         AND u.is_active = true
         AND u.email IS NOT NULL
         AND u.email != ''
         AND up.selected_sheets IS NOT NULL
         AND up.selected_sheets != '[]'
         AND up.selected_sheets != 'null'`,
      [timeWindows]
    );

    console.log(`📧 Found ${usersResult.rows.length} users for email delivery`);
    
    if (usersResult.rows.length > 0) {
      console.log('Users to receive emails:');
      usersResult.rows.forEach(user => {
        console.log(`  - ${user.email} (preferred: ${user.preferred_time}, sheets: ${user.selected_sheets})`);
      });
    }

    // Avoid duplicate emails per day
    const today = istTime.toISOString().split('T')[0]; // YYYY-MM-DD

    for (const user of usersResult.rows) {
      try {
        // Check if email was already sent today, but also consider if user resubscribed since last email
        const emailCheckResult = await pool.query(
          `SELECT el.id, el.sent_at, up.updated_at as subscription_updated
           FROM email_logs el
           JOIN user_preferences up ON up.user_id = el.user_id
           WHERE el.user_id = $1 
             AND el.subject LIKE '%Daily DSA Problems%'
             AND el.sent_at::date = $2
             AND el.status = 'sent'
           ORDER BY el.sent_at DESC
           LIMIT 1`,
          [user.id, today]
        );

        if (emailCheckResult.rows.length > 0) {
          const lastEmail = emailCheckResult.rows[0];
          // If user's subscription was updated after the last email, they may have resubscribed
          // In that case, allow sending another email
          if (new Date(lastEmail.subscription_updated) > new Date(lastEmail.sent_at)) {
            console.log(`🔄 User ${user.email} resubscribed since last email - sending new email`);
          } else {
            console.log(`✅ Email already sent today to ${user.email}`);
            continue;
          }
        }

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
    // Double-check subscription
    const subscriptionCheck = await pool.query(
      'SELECT email_notifications FROM user_preferences WHERE user_id = $1',
      [user.id]
    );

    if (
      subscriptionCheck.rows.length === 0 ||
      !subscriptionCheck.rows[0].email_notifications
    ) {
      console.log(`⚠️ User ${user.email} is not subscribed to email notifications`);
      return;
    }

    // Parse selected sheets
    let selectedSheets = [];
    try {
      console.log(`🔍 Raw selected_sheets for ${user.email}:`, user.selected_sheets, typeof user.selected_sheets);
      
      if (Array.isArray(user.selected_sheets)) {
        selectedSheets = user.selected_sheets;
      } else if (typeof user.selected_sheets === 'string') {
        const cleanString = user.selected_sheets.trim();
        
        if (cleanString.startsWith('[') && cleanString.endsWith(']')) {
          try {
            // Try JSON parse first
            selectedSheets = JSON.parse(cleanString);
          } catch {
            // Handle PostgreSQL array format: "[ 'uuid1', 'uuid2' ]"
            const pgArrayMatch = cleanString.match(/^\s*\[\s*(.+)\s*\]\s*$/);
            if (pgArrayMatch) {
              // Split by comma and clean up quotes
              selectedSheets = pgArrayMatch[1]
                .split(',')
                .map(item => item.trim().replace(/^['"]|['"]$/g, ''));
            } else {
              throw new Error('Unable to parse array format');
            }
          }
        } else if (cleanString.length > 0) {
          // Single sheet ID
          selectedSheets = [cleanString];
        } else {
          selectedSheets = [];
        }
      } else {
        selectedSheets = [];
      }
      
      console.log(`✅ Parsed selected sheets for ${user.email}:`, selectedSheets);
    } catch (error) {
      console.error(
        `❌ Failed to parse selected_sheets for user ${user.email}:`,
        user.selected_sheets,
        'Error:', error.message
      );
      return;
    }

    if (!Array.isArray(selectedSheets) || selectedSheets.length === 0) {
      console.log(`⚠️ No sheets selected for user ${user.email}`);
      return;
    }

    console.log(
      `📋 Getting problems for user ${user.email} from sheets: ${selectedSheets.join(', ')}`
    );

    // Get unsolved problems that haven't been sent before
    const problemsResult = await pool.query(
      `SELECT p.id, p.title, p.difficulty, p.ques_topic, p.lc_link, p.yt_link
       FROM problems p
       LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $1
       LEFT JOIN sent_problems sp ON p.id = sp.problem_id AND sp.user_id = $1
       WHERE p.sheet_id = ANY($2)
         AND p.is_active = true
         AND (pp.status IS NULL OR pp.status != 'solved')
         AND sp.problem_id IS NULL
       ORDER BY RANDOM()
       LIMIT $3`,
      [user.id, selectedSheets, user.daily_problems]
    );

    if (problemsResult.rows.length === 0) {
      console.log(`⚠️ No unsolved problems found for user ${user.email}`);
      return;
    }

    // Parse topics
    const problems = problemsResult.rows.map((problem) => {
      let topics = ['General'];
      try {
        const parsedTopics = JSON.parse(problem.ques_topic || '[]');
        topics = parsedTopics
          .map((t) => t.label || t.value || t)
          .filter(Boolean);
        if (topics.length === 0) topics = ['General'];
      } catch {
        // fallback to General
      }
      return { ...problem, topics };
    });

    const emailHtml = generateDailyProblemsEmail(user.name, problems);

    // Get IST date for subject
    const istDate = getISTDate();

    const emailLogId = await sendEmail(
      user.email,
      `🚀 Your Daily DSA Problems - ${istDate.toLocaleDateString('en-IN')}`,
      emailHtml,
      user.id
    );

    // Track sent problems to avoid resending
    if (emailLogId && problems.length > 0) {
      const problemIds = problems.map(p => p.id);
      const insertValues = problemIds.map((problemId, index) => 
        `($1, $${index + 2}, NOW(), $${problemIds.length + 2})`
      ).join(', ');
      
      await pool.query(
        `INSERT INTO sent_problems (user_id, problem_id, sent_at, email_log_id) 
         VALUES ${insertValues}
         ON CONFLICT (user_id, problem_id) DO NOTHING`,
        [user.id, ...problemIds, emailLogId]
      );
      
      console.log(`📝 Tracked ${problems.length} sent problems for user ${user.email}`);
    }

    console.log(
      `✅ Daily email sent to ${user.email} with ${problems.length} problems`
    );
  } catch (error) {
    console.error(`❌ Error sending daily email to ${user.email}:`, error);
    throw error;
  }
};

// Function to check and send immediate email if user's preferred time is valid for today
export const checkAndSendImmediateEmail = async (userId) => {
  try {
    console.log(`🔍 Checking immediate email opportunity for user ${userId}...`);
    
    const istTime = getISTDate();
    const currentISTHour = istTime.getHours();
    const currentISTMinute = istTime.getMinutes();
    const currentTimeString = `${currentISTHour.toString().padStart(2, '0')}:${currentISTMinute.toString().padStart(2, '0')}`;
    
    console.log(`🕐 Current IST time: ${currentTimeString}`);

    // Get user preferences
    const userResult = await pool.query(
      `SELECT u.id, u.name, u.email, up.daily_problems, 
              up.selected_sheets::text as selected_sheets, up.preferred_time
       FROM users u
       JOIN user_preferences up ON u.id = up.user_id
       WHERE u.id = $1
         AND up.email_notifications = true
         AND u.is_active = true
         AND u.email IS NOT NULL
         AND u.email != ''
         AND up.selected_sheets IS NOT NULL
         AND up.selected_sheets != '[]'
         AND up.selected_sheets != 'null'`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.log(`⚠️ User ${userId} is not eligible for immediate email`);
      return false;
    }

    const user = userResult.rows[0];
    const userPreferredTime = user.preferred_time;
    
    console.log(`👤 User ${user.email} preferred time: ${userPreferredTime}`);

    // Check if current time is within 15 minutes after their preferred time
    const [prefHour, prefMin] = userPreferredTime.split(':').map(Number);
    const prefTimeMinutes = prefHour * 60 + prefMin;
    const currentTimeMinutes = currentISTHour * 60 + currentISTMinute;
    
    // Allow sending if current time is between preferred time and 15 minutes after
    const timeDiff = currentTimeMinutes - prefTimeMinutes;
    const isWithinWindow = timeDiff >= 0 && timeDiff <= 15;
    
    console.log(`⏰ Time difference: ${timeDiff} minutes. Within window: ${isWithinWindow}`);

    if (!isWithinWindow) {
      console.log(`⏰ Current time ${currentTimeString} is not within 15 minutes of preferred time ${userPreferredTime}`);
      return false;
    }

    // Check if email already sent today, but also consider if user resubscribed since last email
    const today = istTime.toISOString().split('T')[0];
    const emailCheckResult = await pool.query(
      `SELECT el.id, el.sent_at, up.updated_at as subscription_updated
       FROM email_logs el
       JOIN user_preferences up ON up.user_id = el.user_id
       WHERE el.user_id = $1 
         AND el.subject LIKE '%Daily DSA Problems%'
         AND el.sent_at::date = $2
         AND el.status = 'sent'
       ORDER BY el.sent_at DESC
       LIMIT 1`,
      [userId, today]
    );

    if (emailCheckResult.rows.length > 0) {
      const lastEmail = emailCheckResult.rows[0];
      // If user's subscription was updated after the last email, they may have resubscribed
      // In that case, allow sending another email
      if (new Date(lastEmail.subscription_updated) > new Date(lastEmail.sent_at)) {
        console.log(`🔄 User ${user.email} resubscribed since last email - sending immediate email`);
      } else {
        console.log(`✅ Email already sent today to ${user.email}`);
        return false;
      }
    }

    // Send immediate email
    console.log(`📧 Sending immediate email to ${user.email}...`);
    await sendDailyEmailToUser(user);
    return true;

  } catch (error) {
    console.error('❌ Check immediate email error:', error);
    return false;
  }
};