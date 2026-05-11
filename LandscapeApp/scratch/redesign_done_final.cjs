const fs = require('fs');

const tsxPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
const cssPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';

// ===== 1. Fix App.tsx: Replace only the done-hero JSX block (lines 5060-5070) =====
let tsx = fs.readFileSync(tsxPath, 'utf8');

// Very precise target - the exact 3 inner lines
const oldCheck = `<div className="done-status-bar">
                <div className="done-check"><Check size={20} strokeWidth={3} /></div>
                <div className="done-eyebrow-wrapper">
                  <div className="done-eyebrow-line" />
                  <span className="done-eyebrow">HOÀN TẤT · {allImages.length} PHƯƠNG ÁN</span>
                </div>
              </div>`;

const newCheck = `<div className="done-check-ring">
                <div className="done-check-circle">
                  <Check size={26} strokeWidth={3} />
                </div>
              </div>
              <div className="done-badge">
                <span className="done-badge-dot" />
                <span>HOÀN TẤT · {allImages.length} PHƯƠNG ÁN</span>
              </div>`;

if (tsx.includes(oldCheck)) {
  tsx = tsx.replace(oldCheck, newCheck);
  fs.writeFileSync(tsxPath, tsx, 'utf8');
  console.log('SUCCESS: Updated JSX in App.tsx');
} else {
  console.log('ERROR: Could not find old JSX check block');
}

// ===== 2. Fix App.css: Replace done-hero styles =====
let css = fs.readFileSync(cssPath, 'utf8');

const oldCss = `.done-status-bar {
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
}`;

const newCss = `/* Animated ring around checkmark */
.done-check-ring {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #4a8c5c, #a3d9a5, #4a8c5c);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  animation: done-ring-spin 3s linear infinite, done-ring-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 6px 20px rgba(74, 140, 92, 0.2);
}

.done-check-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(160deg, #5a9e6b, #2f5238);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.25), 0 4px 12px rgba(47, 82, 56, 0.3);
}

@keyframes done-ring-spin {
  from { background: conic-gradient(from 0deg, #4a8c5c, #a3d9a5, #4a8c5c); }
  50% { background: conic-gradient(from 180deg, #4a8c5c, #a3d9a5, #4a8c5c); }
  to { background: conic-gradient(from 360deg, #4a8c5c, #a3d9a5, #4a8c5c); }
}

@keyframes done-ring-in {
  0% { transform: scale(0.3); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}

/* Status badge pill */
.done-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(74, 140, 92, 0.08), rgba(74, 140, 92, 0.03));
  border: 1px solid rgba(74, 140, 92, 0.2);
  border-radius: 50px;
  padding: 8px 20px;
  margin-bottom: 24px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: #2f5238;
  animation: done-badge-in 0.7s 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.done-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4a8c5c;
  animation: done-dot-pulse 2s ease-in-out infinite;
}

@keyframes done-badge-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes done-dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}`;

if (css.includes(oldCss)) {
  css = css.replace(oldCss, newCss);
} else {
  console.log('WARNING: Could not find old CSS block, appending new styles');
}

// Also update mobile responsive
const oldMobile = `  .done-status-bar { gap: 12px; margin-bottom: 16px; }
  .done-check { width: 40px; height: 40px; }
  .done-eyebrow-line { width: 24px; }
  .done-eyebrow { font-size: 11px; letter-spacing: 0.1em; }`;

const newMobile = `  .done-check-ring { width: 56px; height: 56px; margin-bottom: 14px; }
  .done-check-circle { width: 44px; height: 44px; }
  .done-check-circle svg { width: 20px; height: 20px; }
  .done-badge { padding: 6px 16px; font-size: 10.5px; letter-spacing: 0.12em; margin-bottom: 16px; }`;

if (css.includes(oldMobile)) {
  css = css.replace(oldMobile, newMobile);
}

fs.writeFileSync(cssPath, css, 'utf8');
console.log('SUCCESS: Updated CSS in App.css');
