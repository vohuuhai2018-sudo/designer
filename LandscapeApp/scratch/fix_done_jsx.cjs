const fs = require('fs');

const tsxPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let lines = fs.readFileSync(tsxPath, 'utf8').split('\n');

// Find the exact line numbers
let startLine = -1, endLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('done-hero') && lines[i].includes('className') && startLine === -1) {
    // Check if next line has done-status-bar or done-check
    if (i + 1 < lines.length && (lines[i+1].includes('done-status-bar') || lines[i+1].includes('done-check'))) {
      startLine = i;
    }
  }
  if (startLine !== -1 && endLine === -1 && lines[i].includes('done-sub') && lines[i].includes('/p>')) {
    // Find the closing </div> after this
    for (let j = i + 1; j < i + 5; j++) {
      if (lines[j] && lines[j].trim().startsWith('</div>')) {
        endLine = j;
        break;
      }
    }
    if (endLine === -1) endLine = i + 1;
    break;
  }
}

console.log(`Found block at lines ${startLine + 1} to ${endLine + 1}`);

if (startLine === -1 || endLine === -1) {
  console.log('ERROR: Could not find the done-hero block');
  process.exit(1);
}

// Get the indentation from the first line
const indent = lines[startLine].match(/^(\s*)/)[1];

const newBlock = [
  `${indent}<div className="done-hero">`,
  `${indent}  <div className="done-check-ring">`,
  `${indent}    <div className="done-check-circle">`,
  `${indent}      <Check size={26} strokeWidth={3} />`,
  `${indent}    </div>`,
  `${indent}  </div>`,
  `${indent}  <div className="done-badge">`,
  `${indent}    <span className="done-badge-dot" />`,
  `${indent}    <span>HOÀN TẤT · {allImages.length} PHƯƠNG ÁN</span>`,
  `${indent}  </div>`,
  `${indent}  <h1 className="done-title">Bản vẽ đã sẵn sàng.</h1>`,
  `${indent}  <p className="done-sub">Kéo thanh ngang để so sánh trước &amp; sau. Chọn phương án ưng ý để tạo bổ sung 7 bản chi tiết.</p>`,
  `${indent}</div>`,
];

lines.splice(startLine, endLine - startLine + 1, ...newBlock);
fs.writeFileSync(tsxPath, lines.join('\n'), 'utf8');
console.log('SUCCESS: Replaced done-hero JSX block');
