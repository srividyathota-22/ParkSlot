const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['driver', 'owner', 'admin'], required: true, default: 'driver' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    refreshTokenHash: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);