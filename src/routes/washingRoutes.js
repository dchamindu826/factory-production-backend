// src/routes/washingRoutes.js
const express = require('express');
const router = express.Router();
const washingController = require('../controllers/washingController');
const { protect, isDataEntry, isAdmin } = require('../middlewares/authMiddleware');

// Data Entry Route
// POST /api/washing/
router.post('/', protect, isDataEntry, washingController.addWashingEntry);

// Admin Approval Routes
// GET /api/washing/pending
router.get('/pending', protect, isAdmin, washingController.getPendingWashing);

// PUT /api/washing/approve/:id
router.put('/approve/:id', protect, isAdmin, washingController.approveWashing);

// PUT /api/washing/reject/:id
router.put('/reject/:id', protect, isAdmin, washingController.rejectWashing);

// Report Route (Admin Only)
// GET /api/washing/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/report', protect, isAdmin, washingController.getApprovedWashingForReport);

module.exports = router;
