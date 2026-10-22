const router = require('express').Router();
const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { protect, allow } = require('../middleware/auth');
const { notify } = require('../services/notify');

router.use(protect);
router.post('/', async (req, res) => {
  try {
    if (req.user.role === 'admin') return res.status(403).json({ message: 'Admins resolve disputes, they do not raise them' });
    const { bookingId, reason } = req.body || {};
    if (!bookingId || !reason || !reason.trim()) return res.status(400).json({ message: 'bookingId and reason are required' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const listing = await Listing.findById(booking.listingId).select('ownerId title');
    const isDriver = String(booking.userId) === String(req.user.id);
    const isOwner = listing && String(listing.ownerId) === String(req.user.id);
    if (!isDriver && !isOwner) return res.status(403).json({ message: 'Not your booking' });

    if (await Dispute.findOne({ bookingId, raisedBy: req.user.id, status: 'open' }))
      return res.status(400).json({ message: 'You already have an open dispute for this booking' });

    const dispute = await Dispute.create({ bookingId, raisedBy: req.user.id, reason: reason.trim() });
    await notify(isDriver ? listing.ownerId : booking.userId, 'dispute_raised', `A dispute was raised on a booking at ${listing.title}.`, { disputeId: dispute._id });
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Promise.all(admins.map((a) => notify(a._id, 'dispute_raised', `New dispute at ${listing.title}.`, { disputeId: dispute._id })));
    res.status(201).json(dispute);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const q = req.user.role === 'admin' ? {} : { raisedBy: req.user.id };
    const disputes = await Dispute.find(q).sort({ createdAt: -1 })
      .populate('raisedBy', 'name role')
      .populate({ path: 'bookingId', select: 'start end priceTotal status listingId', populate: { path: 'listingId', select: 'title' } });
    res.json({ disputes });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/:id/resolve', allow('admin'), async (req, res) => {
  try {
    const { resolution } = req.body || {};
    if (!resolution || !resolution.trim()) return res.status(400).json({ message: 'A resolution note is required' });
    const d = await Dispute.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Dispute not found' });
    if (d.status === 'resolved') return res.status(400).json({ message: 'Already resolved' });
    d.status = 'resolved';
    d.resolution = resolution.trim();
    d.resolvedBy = req.user.id;
    d.resolvedAt = new Date();
    await d.save();
    await notify(d.raisedBy, 'dispute_resolved', `Your dispute was resolved: ${d.resolution}`, { disputeId: d._id });
    res.json(d);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;