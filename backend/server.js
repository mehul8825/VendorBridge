const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./models');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    database: db.sequelize.dialect.name
  });
});

// API Routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    message: 'An unexpected error occurred on the server',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Initialize Database and Start Server
const startServer = async () => {
  try {
    // Initialize the DB (MySQL with SQLite fallback)
    await db.sequelize.init();

    // Sync database schemas
    console.log('Syncing database models...');
    await db.sequelize.sync();
    console.log('Database synced successfully.');

    // Start listening
    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`  VendorBridge ERP Server running on port ${PORT}`);
      console.log(`  Database Dialect: ${db.sequelize.dialect.name}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('Failed to start the VendorBridge server:', error);
    process.exit(1);
  }
};

startServer();
