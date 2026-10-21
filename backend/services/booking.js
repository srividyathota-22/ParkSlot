const { istClockToUtc, istDayOfWeek, startOfIstDay } = require('./time');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const SlotLock = require('../models/SlotLock');
const { computePrice } = require('./pricing');
const Vehicle = require('../models/Vehicle');
const { notify } = require('./notify');

const HOUR_MS = 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * HOUR_MS;

function hourBuckets(start, end) {
  const first = Math.floor((start.getTime() + IST_OFFSET_MS) / HOUR_MS) * HOUR_MS - IST_OFFSET_MS;
  const buckets = [];
  for (let t = first; t < end.getTime(); t += HOUR_MS) buckets.push(new Date(t));
  return buckets;
}

async function createBooking({ userId, listingId, slotId, vehicleId, start, end }) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (!(startDate < endDate)) throw new Error('start must be before end');

  const listing = await Listing.findById(listingId);
  if (!listing) throw new Error('Listing not found');
  if (listing.status !== 'active') throw new Error('Listing is not active');
  const slot = listing.slots.find((s) => s._id.toString() === slotId.toString());
  if (!slot) throw new Error('Slot not found on listing');
  if (!slot.isActive) throw new Error('Slot is not active');
  const slotFits =
    slot.vehicleType === 'both' ||
    slot.vehicleType === listing.vehicleTypes[0] || 
    listing.vehicleTypes.some((vt) => vt === slot.vehicleType);
  if (vehicleId) {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
    if (!vehicle) throw new Error('Vehicle not found');
    if (slot.vehicleType !== 'both' && slot.vehicleType !== vehicle.type) {
      throw new Error('This slot does not fit your vehicle type');
    }
  }
  if (!isWithinAvailability(listing.availabilityRules || [], startDate, endDate))
    throw new Error('Requested window is outside availability');
  if (overlapsBlock(listing.blocks || [], startDate, endDate))
    throw new Error('Requested window is blocked');

  const { priceTotal, pricingUnit } = computePrice(listing.prices, startDate, endDate);
  const initialStatus = listing.approvalMode === 'auto' ? 'confirmed' : 'pending';
  const decidedAt = listing.approvalMode === 'auto' ? new Date() : undefined;
  const session = await mongoose.startSession();
  let createdBooking = null;

  try {
    await session.withTransaction(async () => {
      const [booking] = await Booking.create(
        [
          {
            userId,
            listingId,
            slotId,
            vehicleId,
            start: startDate,
            end: endDate,
            status: initialStatus,
            priceTotal,
            pricingUnit,
            paymentStatus: 'unpaid',
            decidedAt,
          },
        ],
        { session }
      );
      const hours = hourBuckets(startDate, endDate);
      const lockDocs = hours.map((h) => ({
        slotId,
        hourStart: h,
        bookingId: booking._id,
      }));

      try {
        await SlotLock.insertMany(lockDocs, { session, ordered: true });
      } catch (err) {
        if (err.code === 11000 || err.writeErrors?.some((e) => e.code === 11000)) {
          const conflict = new Error('Slot just taken');
          conflict.code = 409;
          throw conflict;
        }
        throw err;
      }

      createdBooking = booking;
    });
  } finally {
    await session.endSession();
  }
  const auto = createdBooking.status === 'confirmed';
  await notify(userId, auto ? 'booking_confirmed' : 'booking_requested',
    auto ? `Your booking at ${listing.title} is confirmed.` : `Your request for ${listing.title} was sent to the owner.`,
    { bookingId: createdBooking._id });
  await notify(listing.ownerId, 'booking_new',
    auto ? `New confirmed booking at ${listing.title}.` : `New booking request at ${listing.title}. Please approve or reject.`,
    { bookingId: createdBooking._id });

  return createdBooking;
}

async function setStatusWithLockRelease({ bookingId, action, actorId, actorRole, reason }) {
  const session = await mongoose.startSession();
  let updated = null;

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) {
        const e = new Error('Booking not found');
        e.code = 404;
        throw e;
      }
      if ((action === 'approve' || action === 'reject') && actorRole === 'driver') {
        const e = new Error('Only the owner can approve or reject bookings');
        e.code = 403;
        throw e;
      }
      if (actorRole === 'driver' && booking.userId.toString() !== actorId.toString()) {
        const e = new Error('Not your booking');
        e.code = 403;
        throw e;
      }
      if (actorRole === 'owner') {
        const listing = await Listing.findById(booking.listingId).session(session);
        if (!listing || listing.ownerId.toString() !== actorId.toString()) {
          const e = new Error('Not your listing');
          e.code = 403;
          throw e;
        }
      }

      const transitions = {
        approve: { from: ['pending'], to: 'confirmed', setDecided: true },
        reject: { from: ['pending'], to: 'rejected', setDecided: true, releaseLocks: true },
        cancel: { from: ['pending', 'confirmed'], to: 'cancelled', releaseLocks: true },
      };

      const rule = transitions[action];
      if (!rule) {
        const e = new Error('Unknown action');
        e.code = 400;
        throw e;
      }
      if (!rule.from.includes(booking.status)) {
        const e = new Error(`Cannot ${action} a booking in status ${booking.status}`);
        e.code = 400;
        throw e;
      }

      booking.status = rule.to;
      if (rule.setDecided) booking.decidedAt = new Date();
      if (action === 'cancel') {
        booking.cancelledAt = new Date();
        booking.cancelReason = reason || 'Cancelled';
      }
      await booking.save({ session });

      if (rule.releaseLocks) {
        await SlotLock.deleteMany({ bookingId: booking._id }).session(session);
      }

      updated = booking;
    });
  } finally {
    await session.endSession();
  }
  const l = await Listing.findById(updated.listingId).select('ownerId title');
  if (l) {
    const text = { approve: 'was approved', reject: 'was rejected', cancel: 'was cancelled' }[action];
    if (actorRole === 'driver') await notify(l.ownerId, 'booking_cancel', `A booking at ${l.title} was cancelled by the driver.`, { bookingId: updated._id });
    else await notify(updated.userId, `booking_${action}`, `Your booking at ${l.title} ${text}.`, { bookingId: updated._id });
  }

  return updated;
}

function isWithinAvailability(rules, start, end) {
  if (!rules.length) return false;

  const startDay = startOfIstDay(start);
  const endDay = startOfIstDay(end);

  for (let d = new Date(startDay); d <= endDay; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = istDayOfWeek(d);
    const nextIstDayStart = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    const windowStart = start > d ? start : d;
    const windowEnd = end < nextIstDayStart ? end : nextIstDayStart;
    if (windowStart >= windowEnd) continue;

    const dayRules = rules.filter((r) => r.dayOfWeek === dow);
    const covered = dayRules.some((r) => {
      const rStart = istClockToUtc(d, r.startTime);
      const rEnd = istClockToUtc(d, r.endTime);
      return windowStart >= rStart && windowEnd <= rEnd;
    });
    if (!covered) return false;
  }

  return true;
}

function overlapsBlock(blocks, start, end) {
  return blocks.some((b) => {
    const bs = new Date(b.start);
    const be = new Date(b.end);
    return start < be && end > bs;
  });
}

module.exports = { createBooking, setStatusWithLockRelease, hourBuckets };