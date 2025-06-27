import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// NeonDB optimized configuration with serverless-friendly settings
const isNeonDB = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isNeonDB ? {
    rejectUnauthorized: false
  } : false,
  // NeonDB serverless-optimized settings
  max: isNeonDB ? 5 : 10, // Lower max connections for serverless
  min: 0,  // No minimum connections for serverless
  idleTimeoutMillis: isNeonDB ? 10000 : 30000, // Shorter timeout for serverless
  connectionTimeoutMillis: 15000, // Longer timeout for initial connection
  maxUses: isNeonDB ? 1000 : 7500, // Lower max uses for serverless
  acquireTimeoutMillis: 10000, // Timeout for acquiring connection from pool
});

// Fallback configuration if DATABASE_URL is not provided
if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not found, using individual connection parameters');
  const fallbackPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'interview_prep',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_HOST && process.env.DB_HOST.includes('neon.tech') 
      ? { rejectUnauthorized: false } 
      : false,
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// Test database connection with retry logic and NeonDB-specific error handling
const testConnection = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log('✅ Connected to NeonDB successfully');
      
      // Test a simple query to verify connection
      const result = await client.query('SELECT NOW()');
      console.log('📅 Database time:', result.rows[0].now);
      
      client.release();
      break;
    } catch (err) {
      console.error(`❌ Database connection attempt failed (${4 - retries}/3):`, err.message);
      
      // NeonDB-specific error handling
      if (err.message.includes('Control plane request failed')) {
        console.error('🔧 NeonDB Control Plane Error detected. Possible causes:');
        console.error('   - Database instance is in sleep mode (will auto-wake)');
        console.error('   - Network connectivity issues');
        console.error('   - Invalid connection string format');
        console.error('   - Database instance needs to be restarted');
      }
      
      retries--;
      if (retries === 0) {
        console.error('❌ Failed to connect to database after 3 attempts');
        console.error('💡 Please check your DATABASE_URL in .env file');
        console.error('💡 Make sure your NeonDB instance is active and accessible');
        console.error('💡 Try restarting your NeonDB instance from the Neon dashboard');
      } else {
        console.log(`⏳ Retrying in 3 seconds... (${retries} attempts left)`);
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 3000 * (4 - retries)));
      }
    }
  }
};

// Test connection on startup
testConnection();

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

pool.on('connect', (client) => {
  console.log('🔗 New database connection established');
});

pool.on('remove', (client) => {
  console.log('🔌 Database connection removed from pool');
});

export default pool;