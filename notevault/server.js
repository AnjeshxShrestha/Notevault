require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { startReminderEngine } = require('./utils/reminderEngine');

// Routes
const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const reminderRoutes = require('./routes/reminderRoutes');

const app = express();

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// Helmet: Sets various HTTP security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for inline scripts in our frontend
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS - restrict to same origin in production
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGIN || false
    : true,
  credentials: true, // Allow cookies
}));

// Parse cookies (required for JWT cookie)
app.use(cookieParser(process.env.COOKIE_SECRET));

// Parse JSON bodies with size limit
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// NoSQL Injection Protection: Sanitize MongoDB operators in user input
// Removes $ and . from user input to prevent operator injection
app.use(mongoSanitize({
  replaceWith: '_', // Replace dangerous chars with underscore
  onSanitize: ({ req, key }) => {
    logger.warn(`NoSQL injection attempt blocked. Key: ${key} from IP: ${req.ip}`);
  },
}));

// HTTP request logging (use 'combined' in production, 'dev' in development)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  }));
}

// General API rate limiting
app.use('/api', apiLimiter);

// ============================================================
// STATIC FILES (Frontend)
// ============================================================
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/reminders', reminderRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'NoteVault API is running',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend for all non-API routes (SPA support)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// ERROR HANDLING
// ============================================================
app.use(notFound);
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // Connect to MongoDB first
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`NoteVault server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    logger.info(`Frontend: http://localhost:${PORT}`);
  });

  // Start the reminder engine after DB is connected
  startReminderEngine();
};

startServer().catch((error) => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`);
  process.exit(1);
});

module.exports = app;
