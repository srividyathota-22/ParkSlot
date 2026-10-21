const router = require('express').Router();
const { searchListings } = require('../services/search');
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius = 5, start, end, vehicleType, sort } = req.query;

    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng are required' });
    if (!start || !end) return res.status(400).json({ message: 'start and end are required' });

    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    if (Number.isNaN(latN) || Number.isNaN(lngN) || Number.isNaN(radiusKm))
      return res.status(400).json({ message: 'lat, lng, radius must be numeric' });

    if (!['2-wheeler', '4-wheeler'].includes(vehicleType))
      return res.status(400).json({ message: "vehicleType must be '2-wheeler' or '4-wheeler'" });

    const results = await searchListings({
      lat: latN,
      lng: lngN,
      radiusKm,
      vehicleType,
      start,
      end,
      sort,
    });

    res.json({ count: results.length, results });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;