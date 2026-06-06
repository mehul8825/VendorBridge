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

exports.generatePO = async (req, res) => {
  try {
    const { quotationId } = req.body;
    if (!quotationId) {
      return res.status(400).json({ message: 'Quotation ID is required' });
    }
    
    // Verify quotation is approved/accepted and doesn't already have a PO
    const quote = await Quotation.findByPk(quotationId, {
      include: [{ model: RFQ, as: 'rfq' }, { model: VendorProfile, as: 'vendor' }]
    });
    if (!quote) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    if (quote.status !== 'accepted') {
      return res.status(400).json({ message: 'Quotation must be accepted/approved before releasing a PO.' });
    }

    const existingPO = await PurchaseOrder.findOne({ where: { quotationId } });
    if (existingPO) {
      return res.status(400).json({ message: 'A Purchase Order has already been generated for this quotation.' });
    }

    // Generate PO number
    const poCount = await PurchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(4, '0')}`;

    const po = await PurchaseOrder.create({
      poNumber,
      rfqId: quote.rfqId,
      vendorId: quote.vendorId,
      quotationId: quote.id,
      totalAmount: quote.price,
      status: 'approved' // Automatically approved since it came from approved quote
    });

    // Create activity log
    await ActivityLog.create({
      userId: req.user.id,
      action: 'PO_GENERATED',
      details: `Procurement Officer generated PO ${poNumber} for quotation #${quote.id} and vendor '${quote.vendor.companyName}'`
    });

    // Notify vendor
    await Notification.create({
      userId: quote.vendor.userId,
      message: `Purchase Order ${poNumber} has been generated and released for your bid on "${quote.rfq.title}".`,
      type: 'info'
    });

    res.status(201).json(po);
  } catch (error) {
    console.error('Generate PO Error:', error);
    res.status(500).json({ message: 'Failed to generate Purchase Order' });
  }
};
