const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Quotation = sequelize.define('Quotation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  rfqId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  vendorId: {
    type: DataTypes.INTEGER, // References VendorProfile ID
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  deliveryDays: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('submitted', 'under_review', 'accepted', 'rejected'),
    allowNull: false,
    defaultValue: 'submitted'
  }
}, {
  timestamps: true
});

module.exports = Quotation;
