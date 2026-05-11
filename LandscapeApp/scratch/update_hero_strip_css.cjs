const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const oldStrip = `.wd-hero-strip {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 14px 24px;
  border-radius: 999px;
  background: rgba(251, 247, 238, 0.70);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.55);
  font-size: 14px;
  color: var(--ink-900);
}`;

const newStrip = `.wd-hero-strip {
  display: inline-flex;
  align-items: center;
  gap: 20px;
  padding: 16px 32px;
  border-radius: 999px;
  background: rgba(251, 247, 238, 0.70);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.55);
  font-size: 16px;
  color: var(--ink-900);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
}

.wd-hero-strip span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wd-hero-strip svg {
  color: var(--bronze-500);
  flex-shrink: 0;
}`;

if (content.includes(oldStrip)) {
    content = content.replace(oldStrip, newStrip);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Updated hero strip CSS');
} else {
    console.log('ERROR: Could not find hero strip CSS');
}
