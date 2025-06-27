#!/usr/bin/env node

/**
 * NeonDB Connection Troubleshooting Script
 * 
 * This script helps diagnose and fix common NeonDB connection issues,
 * particularly the "Control plane request failed" error.
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

console.log('🔍 NeonDB Connection Troubleshooting\n');

// Check environment variables
console.log('1. Checking environment variables...');
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.log('💡 Make sure your .env file contains DATABASE_URL');
  process.exit(1);
}

console.log('✅ DATABASE_URL found');
console.log(`   Format: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`);

// Validate URL format
if (!databaseUrl.includes('neon.tech')) {
  console.warn('⚠️  URL doesn\'t appear to be a NeonDB connection string');
}

if (!databaseUrl.includes('sslmode=require')) {
  console.warn('⚠️  Connection string missing sslmode=require parameter');
}

console.log('\n2. Testing connection with optimized settings...');

// Create pool with NeonDB-optimized settings
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  },
  max: 3, // Lower for testing
  min: 0,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 20000,
  acquireTimeoutMillis: 15000,
});

async function testConnection() {
  let client;
  try {
    console.log('   Acquiring connection...');
    client = await pool.connect();
    console.log('✅ Connection acquired successfully');

    console.log('   Testing basic query...');
    const timeResult = await client.query('SELECT NOW() as server_time');
    console.log(`✅ Server time: ${timeResult.rows[0].server_time}`);

    console.log('   Testing database info...');
    const versionResult = await client.query('SELECT version()');
    console.log(`✅ PostgreSQL version: ${versionResult.rows[0].version.split(' ')[0]} ${versionResult.rows[0].version.split(' ')[1]}`);

    console.log('   Testing UUID extension...');
    try {
      await client.query('SELECT uuid_generate_v4()');
      console.log('✅ UUID extension is available');
    } catch (err) {
      console.warn('⚠️  UUID extension not available, attempting to create...');
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        console.log('✅ UUID extension created successfully');
      } catch (createErr) {
        console.warn('⚠️  Could not create UUID extension:', createErr.message);
      }
    }

    console.log('\n3. Testing application tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.warn('⚠️  No tables found. You may need to run migrations.');
      console.log('💡 Run: npm run migrate');
    } else {
      console.log('✅ Found tables:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }

  } catch (err) {
    console.error('\n❌ Connection test failed:', err.message);
    
    if (err.message.includes('Control plane request failed')) {
      console.log('\n🔧 NeonDB Control Plane Error Solutions:');
      console.log('1. Your database may be in sleep mode - it should auto-wake on connection');
      console.log('2. Try refreshing your connection string from the Neon dashboard');
      console.log('3. Check if your Neon project is suspended or needs payment');
      console.log('4. Verify your internet connection');
      console.log('5. Try connecting from the Neon SQL Editor to verify the instance');
    } else if (err.message.includes('timeout')) {
      console.log('\n⏱️ Timeout Error Solutions:');
      console.log('1. Your database may be starting up (serverless)');
      console.log('2. Network latency issues');
      console.log('3. Try increasing connection timeout');
    } else if (err.message.includes('password authentication failed')) {
      console.log('\n🔑 Authentication Error Solutions:');
      console.log('1. Verify your DATABASE_URL credentials');
      console.log('2. Check if your password contains special characters that need encoding');
      console.log('3. Regenerate your database password from Neon dashboard');
    }
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function main() {
  try {
    await testConnection();
    console.log('\n✅ NeonDB troubleshooting completed successfully!');
  } catch (err) {
    console.error('\n❌ Troubleshooting failed:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main().catch(console.error);
