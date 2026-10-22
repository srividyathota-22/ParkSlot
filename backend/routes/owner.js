const router = require('express').Router();
const OwnerProfile = require('../models/OwnerProfile');
const Listing = require('../models/Listing');
const { protect, allow } = require('../middleware/auth');
const { requireVerifiedOwner } = require('../middleware/verifyOwner');

router.get('/profile', protect, allow('owner'), async (req, res) => {
  const profile = await OwnerProfile.findOne({ userId: req.user.id });
  if (!profile) return res.status(404).json({ message: 'Owner profile not found' });
  res.json(profile);
});
router.post('/verify', protect, allow('owner'), async (req, res) => {
  try {
    const { idDocUrl, ownershipDocUrl } = req.body;
    if (!idDocUrl || !ownershipDocUrl)
      return res.status(400).json({ message: 'idDocUrl and ownershipDocUrl required' });

    const profile = await OwnerProfile.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ message: 'Owner profile not found' });
    if (profile.verificationStatus === 'verified')
      return res.status(400).json({ message: 'Already verified' });

    profile.idDocUrl = idDocUrl;
    profile.ownershipDocUrl = ownershipDocUrl;
    profile.verificationStatus = 'pending';
    profile.rejectionReason = undefined;
    await profile.save();

    res.json({ message: 'Verification submitted, awaiting admin review', profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/listings', protect, allow('owner'), requireVerifiedOwner, async (req, res) => {
  try {
    const {
      title, description,
      location, photos, vehicleTypes,
      slots, availabilityRules,
      approvalMode, prices, minDurationMinutes, advanceNoticeMinutes,
    } = req.body;

    if (!title || !location || !location.coordinates || !prices?.hourly)
      return res.status(400).json({ message: 'title, location.coordinates and prices.hourly are required' });

    if (!Array.isArray(slots) || slots.length === 0)
      return res.status(400).json({ message: 'at least one slot is required' });

    const listing = await Listing.create({
      ownerId: req.user.id,
      title, description,
      location,
      photos: photos || [],
      vehicleTypes: vehicleTypes || [],
      slots,
      availabilityRules: availabilityRules || [],
      approvalMode: approvalMode || 'manual',
      prices,
      minDurationMinutes: minDurationMinutes ?? 60,
      advanceNoticeMinutes: advanceNoticeMinutes ?? 0,
      status: 'pending_review', 
    });

    res.status(201).json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/listings', protect, allow('owner'), async (req, res) => {
  const listings = await Listing.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
  res.json(listings);
});

router.put('/listings/:id', protect, allow('owner'), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.ownerId.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not your listing' });

    const editable = [
      'title', 'description', 'location', 'photos', 'vehicleTypes',
      'slots', 'availabilityRules', 'approvalMode', 'prices',
      'minDurationMinutes', 'advanceNoticeMinutes',
    ];
    for (const key of editable) {
      if (req.body[key] !== undefined) listing[key] = req.body[key];
    }
    if (listing.status === 'active') listing.status = 'pending_review';

    await listing.save();
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/listings/:id/blocks', protect, allow('owner'), async (req, res) => {
  try {
    const { start, end, reason } = req.body;
    if (!start || !end) return res.status(400).json({ message: 'start and end required' });

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.ownerId.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not your listing' });

    listing.blocks.push({ start: new Date(start), end: new Date(end), reason });
    await listing.save();
    res.json({ message: 'Block added', blocks: listing.blocks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/listings/:id/pause', protect, allow('owner'), async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  if (listing.ownerId.toString() !== req.user.id)
    return res.status(403).json({ message: 'Not your listing' });
  if (listing.status !== 'active')
    return res.status(400).json({ message: 'Only active listings can be paused' });

  listing.status = 'paused';
  await listing.save();
  res.json({ message: 'Paused', listing });
});

router.patch('/listings/:id/reactivate', protect, allow('owner'), async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  if (listing.ownerId.toString() !== req.user.id)
    return res.status(403).json({ message: 'Not your listing' });
  if (listing.status !== 'paused')
    return res.status(400).json({ message: 'Only paused listings can be reactivated' });

  listing.status = 'active';
  await listing.save();
  res.json({ message: 'Reactivated', listing });
});
router.delete('/listings/:id/blocks/:blockId', protect, allow('owner'), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.ownerId.toString() !== req.user.id) return res.status(403).json({ message: 'Not your listing' });
    listing.blocks.pull({ _id: req.params.blockId });
    await listing.save();
    res.json({ blocks: listing.blocks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;