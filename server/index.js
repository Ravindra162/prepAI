import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import sheetRoutes from './routes/sheets.js';
import problemRoutes from './routes/problems.js';
import progressRoutes from './routes/progress.js';
import adminRoutes from './routes/admin.js';
import emailRoutes from './routes/email.js';
import codeExecutionRoutes from './routes/codeExecution.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { authenticateToken, optionalAuth } from './middleware/auth.js';

// Import services
import { startEmailScheduler } from './services/emailScheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/sheets', sheetRoutes);
app.use('/api/problems', optionalAuth, problemRoutes);
app.use('/api/progress', authenticateToken, progressRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/email', authenticateToken, emailRoutes);
app.use('/api/code', authenticateToken, codeExecutionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Starting email scheduler...`);
  startEmailScheduler();
});

export default app;