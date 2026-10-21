const OwnerProfile = require('../models/OwnerProfile');

const requireVerifiedOwner = async (req, res, next) => {
  if (req.user.role !== 'owner')
    return res.status(403).json({ message: 'Only owners can perform this action' });

  const profile = await OwnerProfile.findOne({ userId: req.user.id });
  if (!profile || profile.verificationStatus !== 'verified')
    return res.status(403).json({
      message: 'Owner verification required before publishing listings',
      verificationStatus: profile?.verificationStatus || 'missing',
    });

  req.ownerProfile = profile;
  next();
};

module.exports = { requireVerifiedOwner };