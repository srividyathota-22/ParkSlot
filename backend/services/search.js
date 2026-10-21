const SlotLock = require('../models/SlotLock');
const { istClockToUtc, istDayOfWeek, startOfIstDay } = require('./time');

async function getLockedSlotIds(slotIds, start, end) {
  if (!slotIds.length) return new Set();
  const startHour = new Date(start);
  startHour.setUTCMinutes(0, 0, 0);
  const endHour = new Date(end);
  endHour.setUTCMinutes(0, 0, 0);

  const locks = await SlotLock.find({
    slotId: { $in: slotIds },
    hourStart: { $gte: startHour, $lt: endHour },
  }).select('slotId').lean();

  return new Set(locks.map((l) => l.slotId.toString()));
}
const Listing = require('../models/Listing');
const { computePrice } = require('./pricing');
async function searchListings({ lat, lng, radiusKm, vehicleType, start, end, sort }) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (!(startDate < endDate)) {
    throw new Error('start must be before end');
  }

  const maxDistanceMeters = radiusKm * 1000;
  const pipeline = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance: maxDistanceMeters,
        spherical: true,
        query: { status: 'active' },
      },
    },
    {
      $addFields: {
        distanceKm: { $divide: ['$distanceMeters', 1000] },
      },
    },
    { $limit: 100 },
  ];
  const candidates = await Listing.aggregate(pipeline);
  const results = [];

  for (const raw of candidates) {

    const listing = raw;
    if (vehicleType) {
      const advertised = listing.vehicleTypes || [];
      if (!advertised.includes(vehicleType)) continue;

      const compatibleSlots = (listing.slots || []).filter(
        (s) =>
          s.isActive &&
          (s.vehicleType === vehicleType || s.vehicleType === 'both')
      );
      if (compatibleSlots.length === 0) continue;

      listing._compatibleSlots = compatibleSlots;
    } else {
      listing._compatibleSlots = (listing.slots || []).filter((s) => s.isActive);
    }

    if (!isWithinAvailability(listing.availabilityRules || [], startDate, endDate)) {
      continue;
    }
    if (overlapsBlock(listing.blocks || [], startDate, endDate)) {
      continue;
    }
    const slotIds = listing._compatibleSlots.map((s) => s._id);
    const lockedSlotIds = await getLockedSlotIds(slotIds, startDate, endDate);
    listing._compatibleSlots = listing._compatibleSlots.filter(
      (s) => !lockedSlotIds.has(s._id.toString())
    );
    if (listing._compatibleSlots.length === 0) continue;
    const { priceTotal, pricingUnit } = computePrice(listing.prices, startDate, endDate);

    results.push({
      _id: listing._id,
      title: listing.title,
      description: listing.description,
      location: listing.location,
      photos: listing.photos,
      vehicleTypes: listing.vehicleTypes,
      prices: listing.prices,
      approvalMode: listing.approvalMode,
      distanceKm: Number(listing.distanceKm.toFixed(2)),
      priceForRequestedDuration: priceTotal,
      pricingUnit,
      availableSlots: listing._compatibleSlots.map((s) => ({
        _id: s._id,
        label: s.label,
        vehicleType: s.vehicleType,
        size: s.size,
      })),
    });
  }
  if (sort === 'price') {
    results.sort((a, b) => a.priceForRequestedDuration - b.priceForRequestedDuration);
  } else {

    results.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return results;
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

module.exports = { searchListings };