const router = require('express').Router();
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const Vehicle = require('../models/Vehicle');
const { protect } = require('../middleware/auth');
const { createBooking, setStatusWithLockRelease } = require('../services/booking');
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'driver')
      return res.status(403).json({ message: 'Only drivers can create bookings' });

    const { listingId, slotId, vehicleId, start, end } = req.body;
    if (!listingId || !slotId || !start || !end)
      return res.status(400).json({ message: 'listingId, slotId, start, end are required' });
    if (vehicleId) {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) return res.status(400).json({ message: 'Vehicle not found' });
      if (vehicle.userId.toString() !== req.user.id)
        return res.status(403).json({ message: 'Not your vehicle' });

      const listing = await Listing.findById(listingId);
      if (!listing) return res.status(404).json({ message: 'Listing not found' });
      const slot = listing.slots.find((s) => s._id.toString() === slotId);
      if (!slot) return res.status(404).json({ message: 'Slot not found' });

      const fits =
        slot.vehicleType === 'both' ||
        slot.vehicleType === vehicle.type ||
        listing.vehicleTypes.includes(vehicle.type);
      if (!fits) return res.status(400).json({ message: 'Vehicle type incompatible with slot' });
    }

    const booking = await createBooking({
      userId: req.user.id,
      listingId,
      slotId,
      vehicleId,
      start,
      end,
    });

    res.status(201).json(booking);
  } catch (err) {
    if (err.code === 409) return res.status(409).json({ message: err.message });
    if (err.code === 404) return res.status(404).json({ message: err.message });
    res.status(400).json({ message: err.message });
  }
});
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'driver') filter = { userId: req.user.id };
    else if (req.user.role === 'owner') {
      const owned = await Listing.find({ ownerId: req.user.id }).select('_id').lean();
      filter = { listingId: { $in: owned.map((l) => l._id) } };
    } else if (req.user.role === 'admin') filter = {};

    const bookings = await Booking.find(filter)
      .populate('listingId', 'title location photos')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/approve', protect, async (req, res) => {
  try {
    const booking = await setStatusWithLockRelease({
      bookingId: req.params.id,
      action: 'approve',
      actorId: req.user.id,
      actorRole: req.user.role,
    });
    res.json(booking);
  } catch (err) {
    const code = err.code || 500;
    res.status(code).json({ message: err.message });
  }
});
router.patch('/:id/reject', protect, async (req, res) => {
  try {
    const booking = await setStatusWithLockRelease({
      bookingId: req.params.id,
      action: 'reject',
      actorId: req.user.id,
      actorRole: req.user.role,
    });
    res.json(booking);
  } catch (err) {
    const code = err.code || 500;
    res.status(code).json({ message: err.message });
  }
});

router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await setStatusWithLockRelease({
      bookingId: req.params.id,
      action: 'cancel',
      actorId: req.user.id,
      actorRole: req.user.role,
      reason: req.body.reason,
    });
    res.json(booking);
  } catch (err) {
    const code = err.code || 500;
    res.status(code).json({ message: err.message });
  }
});

module.exports = router;