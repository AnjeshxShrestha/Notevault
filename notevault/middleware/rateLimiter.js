const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute-force attacks
 */
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 10, // 10 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Log suspicious activity
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for login from IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  },
  // Skip successful requests from the count
  skipSuccessfulRequests: true,
});

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Registration rate limiter
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Registration rate limit exceeded from IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { loginLimiter, apiLimiter, registerLimiter };
