import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importPrepSheet() {
    let client;
    
    try {
        // Read the DSA sheet JSON file
        const dsaSheetPath = path.join(__dirname, '../dsa_sheet.json');
        const dsaSheetData = JSON.parse(fs.readFileSync(dsaSheetPath, 'utf8'));
        
        // Get a client from the pool
        client = await pool.connect();
        
        console.log('Starting PrepSheet import...');
        
        // Begin transaction
        await client.query('BEGIN');
        
        // Check if PrepSheet already exists
        const existingSheet = await client.query(
            'SELECT id FROM sheets WHERE title = $1',
            ['PrepSheet']
        );
        
        let sheetId;
        if (existingSheet.rows.length > 0) {
            sheetId = existingSheet.rows[0].id;
            console.log(`PrepSheet already exists with ID: ${sheetId}`);
            
            // Delete existing problems for this sheet
            await client.query('DELETE FROM problems WHERE sheet_id = $1', [sheetId]);
            console.log('Deleted existing problems for PrepSheet');
        } else {
            // Insert the sheet
            const sheetResult = await client.query(
                'INSERT INTO sheets (title, description, difficulty, author, is_active, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
                ['PrepSheet', 'Comprehensive DSA preparation sheet with curated problems from TakeUForward', 'intermediate', 'TakeUForward', true]
            );
            
            sheetId = sheetResult.rows[0].id;
            console.log(`Created new sheet with ID: ${sheetId}`);
        }
        
        let totalProblems = 0;
        
        // Process each step in the sheet data
        for (const step of dsaSheetData.sheetData) {
            console.log(`Processing step ${step.step_no}: ${step.head_step_no}`);
            
            // Process each topic/problem in the step
            for (const topic of step.topics) {
                try {
                    // Parse question topics if they exist
                    let parsedTopics = [];
                    if (topic.ques_topic) {
                        try {
                            parsedTopics = JSON.parse(topic.ques_topic);
                        } catch (e) {
                            console.warn(`Failed to parse topics for problem ${topic.id}: ${e.message}`);
                        }
                    }
                    
                    // Create problem description with links
                    const description = `
**Problem Links:**
${topic.post_link ? `- [Article](${topic.post_link})` : ''}
${topic.yt_link ? `- [Video Tutorial](${topic.yt_link})` : ''}
${topic.lc_link ? `- [LeetCode](${topic.lc_link})` : ''}
${topic.gfg_link ? `- [GeeksforGeeks](${topic.gfg_link})` : ''}
${topic.cs_link ? `- [Coding Ninjas](${topic.cs_link})` : ''}
${topic.plus_link ? `- [TakeUForward Plus](${topic.plus_link})` : ''}
${topic.editorial_link ? `- [Editorial](${topic.editorial_link})` : ''}

**Category:** ${step.head_step_no}
**Difficulty:** ${topic.difficulty !== null ? (topic.difficulty === 0 ? 'Easy' : topic.difficulty === 1 ? 'Medium' : 'Hard') : 'Not specified'}
${parsedTopics.length > 0 ? `**Topics:** ${parsedTopics.map(t => t.label).join(', ')}` : ''}
                    `.trim();
                    
                    // Insert the problem
                    await client.query(`
                        INSERT INTO problems (
                            sheet_id, 
                            title, 
                            step_no,
                            sl_no_in_step,
                            head_step_no,
                            post_link,
                            yt_link,
                            cs_link,
                            gfg_link,
                            lc_link,
                            difficulty,
                            ques_topic,
                            plus_link,
                            editorial_link,
                            is_active,
                            created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
                    `, [
                        sheetId,
                        topic.title,
                        step.step_no,
                        topic.sl_no || 1,
                        step.head_step_no,
                        topic.post_link || null,
                        topic.yt_link || null,
                        topic.cs_link || null,
                        topic.gfg_link || null,
                        topic.lc_link || null,
                        topic.difficulty !== null ? topic.difficulty : 1,
                        JSON.stringify(parsedTopics),
                        topic.plus_link || null,
                        topic.editorial_link || null,
                        true
                    ]);
                    
                    totalProblems++;
                } catch (problemError) {
                    console.error(`Error inserting problem ${topic.title}:`, problemError.message);
                    // Continue with other problems instead of failing completely
                }
            }
        }
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`✅ PrepSheet import completed successfully!`);
        console.log(`📊 Total problems imported: ${totalProblems}`);
        console.log(`📋 Sheet ID: ${sheetId}`);
        
    } catch (error) {
        console.error('❌ Error importing PrepSheet:', error);
        if (client) {
            await client.query('ROLLBACK');
        }
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        // Don't end the pool since it's shared
    }
}

// Run the import
importPrepSheet();
