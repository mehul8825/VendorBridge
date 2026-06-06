const { Quotation, RFQ, VendorProfile, PurchaseOrder, ActivityLog, Notification } = require('../models');

exports.submitQuotation = async (req, res) => {
  try {
    const { rfqId, price, deliveryDays, notes } = req.body;

    if (!rfqId || price === undefined || !deliveryDays) {
      return res.status(400).json({ message: 'RFQ reference, price, and delivery timeline are required.' });
    }

    const rfq = await RFQ.findByPk(rfqId);
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    if (rfq.status !== 'open') {
      return res.status(400).json({ message: 'This RFQ is no longer open for quotations.' });
    }

    const profile = req.vendorProfile;
    if (!profile) {
      return res.status(403).json({ message: 'Vendor profile not verified. Complete onboarding first.' });
    }

    if (profile.status !== 'approved') {
      return res.status(403).json({ message: 'Your onboarding profile is pending approval. You cannot submit quotations yet.' });
    }

    // Check if vendor already submitted a quote
    const existingQuotation = await Quotation.findOne({
      where: { rfqId, vendorId: profile.id }
    });

    if (existingQuotation) {
      return res.status(400).json({ message: 'You have already submitted a quotation for this RFQ. Use the edit feature instead.' });
    }

    const quotation = await Quotation.create({
      rfqId,
      vendorId: profile.id,
      price,
      deliveryDays,
      notes,
      status: 'submitted'
    });

    await ActivityLog.create({
      userId: req.user.id,
      action: 'QUOTATION_SUBMITTED',
      details: `Vendor '${profile.companyName}' submitted quotation of INR ${price} for RFQ #${rfqId}`
    });

    // Notify procurement officers
    await Notification.create({
      userId: rfq.createdBy,
      message: `Vendor '${profile.companyName}' submitted a quotation for RFQ: "${rfq.title}"`,
      type: 'success'
    });

    res.status(201).json(quotation);
  } catch (error) {
    console.error('Submit Quotation Error:', error);
    res.status(500).json({ message: 'Failed to submit quotation' });
  }
};

exports.updateQuotation = async (req, res) => {
  try {
    const { id } = req.params; // Quotation ID
    const { price, deliveryDays, notes } = req.body;

    const quotation = await Quotation.findByPk(id, {
      include: [{ model: RFQ, as: 'rfq' }]
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const profile = req.vendorProfile;
    if (!profile || quotation.vendorId !== profile.id) {
      return res.status(403).json({ message: 'Not authorized to edit this quotation' });
    }

    if (quotation.rfq.status !== 'open') {
      return res.status(400).json({ message: 'The RFQ associated with this quotation is closed.' });
    }

    if (price !== undefined) quotation.price = price;
    if (deliveryDays !== undefined) quotation.deliveryDays = deliveryDays;
    if (notes !== undefined) quotation.notes = notes;

    await quotation.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: 'QUOTATION_UPDATED',
      details: `Vendor '${profile.companyName}' updated quotation #${id}`
    });

    res.json(quotation);
  } catch (error) {
    console.error('Update Quotation Error:', error);
    res.status(500).json({ message: 'Failed to update quotation' });
  }
};

exports.getMyQuotations = async (req, res) => {
  try {
    const profile = req.vendorProfile;
    if (!profile) {
      return res.json([]);
    }

    const quotations = await Quotation.findAll({
      where: { vendorId: profile.id },
      include: [{ model: RFQ, as: 'rfq' }],
      order: [['createdAt', 'DESC']]
    });

    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quotations' });
  }
};

exports.getApprovedPendingPO = async (req, res) => {
  try {
    const quotations = await Quotation.findAll({
      where: { status: 'accepted' },
      include: [
        { model: RFQ, as: 'rfq' },
        { model: VendorProfile, as: 'vendor' },
        { model: PurchaseOrder, as: 'purchaseOrder', required: false }
      ]
    });
    
    // Filter out quotations that already have POs
    const pending = quotations.filter(q => !q.purchaseOrder);
    res.json(pending);
  } catch (error) {
    console.error('Fetch Pending PO Bids Error:', error);
    res.status(500).json({ message: 'Failed to fetch pending PO bids' });
  }
};
