const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');

// --- AUTHENTICATION & USERS ---
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.get('/auth/notifications', protect, authController.getNotifications);
router.put('/auth/notifications/:id/read', protect, authController.markNotificationRead);
router.get('/auth/users', protect, authorize('admin'), authController.getUsers);
router.put('/auth/users/:id/status', protect, authorize('admin'), authController.toggleUserStatus);

module.exports = router;
