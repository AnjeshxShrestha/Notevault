const Note = require('../models/Note');
const logger = require('../utils/logger');

/**
 * @route   GET /api/notes
 * @desc    Get all notes for authenticated user
 * @access  Private
 */
const getNotes = async (req, res, next) => {
  try {
    // CRITICAL: Always filter by req.user._id to enforce data isolation
    const notes = await Note.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .lean(); // lean() for better performance on read-only

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/notes
 * @desc    Create a new note
 * @access  Private
 */
const createNote = async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;

    const note = await Note.create({
      user: req.user._id, // Always use authenticated user's ID
      title,
      content,
      tags: tags || [],
    });

    logger.info(`Note created: ${note._id} by user: ${req.user._id}`);

    return res.status(201).json({
      success: true,
      note,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/notes/:id
 * @desc    Update a note
 * @access  Private
 */
const updateNote = async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;

    // CRITICAL: Filter by both _id AND user to prevent unauthorized access
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, // Ownership check in query
      { title, content, tags },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.',
      });
    }

    return res.status(200).json({
      success: true,
      note,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete a note
 * @access  Private
 */
const deleteNote = async (req, res, next) => {
  try {
    // CRITICAL: Filter by both _id AND user to prevent unauthorized deletion
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.',
      });
    }

    logger.info(`Note deleted: ${req.params.id} by user: ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'Note deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotes, createNote, updateNote, deleteNote };
