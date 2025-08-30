import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csvParser from 'csv-parser';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to parse CSV file
function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = fs.createReadStream(filePath)
            .pipe(csvParser());

        stream.on('data', (data) => results.push(data));
        stream.on('end', () => resolve(results));
        stream.on('error', reject);
    });
}

// Function to convert difficulty string to number
function getDifficultyNumber(difficulty) {
    switch (difficulty.toLowerCase()) {
        case 'easy': return 0;
        case 'medium': return 1;
        case 'hard': return 2;
        default: return 1; // Default to medium
    }
}

// Function to clean percentage string (remove % and convert to float)
function cleanPercentage(percentageStr) {
    if (!percentageStr) return null;
    return parseFloat(percentageStr.replace('%', ''));
}

async function importCompanySheet(companyName = null) {
    let client;
    
    try {
        // Get a client from the pool
        client = await pool.connect();
        
        console.log('Starting Company Sheets import...');
        
        // Get the leetcode company questions directory
        const leetcodeDir = path.join(__dirname, '../leetcode-companywise-interview-questions');
        
        // Get all company directories
        const companyDirs = fs.readdirSync(leetcodeDir)
            .filter(item => {
                const itemPath = path.join(leetcodeDir, item);
                return fs.statSync(itemPath).isDirectory() && 
                       fs.existsSync(path.join(itemPath, 'all.csv'));
            });

        // Filter by specific company if provided
        const companiesToProcess = companyName 
            ? companyDirs.filter(dir => dir.toLowerCase() === companyName.toLowerCase())
            : companyDirs;

        if (companiesToProcess.length === 0) {
            if (companyName) {
                console.log(`❌ Company "${companyName}" not found or doesn't have all.csv file`);
            } else {
                console.log('❌ No companies found with all.csv files');
            }
            return;
        }

        console.log(`📋 Found ${companiesToProcess.length} companies to process`);

        let totalSheetsProcessed = 0;
        let totalProblemsImported = 0;

        for (const company of companiesToProcess) {
            try {
                console.log(`\n🏢 Processing ${company}...`);
                
                // Begin transaction for each company
                await client.query('BEGIN');
                
                // Read and parse the CSV file
                const csvPath = path.join(leetcodeDir, company, 'all.csv');
                const problems = await parseCSV(csvPath);
                
                if (problems.length === 0) {
                    console.log(`⚠️  No problems found in ${company}/all.csv`);
                    await client.query('ROLLBACK');
                    continue;
                }

                // Create sheet title
                const sheetTitle = `${company.charAt(0).toUpperCase() + company.slice(1)} Interview Questions`;
                
                // Check if sheet already exists
                const existingSheet = await client.query(
                    'SELECT id FROM sheets WHERE title = $1',
                    [sheetTitle]
                );

                let sheetId;
                if (existingSheet.rows.length > 0) {
                    sheetId = existingSheet.rows[0].id;
                    console.log(`📋 Sheet already exists with ID: ${sheetId}`);
                    
                    // Delete existing problems for this sheet
                    await client.query('DELETE FROM problems WHERE sheet_id = $1', [sheetId]);
                    console.log(`🗑️  Deleted existing problems for ${company}`);
                } else {
                    // Insert the sheet
                    const sheetResult = await client.query(
                        'INSERT INTO sheets (title, description, difficulty, author, is_active, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
                        [
                            sheetTitle, 
                            `LeetCode interview questions frequently asked at ${company}`, 
                            'mixed', 
                            'LeetCode', 
                            true
                        ]
                    );
                    
                    sheetId = sheetResult.rows[0].id;
                    console.log(`✅ Created new sheet with ID: ${sheetId}`);
                }

                let problemsForThisCompany = 0;

                // Process each problem
                for (let i = 0; i < problems.length; i++) {
                    const problem = problems[i];
                    
                    try {
                        // Clean and validate data
                        const problemId = parseInt(problem.ID);
                        const url = problem.URL || null;
                        const title = problem.Title || `Problem ${problemId}`;
                        const difficulty = getDifficultyNumber(problem.Difficulty);
                        const acceptance = cleanPercentage(problem['Acceptance %']);
                        const frequency = cleanPercentage(problem['Frequency %']);

                        // Create description with problem details
                        const description = `
**LeetCode Problem #${problemId}**
${url ? `**Link:** [${title}](${url})` : ''}
**Difficulty:** ${problem.Difficulty}
**Acceptance Rate:** ${problem['Acceptance %'] || 'N/A'}
**Frequency:** ${problem['Frequency %'] || 'N/A'}
**Company:** ${company}

This problem is frequently asked in ${company} interviews.
                        `.trim();

                        // Create topics array with company name
                        const topics = [{
                            label: company,
                            value: company.toLowerCase().replace(/[^a-z0-9]/g, '-')
                        }];

                        // Insert the problem
                        await client.query(`
                            INSERT INTO problems (
                                sheet_id, 
                                title, 
                                step_no,
                                sl_no_in_step,
                                head_step_no,
                                lc_link,
                                difficulty,
                                ques_topic,
                                company_tags,
                                acceptance_rate,
                                frequency_rate,
                                leetcode_id,
                                problem_source,
                                is_active,
                                created_at
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
                        `, [
                            sheetId,
                            title,
                            1, // All problems in step 1
                            i + 1, // Sequential numbering
                            `${company} Interview Questions`,
                            url,
                            difficulty,
                            JSON.stringify(topics),
                            `${company}|Acceptance:${problem['Acceptance %'] || 'N/A'}|Frequency:${problem['Frequency %'] || 'N/A'}|LeetCode:${problemId}`,
                            acceptance,
                            frequency,
                            problemId,
                            'leetcode-company',
                            true
                        ]);

                        problemsForThisCompany++;
                        totalProblemsImported++;

                        // Log progress every 100 problems
                        if (problemsForThisCompany % 100 === 0) {
                            console.log(`📊 Processed ${problemsForThisCompany}/${problems.length} problems for ${company}`);
                        }

                    } catch (problemError) {
                        console.error(`❌ Error inserting problem ${problem.Title || problem.ID}:`, problemError.message);
                        // Continue with other problems instead of failing completely
                    }
                }

                // Commit transaction for this company
                await client.query('COMMIT');
                console.log(`✅ Completed ${company}: ${problemsForThisCompany} problems imported`);
                totalSheetsProcessed++;

            } catch (companyError) {
                console.error(`❌ Error processing company ${company}:`, companyError.message);
                // Rollback this company's transaction
                try {
                    await client.query('ROLLBACK');
                } catch (rollbackError) {
                    console.error(`❌ Error rolling back transaction for ${company}:`, rollbackError.message);
                }
                // Continue with other companies
            }
        }
        
        console.log(`\n🎉 Company Sheets import completed!`);
        console.log(`📊 Total companies processed: ${totalSheetsProcessed}`);
        console.log(`📋 Total problems imported: ${totalProblemsImported}`);
        
    } catch (error) {
        console.error('❌ Error importing Company Sheets:', error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const companyName = args.length > 0 ? args[0] : null;

if (companyName) {
    console.log(`🎯 Importing questions for company: ${companyName}`);
} else {
    console.log('🌐 Importing questions for all companies');
    console.log('💡 Tip: You can specify a company name as argument: node importCompanySheet.js amazon');
}

// Run the import
importCompanySheet(companyName);
