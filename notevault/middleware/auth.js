const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Protect routes - verifies JWT from HTTP-only cookie
 */
const protect = async (req, res, next) => {
  try {
    // Get token from HTTP-only cookie (never from localStorage)
    const token = req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // Log suspicious activity
      logger.warn(`Invalid JWT attempt from IP: ${req.ip} - ${jwtError.message}`);

      // Clear invalid cookie
      res.clearCookie('jwt');

      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid session. Please log in again.',
      });
    }

    // Find the user (verify they still exist)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      logger.warn(`JWT references non-existent user ID: ${decoded.id} from IP: ${req.ip}`);
      res.clearCookie('jwt');
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
      });
    }

    // Attach user to request for downstream use
    req.user = user;
    next();

  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Authentication error. Please try again.',
    });
  }
};

/**
 * Generate JWT and set as HTTP-only cookie
 */
const sendTokenCookie = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,       // Cannot be accessed via JS (prevents XSS theft)
    sameSite: 'strict',   // CSRF protection
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    path: '/',
  };

  res.cookie('jwt', token, cookieOptions);

  // Don't return the token in the body - it's in the cookie
  return res.status(statusCode).json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
};

module.exports = { protect, sendTokenCookie };
