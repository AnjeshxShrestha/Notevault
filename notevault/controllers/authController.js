const User = require('../models/User');
const { sendTokenCookie } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists (using Mongoose - safe from injection)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Create user - password is hashed in the model pre-save hook
    const user = await User.create({ username, email, password });

    logger.info(`New user registered: ${email} from IP: ${req.ip}`);

    // Send JWT cookie and user data
    sendTokenCookie(user, 201, res);

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user WITH password (select: false by default)
    const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lastFailedLogin');

    if (!user) {
      // Use generic message to prevent user enumeration
      logger.warn(`Failed login attempt for non-existent email: ${email} from IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare password using bcrypt
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Track failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      user.lastFailedLogin = new Date();
      await user.save();

      logger.warn(
        `Failed login attempt #${user.failedLoginAttempts} for: ${email} from IP: ${req.ip}`
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      user.lastFailedLogin = null;
      await user.save();
    }

    logger.info(`User logged in: ${email} from IP: ${req.ip}`);

    // Send JWT cookie
    sendTokenCookie(user, 200, res);

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user - clear JWT cookie
 * @access  Private
 */
const logout = (req, res) => {
  // Clear the JWT cookie
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0), // Expire immediately
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  logger.info(`User logged out: ${req.user?.email} from IP: ${req.ip}`);

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      createdAt: req.user.createdAt,
    },
  });
};

module.exports = { register, login, logout, getMe };
