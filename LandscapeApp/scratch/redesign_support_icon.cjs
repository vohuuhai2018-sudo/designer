const fs = require('fs');
const path = require('path');

// 1. Update App.tsx
const tsxPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let tsxContent = fs.readFileSync(tsxPath, 'utf8');

const oldTsx = `<div className="wd-float">
        <a className="wd-float-pill wd-float-support" href="https://zalo.me/0888220044" target="_blank" rel="noopener noreferrer">
          <MessageCircle size={20} /><span>Chat Hỗ Trợ</span>
        </a>
      </div>`;

const newTsx = `<div className="wd-float">
        <a className="wd-float-support-icon" href="https://zalo.me/0888220044" target="_blank" rel="noopener noreferrer" title="Chat Hỗ Trợ">
          <MessageCircle size={30} />
        </a>
      </div>`;

if (tsxContent.includes(oldTsx)) {
    tsxContent = tsxContent.replace(oldTsx, newTsx);
} else {
    // Regex fallback
    tsxContent = tsxContent.replace(/<div className="wd-float">[\s\S]*?<\/div>/, newTsx);
}
fs.writeFileSync(tsxPath, tsxContent, 'utf8');

// 2. Update App.css
const cssPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

const supportBtnStyles = `
/* Redesign support button as a fixed icon */
.wd-float-support-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #0068FF;
  color: #fff;
  box-shadow: 0 10px 30px rgba(0, 104, 255, 0.4);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
}

.wd-float-support-icon:hover {
  transform: scale(1.1) translateY(-5px);
  background: #0056D2;
  box-shadow: 0 15px 45px rgba(0, 104, 255, 0.5);
}

/* Pulsing effect to attract attention */
.wd-float-support-icon::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #0068FF;
  z-index: -1;
  animation: supportPulse 2s infinite;
}

@keyframes supportPulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.5); opacity: 0; }
}

@media (max-width: 720px) {
  .wd-float {
    bottom: 30px !important;
    right: 20px !important;
    left: auto !important;
  }
  .wd-float-support-icon {
    width: 60px;
    height: 60px;
    box-shadow: 0 8px 25px rgba(0, 104, 255, 0.45);
  }
}
`;

// Remove old support CSS if it exists and append new one
cssContent = cssContent.replace(/\.wd-float-support \{[\s\S]*?\}/g, '');
cssContent = cssContent.replace(/@media \(max-width: 720px\) \{\s+\.wd-float-support span[\s\S]*?\}\s+\.wd-float-support[\s\S]*?\}/g, '');
// Also remove the specific mobile fix appended earlier
cssContent = cssContent.replace(/\/\* Fix mobile float position \*\/[\s\S]*?@media \(max-width: 720px\) \{[\s\S]*?\}\s*\}\s*/g, '');

cssContent += supportBtnStyles;
fs.writeFileSync(cssPath, cssContent, 'utf8');

console.log('SUCCESS: Redesigned support button as fixed icon');
