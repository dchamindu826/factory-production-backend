// src/routes/subContractRoutes.js
const express = require('express');
const router = express.Router();
const subContractController = require('../controllers/subContractController');
const { protect, isDataEntry, isAdmin } = require('../middlewares/authMiddleware');

// Data Entry Route
// POST /api/sub-contracts/
router.post('/', protect, isDataEntry, subContractController.addSCEntry);

// Admin Approval Routes
// GET /api/sub-contracts/pending
router.get('/pending', protect, isAdmin, subContractController.getPendingSCEntries);

// PUT /api/sub-contracts/approve/:id
router.put('/approve/:id', protect, isAdmin, subContractController.approveSCEntry);

// PUT /api/sub-contracts/reject/:id
router.put('/reject/:id', protect, isAdmin, subContractController.rejectSCEntry);

// Report Route (Admin Only)
// GET /api/sub-contracts/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/report', protect, isAdmin, subContractController.getApprovedSCEntriesForReport);

module.exports = router;
