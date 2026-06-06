const { RFQ, RFQAssignment, VendorProfile, Quotation, User, ActivityLog, Notification } = require('../models');

exports.createRFQ = async (req, res) => {
  try {
    const { title, productDetails, quantity, targetBudget, deadline, assignedVendorIds } = req.body;

    if (!title || !productDetails || !quantity || !targetBudget || !deadline) {
      return res.status(400).json({ message: 'Title, product details, quantity, target budget, and deadline are required.' });
    }

    const rfq = await RFQ.create({
      title,
      productDetails,
      quantity,
      targetBudget,
      deadline,
      status: 'open',
      createdBy: req.user.id
    });

    // Handle Vendor Assignments if provided
    if (assignedVendorIds && Array.isArray(assignedVendorIds)) {
      for (const vendorId of assignedVendorIds) {
        await RFQAssignment.create({
          rfqId: rfq.id,
          vendorId
        });

        // Notify each assigned vendor
        const profile = await VendorProfile.findByPk(vendorId);
        if (profile) {
          await Notification.create({
            userId: profile.userId,
            message: `You have been invited to submit a quotation for RFQ: "${title}"`,
            type: 'info'
          });
        }
      }
    } else {
      // If no assignments, invite all approved vendors
      const approvedVendors = await VendorProfile.findAll({ where: { status: 'approved' } });
      for (const vendor of approvedVendors) {
        await RFQAssignment.create({
          rfqId: rfq.id,
          vendorId: vendor.id
        });

        await Notification.create({
          userId: vendor.userId,
          message: `New RFQ published: "${title}". Submit your quotation.`,
          type: 'info'
        });
      }
    }

    await ActivityLog.create({
      userId: req.user.id,
      action: 'RFQ_CREATED',
      details: `RFQ #${rfq.id} - "${title}" created by ${req.user.name}`
    });

    res.status(201).json(rfq);
  } catch (error) {
    console.error('Create RFQ Error:', error);
    res.status(500).json({ message: 'Failed to create RFQ' });
  }
};

exports.getRFQs = async (req, res) => {
  try {
    const userRole = req.user.role;
    let rfqs;

    if (userRole === 'vendor') {
      // Vendors only see RFQs they are assigned/invited to
      const profile = req.vendorProfile;
      if (!profile) {
        return res.status(403).json({ message: 'Vendor profile not set up yet. Complete onboarding first.' });
      }

      rfqs = await RFQ.findAll({
        include: [
          {
            model: RFQAssignment,
            as: 'assignments',
            where: { vendorId: profile.id },
            attributes: []
          },
          {
            model: User,
            as: 'creator',
            attributes: ['name', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } else {
      // Admin, Manager, Procurement see all
      rfqs = await RFQ.findAll({
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['name', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    }

    res.json(rfqs);
  } catch (error) {
    console.error('Fetch RFQs Error:', error);
    res.status(500).json({ message: 'Failed to fetch RFQs' });
  }
};

exports.getRFQById = async (req, res) => {
  try {
    const { id } = req.params;
    const include = [
      {
        model: User,
        as: 'creator',
        attributes: ['name', 'email']
      },
      {
        model: RFQAssignment,
        as: 'assignments',
        include: [{ model: VendorProfile, as: 'vendor' }]
      }
    ];

    // Managers/Procurement/Admins also get quotations
    if (req.user.role !== 'vendor') {
      include.push({
        model: Quotation,
        as: 'quotations',
        include: [{ model: VendorProfile, as: 'vendor' }]
      });
    }

    const rfq = await RFQ.findByPk(id, { include });

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    // Verify vendor assignment
    if (req.user.role === 'vendor') {
      const isAssigned = rfq.assignments.some(a => a.vendorId === req.vendorProfile.id);
      if (!isAssigned) {
        return res.status(403).json({ message: 'Not authorized to view this RFQ' });
      }
    }

    res.json(rfq);
  } catch (error) {
    console.error('Fetch RFQ ID Error:', error);
    res.status(500).json({ message: 'Failed to retrieve RFQ details' });
  }
};

exports.getBidsComparison = async (req, res) => {
  try {
    const { id } = req.params; // RFQ ID
    const rfq = await RFQ.findByPk(id, {
      include: [
        {
          model: Quotation,
          as: 'quotations',
          include: [{ model: VendorProfile, as: 'vendor' }]
        }
      ]
    });

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    if (req.user.role === 'vendor') {
      return res.status(403).json({ message: 'Vendors are not allowed to view the bid comparison board.' });
    }

    const quotations = rfq.quotations || [];

    // Calculate details for comparison
    if (quotations.length > 0) {
      const prices = quotations.map(q => parseFloat(q.price));
      const deliveryTimes = quotations.map(q => q.deliveryDays);

      const lowestPrice = Math.min(...prices);
      const fastestDelivery = Math.min(...deliveryTimes);

      // Enhance the response
      const comparedBids = quotations.map(q => {
        const quoteObj = q.toJSON();
        quoteObj.isLowestPrice = parseFloat(q.price) === lowestPrice;
        quoteObj.isFastestDelivery = q.deliveryDays === fastestDelivery;
        return quoteObj;
      });

      return res.json({
        rfq,
        bids: comparedBids,
        lowestPrice,
        fastestDelivery
      });
    }

    res.json({
      rfq,
      bids: [],
      lowestPrice: 0,
      fastestDelivery: 0
    });
  } catch (error) {
    console.error('Compare Bids Error:', error);
    res.status(500).json({ message: 'Failed to compare bids' });
  }
};

exports.closeRFQ = async (req, res) => {
  try {
    const { id } = req.params;
    const rfq = await RFQ.findByPk(id);

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    rfq.status = 'closed';
    await rfq.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: 'RFQ_CLOSED',
      details: `RFQ #${rfq.id} was closed by ${req.user.name}`
    });

    res.json(rfq);
  } catch (error) {
    res.status(500).json({ message: 'Failed to close RFQ' });
  }
};
