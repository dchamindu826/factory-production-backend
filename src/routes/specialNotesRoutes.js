// src/routes/specialNotesRoutes.js
const express = require('express');
const router = express.Router();
const specialNotesController = require('../controllers/specialNotesController');
const { protect, isAdmin } = require('../middlewares/authMiddleware'); // Assuming only Admin can manage notes

// Add a new special note (Admin only)
// POST /api/special-notes/
router.post('/', protect, isAdmin, specialNotesController.addSpecialNote);

// Get all active special notes (Admin only for now, can be changed if needed for display)
// GET /api/special-notes/
router.get('/', protect, isAdmin, specialNotesController.getActiveSpecialNotes);

// Deactivate (soft delete) a special note (Admin only)
// DELETE /api/special-notes/:id
router.delete('/:id', protect, isAdmin, specialNotesController.deactivateSpecialNote);

module.exports = router;
