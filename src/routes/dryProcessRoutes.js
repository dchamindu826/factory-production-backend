// src/routes/dryProcessRoutes.js
const express = require('express');
const router = express.Router();
const dryProcessController = require('../controllers/dryProcessController');
const { protect, isDataEntry, isAdmin } = require('../middlewares/authMiddleware');

// --- Data Entry Route ---
// POST /api/dry-process/
// Allows users with 'DATA_ENTRY' or 'ADMIN' role to add new dry process entries.
router.post('/', protect, isDataEntry, dryProcessController.addDryProcessEntry);

// --- Admin Approval Routes ---
// GET /api/dry-process/pending
// Allows users with 'ADMIN' role to get a list of all dry process entries with 'PENDING' status.
router.get('/pending', protect, isAdmin, dryProcessController.getPendingDryProcess);

// PUT /api/dry-process/approve/:id
// Allows users with 'ADMIN' role to approve a specific dry process entry by its ID.
router.put('/approve/:id', protect, isAdmin, dryProcessController.approveDryProcess);

// PUT /api/dry-process/reject/:id
// Allows users with 'ADMIN' role to reject a specific dry process entry by its ID.
router.put('/reject/:id', protect, isAdmin, dryProcessController.rejectDryProcess);

// --- Report Route (Admin Only) ---
// GET /api/dry-process/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Allows users with 'ADMIN' role to get 'APPROVED' dry process entries within a specified date range.
router.get('/report', protect, isAdmin, dryProcessController.getApprovedDryProcessForReport);

module.exports = router;
