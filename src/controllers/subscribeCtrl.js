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

    // --- Environment-aware URLs ---
    // FRONTEND_URL should be your public frontend (e.g. https://echowritings.vercel.app)
    // BASE_URL should be your backend public URL (e.g. https://echowritings-backend.onrender.com)
    const FRONTEND = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    const BASE = (process.env.BASE_URL || "").replace(/\/$/, "");

    // debug log to help you see what's set in production logs
    console.log("[DEBUG] FRONTEND_URL:", FRONTEND || "(not set)");
    console.log("[DEBUG] BASE_URL:", BASE || "(not set)");

    // Build two links:
    // 1) friendlyLink → points to frontend confirmation page (recommended UX)
    // 2) directBackendLink → direct backend confirm endpoint (fallback)
    const safeToken = encodeURIComponent(token);
    const friendlyLink = FRONTEND
      ? `${FRONTEND}/confirm?token=${safeToken}`
      : (BASE ? `${BASE}/api/confirm?token=${safeToken}` : `http://localhost:${process.env.PORT || 4000}/api/confirm?token=${safeToken}`);

    const directBackendLink = BASE
      ? `${BASE}/api/confirm?token=${safeToken}`
      : `http://localhost:${process.env.PORT || 4000}/api/confirm?token=${safeToken}`;

    // Email HTML: friendly link (frontend) + backend link as fallback (hidden visually but present)
    const html = `
      <p>Thanks for subscribing to EchoWritings.</p>
      <p>Click the button below to confirm your subscription:</p>
      <p style="margin:18px 0;">
        <a href="${friendlyLink}" style="display:inline-block;padding:10px 18px;background:#f59e0b;color:#fff;border-radius:8px;text-decoration:none;">Confirm subscription</a>
      </p>
      <p style="font-size:12px;color:#666;">If the button doesn't work, open this link in your browser:</p>
      <p style="word-break:break-all;"><a href="${directBackendLink}">${directBackendLink}</a></p>
    `;
    const text = `Confirm your subscription: ${directBackendLink}`;

    try {
      await sendMail({ to: email, subject: "Confirm your EchoWritings subscription", html, text, from: process.env.FROM_EMAIL });
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
          from: process.env.FROM_EMAIL,
          subject: `New subscriber: ${email}`,
          text: `New subscriber: ${email}\nVerified: false\nTime: ${new Date().toISOString()}`
        });
        console.log("[DEBUG] Admin notified about new subscriber");
      } else {
        console.log("[DEBUG] Admin email not configured; skipping admin notify");
      }
    } catch (adminErr) {
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

    const front = (process.env.FRONTEND_URL || "https://www.echowritings.com").replace(/\/$/, "");
    // redirect to a friendly frontend page (or fallback if FRONTEND_URL not set)
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
    const front = (process.env.FRONTEND_URL || "https://www.echowritings.com").replace(/\/$/, "");
    return res.redirect(`${front}/unsubscribed`);
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return res.status(500).send("Server error");
  }
}

module.exports = { subscribe, confirm, unsubscribe };
