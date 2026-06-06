const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');
const vendorController = require('../controllers/vendorController');

// --- AUTHENTICATION & USERS ---
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.get('/auth/notifications', protect, authController.getNotifications);
router.put('/auth/notifications/:id/read', protect, authController.markNotificationRead);
router.get('/auth/users', protect, authorize('admin'), authController.getUsers);
router.put('/auth/users/:id/status', protect, authorize('admin'), authController.toggleUserStatus);

// --- VENDORS ---
router.post('/vendors/onboard', protect, authorize('vendor'), vendorController.onboardProfile);
router.get('/vendors/profile', protect, authorize('vendor'), vendorController.getMyProfile);
router.get('/vendors', protect, authorize('admin', 'procurement', 'manager'), vendorController.getVendors);
router.put('/vendors/:id/approve', protect, authorize('admin'), vendorController.approveOrRejectVendor);
router.put('/vendors/:id/rate', protect, authorize('admin', 'procurement'), vendorController.updateRating);

module.exports = router;
