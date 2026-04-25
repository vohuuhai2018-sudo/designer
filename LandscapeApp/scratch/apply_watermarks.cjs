const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Architecture Gallery
content = content.replace(/className={`gallery-item-luxe/g, 'className={`gallery-item-luxe cat-img');

// 2. SuccessView results (previous images)
content = content.replace(/key={`prev-\${i}`}\s+style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba\(255,255,255,0.1\)', aspectRatio: '16\/10' }}/g, 'key={`prev-${i}`} className="result-img-protected" style={{ position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", aspectRatio: "16/10" }}');

// 3. SuccessView results (all images)
content = content.replace(/key={i}\s+style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba\(255,255,255,0.1\)', boxShadow: '0 4px 12px rgba\(0,0,0,0.25\)', aspectRatio: '16\/10' }}/g, 'key={i} className="result-img-protected" style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 12px rgba(0,0,0,0.25)", aspectRatio: "16/10" }}');

fs.writeFileSync(path, content, 'utf8');
console.log('Watermark classes applied successfully.');
