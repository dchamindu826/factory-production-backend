// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// User Registration Route (කලින් තිබ්බ එක)
router.post('/register', authController.registerUser);

// User Login Route (අලුතින් එකතු කළ එක)
router.post('/login', authController.loginUser); // loginUser function එකට map කරනවා

module.exports = router;