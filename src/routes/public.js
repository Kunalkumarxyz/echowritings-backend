// src/routes/public.js
const express = require('express');
const router = express.Router();

// -------------------------------
// Newsletter / Contact Routes
// -------------------------------
const { subscribe, confirm, unsubscribe } = require('../controllers/subscribeCtrl');
router.post('/subscribe', subscribe);
router.get('/confirm', confirm);
router.get('/unsubscribe', unsubscribe);

const { contact } = require("../controllers/contactCtrl");
router.post("/contact", contact);

// -------------------------------
// POSTS SYSTEM (Stories)
// -------------------------------
let seedPosts = [];
try {
  seedPosts = require("../data/posts.js");
} catch (e) {
  console.warn("⚠️ Seed posts not found, using empty array.");
  seedPosts = [];
}

// If you added a Post model for DB use:
let Post = null;
try {
  Post = require("../models/Post");
} catch (err) {
  Post = null;
}

// Helper DB function
async function fetchDBPosts() {
  if (!Post) return null;
  try {
    const docs = await Post.find({}).sort({ createdAt: -1 }).lean();
    return docs;
  } catch (e) {
    return null;
  }
}

// -------------------------------
// GET all posts
// -------------------------------
router.get("/posts", async (req, res) => {
  // 1) Try DB  
  const db = await fetchDBPosts();
  if (db && db.length) return res.json(db);

  // 2) Try seed
  if (seedPosts.length) return res.json(seedPosts);

  // 3) Empty fallback
  return res.json([]);
});

// -------------------------------
// GET single post (slug OR id)
// -------------------------------
router.get("/posts/:slugOrId", async (req, res) => {
  const key = req.params.slugOrId;

  // --- DB Lookup ---
  if (Post) {
    try {
      let doc = await Post.findOne({ slug: key }).lean();

      if (!doc) {
        const num = Number(key);
        if (!isNaN(num)) {
          doc = await Post.findOne({ id: num }).lean();
        }
      }

      if (doc) return res.json(doc);
    } catch (e) {}
  }

  // --- Seed Lookup ---
  let found = seedPosts.find((p) => p.slug === key);

  if (!found) {
    const num = Number(key);
    if (!isNaN(num)) found = seedPosts.find((p) => Number(p.id) === num);
  }

  if (found) return res.json(found);

  return res.status(404).json({ error: "Post not found" });
});

module.exports = router;
