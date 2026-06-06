const express = require('express');
const cors = require('cors');
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const db = require('./models');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('User connected via Socket.io:', socket.id);
  
  socket.on('join', (userId) => {
    socket.join(userId.toString());
    console.log(`Socket ${socket.id} joined room ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

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

    // Initialize cron jobs
    const initCronJobs = require('./scripts/cronJobs');
    initCronJobs(io);

    // Start listening
    server.listen(PORT, () => {
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
