#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 NeonDB Setup Guide');
console.log('====================\n');

if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL not found in .env file');
  console.log('');
  console.log('📝 To set up NeonDB:');
  console.log('1. Go to https://neon.tech/ and create a free account');
  console.log('2. Create a new project');
  console.log('3. Copy the connection string from your dashboard');
  console.log('4. Add it to your .env file as DATABASE_URL');
  console.log('');
  console.log('📋 Your .env file should contain:');
  console.log('DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require');
  console.log('');
  console.log('💡 Example:');
  console.log('DATABASE_URL=postgresql://myuser:mypass@ep-cool-lab-123456.us-east-1.aws.neon.tech/neondb?sslmode=require');
  console.log('');
  process.exit(1);
}

// Test connection and run migrations
async function setupDatabase() {
  try {
    console.log('🔍 Testing NeonDB connection...');
    
    // Dynamic import to avoid module loading issues
    const { default: pool } = await import('../config/database.js');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to NeonDB');
    
    // Check if tables exist
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'sheets', 'problems', 'problem_progress')
    `);
    
    console.log(`📊 Found ${tableCheck.rows.length} existing tables`);
    
    client.release();
    
    if (tableCheck.rows.length === 0) {
      console.log('🏗️  No tables found. Running migrations...');
      console.log('💡 Run: npm run migrate');
    } else {
      console.log('✅ Database tables already exist');
      console.log('🚀 Your database is ready to use!');
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Check your DATABASE_URL in .env file');
    console.log('2. Ensure your NeonDB instance is active');
    console.log('3. Verify the connection string format');
    console.log('4. Check if your IP is allowed (NeonDB allows all by default)');
    console.log('');
    process.exit(1);
  }
}

setupDatabase();
