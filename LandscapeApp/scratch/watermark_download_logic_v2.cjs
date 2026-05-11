const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /<div className="result-meta">\s*<span className="result-name">Phương án \{num\}<\/span>\s*<button className="result-zoom" onClick=\{\(e\) => \{ e\.stopPropagation\(\); setPreviewImage\(url\); \}\} aria-label="Phóng to">\s*<Search size=\{14\} \/>\s*<\/button>/;

const replacement = `<div className="result-meta">
                      <span className="result-name">Phương án {num}</span>
                      <div className="result-actions">
                        <button className="result-zoom" onClick={(e) => { e.stopPropagation(); setPreviewImage(url); }} title="Phóng to">
                          <Search size={14} />
                        </button>
                        <button className="result-download" onClick={(e) => { 
                          e.stopPropagation(); 
                          if (!isPaid) {
                            setPaymentOpen(true);
                          } else {
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = \`thietke5p-\${num}.jpg\`;
                            link.click();
                          }
                        }} title="Tải ảnh gốc">
                          <Download size={14} />
                        </button>
                      </div>`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Integrated download logic with regex');
} else {
    console.log('ERROR: Could not find target block with regex');
}
