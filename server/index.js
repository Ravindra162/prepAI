import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      workerSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// =============================
// Serve Frontend React App
// =============================
const publicPath = join(__dirname, '../dist');

// Serve static files with proper headers
app.use(express.static(publicPath, {
  maxAge: '1d',
  etag: false,
  setHeaders: (res, path) => {
    // Special handling for JavaScript files (including Monaco Editor)
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    // Special handling for Web Workers
    if (path.includes('worker') || path.endsWith('.worker.js')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
    }
    // Special handling for WASM files
    if (path.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    }
  }
}));

// Special handling for Monaco Editor assets
app.get('/assets/*', (req, res, next) => {
  // Serve Monaco Editor and other assets with correct MIME types
  const filePath = join(publicPath, req.path);
  if (fs.existsSync(filePath)) {
    if (req.path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (req.path.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    } else if (req.path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    res.sendFile(filePath);
  } else {
    next();
  }
});

// Catch-all for React router
app.get('*', (req, res) => {
  const indexPath = join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built or index.html missing');
  }
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Starting email scheduler...`);
  startEmailScheduler();
});

export default app;
