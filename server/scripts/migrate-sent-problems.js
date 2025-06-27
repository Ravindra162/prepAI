import pool from '../config/database.js';

const createSentProblemsTable = async () => {
  try {
    console.log('🔄 Creating sent_problems table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sent_problems (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        email_log_id UUID REFERENCES email_logs(id) ON DELETE SET NULL,
        UNIQUE(user_id, problem_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sent_problems_user_id ON sent_problems(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sent_problems_problem_id ON sent_problems(problem_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sent_problems_sent_at ON sent_problems(sent_at)
    `);

    console.log('✅ sent_problems table created successfully');

    // Add a column to user_preferences to track when user last cleared their history
    console.log('🔄 Adding last_history_cleared column to user_preferences...');
    
    await pool.query(`
      ALTER TABLE user_preferences 
      ADD COLUMN IF NOT EXISTS last_history_cleared TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `);

    console.log('✅ user_preferences table updated successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await createSentProblemsTable();
    console.log('🎉 Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();
