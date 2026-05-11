const fs = require('fs');
const path = require('path');

const appPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
const cssPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';

let appContent = fs.readFileSync(appPath, 'utf8');
let cssContent = fs.readFileSync(cssPath, 'utf8');

// 1. Update App.tsx - Add 'ready pulse' classes to submit button
const oldBtn = 'className={`btn btn-primary btn-lg dv-submit ${!isReady ? \'disabled\' : \'\'}`}';
const newBtn = 'className={`btn btn-primary btn-lg dv-submit ${isReady ? \'ready pulse\' : \'disabled\'}`}';
if (appContent.includes(oldBtn)) {
    appContent = appContent.replace(oldBtn, newBtn);
}

// 2. Update App.css - Move support button up on mobile and style ready button
const supportMove = `@media (max-width: 720px) {
  .wd-float {
    bottom: 120px !important; /* Move higher to avoid covering action buttons */
    right: 20px !important;
    z-index: 9999 !important;
  }
}`;

const readyBtnStyles = `
/* Submit Button Upgrade */
.dv-submit.disabled {
  opacity: 0.5;
  filter: grayscale(0.8);
  pointer-events: none;
  background: #ccc !important;
  box-shadow: none !important;
}

.dv-submit.ready {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important; /* Vibrant green when ready */
  box-shadow: 0 10px 30px rgba(34, 197, 94, 0.4) !important;
  transform: scale(1.02);
}

.dv-submit.pulse {
  animation: btnPulse 2s infinite;
}

@keyframes btnPulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}
`;

// Replace existing .wd-float media query if it exists, or append
const floatRegex = /@media\s*\(max-width:\s*720px\)\s*\{\s*\.wd-float\s*\{[^}]*\}\s*\}/g;
if (floatRegex.test(cssContent)) {
    cssContent = cssContent.replace(floatRegex, supportMove);
} else {
    cssContent += '\n' + supportMove;
}

cssContent += '\n' + readyBtnStyles;

fs.writeFileSync(appPath, appContent, 'utf8');
fs.writeFileSync(cssPath, cssContent, 'utf8');

console.log('SUCCESS: Moved support button and upgraded submit button UX');
