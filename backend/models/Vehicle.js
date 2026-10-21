const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['2-wheeler', '4-wheeler'], required: true },
    registrationNumber: { type: String, required: true, trim: true },
    label: { type: String, trim: true },
  },
  { timestamps: true }
);

vehicleSchema.index({ userId: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);