const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GRN = sequelize.define('GRN', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  poId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  receivedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  condition: {
    type: DataTypes.ENUM('excellent', 'good', 'damaged', 'incomplete'),
    allowNull: false,
    defaultValue: 'good'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receivedBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = GRN;
