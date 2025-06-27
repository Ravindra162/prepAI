import nodemailer from 'nodemailer';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter configuration
transporter.verify((error) => {
  if (error) {
    console.error('❌ Email service configuration error:', error);
  } else {
    console.log('✅ Email service ready');
  }
});

export const sendEmail = async (to, subject, html, userId = null) => {
  try {
    const mailOptions = {
      from: `"InterviewPrep" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Log email
    await pool.query(
      `INSERT INTO email_logs (user_id, recipient_email, subject, content, status, sent_at, message_id)
       VALUES ($1, $2, $3, $4, 'sent', NOW(), $5)`,
      [userId, to, subject, html, info.messageId]
    );

    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email send error:', error);
    
    // Log failed email
    await pool.query(
      `INSERT INTO email_logs (user_id, recipient_email, subject, content, status, sent_at, error_message)
       VALUES ($1, $2, $3, $4, 'failed', NOW(), $5)`,
      [userId, to, subject, html, error.message]
    );
    
    throw error;
  }
};

export const generateDailyProblemsEmail = (userName, problems) => {
  const problemsHtml = problems.map((problem, index) => `
    <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #1e293b;">
        ${index + 1}. ${problem.title}
      </h3>
      <p style="margin: 0 0 10px 0; color: #64748b;">
        <strong>Difficulty:</strong> ${getDifficultyText(problem.difficulty)} | 
        <strong>Topic:</strong> ${problem.topics.join(', ')}
      </p>
      <div style="margin-top: 10px;">
        <a href="${problem.lc_link}" style="display: inline-block; margin-right: 10px; padding: 8px 16px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">
          Solve on LeetCode
        </a>
        ${problem.yt_link ? `
          <a href="${problem.yt_link}" style="display: inline-block; margin-right: 10px; padding: 8px 16px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">
            Watch Solution
          </a>
        ` : ''}
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Daily DSA Problems</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🚀 Daily DSA Challenge</h1>
        <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">
          Hi ${userName}! Here are your problems for today.
        </p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1e293b; margin-bottom: 20px;">Today's Problems</h2>
        ${problemsHtml}
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #64748b;">
          Keep up the great work! 💪<br>
          <a href="${process.env.CLIENT_URL}" style="color: #3b82f6; text-decoration: none;">
            Visit InterviewPrep Platform
          </a>
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
        <p>You're receiving this because you subscribed to daily problem notifications.</p>
        <p>
          <a href="${process.env.CLIENT_URL}/profile" style="color: #64748b;">Manage preferences</a> | 
          <a href="${process.env.CLIENT_URL}/unsubscribe" style="color: #64748b;">Unsubscribe</a>
        </p>
      </div>
    </body>
    </html>
  `;
};

const getDifficultyText = (difficulty) => {
  switch (difficulty) {
    case 0: return 'Easy';
    case 1: return 'Medium';
    case 2: return 'Hard';
    default: return 'Unknown';
  }
};