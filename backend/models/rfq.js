const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RFQ = sequelize.define('RFQ', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  productDetails: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  targetBudget: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  deadline: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of attachment objects: [{name, url, uploadedAt, size}]'
  },
  status: {
    type: DataTypes.ENUM('draft', 'open', 'closed', 'awarded'),
    allowNull: false,
    defaultValue: 'open'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = RFQ;
