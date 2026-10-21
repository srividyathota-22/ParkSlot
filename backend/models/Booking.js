const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },

    start: { type: Date, required: true },
    end: { type: Date, required: true },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
    },

    priceTotal: { type: Number, required: true },
    pricingUnit: { type: String, enum: ['hourly', 'daily', 'monthly'], required: true },

    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pay_at_venue', 'paid', 'refunded'],
      default: 'unpaid',
    },

    decidedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ slotId: 1, status: 1 });
bookingSchema.index({ listingId: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);