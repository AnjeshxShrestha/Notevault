const express = require('express');
const router = express.Router();
const {
  getReminders,
  createReminder,
  deleteReminder,
  getTriggeredReminders,
} = require('../controllers/reminderController');
const { protect } = require('../middleware/auth');
const { validateReminder, validateMongoId } = require('../middleware/validate');

// All reminder routes require authentication
router.use(protect);

router.get('/', getReminders);
router.get('/triggered', getTriggeredReminders);
router.post('/', validateReminder, createReminder);
router.delete('/:id', validateMongoId('id'), deleteReminder);

module.exports = router;
