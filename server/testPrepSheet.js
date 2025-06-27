import pool from './config/database.js';

async function testPrepSheet() {
  try {
    console.log('🔍 Checking if PrepSheet exists...');
    
    const sheetsResult = await pool.query('SELECT id, title, author, difficulty FROM sheets');
    console.log('📋 All sheets in database:');
    sheetsResult.rows.forEach(sheet => {
      console.log(`  - ${sheet.title} (${sheet.id}) by ${sheet.author}`);
    });
    
    const prepSheetResult = await pool.query('SELECT id, title, author, difficulty FROM sheets WHERE title = $1', ['PrepSheet']);
    
    if (prepSheetResult.rows.length > 0) {
      const prepSheet = prepSheetResult.rows[0];
      console.log('\n✅ PrepSheet found:');
      console.log(`  - ID: ${prepSheet.id}`);
      console.log(`  - Title: ${prepSheet.title}`);
      console.log(`  - Author: ${prepSheet.author}`);
      console.log(`  - Difficulty: ${prepSheet.difficulty}`);
      
      // Check problem count
      const problemsResult = await pool.query('SELECT COUNT(*) as count FROM problems WHERE sheet_id = $1', [prepSheet.id]);
      console.log(`  - Problems: ${problemsResult.rows[0].count}`);
    } else {
      console.log('\n❌ PrepSheet not found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testPrepSheet();
