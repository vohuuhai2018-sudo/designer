const mongoose = require('mongoose');
require('dotenv').config({ path: '../server/.env' });

async function check() {
  try {
    console.log('Connecting to:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    const count = await mongoose.connection.db.collection('projects').countDocuments();
    console.log('Project count:', count);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
