
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function list() {
  await mongoose.connect(process.env.MONGO_URI);
  const projects = await mongoose.connection.db.collection('projects').find().sort({ timestamp: -1 }).limit(5).toArray();
  console.log('Recent projects:');
  projects.forEach(p => {
    console.log(`- ${p.id} (${p.customerName || 'No Name'}) status=${p.status}`);
  });
  await mongoose.disconnect();
}

list();
