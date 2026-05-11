const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const oldMobileStyles = /@media \(max-width: 720px\) \{\s+\.wd-float \{[\s\S]*?\}\s+\.wd-float-support \{ [\s\S]*? \}\s+\.wd-float-support span \{ display: inline !important; \}\s+\}/;

const newMobileStyles = `@media (max-width: 720px) {
  .wd-float {
    bottom: max(64px, calc(32px + env(safe-area-inset-bottom))) !important; 
    right: 20px !important;
    z-index: 9999 !important;
  }
  .wd-float-support { 
    border-radius: 50px !important; 
    padding: 12px 24px !important; 
    font-size: 14px !important;
    box-shadow: 0 12px 32px rgba(0, 104, 255, 0.45) !important;
    background: #0068FF !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    text-transform: none !important;
    width: auto !important;
    white-space: nowrap !important;
  }
  .wd-float-support span { display: inline !important; }
  .wd-float-support svg { width: 22px !important; height: 22px !important; }
}`;

// I'll use a more surgical approach to replace the end of the file or specifically the last block.
const lastMediaIdx = content.lastIndexOf('@media (max-width: 720px)');
if (lastMediaIdx !== -1) {
    // Just append the fix at the end to override everything.
    content += `\n/* Force iOS Safari Fix */\n${newMobileStyles}`;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Applied iOS Safari specific fix at the end of CSS');
} else {
    content += newMobileStyles;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Appended mobile styles');
}
