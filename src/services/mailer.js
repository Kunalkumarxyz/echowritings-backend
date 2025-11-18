// src/services/mailer.js
const sgMail = require('@sendgrid/mail');
const SENDGRID_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || "kunalkumarxyz@hotmail.com";

let useSendGrid = false;
if (SENDGRID_KEY && SENDGRID_KEY.startsWith('SG.')) {
  sgMail.setApiKey(SENDGRID_KEY);
  useSendGrid = true;
} else {
  console.warn('⚠️ SendGrid key missing/invalid — using console dev-fallback for emails.');
}

async function sendMail({ to, subject, html, text }) {
  if (!useSendGrid) {
    console.log('---- EMAIL (dev fallback) ----');
    console.log('To:', to);
    console.log('From:', FROM_EMAIL);
    console.log('Subject:', subject);
    if (text) console.log('Text:', text);
    if (html) console.log('HTML:', html);
    console.log('---- end ----');
    return Promise.resolve();
  }

  const msg = {
    to,
    from: FROM_EMAIL,   // <-- ensures emails always come from your domain email
    subject,
    html,
    text
  };

  return sgMail.send(msg);
}

module.exports = { sendMail };
