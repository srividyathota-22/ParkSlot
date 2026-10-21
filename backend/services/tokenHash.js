const crypto = require('crypto');

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function verifyRefreshToken(token, storedHash) {
  if (!storedHash) return false;
  const incoming = hashRefreshToken(token);
  const a = Buffer.from(incoming, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { hashRefreshToken, verifyRefreshToken };