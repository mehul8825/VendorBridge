const jwt = require('jsonwebtoken');
const { User, VendorProfile } = require('../models');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforvendorbridgeerp');

      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (!req.user) {
        return res.status(401).json({ message: 'User associated with this token no longer exists' });
      }

      if (req.user.status === 'inactive') {
        return res.status(403).json({ message: 'This user account is deactivated' });
      }

      // If user is a vendor, fetch vendor profile ID
      if (req.user.role === 'vendor') {
        const profile = await VendorProfile.findOne({ where: { userId: req.user.id } });
        if (profile) {
          req.vendorProfile = profile;
        }
      }

      next();
    } catch (error) {
      console.error('JWT Token Verification Error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Role '${req.user.role}' is not authorized to access this resource` });
    }
    next();
  };
};

module.exports = { protect, authorize };
