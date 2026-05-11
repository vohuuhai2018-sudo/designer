const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const countStyleRegex = /\.cat-count \{[\s\S]*?font: 500 11px var\(--font-body\);[\s\S]*?\}\n\.cat-count svg \{ width: 12px; height: 12px; \}/;

const replacement = `.cat-count {
  position: absolute;
  left: 12px;
  bottom: 12px;
  background: rgba(10, 8, 5, 0.85);
  color: #fff;
  font: 600 14px var(--font-body);
  padding: 6px 16px;
  border-radius: 100px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.cat-count svg { width: 16px; height: 16px; stroke-width: 2.5px; }`;

if (countStyleRegex.test(content)) {
    content = content.replace(countStyleRegex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Increased category count badge size (regex)');
} else {
    // Try without the svg part
    const countOnlyRegex = /\.cat-count \{[\s\S]*?font: 500 11px var\(--font-body\);[\s\S]*?\}/;
    if (countOnlyRegex.test(content)) {
        content = content.replace(countOnlyRegex, replacement);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('SUCCESS: Increased category count badge size (regex only)');
    } else {
        console.log('ERROR: Could not find .cat-count styles');
    }
}
