const express = require("express");
const Subscriber = require("../models/Subscriber");
const { publish } = require("../controllers/publishCtrl");
const { resendConfirm } = require("../controllers/adminCtrl");
const router = express.Router();

router.post('/publish', publish);
router.post('/resend-confirm', resendConfirm);

router.get('/subscribers', async (req,res) => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const subs = await Subscriber.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json(subs);
  } catch (err) {
    console.error('Error loading subscribers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
