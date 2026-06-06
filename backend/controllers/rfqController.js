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
    const { id } = req.params;
    const rfq = await RFQ.findByPk(id, {
      include: [
        {
          model: Quotation,
          as: 'quotations',
          include: [{ model: VendorProfile, as: 'vendor' }]
        }
      ]
    });

    if (!rfq) return res.status(404).json({ message: 'RFQ not found' });

    if (req.user.role === 'vendor') {
      return res.status(403).json({ message: 'Vendors are not allowed to view the bid comparison board.' });
    }

    const quotations = rfq.quotations || [];

    if (quotations.length === 0) {
      return res.json({ rfq, bids: [], lowestPrice: 0, fastestDelivery: 0 });
    }

    // ── Raw metrics ──────────────────────────────────────────────────────
    const prices        = quotations.map(q => parseFloat(q.price));
    const deliveryTimes = quotations.map(q => parseInt(q.deliveryDays, 10));
    const ratings       = quotations.map(q => parseFloat(q.vendor?.rating || 3));
    const budget        = parseFloat(rfq.targetBudget);

    const lowestPrice     = Math.min(...prices);
    const highestPrice    = Math.max(...prices);
    const fastestDelivery = Math.min(...deliveryTimes);
    const slowestDelivery = Math.max(...deliveryTimes);
    const highestRating   = Math.max(...ratings);

    // ── Scoring weights (total = 100) ────────────────────────────────────
    // 1. Price Score       (35%) — lower price = higher score
    // 2. Delivery Score    (25%) — faster delivery = higher score
    // 3. Vendor Rating     (20%) — higher rating = higher score
    // 4. Response Quality  (12%) — detail/completeness of bid notes
    // 5. Budget Compliance (8%)  — whether bid is within target budget

    const scoreBid = (q) => {
      const price    = parseFloat(q.price);
      const delivery = parseInt(q.deliveryDays, 10);
      const rating   = parseFloat(q.vendor?.rating || 3);
      const notes    = (q.notes || '').trim();

      // 1. Price score (35) — normalized: lowest gets 35, highest gets 0
      const priceRange = highestPrice - lowestPrice || 1;
      const priceScore = ((highestPrice - price) / priceRange) * 35;

      // 2. Delivery score (25)
      const delivRange = slowestDelivery - fastestDelivery || 1;
      const delivScore = ((slowestDelivery - delivery) / delivRange) * 25;

      // 3. Vendor rating (20) — 5-star max
      const ratingScore = (rating / 5) * 20;

      // 4. Response quality (12)
      //    Criteria: notes length (>80 chars), mentions price/timeline/warranty/insurance keywords
      const keywords   = ['warranty', 'insurance', 'delivery', 'quality', 'certified', 'gst', 'tracking', 'stock', 'commercial', 'guarantee'];
      const wordHits   = keywords.filter(k => notes.toLowerCase().includes(k)).length;
      const lengthPts  = Math.min(notes.length / 80, 1) * 6;   // up to 6pts for length
      const keywordPts = Math.min(wordHits / 3, 1) * 6;        // up to 6pts for keywords
      const qualityScore = lengthPts + keywordPts;

      // 5. Budget compliance (8)
      const complianceScore = price <= budget ? 8 : Math.max(0, 8 - ((price - budget) / budget) * 8);

      const total = priceScore + delivScore + ratingScore + qualityScore + complianceScore;

      return {
        priceScore:      Math.round(priceScore * 10) / 10,
        deliveryScore:   Math.round(delivScore * 10) / 10,
        ratingScore:     Math.round(ratingScore * 10) / 10,
        qualityScore:    Math.round(qualityScore * 10) / 10,
        complianceScore: Math.round(complianceScore * 10) / 10,
        totalScore:      Math.round(total * 10) / 10,
        // Human-readable detail
        budgetCompliant: price <= budget,
        priceDiff:       price - budget,
        responseDetail: {
          wordCount:  notes.split(/\s+/).filter(Boolean).length,
          charCount:  notes.length,
          keywordsHit: keywords.filter(k => notes.toLowerCase().includes(k)),
        }
      };
    };

    const scored = quotations.map(q => {
      const quoteObj = q.toJSON();
      const scores   = scoreBid(q);
      return {
        ...quoteObj,
        isLowestPrice:    parseFloat(q.price) === lowestPrice,
        isFastestDelivery: parseInt(q.deliveryDays, 10) === fastestDelivery,
        scores
      };
    });

    // Sort by totalScore desc, attach rank
    scored.sort((a, b) => b.scores.totalScore - a.scores.totalScore);
    scored.forEach((b, i) => { b.rank = i + 1; });

    res.json({
      rfq,
      bids: scored,
      lowestPrice,
      fastestDelivery,
      weights: { price: 35, delivery: 25, rating: 20, quality: 12, compliance: 8 }
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
