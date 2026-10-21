const mongoose = require('mongoose');

const slotLockSchema = new mongoose.Schema(
  {
    slotId: { type: mongoose.Schema.Types.ObjectId, required: true },
    hourStart: { type: Date, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  },
  { timestamps: true }
);
slotLockSchema.index({ slotId: 1, hourStart: 1 }, { unique: true });

module.exports = mongoose.model('SlotLock', slotLockSchema);