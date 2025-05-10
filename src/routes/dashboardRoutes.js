// src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, isAdmin } = require('../middlewares/authMiddleware'); // Assuming isAdmin might be needed for some dashboard data, or just protect for all logged-in users

// GET /api/dashboard/summary
// This route fetches general summary data for the dashboard.
// Protected, so only logged-in users can access.
router.get('/summary', protect, dashboardController.getDashboardSummary);

// GET /api/dashboard/chart/dry-process?timeframe=daily (or weekly, or monthly)
// This route fetches aggregated data for the Dry Process chart.
// Protected. If only admins should see chart data, you can add 'isAdmin' middleware.
router.get('/chart/dry-process', protect, dashboardController.getDryProcessChartData);

// Placeholder for Washing Process Chart Data Route - to be implemented later
// GET /api/dashboard/chart/washing?timeframe=daily
// router.get('/chart/washing', protect, dashboardController.getWashingProcessChartData);

module.exports = router;
