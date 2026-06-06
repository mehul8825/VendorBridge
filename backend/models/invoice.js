const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  poId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  vendorId: {
    type: DataTypes.INTEGER, // References VendorProfile ID
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  taxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending_approval', 'approved', 'paid', 'overdue'),
    allowNull: false,
    defaultValue: 'pending_approval'
  },
  invoiceDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  dcNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dcDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  invoicedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  selectedItems: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  barcode: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Invoice;
