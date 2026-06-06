const sequelize = require('../config/db');
const User = require('./user');
const VendorProfile = require('./vendorProfile');
const RFQ = require('./rfq');
const RFQAssignment = require('./rfqAssignment');
const Quotation = require('./quotation');
const Approval = require('./approval');
const PurchaseOrder = require('./purchaseOrder');
const Invoice = require('./invoice');
const ActivityLog = require('./activityLog');
const Notification = require('./notification');
const GRN = require('./grn');
const RFQMessage = require('./rfqMessage');

// User <-> VendorProfile
User.hasOne(VendorProfile, { foreignKey: 'userId', as: 'vendorProfile', onDelete: 'CASCADE' });
VendorProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> ActivityLog
User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activityLogs', onDelete: 'CASCADE' });
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// RFQ <-> User (Creator)
RFQ.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(RFQ, { foreignKey: 'createdBy', as: 'rfqs' });

// RFQ <-> RFQAssignment <-> VendorProfile
RFQ.hasMany(RFQAssignment, { foreignKey: 'rfqId', as: 'assignments', onDelete: 'CASCADE' });
RFQAssignment.belongsTo(RFQ, { foreignKey: 'rfqId', as: 'rfq' });

VendorProfile.hasMany(RFQAssignment, { foreignKey: 'vendorId', as: 'assignments', onDelete: 'CASCADE' });
RFQAssignment.belongsTo(VendorProfile, { foreignKey: 'vendorId', as: 'vendor' });

// RFQ <-> Quotation <-> VendorProfile
RFQ.hasMany(Quotation, { foreignKey: 'rfqId', as: 'quotations', onDelete: 'CASCADE' });
Quotation.belongsTo(RFQ, { foreignKey: 'rfqId', as: 'rfq' });

VendorProfile.hasMany(Quotation, { foreignKey: 'vendorId', as: 'quotations', onDelete: 'CASCADE' });
Quotation.belongsTo(VendorProfile, { foreignKey: 'vendorId', as: 'vendor' });

// PurchaseOrder relations
PurchaseOrder.belongsTo(RFQ, { foreignKey: 'rfqId', as: 'rfq' });
PurchaseOrder.belongsTo(VendorProfile, { foreignKey: 'vendorId', as: 'vendor' });
PurchaseOrder.belongsTo(Quotation, { foreignKey: 'quotationId', as: 'quotation' });

RFQ.hasMany(PurchaseOrder, { foreignKey: 'rfqId', as: 'purchaseOrders' });
VendorProfile.hasMany(PurchaseOrder, { foreignKey: 'vendorId', as: 'purchaseOrders' });
Quotation.hasOne(PurchaseOrder, { foreignKey: 'quotationId', as: 'purchaseOrder' });

// Invoice relations
Invoice.belongsTo(PurchaseOrder, { foreignKey: 'poId', as: 'purchaseOrder' });
Invoice.belongsTo(VendorProfile, { foreignKey: 'vendorId', as: 'vendor' });

PurchaseOrder.hasOne(Invoice, { foreignKey: 'poId', as: 'invoice' });
VendorProfile.hasMany(Invoice, { foreignKey: 'vendorId', as: 'invoices' });

// GRN relations
PurchaseOrder.hasOne(GRN, { foreignKey: 'poId', as: 'grn' });
GRN.belongsTo(PurchaseOrder, { foreignKey: 'poId', as: 'purchaseOrder' });
GRN.belongsTo(User, { foreignKey: 'receivedBy', as: 'receiver' });

// RFQMessage relations
RFQ.hasMany(RFQMessage, { foreignKey: 'rfqId', as: 'messages', onDelete: 'CASCADE' });
RFQMessage.belongsTo(RFQ, { foreignKey: 'rfqId', as: 'rfq' });
RFQMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Approval relations (polymorphic logs linked manually or conceptually)
Approval.belongsTo(User, { foreignKey: 'managerId', as: 'manager' });

const db = {
  sequelize,
  User,
  VendorProfile,
  RFQ,
  RFQAssignment,
  Quotation,
  Approval,
  PurchaseOrder,
  Invoice,
  ActivityLog,
  Notification,
  GRN,
  RFQMessage
};

module.exports = db;
