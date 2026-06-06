const { Approval, Quotation, RFQ, PurchaseOrder, VendorProfile, User, ActivityLog, Notification } = require('../models');

// Initiate approval request
exports.initiateApproval = async (req, res) => {
  try {
    const { entityType, entityId, remarks } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({ message: 'Entity type (quotation/po) and Entity ID are required.' });
    }

    // Double check entity exists
    if (entityType === 'quotation') {
      const quote = await Quotation.findByPk(entityId);
      if (!quote) return res.status(404).json({ message: 'Quotation not found' });
      quote.status = 'under_review';
      await quote.save();
    } else if (entityType === 'po') {
      const po = await PurchaseOrder.findByPk(entityId);
      if (!po) return res.status(404).json({ message: 'Purchase Order not found' });
      po.status = 'pending_approval';
      await po.save();
    }

    // Select a manager
    const manager = await User.findOne({ where: { role: 'manager', status: 'active' } });
    if (!manager) {
      return res.status(400).json({ message: 'No active manager found to assign this approval.' });
    }

    const approval = await Approval.create({
      entityType,
      entityId,
      managerId: manager.id,
      status: 'pending',
      remarks
    });

    await ActivityLog.create({
      userId: req.user.id,
      action: 'APPROVAL_REQUESTED',
      details: `Requested approval for ${entityType} #${entityId} by ${req.user.name}`
    });

    await Notification.create({
      userId: manager.id,
      message: `New approval request pending for ${entityType} #${entityId}`,
      type: 'info'
    });

    res.status(201).json(approval);
  } catch (error) {
    console.error('Initiate Approval Error:', error);
    res.status(500).json({ message: 'Failed to request approval' });
  }
};

// Fetch pending approvals for the logged-in manager, or all approvals for tracking
exports.getApprovals = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'manager') {
      where.managerId = req.user.id;
    }

    const approvals = await Approval.findAll({
      where,
      include: [{ model: User, as: 'manager', attributes: ['name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    // Populate full entity info dynamically
    const enrichedApprovals = [];
    for (const approval of approvals) {
      const appJson = approval.toJSON();
      if (approval.entityType === 'quotation') {
        appJson.entity = await Quotation.findByPk(approval.entityId, {
          include: [
            { model: RFQ, as: 'rfq' },
            { model: VendorProfile, as: 'vendor' }
          ]
        });
      } else if (approval.entityType === 'po') {
        appJson.entity = await PurchaseOrder.findByPk(approval.entityId, {
          include: [
            { model: RFQ, as: 'rfq' },
            { model: VendorProfile, as: 'vendor' }
          ]
        });
      }
      enrichedApprovals.push(appJson);
    }

    res.json(enrichedApprovals);
  } catch (error) {
    console.error('Fetch Approvals Error:', error);
    res.status(500).json({ message: 'Failed to fetch approvals' });
  }
};

// Manager reviews (approves or rejects) the request
exports.reviewApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value. Use approved or rejected.' });
    }

    const approval = await Approval.findByPk(id);
    if (!approval) {
      return res.status(404).json({ message: 'Approval request not found' });
    }

    if (approval.managerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to sign off on this approval.' });
    }

    approval.status = status;
    approval.remarks = remarks;
    await approval.save();

    const entityType = approval.entityType;
    const entityId = approval.entityId;

    if (entityType === 'quotation') {
      const quote = await Quotation.findByPk(entityId, {
        include: [{ model: RFQ, as: 'rfq' }, { model: VendorProfile, as: 'vendor' }]
      });

      if (quote) {
        if (status === 'approved') {
          quote.status = 'accepted';
          await quote.save();

          // Reject all other bids for this RFQ
          await Quotation.update(
            { status: 'rejected' },
            { where: { rfqId: quote.rfqId, status: 'submitted' } }
          );

          // Update RFQ status to awarded
          const rfq = await RFQ.findByPk(quote.rfqId);
          if (rfq) {
            rfq.status = 'awarded';
            await rfq.save();
          }

          // Generate Purchase Order automatically
          const poCount = await PurchaseOrder.count();
          const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(4, '0')}`;
          
          const po = await PurchaseOrder.create({
            poNumber,
            rfqId: quote.rfqId,
            vendorId: quote.vendorId,
            quotationId: quote.id,
            totalAmount: quote.price,
            status: 'approved' // Automatically approved since the quote was approved by manager
          });

          // Notify vendor
          await Notification.create({
            userId: quote.vendor.userId,
            message: `Congratulations! Your bid for "${quote.rfq.title}" has been accepted. Purchase Order ${poNumber} has been issued.`,
            type: 'success'
          });

          await ActivityLog.create({
            userId: req.user.id,
            action: 'BID_AWARDED',
            details: `Manager approved bid #${quote.id} and created PO ${poNumber} for vendor '${quote.vendor.companyName}'`
          });
        } else {
          quote.status = 'rejected';
          await quote.save();

          await Notification.create({
            userId: quote.vendor.userId,
            message: `Your quotation for RFQ: "${quote.rfq.title}" was reviewed and rejected.`,
            type: 'warning'
          });

          await ActivityLog.create({
            userId: req.user.id,
            action: 'BID_REJECTED',
            details: `Manager rejected bid #${quote.id} for RFQ #${quote.rfqId}`
          });
        }
      }
    } else if (entityType === 'po') {
      const po = await PurchaseOrder.findByPk(entityId, {
        include: [{ model: VendorProfile, as: 'vendor' }, { model: RFQ, as: 'rfq' }]
      });

      if (po) {
        if (status === 'approved') {
          po.status = 'approved';
          await po.save();

          await Notification.create({
            userId: po.vendor.userId,
            message: `Purchase Order ${po.poNumber} has been approved and sent to you.`,
            type: 'success'
          });

          await ActivityLog.create({
            userId: req.user.id,
            action: 'PO_APPROVED',
            details: `Approved Purchase Order ${po.poNumber}`
          });
        } else {
          po.status = 'rejected';
          await po.save();

          await ActivityLog.create({
            userId: req.user.id,
            action: 'PO_REJECTED',
            details: `Rejected Purchase Order ${po.poNumber} with remarks: ${remarks}`
          });
        }
      }
    }

    res.json(approval);
  } catch (error) {
    console.error('Review Approval Error:', error);
    res.status(500).json({ message: 'Failed to process approval review' });
  }
};
