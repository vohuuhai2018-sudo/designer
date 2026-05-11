const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

// Update main .wd-float
content = content.replace(
    /\.wd-float\s*\{[^}]*right:\s*[^;]+;[^}]*align-items:\s*flex-end;[^}]*\}/g,
    (match) => {
        return match
            .replace(/right:\s*[^;]+;/, 'left: 24px;')
            .replace(/align-items:\s*flex-end;/, 'align-items: flex-start;');
    }
);

// Flexible replacement for various instances
content = content.replace(/right:\s*24px;/g, 'left: 24px;');
content = content.replace(/right:\s*16px;/g, 'left: 16px;');
content = content.replace(/right:\s*20px\s*!important;/g, 'left: 20px !important;');
content = content.replace(/left:\s*auto\s*!important;/g, 'right: auto !important;');

// Specific fix for the main block at 9559
const mainBlock = `.wd-float {
  position: fixed;
  bottom: 12px;
  right: 24px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}`;

const newMainBlock = `.wd-float {
  position: fixed;
  bottom: 12px;
  left: 24px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}`;

if (content.includes(mainBlock)) {
    content = content.replace(mainBlock, newMainBlock);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Moved support button to bottom-left');
