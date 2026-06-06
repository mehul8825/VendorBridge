const { VendorProfile, User, ActivityLog, Notification } = require('../models');
const { Op } = require('sequelize');

exports.onboardProfile = async (req, res) => {
  try {
    const { companyName, category, gstNumber, phone, contactPerson } = req.body;

    if (!companyName || !category || !gstNumber || !phone || !contactPerson) {
      return res.status(400).json({ message: 'All profile details are required' });
    }

    let profile = await VendorProfile.findOne({ where: { userId: req.user.id } });

    if (profile) {
      profile.companyName = companyName;
      profile.category = category;
      profile.gstNumber = gstNumber;
      profile.phone = phone;
      profile.contactPerson = contactPerson;
      // When updated, if it was rejected or pending, reset to pending for review
      profile.status = 'pending';
      await profile.save();
    } else {
      profile = await VendorProfile.create({
        userId: req.user.id,
        companyName,
        category,
        gstNumber,
        phone,
        contactPerson,
        status: 'pending'
      });
    }

    await ActivityLog.create({
      userId: req.user.id,
      action: 'VENDOR_ONBOARDING_SUBMITTED',
      details: `Vendor ${companyName} submitted details for approval.`
    });

    // Notify administrators
    const admins = await User.findAll({ where: { role: 'admin' } });
    for (const admin of admins) {
      await Notification.create({
        userId: admin.id,
        message: `Vendor '${companyName}' has submitted their profile for onboarding approval.`,
        type: 'info'
      });
    }

    res.json(profile);
  } catch (error) {
    console.error('Onboarding Error:', error);
    res.status(500).json({ message: 'Failed to submit onboarding profile' });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const profile = await VendorProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch vendor profile' });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const { search, category, status } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { companyName: { [Op.like]: `%${search}%` } },
        { contactPerson: { [Op.like]: `%${search}%` } },
        { gstNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const vendors = await VendorProfile.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['email', 'status'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(vendors);
  } catch (error) {
    console.error('Fetch Vendors Error:', error);
    res.status(500).json({ message: 'Failed to fetch vendors' });
  }
};

exports.approveOrRejectVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const profile = await VendorProfile.findByPk(id);
    if (!profile) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    profile.status = status;
    await profile.save();

    // Log the approval action
    await ActivityLog.create({
      userId: req.user.id,
      action: status === 'approved' ? 'VENDOR_APPROVED' : 'VENDOR_REJECTED',
      details: `Vendor profile for '${profile.companyName}' has been ${status} by ${req.user.name}.`
    });

    // Notify the vendor
    await Notification.create({
      userId: profile.userId,
      message: `Your Vendor Onboarding Profile has been ${status}.`,
      type: status === 'approved' ? 'success' : 'warning'
    });

    res.json(profile);
  } catch (error) {
    console.error('Onboarding Approval Error:', error);
    res.status(500).json({ message: 'Failed to review vendor profile' });
  }
};

exports.updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (rating === undefined || rating < 0 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 0 and 5' });
    }

    const profile = await VendorProfile.findByPk(id);
    if (!profile) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    profile.rating = rating;
    await profile.save();

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update vendor rating' });
  }
};
