const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/owner', require('./routes/owner'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/search', require('./routes/search'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/disputes', require('./routes/disputes'));

app.get('/', (req, res) => res.send('Smart Parking API running '));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log(' MongoDB connected');
    require('./jobs/expire').start();
    app.listen(PORT, () => console.log(` Server running... on port ${PORT}`));
  })
  .catch((err) => {
    console.error('DB error:', err.message);
    process.exit(1);
  });