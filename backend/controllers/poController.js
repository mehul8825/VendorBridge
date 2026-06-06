const { PurchaseOrder, RFQ, VendorProfile, Quotation, ActivityLog, Notification } = require('../models');

exports.getPOs = async (req, res) => {
  try {
    const role = req.user.role;
    let pos;

    if (role === 'vendor') {
      const profile = req.vendorProfile;
      if (!profile) return res.json([]);

      pos = await PurchaseOrder.findAll({
        where: { vendorId: profile.id },
        include: [
          { model: RFQ, as: 'rfq' },
          { model: Quotation, as: 'quotation' }
        ],
        order: [['createdAt', 'DESC']]
      });
    } else {
      // Admin, Manager, Procurement
      pos = await PurchaseOrder.findAll({
        include: [
          { model: RFQ, as: 'rfq' },
          { model: VendorProfile, as: 'vendor' },
          { model: Quotation, as: 'quotation' }
        ],
        order: [['createdAt', 'DESC']]
      });
    }

    res.json(pos);
  } catch (error) {
    console.error('Fetch POs Error:', error);
    res.status(500).json({ message: 'Failed to fetch purchase orders' });
  }
};

exports.getPOById = async (req, res) => {
  try {
    const { id } = req.params;
    const po = await PurchaseOrder.findByPk(id, {
      include: [
        { model: RFQ, as: 'rfq' },
        { model: VendorProfile, as: 'vendor' },
        { model: Quotation, as: 'quotation' }
      ]
    });

    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (req.user.role === 'vendor' && po.vendorId !== req.vendorProfile.id) {
      return res.status(403).json({ message: 'Not authorized to view this Purchase Order' });
    }

    res.json(po);
  } catch (error) {
    console.error('Fetch PO ID Error:', error);
    res.status(500).json({ message: 'Failed to fetch Purchase Order details' });
  }
};

exports.updatePOStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be accepted or rejected' });
    }

    const po = await PurchaseOrder.findByPk(id, {
      include: [{ model: RFQ, as: 'rfq' }]
    });
    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (req.user.role === 'vendor' && po.vendorId !== req.vendorProfile.id) {
      return res.status(403).json({ message: 'Not authorized to modify this Purchase Order' });
    }

    po.status = status;
    await po.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: status === 'accepted' ? 'PO_ACCEPTED_BY_VENDOR' : 'PO_REJECTED_BY_VENDOR',
      details: `Vendor updated Purchase Order ${po.poNumber} to ${status}`
    });

    // Notify procurement officer
    await Notification.create({
      userId: po.rfq.createdBy,
      message: `Vendor updated Purchase Order ${po.poNumber} status to: ${status}`,
      type: status === 'accepted' ? 'success' : 'warning'
    });

    res.json(po);
  } catch (error) {
    console.error('Update PO Status Error:', error);
    res.status(500).json({ message: 'Failed to update Purchase Order' });
  }
};
