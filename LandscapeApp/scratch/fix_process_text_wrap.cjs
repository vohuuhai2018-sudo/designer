const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const targetCode = `.welcome-redesign .wd-process-step h3 {
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-900);
    margin: 0;
    line-height: 1.2;
  }`;

const fixedCode = `.welcome-redesign .wd-process-step h3 {
    font-family: var(--font-body);
    font-size: 10px; /* Thu nhỏ thêm 1 chút để không bị nhảy dòng */
    font-weight: 600;
    color: var(--ink-900);
    margin: 0;
    line-height: 1.2;
    white-space: nowrap; /* Tuyệt đối không cho xuống dòng */
    letter-spacing: -0.01em;
  }`;

if (content.includes(targetCode)) {
    content = content.replace(targetCode, fixedCode);
    console.log('SUCCESS: Fixed text wrapping for process steps');
} else {
    // Fallback search
    const fallbackRegex = /\.welcome-redesign \.wd-process-step h3 \{[\s\S]*?font-size: 11px;[\s\S]*?\}/;
    if (fallbackRegex.test(content)) {
        content = content.replace(fallbackRegex, fixedCode);
        console.log('SUCCESS: Fixed text wrapping for process steps (regex)');
    }
}

// Also adjust the grid padding on very small devices
const gridTarget = `.welcome-redesign .wd-process-grid {
    grid-template-columns: 1fr auto 1fr auto 1fr;
    gap: 0;
    padding: 16px 10px;`;

const fixedGrid = `.welcome-redesign .wd-process-grid {
    grid-template-columns: 1fr auto 1fr auto 1fr;
    gap: 0;
    padding: 16px 6px;`;

if (content.includes(gridTarget)) {
    content = content.replace(gridTarget, fixedGrid);
    console.log('SUCCESS: Adjusted grid padding');
}

fs.writeFileSync(filePath, content, 'utf8');
