require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.log("Usage: node seed/setPassword.js <email> '<new password>'");
  process.exit(1);
}
if (password.length < 6) {
  console.log('The password must have at least 6 characters.');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('No user with that email.');
    } else {
      user.passwordHash = await bcrypt.hash(password, 10);
      user.refreshTokenHash = undefined; // logs this account out everywhere
      await user.save();
      console.log('Password changed for', user.email);
    }
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }
})();