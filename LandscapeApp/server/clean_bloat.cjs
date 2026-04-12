require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

// Schema
const ProjectSchema = new mongoose.Schema({
  id: String,
  rawImage: String,
});
const Project = mongoose.model('Project', ProjectSchema);

async function cleanDB() {
  console.log('Connecting to DB...', process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected!');

  const base64Docs = await Project.find({ rawImage: { $regex: /^data:/ } }).select('_id');
  console.log(`Found ${base64Docs.length} bloated base64 documents!`);

  if (base64Docs.length > 0) {
    console.log('Deleting them...');
    const res = await Project.deleteMany({ rawImage: { $regex: /^data:/ } });
    console.log(`Deleted ${res.deletedCount} documents.`);
  } else {
    console.log('No base64 documents found.');
  }

  process.exit(0);
}

cleanDB().catch(console.error);
