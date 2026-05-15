
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  id: String,
  status: String,
  aiResults: [String],
  finalImage: String,
  pass2Results: mongoose.Schema.Types.Mixed
}, { strict: false });

const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const p = await Project.findOne({ id: 'mnzoqa0u715gwtqslnw' });
  if (!p) {
    console.log('Project not found');
  } else {
    console.log('Project ID:', p.id);
    console.log('Status:', p.status);
    console.log('AI Results Count:', p.aiResults?.length || 0);
    console.log('Final Image:', p.finalImage);
    console.log('Pass 2 Status:', p.pass2Results?.status);
  }
  await mongoose.disconnect();
}

check();
