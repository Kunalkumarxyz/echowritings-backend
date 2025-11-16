// src/routes/posts.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// GET /api/posts  -> returns posts sorted by createdAt desc
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find({}).sort({ createdAt: -1 }).lean();
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/posts -> create post (simple validation)
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.title) return res.status(400).json({ error: 'title required' });

    // ensure slug exists
    const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    const exists = await Post.findOne({ slug });
    if (exists) {
      // create unique fallback
      body.slug = slug + '-' + Date.now().toString(36);
    } else {
      body.slug = slug;
    }

    const p = new Post({
      slug: body.slug,
      title: body.title,
      metaTitle: body.metaTitle || body.title,
      metaDescription: body.metaDescription || body.excerpt || '',
      time: body.time || body.time,
      date: body.date || (new Date().toISOString().split('T')[0]),
      img: body.img || '',
      author: body.author || 'EchoWritings',
      excerpt: body.excerpt || '',
      content: Array.isArray(body.content) ? body.content : [String(body.content || '')]
    });

    await p.save();
    res.status(201).json(p);
  } catch (err) {
    console.error('POST /api/posts error', err);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

module.exports = router;
