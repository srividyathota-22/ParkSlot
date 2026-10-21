const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const SlotLock = require('../models/SlotLock');
const { notify } = require('../services/notify');

const EXPIRY_MS = Number(process.env.PENDING_EXPIRY_MINUTES || 120) * 60000;

async function runJobs() {
  const now = new Date();
  try {
    // 1. Requests the owner ignored: reject them and free the slot
    const stale = await Booking.find({ status: 'pending', createdAt: { $lte: new Date(now - EXPIRY_MS) } });
    for (const b of stale) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await Booking.updateOne({ _id: b._id, status: 'pending' }, { status: 'rejected', decidedAt: now, cancelReason: 'Owner did not respond in time' }, { session });
          await SlotLock.deleteMany({ bookingId: b._id }, { session });
        });
        const l = await Listing.findById(b.listingId).select('title');
        await notify(b.userId, 'booking_expired', `Your request at ${l?.title || 'the listing'} expired because the owner did not respond.`, { bookingId: b._id });
      } finally { await session.endSession(); }
    }
    // 2. Confirmed bookings: start time reached = active, end time reached = completed
    await Booking.updateMany({ status: 'confirmed', start: { $lte: now }, end: { $gt: now } }, { status: 'active' });
    await Booking.updateMany({ status: { $in: ['confirmed', 'active'] }, end: { $lte: now } }, { status: 'completed' });
  } catch (err) { console.error('job failed:', err.message); }
}

function start() {
  runJobs();
  setInterval(runJobs, 60000);
}

module.exports = { start, runJobs };