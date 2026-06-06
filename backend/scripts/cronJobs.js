const cron = require('node-cron');
const { RFQ, PurchaseOrder, Approval, Notification, User } = require('../models');
const { Op } = require('sequelize');

module.exports = (io) => {
  console.log('Initializing Cron Jobs...');

  // Run daily at midnight: '0 0 * * *'
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running daily checks...');
    try {
      // 1. Remind managers of pending approvals > 48 hours
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const pendingApprovals = await Approval.findAll({
        where: {
          status: 'pending',
          createdAt: { [Op.lt]: twoDaysAgo }
        }
      });

      for (const app of pendingApprovals) {
        const notif = await Notification.create({
          userId: app.managerId,
          title: 'Action Required: Pending Approval',
          message: `Requisition Approval ID #${app.id} has been pending for over 48 hours. Please review.`,
          type: 'alert'
        });
        io.to(app.managerId.toString()).emit('notification', notif);
      }

      // 2. Remind procurement of RFQs nearing deadline (e.g., closing tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const closingRFQs = await RFQ.findAll({
        where: {
          status: 'open',
          deadline: tomorrowStr
        }
      });

      for (const rfq of closingRFQs) {
        // notify creator
        const notif = await Notification.create({
          userId: rfq.createdBy,
          title: 'RFQ Closing Soon',
          message: `RFQ "${rfq.title}" is closing tomorrow.`,
          type: 'info'
        });
        io.to(rfq.createdBy.toString()).emit('notification', notif);
      }

      console.log('[Cron] Daily checks completed.');
    } catch (err) {
      console.error('[Cron] Error running daily checks:', err);
    }
  });
};
