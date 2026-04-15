const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const ProjectSchema = new mongoose.Schema({
  id: String,
  customerName: String,
  status: String
});
const Project = mongoose.model('Project', ProjectSchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const projects = await Project.find();
    console.log(`Found ${projects.length} projects`);
    projects.forEach(p => console.log(`- ${p.customerName} (${p.status})` ));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
