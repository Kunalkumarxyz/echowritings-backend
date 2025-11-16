// listSubscribers.js
require('dotenv').config();
const mongoose = require('mongoose');
const Subscriber = require('./src/models/Subscriber');

async function main(){
  await mongoose.connect(process.env.MONGO_URI);
  const subs = await Subscriber.find().lean();
  console.log(subs);
  await mongoose.disconnect();
}
main().catch(e=>{ console.error(e); process.exit(1); });
