
require('dotenv').config({ path: 'd:/4. DỰ ÁN SƠN HẢI/1. WEB/APP VẼ/LandscapeApp/server/.env' });
const mongoose = require('mongoose');

const SystemContentSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  uiText: { type: mongoose.Schema.Types.Mixed, default: {} },
  uiIcons: { type: mongoose.Schema.Types.Mixed, default: {} },
  tips: { type: mongoose.Schema.Types.Mixed, default: null },
  plans: { type: mongoose.Schema.Types.Mixed, default: null },
  library: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });
const SystemContent = mongoose.model('SystemContent', SystemContentSchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const content = await SystemContent.findOne({ key: 'main' });
    if (content) {
      console.log('Library Categories:', Object.keys(content.library || {}));
      Object.keys(content.library || {}).forEach(k => {
        console.log(` - ${k}: ${content.library[k].length} items`);
      });
    } else {
      console.log('No SystemContent found in DB');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
