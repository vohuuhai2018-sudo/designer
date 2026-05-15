
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function find() {
  await mongoose.connect(process.env.MONGO_URI);
  const p = await mongoose.connection.db.collection('projects').findOne({ id: 'mnzoqa0u715gwtqslnw' });
  if (p) {
    console.log('Found project:', JSON.stringify(p, null, 2));
  } else {
    console.log('Project not found');
  }
  await mongoose.disconnect();
}

find();
