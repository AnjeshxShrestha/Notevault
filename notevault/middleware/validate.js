const { body, param, validationResult } = require('express-validator');

/**
 * Handle validation errors - returns standardized error response
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Auth validation rules
 */
const validateRegister = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, underscores')
    .escape(),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email too long'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .isLength({ max: 128 }).withMessage('Password too long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ max: 128 }).withMessage('Password too long'),

  handleValidationErrors,
];

/**
 * Note validation rules
 */
const validateNote = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters')
    .escape(),

  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ max: 50000 }).withMessage('Content too long'),

  body('tags')
    .optional()
    .isArray({ max: 20 }).withMessage('Too many tags'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Tag too long')
    .escape(),

  handleValidationErrors,
];

/**
 * Reminder validation rules
 */
const validateReminder = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description too long'),

  body('dateTime')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .toDate(),

  body('recurrence.type')
    .optional()
    .isIn(['none', 'daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Invalid recurrence type'),

  body('recurrence.dayOfWeek')
    .optional()
    .isInt({ min: 0, max: 6 }).withMessage('Day of week must be 0-6'),

  body('recurrence.dayOfMonth')
    .optional()
    .isInt({ min: 1, max: 31 }).withMessage('Day of month must be 1-31'),

  body('recurrence.month')
    .optional()
    .isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),

  body('note')
    .optional()
    .isMongoId().withMessage('Invalid note reference'),

  handleValidationErrors,
];

/**
 * Validate MongoDB ObjectId in params
 */
const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage('Invalid ID format'),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateNote,
  validateReminder,
  validateMongoId,
};
