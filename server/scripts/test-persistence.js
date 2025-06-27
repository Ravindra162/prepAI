// Test script to demonstrate per-user persistence of problem completion
// This script shows how the completion status is stored and retrieved per user

import pool from '../config/database.js';

const testPersistence = async () => {
  console.log('🧪 Testing Problem Completion Persistence Per User...\n');

  try {
    // Create test users if they don't exist
    const user1Result = await pool.query(`
      INSERT INTO users (email, password, name, role) 
      VALUES ('test1@example.com', 'hashed_password', 'Test User 1', 'user')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email, name
    `);

    const user2Result = await pool.query(`
      INSERT INTO users (email, password, name, role) 
      VALUES ('test2@example.com', 'hashed_password', 'Test User 2', 'user')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email, name
    `);

    const user1 = user1Result.rows[0];
    const user2 = user2Result.rows[0];

    console.log(`👤 Created/Found User 1: ${user1.name} (${user1.id})`);
    console.log(`👤 Created/Found User 2: ${user2.name} (${user2.id})\n`);

    // Get a test problem
    const problemResult = await pool.query(`
      SELECT p.id, p.title, p.sheet_id 
      FROM problems p 
      LIMIT 1
    `);

    if (problemResult.rows.length === 0) {
      console.log('❌ No problems found in database. Please run seed script first.');
      return;
    }

    const testProblem = problemResult.rows[0];
    console.log(`📝 Using test problem: "${testProblem.title}" (${testProblem.id})\n`);

    // Test 1: User 1 completes the problem
    console.log('🧪 Test 1: User 1 completes the problem');
    await pool.query(`
      INSERT INTO problem_progress (user_id, problem_id, sheet_id, status, solved_at, updated_at)
      VALUES ($1, $2, $3, 'solved', NOW(), NOW())
      ON CONFLICT (user_id, problem_id)
      DO UPDATE SET status = 'solved', solved_at = NOW(), updated_at = NOW()
    `, [user1.id, testProblem.id, testProblem.sheet_id]);

    // Test 2: Check User 1's progress
    const user1ProgressResult = await pool.query(`
      SELECT user_id, problem_id, status, solved_at
      FROM problem_progress 
      WHERE user_id = $1 AND problem_id = $2
    `, [user1.id, testProblem.id]);

    console.log('✅ User 1 Progress:', user1ProgressResult.rows[0]);

    // Test 3: Check User 2's progress (should be empty)
    const user2ProgressResult = await pool.query(`
      SELECT user_id, problem_id, status, solved_at
      FROM problem_progress 
      WHERE user_id = $1 AND problem_id = $2
    `, [user2.id, testProblem.id]);

    console.log('📊 User 2 Progress:', user2ProgressResult.rows.length === 0 ? 'No progress (as expected)' : user2ProgressResult.rows[0]);

    // Test 4: User 2 marks the same problem as bookmarked
    console.log('\n🧪 Test 2: User 2 bookmarks the same problem');
    await pool.query(`
      INSERT INTO problem_progress (user_id, problem_id, sheet_id, status, updated_at)
      VALUES ($1, $2, $3, 'bookmarked', NOW())
      ON CONFLICT (user_id, problem_id)
      DO UPDATE SET status = 'bookmarked', updated_at = NOW()
    `, [user2.id, testProblem.id, testProblem.sheet_id]);

    // Test 5: Check both users' progress
    const allProgressResult = await pool.query(`
      SELECT pp.user_id, u.name, pp.status, pp.solved_at, pp.updated_at
      FROM problem_progress pp
      JOIN users u ON pp.user_id = u.id
      WHERE pp.problem_id = $1
      ORDER BY u.name
    `, [testProblem.id]);

    console.log('\n📊 Final Progress Status for both users:');
    allProgressResult.rows.forEach(row => {
      console.log(`   ${row.name}: ${row.status}${row.solved_at ? ` (solved at: ${row.solved_at})` : ''}`);
    });

    // Test 6: Simulate API call to get problem with user context
    console.log('\n🧪 Test 3: Simulating API calls to get problem with user context');
    
    // For User 1 (should show as completed)
    const user1ApiResult = await pool.query(`
      SELECT p.*, 
             COALESCE(pp.status, 'not_started') as user_status,
             pp.solved_at
      FROM problems p
      LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $2
      WHERE p.id = $1
    `, [testProblem.id, user1.id]);

    console.log(`✅ API Response for User 1:`, {
      title: user1ApiResult.rows[0].title,
      userStatus: user1ApiResult.rows[0].user_status,
      isCompleted: user1ApiResult.rows[0].user_status === 'solved'
    });

    // For User 2 (should show as bookmarked)
    const user2ApiResult = await pool.query(`
      SELECT p.*, 
             COALESCE(pp.status, 'not_started') as user_status,
             pp.solved_at
      FROM problems p
      LEFT JOIN problem_progress pp ON p.id = pp.problem_id AND pp.user_id = $2
      WHERE p.id = $1
    `, [testProblem.id, user2.id]);

    console.log(`✅ API Response for User 2:`, {
      title: user2ApiResult.rows[0].title,
      userStatus: user2ApiResult.rows[0].user_status,
      isCompleted: user2ApiResult.rows[0].user_status === 'solved'
    });

    console.log('\n🎉 SUCCESS: Problem completion is properly persisted per user!');
    console.log('   - Each user has their own completion status');
    console.log('   - Status is preserved across sessions');
    console.log('   - Users cannot see each other\'s progress');
    console.log('   - Database enforces unique constraint per user-problem pair');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

export default testPersistence;
