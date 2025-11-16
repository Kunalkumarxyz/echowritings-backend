// src/controllers/subscribeCtrl.js
const crypto = require("crypto");
const Subscriber = require("../models/Subscriber");
const { sendMail } = require("../services/mailer");

async function subscribe(req, res) {
  console.log("[DEBUG] /api/subscribe hit - body:", req.body);
  try {
    if (!req.body || typeof req.body !== "object") {
      console.warn("[WARN] Invalid req.body:", req.body);
      return res.status(400).json({ error: "Request body missing or invalid JSON" });
    }
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      console.warn("[WARN] Invalid email:", email);
      return res.status(400).json({ error: "Email required" });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const unsubToken = crypto.randomBytes(20).toString("hex");

    let sub;
    try {
      sub = await Subscriber.findOneAndUpdate(
        { email },
        { email, token, unsubToken, verified: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log("[DEBUG] DB upsert success:", sub ? sub.email : null);
    } catch (dbErr) {
      console.error("[ERROR] DB upsert failed:", dbErr);
      return res.status(500).json({ error: "Database error" });
    }

    const confirmUrl = `${process.env.BASE_URL || "http://localhost:4000"}/api/confirm?token=${token}`;
    const html = `<p>Thanks for subscribing. Click to confirm:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p>`;

    try {
      await sendMail({ to: email, subject: "Confirm your subscription", html, text: `Confirm: ${confirmUrl}` });
      console.log("[DEBUG] sendMail succeeded for", email);
    } catch (mailErr) {
      console.error("[ERROR] sendMail failed:", mailErr);
      // return 500 here so you can fix mailer later
      return res.status(500).json({ error: "Email send failed" });
    }

    // Notify admin (dev or real). Use a try/catch so admin notify doesn't break subscriber flow.
    try {
      const adminEmail = process.env.FROM_EMAIL || process.env.ADMIN_EMAIL || null;
      if (adminEmail) {
        await sendMail({
          to: adminEmail,
          subject: `New subscriber: ${email}`,
          text: `New subscriber: ${email}\nVerified: false\nTime: ${new Date().toISOString()}`
        });
        console.log("[DEBUG] Admin notified about new subscriber");
      } else {
        // if no admin email configured, just log
        console.log("[DEBUG] Admin email not configured; skipping admin notify");
      }
    } catch (adminErr) {
      // only log — do not fail the subscribe request
      console.error("[WARN] Admin notify failed:", adminErr);
    }

    return res.json({ message: "Confirmation email sent" });
  } catch (err) {
    console.error("[FATAL] Unexpected subscribe error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function confirm(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token required");
    const sub = await Subscriber.findOne({ token });
    if (!sub) return res.status(400).send("Invalid token");
    sub.verified = true;
    sub.token = null;
    await sub.save();
    const front = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${front}/subscribe-thanks`);
  } catch (err) {
    console.error("Confirm error:", err);
    return res.status(500).send("Server error");
  }
}

async function unsubscribe(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token required");
    const sub = await Subscriber.findOne({ unsubToken: token });
    if (!sub) return res.status(400).send("Invalid token");
    await Subscriber.deleteOne({ _id: sub._id });
    const front = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${front}/unsubscribed`);
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return res.status(500).send("Server error");
  }
}

module.exports = { subscribe, confirm, unsubscribe };
