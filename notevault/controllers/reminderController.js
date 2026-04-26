const Reminder = require('../models/Reminder');
const Note = require('../models/Note');
const logger = require('../utils/logger');

/**
 * @route   GET /api/reminders
 * @desc    Get all reminders for authenticated user
 * @access  Private
 */
const getReminders = async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ user: req.user._id })
      .populate('note', 'title') // Only include note title, not full content
      .sort({ dateTime: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: reminders.length,
      reminders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/reminders
 * @desc    Create a new reminder
 * @access  Private
 */
const createReminder = async (req, res, next) => {
  try {
    const { title, description, dateTime, recurrence, note: noteId } = req.body;

    // Validate recurrence logic
    const rec = recurrence || { type: 'none' };

    if (rec.type === 'none' && !dateTime) {
      return res.status(400).json({
        success: false,
        message: 'dateTime is required for one-time reminders.',
      });
    }

    // For one-time reminders, ensure date is in the future
    if (rec.type === 'none' && new Date(dateTime) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reminder date must be in the future.',
      });
    }

    // If referencing a note, verify ownership
    if (noteId) {
      const note = await Note.findOne({ _id: noteId, user: req.user._id });
      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Referenced note not found.',
        });
      }
    }

    const reminder = await Reminder.create({
      user: req.user._id,
      title,
      description: description || '',
      dateTime: dateTime ? new Date(dateTime) : undefined,
      recurrence: rec,
      note: noteId || null,
    });

    logger.info(`Reminder created: ${reminder._id} by user: ${req.user._id}`);

    return res.status(201).json({
      success: true,
      reminder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/reminders/:id
 * @desc    Delete a reminder
 * @access  Private
 */
const deleteReminder = async (req, res, next) => {
  try {
    // CRITICAL: Filter by both _id AND user
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found.',
      });
    }

    logger.info(`Reminder deleted: ${req.params.id} by user: ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reminders/triggered
 * @desc    Get recently triggered reminders for the user
 * @access  Private
 */
const getTriggeredReminders = async (req, res, next) => {
  try {
    // Get reminders triggered in the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const triggered = await Reminder.find({
      user: req.user._id,
      $or: [
        { triggered: true, triggeredAt: { $gte: since } },
        { lastTriggeredAt: { $gte: since } },
      ],
    })
      .populate('note', 'title')
      .sort({ triggeredAt: -1, lastTriggeredAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: triggered.length,
      reminders: triggered,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReminders, createReminder, deleteReminder, getTriggeredReminders };
