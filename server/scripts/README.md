# Database Import Scripts

This directory contains scripts to import different types of problem sheets into the database.

## Available Scripts

### 1. Import Prep Sheet
Imports the main DSA preparation sheet from `dsa_sheet.json`.

```bash
# Run from project root
npm run import:prep-sheet

# Or directly
node server/scripts/importPrepSheet.js
```

### 2. Import Company Interview Questions
Imports LeetCode interview questions organized by company from the `leetcode-companywise-interview-questions` folder.

```bash
# Import all companies
npm run import:company-sheets

# Import specific company (e.g., amazon)
node server/scripts/importCompanySheet.js amazon

# Import specific company (e.g., google)
node server/scripts/importCompanySheet.js google
```

## Company Sheet Features

- **Company-based Organization**: Each company gets its own sheet
- **Comprehensive Data**: Includes acceptance rates, frequency, and difficulty
- **Frontend Filtering**: Company names are stored in `ques_topic` field for easy filtering
- **LeetCode Integration**: Direct links to LeetCode problems
- **Progress Tracking**: Compatible with existing problem progress system

## Data Sources

- **PrepSheet**: `server/dsa_sheet.json`
- **Company Questions**: `server/leetcode-companywise-interview-questions/[company]/all.csv`

## Database Structure

The scripts work with the existing database schema:
- `sheets` table: Contains sheet metadata
- `problems` table: Contains individual problems with company tags
- `problem_progress` table: Tracks user progress (unchanged)

## Error Handling

- Scripts use database transactions for data integrity
- Individual problem failures don't stop the entire import
- Existing sheets are updated (problems deleted and re-imported)
- Detailed logging for troubleshooting

## Performance

- For company imports, progress is logged every 100 problems
- Large companies (like Google with 2000+ problems) may take a few minutes
- All operations are batched within transactions for efficiency
