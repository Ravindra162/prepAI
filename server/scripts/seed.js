import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await pool.query(`
      INSERT INTO users (email, password, name, role, is_active, created_at)
      VALUES ('admin@interviewprep.com', $1, 'Admin User', 'admin', true, NOW())
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);

    // Create sample user
    const userPassword = await bcrypt.hash('user123', 12);
    
    const userResult = await pool.query(`
      INSERT INTO users (email, password, name, role, is_active, created_at)
      VALUES ('user@example.com', $1, 'John Doe', 'user', true, NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [userPassword]);

    // Create sample sheets
    const sheetResult = await pool.query(`
      INSERT INTO sheets (title, description, difficulty, estimated_time, author, tags, is_active, created_at)
      VALUES 
        ('Striver A2Z DSA Sheet', 'Complete DSA preparation with 450+ problems covering all topics', 'intermediate', '6-8 months', 'Striver', '["Complete", "Beginner Friendly", "Popular"]', true, NOW()),
        ('Love Babbar DSA Sheet', '450 most important DSA questions for interviews', 'intermediate', '4-6 months', 'Love Babbar', '["Interview Focused", "Popular"]', true, NOW()),
        ('NeetCode 150', 'Curated list of 150 LeetCode problems for technical interviews', 'advanced', '3-4 months', 'NeetCode', '["FAANG", "Premium"]', true, NOW())
      ON CONFLICT DO NOTHING
      RETURNING id, title
    `);

    if (sheetResult.rows.length > 0) {
      const striverSheetId = sheetResult.rows.find(s => s.title.includes('Striver'))?.id;
      
      if (striverSheetId) {
        // Add sample problems to Striver sheet
        await pool.query(`
          INSERT INTO problems (sheet_id, title, step_no, sl_no_in_step, head_step_no, post_link, yt_link, cs_link, gfg_link, lc_link, difficulty, ques_topic, plus_link, editorial_link, is_active, created_at)
          VALUES 
            ($1, 'Set Matrix Zeros', 1, 1, 'Arrays', 'https://takeuforward.org/data-structure/set-matrix-zero/', 'https://youtu.be/N0MgLvceX7M', 'https://www.codingninjas.com/codestudio/problems/zero-matrix_1171153', 'https://bit.ly/3SVaSig', 'https://leetcode.com/problems/set-matrix-zeroes/', 1, '[{"value":"arrays","label":"Arrays"},{"value":"data-structure","label":"Data Structures"}]', null, null, true, NOW()),
            ($1, 'Pascal''s Triangle', 1, 2, 'Arrays', 'https://takeuforward.org/data-structure/program-to-generate-pascals-triangle/', 'https://youtu.be/bR7mQgwQ_o8', 'https://www.codingninjas.com/codestudio/problems/print-pascal-s-triangle_6917910', 'https://bit.ly/3C95qlR', 'https://leetcode.com/problems/pascals-triangle/', 1, '[{"value":"arrays","label":"Arrays"},{"value":"data-structure","label":"Data Structures"},{"value":"maths","label":"Maths"}]', 'https://takeuforward.org/plus/dsa/problems/pascal''s-triangle', 'https://takeuforward.org/plus/dsa/problems/pascal''s-triangle?tab=editorial', true, NOW()),
            ($1, 'Next Permutation', 1, 3, 'Arrays', 'https://takeuforward.org/data-structure/next_permutation-find-next-lexicographically-greater-permutation/', 'https://youtu.be/JDOXKqF60RQ', 'https://www.codingninjas.com/codestudio/problems/next-greater-permutation_6929564', 'https://bit.ly/3dug78u', 'https://leetcode.com/problems/next-permutation/', 1, '[{"value":"arrays","label":"Arrays"},{"value":"data-structure","label":"Data Structures"},{"value":"two-pointers","label":"Two Pointer"}]', 'https://takeuforward.org/plus/dsa/problems/next-permutation', 'https://takeuforward.org/plus/dsa/problems/next-permutation?tab=editorial', true, NOW()),
            ($1, 'Kadane''s Algorithm', 1, 4, 'Arrays', 'https://takeuforward.org/data-structure/kadanes-algorithm-maximum-subarray-sum-in-an-array/', 'https://youtu.be/AHZpyENo7k4', 'https://bit.ly/3HZltTa', '', 'https://leetcode.com/problems/maximum-subarray/', 0, '[{"value":"arrays","label":"Arrays"},{"value":"data-structure","label":"Data Structures"}]', 'https://takeuforward.org/plus/dsa/problems/kadane''s-algorithm', 'https://takeuforward.org/plus/dsa/problems/kadane''s-algorithm?tab=editorial', true, NOW())
          ON CONFLICT DO NOTHING
        `, [striverSheetId]);
      }
    }

    console.log('✅ Database seeded successfully');
    console.log('📧 Admin credentials: admin@interviewprep.com / admin123');
    console.log('👤 User credentials: user@example.com / user123');
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase().then(() => {
  process.exit(0);
});