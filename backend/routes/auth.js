const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OwnerProfile = require('../models/OwnerProfile');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');
const { hashRefreshToken, verifyRefreshToken } = require('../services/tokenHash');

const signAccess = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );

const signRefresh = (user) =>
  jwt.sign(
    { id: user._id, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  status: u.status,
});
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role,
      status: 'active',
    });

    if (role === 'owner') {
      await OwnerProfile.create({
        userId: user._id,
        verificationStatus: 'pending',
      });
    }

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    user.refreshTokenHash = hashRefreshToken(refreshToken);
    await user.save();

    res.status(201).json({
      accessToken,
      refreshToken,
      user: publicUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.status === 'suspended')
      return res.status(403).json({ message: 'Account suspended' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);

    user.refreshTokenHash = hashRefreshToken(refreshToken);
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: publicUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
    if (payload.type !== 'refresh')
      return res.status(401).json({ message: 'Not a refresh token' });

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    if (user.status === 'suspended')
      return res.status(403).json({ message: 'Account suspended' });

    if (!verifyRefreshToken(refreshToken, user.refreshTokenHash))
      return res.status(401).json({ message: 'Refresh token revoked' });

    res.json({ accessToken: signAccess(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash -refreshTokenHash');
  if (!user) return res.status(404).json({ message: 'User not found' });

  let ownerProfile = null;
  if (user.role === 'owner') {
    ownerProfile = await OwnerProfile.findOne({ userId: user._id });
  }
  res.json({ user, ownerProfile });
});

module.exports = router;