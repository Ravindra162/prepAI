import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csvParser from 'csv-parser';

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

async function testCSVParsing() {
    try {
        const csvPath = path.join(__dirname, '../leetcode-companywise-interview-questions/amazon/all.csv');
        console.log(`Testing CSV parsing with: ${csvPath}`);
        
        const problems = await parseCSV(csvPath);
        
        console.log(`✅ Successfully parsed ${problems.length} problems`);
        console.log('\n📋 First 3 problems:');
        
        problems.slice(0, 3).forEach((problem, index) => {
            console.log(`\n${index + 1}. ${problem.Title}`);
            console.log(`   ID: ${problem.ID}`);
            console.log(`   URL: ${problem.URL}`);
            console.log(`   Difficulty: ${problem.Difficulty}`);
            console.log(`   Acceptance: ${problem['Acceptance %']}`);
            console.log(`   Frequency: ${problem['Frequency %']}`);
        });
        
        console.log('\n🔍 CSV Headers detected:');
        console.log(Object.keys(problems[0]));
        
    } catch (error) {
        console.error('❌ Error testing CSV parsing:', error);
    }
}

// Run the test
testCSVParsing();
