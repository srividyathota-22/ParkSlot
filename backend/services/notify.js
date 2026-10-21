const Notification = require('../models/Notification');
async function notify(userId, type, message, meta = {}) {
  try { await Notification.create({ userId, type, message, meta }); }
  catch (err) { console.error('notify failed:', err.message); }
}

module.exports = { notify };