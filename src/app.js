// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db'); // Database connection config
const authRoutes = require('./routes/authRoutes'); // Auth routes
const bulkInputRoutes = require('./routes/bulkInputRoutes'); // Bulk Input routes (අලුතින් import කළා)
const dryProcessRoutes = require('./routes/dryProcessRoutes');
const washingRoutes = require('./routes/washingRoutes');
const subContractRoutes = require('./routes/subContractRoutes');
const gatePassRoutes = require('./routes/gatePassRoutes');
const specialNotesRoutes = require('./routes/specialNotesRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// --- Middlewares ---
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// --- Test Route ---
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to Denim Factory Backend API!' });
});

// --- API Routes ---
app.use('/api/auth', authRoutes); // Authentication routes (/api/auth/register, /api/auth/login)
app.use('/api/bulk-inputs', bulkInputRoutes); // Bulk Input routes (/api/bulk-inputs)
app.use('/api/dry-process', dryProcessRoutes);
app.use('/api/washing', washingRoutes);
app.use('/api/sub-contracts', subContractRoutes);
app.use('/api/gate-pass', gatePassRoutes);
app.use('/api/special-notes', specialNotesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// TODO: Add other data entry routes here (e.g., dry-process, washing, etc.)
// app.use('/api/dry-process', dryProcessRoutes);
// app.use('/api/washing', washingRoutes);
// app.use('/api/sub-contracts', subContractRoutes);
// app.use('/api/gate-pass', gatePassRoutes);
// app.use('/api/reports', reportRoutes); // Maybe for fetching report data

// --- Server Startup ---
const PORT = process.env.BACKEND_PORT || 5001;

async function startServer() {
  try {
    const dbConnected = await db.testConnection();
    if (dbConnected) {
      app.listen(PORT, () => {
        console.log(`Backend server is running on http://localhost:${PORT}`);
        console.log('Database is connected and ready.');
      });
    } else {
      console.error('Failed to connect to the database. Server not started.');
      process.exit(1); // Exit if DB fails
    }
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer(); // Start the server