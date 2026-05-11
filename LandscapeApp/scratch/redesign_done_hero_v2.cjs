const fs = require('fs');
const path = require('path');

const tsxPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
const cssPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';

// 1. Update JSX structure in App.tsx
let tsx = fs.readFileSync(tsxPath, 'utf8');
const oldHero = `<div className="done-hero">
              <div className="done-check"><Check size={28} strokeWidth={3} /></div>
              <div className="eyebrow body-eyebrow done-eyebrow">Hoàn tất · {allImages.length} phương án</div>
              <h1 className="done-title">Bản vẽ đã sẵn sàng.</h1>
              <p className="done-sub">Kéo thanh ngang để so sánh trước &amp; sau. Chọn phương án ưng ý để tạo bổ sung 7 bản chi tiết.</p>
            </div>`;

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

if (tsx.includes(oldHero)) {
    tsx = tsx.replace(oldHero, newHero);
    fs.writeFileSync(tsxPath, tsx, 'utf8');
    console.log('SUCCESS: Updated App.tsx');
} else {
    console.log('ERROR: Could not find old hero JSX');
}

// 2. Update CSS in App.css
let css = fs.readFileSync(cssPath, 'utf8');

const newStyles = `
.done-hero {
  text-align: center;
  max-width: 800px;
  margin: 0 auto 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.done-status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  animation: done-bar-in 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.done-check {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #528c5f, #2d462c);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(45, 70, 44, 0.25);
  flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.2);
}

.done-eyebrow-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.done-eyebrow-line {
  width: 40px;
  height: 1.5px;
  background: linear-gradient(to right, #b45309, transparent);
  opacity: 0.6;
}

.done-eyebrow {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: #2d462c;
  opacity: 0.85;
  white-space: nowrap;
}

.done-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(36px, 5vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
  color: #1a1a1a;
}

.done-sub {
  font-size: 18px;
  color: #4a4a4a;
  line-height: 1.6;
  max-width: 600px;
  margin: 0;
}

@keyframes done-bar-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .done-hero { margin-bottom: 32px; padding: 0 20px; }
  .done-status-bar { gap: 12px; margin-bottom: 16px; }
  .done-check { width: 40px; height: 40px; }
  .done-eyebrow-line { width: 24px; }
  .done-eyebrow { font-size: 11px; letter-spacing: 0.1em; }
  .done-title { font-size: 32px; }
  .done-sub { font-size: 15px; }
}
`;

const oldCssBlock = /\.done-hero\s*\{[\s\S]*?\.done-sub\s*\{[\s\S]*?\}/;
if (oldCssBlock.test(css)) {
    css = css.replace(oldCssBlock, newStyles);
    fs.writeFileSync(cssPath, css, 'utf8');
    console.log('SUCCESS: Updated App.css');
} else {
    console.log('ERROR: Could not find CSS block');
}
