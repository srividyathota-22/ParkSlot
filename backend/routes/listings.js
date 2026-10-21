const router = require('express').Router();
const Listing = require('../models/Listing');

router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('ownerId', 'name phone email');

    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.status !== 'active') {
      return res.status(404).json({ message: 'Listing not available' });
    }

    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;