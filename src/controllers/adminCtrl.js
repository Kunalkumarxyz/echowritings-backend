const crypto = require("crypto");
const Subscriber = require("../models/Subscriber");
const { sendMail } = require("../services/mailer");

async function resendConfirm(req, res) {
  try {
    if (req.headers["x-admin-key"] !== process.env.ADMIN_API_KEY) return res.status(401).json({ error: 'Unauthorized' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    let sub = await Subscriber.findOne({ email });
    if (!sub) {
      // create new unverified subscriber if not present
      sub = new Subscriber({ email, verified: false });
    }

    const token = crypto.randomBytes(20).toString('hex');
    sub.token = token;
    sub.verified = false;
    await sub.save();

    const confirmUrl = `${process.env.BASE_URL || 'http://localhost:4000'}/api/confirm?token=${token}`;

    try {
      await sendMail({
        to: sub.email,
        subject: 'Confirm your subscription',
        text: `Confirm: ${confirmUrl}`,
        html: `<p>Click to confirm: <a href="${confirmUrl}">${confirmUrl}</a></p>`
      });
    } catch (mailErr) {
      console.error('resend confirm sendMail failed', mailErr && (mailErr.response ? mailErr.response.body : mailErr));
      if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_API_KEY.startsWith('SG.')) {
        return res.json({ message: 'dev: confirm url', confirmUrl });
      }
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.json({ message: 'Confirmation resent' });
  } catch (err) {
    console.error('resendConfirm err', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { resendConfirm };
