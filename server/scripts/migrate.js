import pool from '../config/database.js';

const createTables = async () => {
  try {
    console.log('🔄 Running database migrations...');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      )
    `);

    // Sheets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sheets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        difficulty VARCHAR(50) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
        estimated_time VARCHAR(100),
        author VARCHAR(255),
        tags JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Problems table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS problems (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        step_no INTEGER DEFAULT 1,
        sl_no_in_step INTEGER DEFAULT 1,
        head_step_no VARCHAR(255),
        post_link TEXT,
        yt_link TEXT,
        cs_link TEXT,
        gfg_link TEXT,
        lc_link TEXT,
        company_tags TEXT,
        difficulty INTEGER DEFAULT 1 CHECK (difficulty IN (0, 1, 2)),
        ques_topic JSONB DEFAULT '[]',
        plus_link TEXT,
        editorial_link TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Problem progress table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS problem_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
        sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'solved', 'bookmarked')),
        solved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, problem_id)
      )
    `);

    // User preferences table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN DEFAULT false,
        daily_problems INTEGER DEFAULT 3,
        preferred_time TIME DEFAULT '09:00',
        selected_sheets JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Code executions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS code_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        problem_id UUID REFERENCES problems(id) ON DELETE SET NULL,
        language VARCHAR(50) NOT NULL,
        code TEXT NOT NULL,
        input TEXT DEFAULT '',
        output TEXT DEFAULT '',
        error TEXT DEFAULT '',
        execution_time FLOAT DEFAULT 0,
        memory_used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Email logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        content TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        sent_at TIMESTAMP DEFAULT NOW(),
        message_id VARCHAR(255),
        error_message TEXT
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_problems_sheet_id ON problems(sheet_id);
      CREATE INDEX IF NOT EXISTS idx_problem_progress_user_id ON problem_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_problem_progress_problem_id ON problem_progress(problem_id);
      CREATE INDEX IF NOT EXISTS idx_problem_progress_status ON problem_progress(status);
      CREATE INDEX IF NOT EXISTS idx_code_executions_user_id ON code_executions(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
    `);

    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

// Run migrations
createTables().then(() => {
  process.exit(0);
});