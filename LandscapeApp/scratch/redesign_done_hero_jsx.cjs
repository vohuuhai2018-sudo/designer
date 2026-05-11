const fs = require('fs');
const path = require('path');

const tsxPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let tsx = fs.readFileSync(tsxPath, 'utf8');

// Using a more flexible regex for JSX match
const heroRegex = /<div\s+className="done-hero">[\s\S]*?<div\s+className="done-check">[\s\S]*?<\/div>[\s\S]*?<div\s+className="eyebrow body-eyebrow done-eyebrow">[\s\S]*?<\/div>[\s\S]*?<h1\s+className="done-title">[\s\S]*?<\/h1>[\s\S]*?<p\s+className="done-sub">[\s\S]*?<\/p>[\s\S]*?<\/div>/;

const newHero = `<div className="done-hero">
              <div className="done-status-bar">
                <div className="done-check"><Check size={20} strokeWidth={3} /></div>
                <div className="done-eyebrow-wrapper">
                  <div className="done-eyebrow-line" />
                  <span className="done-eyebrow">HOÀN TẤT · {allImages.length} PHƯƠNG ÁN</span>
                </div>
              </div>
              <h1 className="done-title">Bản vẽ đã sẵn sàng.</h1>
              <p className="done-sub">Kéo thanh ngang để so sánh trước &amp; sau. Chọn phương án ưng ý để tạo bổ sung 7 bản chi tiết.</p>
            </div>`;

if (heroRegex.test(tsx)) {
    tsx = tsx.replace(heroRegex, newHero);
    fs.writeFileSync(tsxPath, tsx, 'utf8');
    console.log('SUCCESS: Updated App.tsx hero JSX');
} else {
    console.log('ERROR: Could not find done-hero JSX with regex');
}
