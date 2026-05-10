const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.css');
let content = fs.readFileSync(filePath, 'utf8');

const desktopCSS = `
@media (min-width: 900px) {
  .wd-hero-inner {
    text-align: left;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 32px;
    padding: 64px 56px;
    box-shadow: 0 24px 48px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9);
    max-width: 640px;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .wd-hero {
    align-items: center;
  }
  .wd-display {
    text-align: left;
    margin: 16px 0 24px;
    font-size: clamp(48px, 6vw, 86px);
  }
  .wd-hero-sub {
    text-align: left;
    max-width: 100%;
    font-size: 18px;
    color: var(--ink-800);
  }
  .wd-hero-actions {
    justify-content: flex-start;
    margin-top: 32px;
  }
  .wd-hero-strip {
    justify-content: flex-start;
    margin-top: 32px;
    padding: 12px 20px;
    background: rgba(255,255,255,0.7);
    border-radius: 100px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  }
}
`;

content += desktopCSS;

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
