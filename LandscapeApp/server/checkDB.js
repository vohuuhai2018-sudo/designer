require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const projectSchema = new mongoose.Schema({}, { strict: false });
const Project = mongoose.model('Project', projectSchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const count = await Project.countDocuments();
    console.log('Project count:', count);
    if (count > 0) {
        const latest = await Project.findOne().sort({ createdAt: -1 });
        console.log('Latest project:', JSON.stringify(latest, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
