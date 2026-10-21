const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    vehicleType: { type: String, enum: ['2-wheeler', '4-wheeler', 'both'], required: true },
    size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const availabilityRuleSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const blockSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    reason: { type: String },
  },
  { _id: true }
);

const listingSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    title: { type: String, required: true, trim: true },
    description: { type: String },

    location: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v) => Array.isArray(v) && v.length === 2,
          message: 'coordinates must be [lng, lat]',
        },
      },
      city: { type: String, required: true },
      area: { type: String },
      address: { type: String, required: true },
      pincode: { type: String },
      landmark: { type: String },
    },

    photos: [{ type: String }],

    vehicleTypes: [{ type: String, enum: ['2-wheeler', '4-wheeler'] }],

    slots: [slotSchema],
    availabilityRules: [availabilityRuleSchema],
    blocks: [blockSchema],

    approvalMode: { type: String, enum: ['auto', 'manual'], default: 'manual' },

    prices: {
      hourly: { type: Number, required: true },
      daily: { type: Number },
      monthly: { type: Number },
    },

    minDurationMinutes: { type: Number, default: 60 },
    advanceNoticeMinutes: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['draft', 'pending_review', 'active', 'paused', 'rejected'],
      default: 'pending_review',
    },
    rejectionReason: { type: String },
    reviewNotes: { type: String },
  },
  { timestamps: true }
);

listingSchema.index({ location: '2dsphere' });
listingSchema.index({ ownerId: 1, status: 1 });
listingSchema.index({ 'location.city': 1, status: 1 });

module.exports = mongoose.model('Listing', listingSchema);