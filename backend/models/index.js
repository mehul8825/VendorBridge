const sequelize = require('../config/db');
const User = require('./user');
const ActivityLog = require('./activityLog');
const Notification = require('./notification');

// User <-> ActivityLog
User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activityLogs', onDelete: 'CASCADE' });
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const db = {
  sequelize,
  User,
  ActivityLog,
  Notification
};

module.exports = db;
