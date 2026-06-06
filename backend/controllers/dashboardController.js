const { User, VendorProfile, RFQ, Quotation, PurchaseOrder, Invoice, ActivityLog, Approval } = require('../models');
const { Op } = require('sequelize');

exports.getStats = async (req, res) => {
  try {
    const role = req.user.role;
    const stats = {};

    if (role === 'admin') {
      stats.totalUsers = await User.count();
      stats.totalVendors = await VendorProfile.count();
      stats.pendingVendors = await VendorProfile.count({ where: { status: 'pending' } });
      stats.approvedVendors = await VendorProfile.count({ where: { status: 'approved' } });
      
      const invoicesPaid = await Invoice.findAll({ where: { status: 'paid' } });
      stats.totalSpend = invoicesPaid.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

      // Fetch all activity logs
      stats.recentActivities = await ActivityLog.findAll({
        include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
        order: [['createdAt', 'DESC']],
        limit: 10
      });
      
    } else if (role === 'procurement') {
      stats.activeRFQs = await RFQ.count({ where: { status: 'open' } });
      stats.totalPOs = await PurchaseOrder.count();
      stats.pendingPOApprovals = await PurchaseOrder.count({ where: { status: 'pending_approval' } });
      stats.totalInvoices = await Invoice.count();

      const invoicesPaid = await Invoice.findAll({ where: { status: 'paid' } });
      stats.totalSpend = invoicesPaid.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

      stats.recentPOs = await PurchaseOrder.findAll({
        include: [{ model: VendorProfile, as: 'vendor', attributes: ['companyName'] }],
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      stats.recentInvoices = await Invoice.findAll({
        include: [{ model: VendorProfile, as: 'vendor', attributes: ['companyName'] }],
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      stats.recentActivities = await ActivityLog.findAll({
        include: [{ model: User, as: 'user', attributes: ['name'] }],
        order: [['createdAt', 'DESC']],
        limit: 5
      });

    } else if (role === 'manager') {
      stats.pendingApprovals = await Approval.count({
        where: { managerId: req.user.id, status: 'pending' }
      });
      stats.approvedCount = await Approval.count({
        where: { managerId: req.user.id, status: 'approved' }
      });
      stats.activeRFQs = await RFQ.count({ where: { status: 'open' } });
      
      const totalPOApprovedAmount = await PurchaseOrder.findAll({ where: { status: 'approved' } });
      stats.approvedSpend = totalPOApprovedAmount.reduce((sum, po) => sum + parseFloat(po.totalAmount), 0);

      stats.recentApprovals = await Approval.findAll({
        where: { managerId: req.user.id },
        order: [['createdAt', 'DESC']],
        limit: 5
      });

    } else if (role === 'vendor') {
      const profile = req.vendorProfile;
      if (!profile) {
        return res.json({
          status: 'onboarding_required',
          message: 'Complete onboarding profile to view dashboard.'
        });
      }

      stats.myBidsCount = await Quotation.count({ where: { vendorId: profile.id } });
      stats.bidsWonCount = await Quotation.count({ where: { vendorId: profile.id, status: 'accepted' } });
      stats.myInvoicesCount = await Invoice.count({ where: { vendorId: profile.id } });
      
      const myInvoicesPaid = await Invoice.findAll({ where: { vendorId: profile.id, status: 'paid' } });
      stats.totalEarnings = myInvoicesPaid.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

      stats.recentBids = await Quotation.findAll({
        where: { vendorId: profile.id },
        include: [{ model: RFQ, as: 'rfq' }],
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      stats.recentInvoices = await Invoice.findAll({
        where: { vendorId: profile.id },
        order: [['createdAt', 'DESC']],
        limit: 5
      });
    }

    // Common: monthly spending/procurement trend for chart
    // We mock/group database transactions by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyTrends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // We create a mock/actual summary for the last 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const monthName = months[d.getMonth()];
      const year = d.getFullYear();
      
      // Real database check for POs created in that month
      const startOfMonth = new Date(year, d.getMonth(), 1);
      const endOfMonth = new Date(year, d.getMonth() + 1, 0, 23, 59, 59);

      const posInMonth = await PurchaseOrder.findAll({
        where: {
          createdAt: {
            [Op.between]: [startOfMonth, endOfMonth]
          },
          status: { [Op.not]: 'rejected' }
        }
      });

      const totalValue = posInMonth.reduce((sum, po) => sum + parseFloat(po.totalAmount), 0);
      const count = posInMonth.length;

      monthlyTrends.push({
        month: `${monthName} ${year}`,
        amount: totalValue || 0,
        orders: count || 0
      });
    }
    stats.monthlyTrends = monthlyTrends;

    // Category distribution for donut chart
    const rfqs = await RFQ.findAll();
    const categories = {};
    rfqs.forEach(rfq => {
      // Parse category from details or title, default to general
      let cat = 'General';
      try {
        const details = JSON.parse(rfq.productDetails);
        if (details.category) cat = details.category;
      } catch (e) {
        // Fallback: simple text match
        if (rfq.title.toLowerCase().includes('laptop') || rfq.title.toLowerCase().includes('software') || rfq.title.toLowerCase().includes('server')) cat = 'IT';
        else if (rfq.title.toLowerCase().includes('office') || rfq.title.toLowerCase().includes('furniture') || rfq.title.toLowerCase().includes('desk')) cat = 'Furniture';
        else if (rfq.title.toLowerCase().includes('delivery') || rfq.title.toLowerCase().includes('courier')) cat = 'Logistics';
      }
      categories[cat] = (categories[cat] || 0) + 1;
    });

    stats.categoryDistribution = Object.keys(categories).map(key => ({
      name: key,
      value: categories[key]
    }));

    res.json(stats);
  } catch (error) {
    console.error('Fetch Stats Error:', error);
    res.status(500).json({ message: 'Failed to retrieve analytics and stats.' });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.findAll({
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
};
