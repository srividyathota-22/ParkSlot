require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const OwnerProfile = require('../models/OwnerProfile');
const Listing = require('../models/Listing');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const SlotLock = require('../models/SlotLock');
const Dispute = require('../models/Dispute');
const Notification = require('../models/Notification');

(async () => {
  try {
    console.log(' Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log(' Connected');

    console.log('\n Wiping existing collections...');
    await Promise.all([
      User.deleteMany({}),
      OwnerProfile.deleteMany({}),
      Listing.deleteMany({}),
      Vehicle.deleteMany({}),
      Booking.deleteMany({}),
      SlotLock.deleteMany({}),
      Dispute.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log(' Wiped');

    console.log('\n Ensuring indexes...');
    await Promise.all([
      User.syncIndexes(),
      OwnerProfile.syncIndexes(),
      Listing.syncIndexes(),
      Vehicle.syncIndexes(),
      Booking.syncIndexes(),
      SlotLock.syncIndexes(),
      Dispute.syncIndexes(),
      Notification.syncIndexes(),
    ]);
    console.log(' Indexes built');

    const listingIndexes = await Listing.collection.indexes();
    const slotLockIndexes = await SlotLock.collection.indexes();

    const has2dsphere = listingIndexes.some(
      (idx) => idx.key && idx.key.location === '2dsphere'
    );
    const hasUniqueLock = slotLockIndexes.some(
      (idx) => idx.unique && idx.key && idx.key.slotId === 1 && idx.key.hourStart === 1
    );

    if (!has2dsphere) throw new Error(' 2dsphere index on Listing.location missing!');
    if (!hasUniqueLock) throw new Error(' unique(slotId, hourStart) on SlotLock missing!');
    console.log(' Critical indexes verified');

    console.log('\n Creating users...');
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('password123', 10);

    const admin = await User.create({
      name: 'Platform Admin', email: 'admin@parking.com', phone: '9000000000',
      passwordHash: hash, role: 'admin', status: 'active',
    });

    const driver = await User.create({
      name: 'Ravi (Driver)', email: 'driver@parking.com', phone: '9111111111',
      passwordHash: hash, role: 'driver', status: 'active',
    });

    const ownerVerified = await User.create({
      name: 'Lakshmi (Verified Owner)', email: 'owner@parking.com', phone: '9222222222',
      passwordHash: hash, role: 'owner', status: 'active',
    });

    const ownerPending = await User.create({
      name: 'Pending Owner', email: 'pendingowner@parking.com', phone: '9333333333',
      passwordHash: hash, role: 'owner', status: 'active',
    });

    console.log(' Users created');
    console.log('   admin@parking.com / password123');
    console.log('   driver@parking.com / password123');
    console.log('   owner@parking.com / password123 (verified)');
    console.log('   pendingowner@parking.com / password123 (pending)');

    console.log('\n Creating owner profiles...');
    await OwnerProfile.create({
      userId: ownerVerified._id, verificationStatus: 'verified',
      idDocUrl: 'https://example.com/docs/owner-id.pdf',
      ownershipDocUrl: 'https://example.com/docs/owner-ownership.pdf',
      verifiedAt: new Date(), verifiedBy: admin._id,
    });
    await OwnerProfile.create({
      userId: ownerPending._id, verificationStatus: 'pending',
      idDocUrl: 'https://example.com/docs/pending-id.pdf',
      ownershipDocUrl: 'https://example.com/docs/pending-ownership.pdf',
    });
    console.log(' Owner profiles created');

    console.log('\nCreating vehicles...');
    await Vehicle.create([
      { userId: driver._id, type: '4-wheeler', registrationNumber: 'KA01AB1234', label: 'My Car' },
      { userId: driver._id, type: '2-wheeler', registrationNumber: 'KA01XY5678', label: 'My Bike' },
    ]);
    console.log(' Vehicles created');

    console.log('\n Creating listings...');

    const listing1 = await Listing.create({
      ownerId: ownerVerified._id,
      title: 'Covered Car Parking near Indiranagar Metro',
      description: 'Safe covered parking, 2 min walk to metro station.',
      location: {
        type: 'Point',
        coordinates: [77.6408, 12.9784],
        city: 'Bengaluru', area: 'Indiranagar',
        address: '100 Feet Road, Indiranagar',
        pincode: '560038', landmark: 'Near Indiranagar Metro',
      },
      photos: ['https://example.com/photos/parking1.jpg'],
      vehicleTypes: ['4-wheeler'],
      slots: [
        { label: 'A1', vehicleType: '4-wheeler', size: 'medium', isActive: true },
        { label: 'A2', vehicleType: '4-wheeler', size: 'medium', isActive: true },
      ],
      availabilityRules: [
        { dayOfWeek: 1, startTime: '06:00', endTime: '23:00' },
        { dayOfWeek: 2, startTime: '06:00', endTime: '23:00' },
        { dayOfWeek: 3, startTime: '06:00', endTime: '23:00' },
        { dayOfWeek: 4, startTime: '06:00', endTime: '23:00' },
        { dayOfWeek: 5, startTime: '06:00', endTime: '23:00' },
      ],
      approvalMode: 'auto',
      prices: { hourly: 40, daily: 300, monthly: 6000 },
      minDurationMinutes: 60, advanceNoticeMinutes: 0,
      status: 'active',
    });

    const listing2 = await Listing.create({
      ownerId: ownerVerified._id,
      title: 'Bike Parking near Koramangala Office Hub',
      description: 'Open bike parking, fits 5 bikes.',
      location: {
        type: 'Point',
        coordinates: [77.6245, 12.9352],
        city: 'Bengaluru', area: 'Koramangala',
        address: '5th Block, Koramangala',
        pincode: '560095', landmark: 'Near Forum Mall',
      },
      photos: ['https://example.com/photos/bike1.jpg'],
      vehicleTypes: ['2-wheeler'],
      slots: [
        { label: 'B1', vehicleType: '2-wheeler', size: 'small', isActive: true },
        { label: 'B2', vehicleType: '2-wheeler', size: 'small', isActive: true },
        { label: 'B3', vehicleType: '2-wheeler', size: 'small', isActive: true },
      ],
      availabilityRules: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '20:00' },
        { dayOfWeek: 2, startTime: '08:00', endTime: '20:00' },
        { dayOfWeek: 3, startTime: '08:00', endTime: '20:00' },
        { dayOfWeek: 4, startTime: '08:00', endTime: '20:00' },
        { dayOfWeek: 5, startTime: '08:00', endTime: '20:00' },
      ],
      approvalMode: 'manual',
      prices: { hourly: 15, daily: 100, monthly: 2000 },
      minDurationMinutes: 60, advanceNoticeMinutes: 60,
      status: 'active',
    });
        const listing3 = await Listing.create({
      ownerId: ownerVerified._id,
      title: 'Mixed Parking near MG Road Metro (2W + 4W)',
      description: 'Flexible parking — one wide slot fits a car or two bikes.',
      location: {
        type: 'Point',
        coordinates: [77.6066, 12.9756],
        city: 'Bengaluru', area: 'MG Road',
        address: 'MG Road, near Metro Station',
        pincode: '560001', landmark: 'MG Road Metro',
      },
      photos: ['https://example.com/photos/mixed1.jpg'],
      vehicleTypes: ['2-wheeler', '4-wheeler'],
      slots: [
        { label: 'M1', vehicleType: 'both', size: 'large', isActive: true },
        { label: 'M2', vehicleType: '4-wheeler', size: 'medium', isActive: true },
        { label: 'M3', vehicleType: '2-wheeler', size: 'small', isActive: true },
      ],
      availabilityRules: [
        { dayOfWeek: 1, startTime: '07:00', endTime: '22:00' },
        { dayOfWeek: 2, startTime: '07:00', endTime: '22:00' },
        { dayOfWeek: 3, startTime: '07:00', endTime: '22:00' },
        { dayOfWeek: 4, startTime: '07:00', endTime: '22:00' },
        { dayOfWeek: 5, startTime: '07:00', endTime: '22:00' },
        { dayOfWeek: 6, startTime: '07:00', endTime: '22:00' },
      ],
      approvalMode: 'auto',
      prices: { hourly: 30, daily: 200, monthly: 4000 },
      minDurationMinutes: 60, advanceNoticeMinutes: 0,
      status: 'active',
    });


    console.log(' Listings created');

    console.log('\n Testing unique(slotId, hourStart) constraint...');
    const testSlotId = listing1.slots[0]._id;
    const testHour = new Date('2026-11-01T10:00:00Z');
    const dummyBookingId = new mongoose.Types.ObjectId();

    await SlotLock.create({ slotId: testSlotId, hourStart: testHour, bookingId: dummyBookingId });
    console.log('   First lock inserted');

    try {
      await SlotLock.create({ slotId: testSlotId, hourStart: testHour, bookingId: new mongoose.Types.ObjectId() });
      throw new Error(' Duplicate lock was ALLOWED — unique index BROKEN!');
    } catch (err) {
      if (err.code === 11000) {
        console.log('Duplicate lock correctly BLOCKED (E11000). Guard works.');
      } else {
        throw err;
      }
    }

    await SlotLock.deleteMany({ bookingId: dummyBookingId });

    console.log('\n Seed summary:');
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   OwnerProfiles: ${await OwnerProfile.countDocuments()}`);
    console.log(`   Listings: ${await Listing.countDocuments()}`);
    console.log(`   Vehicles: ${await Vehicle.countDocuments()}`);
    console.log(`   Bookings: ${await Booking.countDocuments()}`);
    console.log(`   SlotLocks: ${await SlotLock.countDocuments()}`);
    console.log(`   Disputes: ${await Dispute.countDocuments()}`);
    console.log(`   Notifications: ${await Notification.countDocuments()}`);

    console.log('\n  SEED COMPLETE');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n SEED FAILED:', err.message);
    if (err.errors) console.error(err.errors);
    await mongoose.disconnect();
    process.exit(1);
  }
})();
    