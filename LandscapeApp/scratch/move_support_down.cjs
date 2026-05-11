const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

// Update base position
const basePosRegex = /\.wd-float \{\s+position: fixed;\s+bottom: 24px;/;
const newBasePos = `.wd-float {
  position: fixed;
  bottom: 12px;`;

if (basePosRegex.test(content)) {
    content = content.replace(basePosRegex, newBasePos);
    console.log('SUCCESS: Moved base support button down');
}

// Update iOS Safari Fix position (move it down a bit too)
const iosFixRegex = /bottom: max\(64px, calc\(32px \+ env\(safe-area-inset-bottom\)\)\) !important;/;
const newIosFix = `bottom: max(48px, calc(16px + env(safe-area-inset-bottom))) !important;`;

if (iosFixRegex.test(content)) {
    content = content.replace(iosFixRegex, newIosFix);
    console.log('SUCCESS: Moved iOS support button down');
}

fs.writeFileSync(filePath, content, 'utf8');
