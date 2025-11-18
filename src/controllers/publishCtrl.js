// src/controllers/publishCtrl.js
const Subscriber = require('../models/Subscriber');
const { sendMail } = require('../services/mailer');

async function publish(req, res) {
  try {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { title, excerpt, url } = req.body || {};
    if (!title || !url) return res.status(400).json({ error: 'title and url required' });

    const subs = await Subscriber.find({ verified: true, bounced: false }).limit(500);
    for (const s of subs) {
      const unsub = `${process.env.BASE_URL || 'https://echowritings-backend.onrender.com'}/api/unsubscribe?token=${s.unsubToken}`;
      const html = `<h3>${title}</h3><p>${excerpt || ''}</p><p><a href="${url}">Read article</a></p><hr/><p><a href="${unsub}">Unsubscribe</a></p>`;
      await sendMail({ to: s.email, subject: `New article: ${title}`, html, text: `${title}\n${url}\nUnsubscribe: ${unsub}` });
    }

    return res.json({ message: 'Notifications attempted' });
  } catch (err) {
    console.error('Publish error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { publish };
