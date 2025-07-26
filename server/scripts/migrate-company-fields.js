import pool from '../config/database.js';

const addCompanyFields = async () => {
  let client;
  try {
    console.log('🔄 Running company fields migration...');
    
    // Get a client from the pool
    client = await pool.connect();
    console.log('✅ Connected to database');

    // Begin transaction
    await client.query('BEGIN');

    // Add new optional fields to sheets table
    console.log('📋 Adding new fields to sheets table...');
    
    // Extend difficulty constraint to include 'mixed'
    await client.query(`
      ALTER TABLE sheets DROP CONSTRAINT IF EXISTS sheets_difficulty_check;
    `);
    
    await client.query(`
      ALTER TABLE sheets ADD CONSTRAINT sheets_difficulty_check 
      CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'mixed'));
    `);
    console.log('✅ Updated difficulty constraint to include "mixed"');

    // Add new optional fields to problems table
    console.log('❓ Adding new fields to problems table...');
    
    // Add acceptance_rate field (0-100)
    await client.query(`
      ALTER TABLE problems 
      ADD COLUMN IF NOT EXISTS acceptance_rate DECIMAL(5,2);
    `);
    console.log('✅ Added acceptance_rate field');

    // Add frequency_rate field (0-100)
    await client.query(`
      ALTER TABLE problems 
      ADD COLUMN IF NOT EXISTS frequency_rate DECIMAL(5,2);
    `);
    console.log('✅ Added frequency_rate field');

    // Add leetcode_id field
    await client.query(`
      ALTER TABLE problems 
      ADD COLUMN IF NOT EXISTS leetcode_id INTEGER;
    `);
    console.log('✅ Added leetcode_id field');

    // Add problem_source field (to track where the problem came from)
    await client.query(`
      ALTER TABLE problems 
      ADD COLUMN IF NOT EXISTS problem_source VARCHAR(100) DEFAULT 'manual';
    `);
    console.log('✅ Added problem_source field');

    // Create index on leetcode_id for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_problems_leetcode_id ON problems(leetcode_id);
    `);
    console.log('✅ Added index on leetcode_id');

    // Create index on problem_source for filtering
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_problems_source ON problems(problem_source);
    `);
    console.log('✅ Added index on problem_source');

    // Commit transaction
    await client.query('COMMIT');
    
    console.log('🎉 Company fields migration completed successfully!');
    console.log('📊 New fields added:');
    console.log('   - sheets.difficulty now supports "mixed"');
    console.log('   - problems.acceptance_rate (decimal)');
    console.log('   - problems.frequency_rate (decimal)');
    console.log('   - problems.leetcode_id (integer)');
    console.log('   - problems.problem_source (varchar)');
    
  } catch (error) {
    console.error('❌ Error in company fields migration:', error);
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Run the migration
addCompanyFields()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
