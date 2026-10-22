const router = require('express').Router();
const Listing = require('../models/Listing');
const { protect, allow } = require('../middleware/auth');

router.patch('/listings/:id/review', protect, allow('admin'), async (req, res) => {
  try {
    const { action, reason } = req.body; 
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ message: "action must be 'approve' or 'reject'" });

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.status !== 'pending_review')
      return res.status(400).json({ message: 'Only pending_review listings can be reviewed' });

    if (action === 'approve') {
      listing.status = 'active';
      listing.rejectionReason = undefined;
    } else {
      listing.status = 'rejected';
      listing.rejectionReason = reason || 'Rejected by admin';
    }
    await listing.save();
    res.json({ message: `Listing ${action}d`, listing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
const User = require('../models/User');
const OwnerProfile = require('../models/OwnerProfile');
const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');

router.get('/stats', protect, allow('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'driver' });
    const totalOwners = await User.countDocuments({ role: 'owner' });
    const totalBookings = await Booking.countDocuments();
    const activeListings = await Listing.countDocuments({ status: 'active' });
    

    const bookings = await Booking.find({ status: { $in: ['confirmed', 'completed'] } });
    const totalRevenue = bookings.reduce((sum, b) => sum + b.priceTotal, 0);

    res.json({ totalUsers, totalOwners, totalBookings, activeListings, totalRevenue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/owners', protect, allow('admin'), async (req, res) => {
  try {
    const profiles = await OwnerProfile.find()
      .populate('userId', 'name email phone status')
      .sort({ createdAt: -1 });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/owners/:id/verify', protect, allow('admin'), async (req, res) => {
  try {
    const { action, reason } = req.body; // 'approve' | 'reject'
    const profile = await OwnerProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    if (action === 'approve') {
      profile.verificationStatus = 'verified';
      profile.verifiedAt = new Date();
      profile.verifiedBy = req.user.id;
      profile.rejectionReason = undefined;
    } else {
      profile.verificationStatus = 'rejected';
      profile.rejectionReason = reason || 'Documents invalid';
    }
    await profile.save();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/listings', protect, allow('admin'), async (req, res) => {
  try {
    const listings = await Listing.find().populate('ownerId', 'name email').sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/disputes', protect, allow('admin'), async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate('raisedBy', 'name email role')
      .populate('bookingId')
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/verifications', protect, allow('admin'), async (req, res) => {
  try {
    const owners = await OwnerProfile.find({ verificationStatus: 'pending' }).populate('userId', 'name email phone').sort({ createdAt: 1 });
    const listings = await Listing.find({ status: 'pending_review' }).populate('ownerId', 'name email').sort({ createdAt: 1 });
    res.json({ owners, listings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/bookings', protect, allow('admin'), async (req, res) => {
  try {
    const q = req.query.status ? { status: req.query.status } : {};
    const bookings = await Booking.find(q).sort({ start: -1 }).limit(500)
      .populate('userId', 'name email').populate('listingId', 'title location.area');
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/reports', protect, allow('admin'), async (req, res) => {
  try {
    const [drivers, owners, listings, bookings] = await Promise.all([
      User.countDocuments({ role: 'driver' }),
      User.countDocuments({ role: 'owner' }),
      Listing.find({}, 'title status slots'),
      Booking.find({}).populate('listingId', 'title'),
    ]);
    const earning = ['confirmed', 'active', 'completed'];
    const byStatus = {};
    const perListing = {};
    const perDay = {};
    let revenue = 0;
    let hours = 0;
    bookings.forEach((b) => {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      if (!earning.includes(b.status)) return;
      const h = (b.end - b.start) / 3600000;
      const title = b.listingId?.title || 'Removed listing';
      revenue += b.priceTotal;
      hours += h;
      perListing[title] = perListing[title] || { title, bookings: 0, revenue: 0, hours: 0 };
      perListing[title].bookings += 1;
      perListing[title].revenue += b.priceTotal;
      perListing[title].hours += h;
      const day = new Date(b.start.getTime() + 5.5 * 3600000).toISOString().slice(0, 10); // India date
      perDay[day] = (perDay[day] || 0) + b.priceTotal;
    });
    const active = listings.filter((l) => l.status === 'active');
    res.json({
      counts: { drivers, owners, activeListings: active.length, slots: active.reduce((s, l) => s + l.slots.length, 0) },
      totals: { bookings: bookings.length, revenue, bookedHours: Math.round(hours * 10) / 10 },
      byStatus,
      perListing: Object.values(perListing).sort((a, b) => b.revenue - a.revenue),
      byDay: Object.entries(perDay).sort().map(([day, amount]) => ({ day, amount })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;