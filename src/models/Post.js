// src/models/Post.js
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  slug: { type: String, index: true, unique: true, required: true },
  title: { type: String, required: true },
  metaTitle: String,
  metaDescription: String,
  time: String,
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  img: String,
  author: { type: String, default: 'EchoWritings' },
  excerpt: String,
  content: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);
