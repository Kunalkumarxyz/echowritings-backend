// server.js
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log('Mongo connected');
    const port = process.env.PORT || 4000;
    app.listen(port, () => console.log(`Server running on ${port}`));
    // optional worker start (no-op placeholder)
    require('./src/workers/sendWorker');
  })
  .catch(err => {
    console.error('Mongo Error:', err);
    process.exit(1);
  });
