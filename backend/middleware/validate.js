const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const validateRegister = (req, res, next) => {
const { name, email, password, role } = req.body || {};
  const errors = [];

  if (!name || name.trim().length < 2) errors.push('name is required (min 2 chars)');
  if (!email || !isEmail(email)) errors.push('valid email is required');
  if (!password || password.length < 6) errors.push('password must be at least 6 characters');
  if (!['driver', 'owner'].includes(role)) errors.push('role must be driver or owner');

  if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  const errors = [];

  if (!email || !isEmail(email)) errors.push('valid email is required');
  if (!password) errors.push('password is required');

  if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });
  next();
};

module.exports = { validateRegister, validateLogin };