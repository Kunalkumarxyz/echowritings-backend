// src/controllers/contactCtrl.js
const { sendMail } = require("../services/mailer");

async function contact(req, res) {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ error: "All fields are required" });

    const adminEmail = process.env.FROM_EMAIL || "kunalkumarxyz@hotmail.com";

    await sendMail({
      to: adminEmail,
      subject: `New Contact Message from ${name}`,
      html: `
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b></p>
        <p>${message}</p>
      `,
    });

    return res.json({ message: "Message sent!" });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = { contact };
