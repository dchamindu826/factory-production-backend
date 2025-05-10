// src/routes/gatePassRoutes.js
const express = require('express');
const router = express.Router();
const gatePassController = require('../controllers/gatePassController');
const { protect, isDataEntry, isAdmin } = require('../middlewares/authMiddleware');

// --- Data Entry Route ---
// POST /api/gate-pass/
router.post('/', protect, isDataEntry, gatePassController.addGatePassEntry);

// --- Admin Approval Routes ---
// GET /api/gate-pass/pending
router.get('/pending', protect, isAdmin, gatePassController.getPendingGatePasses);

// PUT /api/gate-pass/approve/:id
router.put('/approve/:id', protect, isAdmin, gatePassController.approveGatePass);

// PUT /api/gate-pass/reject/:id
router.put('/reject/:id', protect, isAdmin, gatePassController.rejectGatePass);

// --- Report Route (Admin Only) ---
// GET /api/gate-pass/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/report', protect, isAdmin, gatePassController.getApprovedGatePassesForReport);

module.exports = router;
