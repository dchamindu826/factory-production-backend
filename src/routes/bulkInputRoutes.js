// src/routes/bulkInputRoutes.js
const express = require('express');
const router = express.Router();
const bulkInputController = require('../controllers/bulkInputController');
const { protect, isDataEntry, isAdmin } = require('../middlewares/authMiddleware');

// --- Data Entry Route ---
// POST /api/bulk-inputs/
router.post('/', protect, isDataEntry, bulkInputController.addBulkInput);

// --- Admin Approval Routes ---
// GET /api/bulk-inputs/pending
router.get('/pending', protect, isAdmin, bulkInputController.getPendingBulkInputs);

// PUT /api/bulk-inputs/approve/:id
router.put('/approve/:id', protect, isAdmin, bulkInputController.approveBulkInput);

// PUT /api/bulk-inputs/reject/:id
router.put('/reject/:id', protect, isAdmin, bulkInputController.rejectBulkInput);

// --- Report Route (Admin Only) ---
// GET /api/bulk-inputs/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/report', protect, isAdmin, bulkInputController.getApprovedBulkInputsForReport);

module.exports = router;
