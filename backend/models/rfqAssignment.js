const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RFQAssignment = sequelize.define('RFQAssignment', {
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
  }
}, {
  timestamps: true
});

module.exports = RFQAssignment;
