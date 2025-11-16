// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const rssHandler = require('./controllers/rssCtrl'); // RSS feed handler

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: '*' }));

// serve RSS feed at root /rss.xml
app.get('/rss.xml', rssHandler);

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// simple health
app.get('/', (req, res) => res.send('newsletter-backend ok'));

module.exports = app;
