const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');
const vendorController = require('../controllers/vendorController');
const rfqController = require('../controllers/rfqController');
const quotationController = require('../controllers/quotationController');
const approvalController = require('../controllers/approvalController');
const poController = require('../controllers/poController');
const invoiceController = require('../controllers/invoiceController');
const dashboardController = require('../controllers/dashboardController');

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

// --- RFQS ---
router.post('/rfqs', protect, authorize('procurement', 'admin'), rfqController.createRFQ);
router.get('/rfqs', protect, rfqController.getRFQs);
router.get('/rfqs/:id', protect, rfqController.getRFQById);
router.get('/rfqs/:id/compare', protect, authorize('procurement', 'admin', 'manager'), rfqController.getBidsComparison);
router.put('/rfqs/:id/close', protect, authorize('procurement', 'admin'), rfqController.closeRFQ);

// --- QUOTATIONS (BIDS) ---
router.post('/quotations', protect, authorize('vendor'), quotationController.submitQuotation);
router.put('/quotations/:id', protect, authorize('vendor'), quotationController.updateQuotation);
router.get('/quotations/my', protect, authorize('vendor'), quotationController.getMyQuotations);
router.get('/quotations/pending-po', protect, authorize('procurement', 'admin'), quotationController.getApprovedPendingPO);

// --- APPROVALS ---
router.post('/approvals/initiate', protect, authorize('procurement', 'admin'), approvalController.initiateApproval);
router.get('/approvals', protect, authorize('manager', 'admin', 'procurement'), approvalController.getApprovals);
router.put('/approvals/:id/review', protect, authorize('manager', 'admin'), approvalController.reviewApproval);

// --- PURCHASE ORDERS ---
router.get('/pos', protect, poController.getPOs);
router.post('/pos', protect, authorize('procurement', 'admin'), poController.generatePO);
router.get('/pos/:id', protect, poController.getPOById);
router.put('/pos/:id/status', protect, authorize('vendor'), poController.updatePOStatus);

// --- INVOICES ---
router.post('/invoices/generate', protect, authorize('vendor', 'procurement', 'admin'), invoiceController.generateInvoice);
router.get('/invoices', protect, invoiceController.getInvoices);
router.get('/invoices/:id', protect, invoiceController.getInvoiceById);
router.put('/invoices/:id/pay', protect, authorize('admin', 'manager'), invoiceController.payInvoice);
router.post('/invoices/:id/email', protect, invoiceController.sendInvoiceEmail);

// --- DASHBOARD & ANALYTICS ---
router.get('/dashboard/stats', protect, dashboardController.getStats);
router.get('/dashboard/logs', protect, authorize('admin'), dashboardController.getActivityLogs);

module.exports = router;
