const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const target = `.cat-count {
  position: absolute;
  left: 10px;
  bottom: 10px;
  background: rgba(20, 18, 12, 0.78);
  color: var(--cream-50);
  font: 500 11px var(--font-body);
  padding: 4px 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  z-index: 1;
}
.cat-count svg { width: 12px; height: 12px; }`;

const replacement = `.cat-count {
  position: absolute;
  left: 10px;
  bottom: 10px;
  background: rgba(20, 18, 12, 0.88); /* Đậm hơn một chút cho rõ */
  color: #fff;
  font: 600 14px var(--font-body); /* To hơn: 11px -> 14px */
  padding: 6px 14px; /* Padding to hơn */
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  z-index: 1;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.cat-count svg { width: 16px; height: 16px; } /* Icon to hơn */`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Increased category count badge size');
} else {
    console.log('ERROR: Could not find .cat-count styles exactly');
}
