// Booking engine test. Run with the server running:  node test/bookings.js
// The driver picks the slot (slotId). Test bookings are deleted at the end.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const SlotLock = require('../models/SlotLock');

const API = process.env.API || 'http://localhost:5000/api';
const IST_MS = 5.5 * 60 * 60 * 1000;
let passed = 0;
let failed = 0;

async function call(method, path, { body, token } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? '  ->  ' + detail : ''}`); }
}

function nextTuesdayIst() {
  const now = new Date(Date.now() + IST_MS);
  const add = ((2 - now.getUTCDay() + 7) % 7) || 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + add));
}
const ist = (day, h, m = 0) => new Date(day.getTime() + (h * 60 + m) * 60000 - IST_MS).toISOString();
const bookingOf = (r) => r.data.booking || r.data;
const statusOf = (r) => bookingOf(r).status;
const login = async (email) => (await call('POST', '/auth/login', { body: { email, password: 'password123' } })).data.accessToken;

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const day = nextTuesdayIst();

  const driver = await User.findOne({ email: 'driver@parking.com' });
  const car = driver && (await Vehicle.findOne({ userId: driver._id, type: '4-wheeler' }));
  const bike = driver && (await Vehicle.findOne({ userId: driver._id, type: '2-wheeler' }));
  const indira = await Listing.findOne({ title: /Indiranagar/ });
  const mg = await Listing.findOne({ title: /MG Road/ });
  const kor = await Listing.findOne({ title: /Koramangala/ });
  if (!driver || !car || !bike || !indira || !mg || !kor) {
    console.log('Seed data is missing. Run: node seed/seed.js');
    process.exit(1);
  }
  const A1 = indira.slots[0]._id; // Indiranagar car slot 1
  const A2 = indira.slots[1]._id; // Indiranagar car slot 2
  const C2 = mg.slots[1]._id;     // MG Road car-only slot
  const B1 = kor.slots[0]._id;    // Koramangala bike slots
  const B2 = kor.slots[1]._id;

  async function cleanup() {
    const from = new Date(ist(day, 0));
    const to = new Date(from.getTime() + 24 * 3600 * 1000);
    const old = await Booking.find({ listingId: { $in: [indira._id, mg._id, kor._id] }, start: { $gte: from, $lt: to } });
    const ids = old.map((b) => b._id);
    await SlotLock.deleteMany({ bookingId: { $in: ids } });
    await Booking.deleteMany({ _id: { $in: ids } });
  }
  await cleanup();

  const driverTok = await login('driver@parking.com');
  const ownerTok = await login('owner@parking.com');
  const otherOwnerTok = await login('pendingowner@parking.com');

  const book = (listing, slotId, vehicle, h1, h2, token = driverTok) =>
    call('POST', '/bookings', {
      token,
      body: { listingId: String(listing._id), slotId: String(slotId), vehicleId: String(vehicle._id), start: ist(day, h1), end: ist(day, h2) },
    });
  const locksOf = (id) => SlotLock.find({ bookingId: id }).sort({ hourStart: 1 });
  const has = (id) => !!id; // stops later steps from calling /bookings/undefined

  // ---------- 1. Basic booking ----------
  console.log('BASIC BOOKING (Indiranagar slot A1, auto-approve, 10:00-12:00 India time)');
  const a = await book(indira, A1, car, 10, 12);
  const A = bookingOf(a);
  check('booking is created (201)', a.status === 201, `status ${a.status} ${JSON.stringify(a.data).slice(0, 150)}`);
  check('auto-approve listing confirms it at once', statusOf(a) === 'confirmed', `status ${statusOf(a)}`);
  check('2 hours at 40 per hour costs 80', A.priceTotal === 80, `got ${A.priceTotal}`);
  const aLocks = has(A._id) ? await locksOf(A._id) : [];
  check('exactly 2 hour-locks are stored', aLocks.length === 2, `got ${aLocks.length}`);
  check('locks sit on India-time hours (04:30Z and 05:30Z)',
    aLocks.map((l) => l.hourStart.toISOString()).join() === [ist(day, 10), ist(day, 11)].join(),
    aLocks.map((l) => l.hourStart.toISOString()).join());

  // ---------- 2. Double booking ----------
  console.log('\nDOUBLE BOOKING');
  const same = await book(indira, A1, car, 10, 12);
  check('same slot, same time is refused (409)', same.status === 409, `status ${same.status} ${JSON.stringify(same.data).slice(0, 100)}`);
  const overlap = await book(indira, A1, car, 11, 13);
  check('same slot, overlapping 11:00-13:00 is refused (409)', overlap.status === 409, `status ${overlap.status}`);
  const early = await book(indira, A1, car, 9, 11);
  check('same slot, overlapping 09:00-11:00 is refused (409)', early.status === 409, `status ${early.status}`);
  const next = await book(indira, A1, car, 12, 13);
  check('back-to-back 12:00-13:00 is allowed (201)', next.status === 201, `status ${next.status} (fails if locks are rounded to UTC hours)`);
  const other = await book(indira, A2, car, 10, 12);
  check('a different slot at the same time is allowed (201)', other.status === 201, `status ${other.status}`);

  // ---------- 3. Cancel frees the slot ----------
  console.log('\nCANCEL');
  if (has(A._id)) {
    const cancel = await call('PATCH', `/bookings/${A._id}/cancel`, { token: driverTok });
    check('driver can cancel (200)', cancel.status === 200, `status ${cancel.status}`);
    check('status becomes cancelled', (await Booking.findById(A._id))?.status === 'cancelled');
    check('its locks are deleted', (await locksOf(A._id)).length === 0);
    const again = await book(indira, A1, car, 10, 12);
    check('the freed slot can be booked again (201)', again.status === 201, `status ${again.status}`);
  } else {
    check('cancel tests skipped, the first booking was not created', false);
  }

  // ---------- 4. Races ----------
  console.log('\nRACE 1 (6 drivers click at the same instant on the same slot)');
  const race = await Promise.all(Array.from({ length: 6 }, () => book(mg, C2, car, 14, 15)));
  const won = race.filter((r) => r.status === 201);
  check('exactly 1 booking succeeds', won.length === 1, `got ${won.length}, statuses ${race.map((r) => r.status).join(',')}`);
  check('the other 5 get a conflict (409)', race.filter((r) => r.status === 409).length === 5, `statuses ${race.map((r) => r.status).join(',')}`);
  check('database holds exactly 1 lock for that hour',
    (await SlotLock.countDocuments({ slotId: C2, hourStart: new Date(ist(day, 14)) })) === 1);

  console.log('\nRACE 2 (overlapping ranges 14:00-16:00 and 15:00-17:00 at the same instant)');
  const race2 = await Promise.all([
    ...Array.from({ length: 3 }, () => book(mg, C2, car, 16, 18)),
    ...Array.from({ length: 3 }, () => book(mg, C2, car, 17, 19)),
  ]);
  check('only 1 of the 6 overlapping requests succeeds', race2.filter((r) => r.status === 201).length === 1, `statuses ${race2.map((r) => r.status).join(',')}`);
  const hours17 = await SlotLock.countDocuments({ slotId: C2, hourStart: new Date(ist(day, 17)) });
  check('hour 17:00 is locked only once', hours17 === 1, `got ${hours17}`);

  // ---------- 5. Manual approval ----------
  console.log('\nMANUAL APPROVAL (Koramangala bike listing)');
  const p1 = await book(kor, B1, bike, 10, 11);
  const p2 = await book(kor, B2, bike, 10, 11);
  check('requests are created as pending (201)', [p1, p2].every((r) => r.status === 201 && statusOf(r) === 'pending'),
    `${p1.status}/${statusOf(p1)} ${p2.status}/${statusOf(p2)}`);
  const hold = await book(kor, B1, bike, 10, 11);
  check('a pending request still holds the slot, so another is refused (409)', hold.status === 409, `status ${hold.status}`);
  const P1 = bookingOf(p1);
  const P2 = bookingOf(p2);
  if (has(P1._id) && has(P2._id)) {
    const byDriver = await call('PATCH', `/bookings/${P1._id}/approve`, { token: driverTok });
    check('a driver cannot approve (403)', byDriver.status === 403, `status ${byDriver.status}`);
    const byOther = await call('PATCH', `/bookings/${P1._id}/approve`, { token: otherOwnerTok });
    check("another owner cannot approve someone else's listing", [403, 404].includes(byOther.status), `status ${byOther.status}`);
    const approve = await call('PATCH', `/bookings/${P1._id}/approve`, { token: ownerTok });
    check('the listing owner approves (200)', approve.status === 200, `status ${approve.status}`);
    check('status becomes confirmed', (await Booking.findById(P1._id))?.status === 'confirmed');
    const reject = await call('PATCH', `/bookings/${P2._id}/reject`, { token: ownerTok });
    check('the owner rejects the other (200)', reject.status === 200, `status ${reject.status}`);
    check('rejected booking releases its locks', (await locksOf(P2._id)).length === 0);
    const rebook = await book(kor, B2, bike, 10, 11);
    check('the released slot can be booked again (201)', rebook.status === 201, `status ${rebook.status}`);
  } else {
    check('approve and reject tests skipped, pending bookings were not created', false);
  }

  // ---------- 6. Validation ----------
  console.log('\nVALIDATION');
  check('outside opening hours (02:00-03:00) is refused (400)', (await book(indira, A1, car, 2, 3)).status === 400);
  check('end before start is refused (400)', (await book(indira, A1, car, 12, 10)).status === 400);
  const wrongVehicle = await book(indira, A2, bike, 15, 16);
  check('a bike on a car-only slot is refused (400)', wrongVehicle.status === 400, `status ${wrongVehicle.status} (fails if vehicle type is not checked)`);
  const noTok = await call('POST', '/bookings', { body: {} });
  check('no token is refused (401)', noTok.status === 401, `status ${noTok.status}`);
  check('an owner account cannot book (403)', (await book(indira, A2, car, 16, 17, ownerTok)).status === 403);

  // ---------- 7. History ----------
  console.log('\nHISTORY');
  const mine = await call('GET', '/bookings', { token: driverTok });
  const myList = mine.data.bookings || mine.data;
  check('driver sees their bookings', mine.status === 200 && Array.isArray(myList) && myList.length >= 5, `status ${mine.status}, got ${Array.isArray(myList) ? myList.length : 'no list'}`);
  const theirs = await call('GET', '/bookings', { token: ownerTok });
  const ownerList = theirs.data.bookings || theirs.data;
  check('owner sees bookings made on their listings', theirs.status === 200 && Array.isArray(ownerList) && ownerList.length > 0, `status ${theirs.status}`);

  await cleanup();
  console.log(`\n${passed} passed, ${failed} failed (test bookings deleted)`);
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
})().catch(async (err) => {
  console.error('\nCould not run the tests:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});