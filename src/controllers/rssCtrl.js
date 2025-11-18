// src/controllers/rssCtrl.js
// Simple RSS feed generator for EchoWritings
// Looks for a Mongoose model first, then backend seed file (../data/posts), returns RSS XML.

const fs = require('fs');
const path = require('path');

let PostModel = null;
try {
  // adjust this path if your Mongoose model lives elsewhere
  PostModel = require('../models/Post');
} catch (e) {
  PostModel = null;
}

let seedPosts = null;
try {
  // Ensure your backend posts file is CommonJS (module.exports = posts)
  seedPosts = require('../data/posts');
} catch (e) {
  seedPosts = null;
  // not fatal — feed will be empty if no posts found
}

/* ---------- helpers ---------- */
function escapeXml(str = '') {
  return String(str).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function buildRssXml(posts = [], siteUrl = 'https://echowritings-backend.onrender.com') {
  const base = siteUrl.replace(/\/$/, '');
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n`;
  xml += `<title>EchoWritings — Daily inspiration</title>\n`;
  xml += `<link>${base}</link>\n`;
  xml += `<description>Daily motivational quotes, stories and inspiration from EchoWritings.</description>\n`;
  xml += `<atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />\n`;

  posts.forEach((p) => {
    const title = escapeXml(p.title || 'Untitled');
    const slug = p.slug || p.id || '';
    const link = `${base}/stories/${slug}`;
    const description = escapeXml(p.metaDescription || p.excerpt || '');
    const pubDate = p.date ? new Date(p.date).toUTCString() : new Date().toUTCString();
    const enclosure = p.img ? `<enclosure url="${escapeXml(p.img)}" type="image/jpeg" />\n` : '';

    xml += `<item>\n`;
    xml += `<title>${title}</title>\n`;
    xml += `<link>${link}</link>\n`;
    xml += `<guid isPermaLink="true">${link}</guid>\n`;
    xml += `<pubDate>${pubDate}</pubDate>\n`;
    xml += `<description><![CDATA[${p.img ? `<p><img src="${escapeXml(p.img)}" alt="${title}" /></p>` : ''}${description}]]></description>\n`;
    if (enclosure) xml += enclosure;
    xml += `</item>\n\n`;
  });

  xml += `</channel>\n</rss>\n`;
  return xml;
}

/* ---------- main handler ---------- */
module.exports = async function rssHandler(req, res) {
  try {
    let posts = [];

    // 1) try database (if PostModel exists and supports find)
    if (PostModel && typeof PostModel.find === 'function') {
      try {
        // adjust query if your model uses different fields (published flag etc.)
        posts = await PostModel.find({}).sort({ date: -1 }).lean().limit(50).exec();
      } catch (err) {
        console.warn('rssCtrl: DB fetch failed, falling back to seed/local:', err && err.message);
        posts = [];
      }
    }

    // 2) fallback to seed file (src/data/posts.js used by backend)
    if ((!posts || posts.length === 0) && Array.isArray(seedPosts) && seedPosts.length) {
      // sort newest first
      posts = seedPosts.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
    }

    // 3) final fallback: empty list (still return valid RSS)
    const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}` || 'https://echowritings-backend.onrender.com';

    const xml = buildRssXml(posts, siteUrl);

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    // small caching for performance
    res.set('Cache-Control', 'public, max-age=300');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('rssCtrl error:', err);
    res.status(500).send('Server error generating RSS');
  }
};
