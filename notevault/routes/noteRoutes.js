const express = require('express');
const router = express.Router();
const { getNotes, createNote, updateNote, deleteNote } = require('../controllers/noteController');
const { protect } = require('../middleware/auth');
const { validateNote, validateMongoId } = require('../middleware/validate');

// All note routes require authentication
router.use(protect);

router.get('/', getNotes);
router.post('/', validateNote, createNote);
router.put('/:id', validateMongoId('id'), validateNote, updateNote);
router.delete('/:id', validateMongoId('id'), deleteNote);

module.exports = router;
