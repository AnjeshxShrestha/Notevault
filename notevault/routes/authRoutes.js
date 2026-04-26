const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/register
router.post('/register', registerLimiter, validateRegister, register);

// POST /api/auth/login
router.post('/login', loginLimiter, validateLogin, login);

// POST /api/auth/logout (protected)
router.post('/logout', protect, logout);

// GET /api/auth/me (protected)
router.get('/me', protect, getMe);

module.exports = router;
