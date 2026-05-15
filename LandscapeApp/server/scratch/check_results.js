
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  id: String,
  results: [Object],
  status: String,
  payment: Object
}, { strict: false });

const Project = mongoose.model('Project', projectSchema);

async function checkRecentResults() {
  await mongoose.connect(process.env.MONGO_URI);
  const projects = await Project.find({ 'interiorPairs.0': { $exists: true } }).sort({ _id: -1 }).limit(5);
  
  console.log('--- INTERIOR PROJECTS ---');
  projects.forEach(p => {
    console.log(`ID: ${p.id}, Status: ${p.status}`);
    console.log(`  Pairs: ${p.interiorPairs.length}`);
    if (p.aiResults) {
      p.aiResults.forEach((url, i) => {
        console.log(`  Result ${i}: ${url}`);
      });
    }
  });
  
  await mongoose.disconnect();
}

checkRecentResults();
