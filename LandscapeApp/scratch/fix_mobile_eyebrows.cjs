const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const mobileFix = `
/* Fix mobile eyebrows and alignment */
@media (max-width: 720px) {
  .wd-hero-eyebrow::before,
  .body-eyebrow::before,
  .welcome-redesign .body-eyebrow::before,
  .success-view .eyebrow.body-eyebrow::before {
    display: none !important;
  }
  
  .wd-hero-inner {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
  }
  
  .wd-display {
    text-align: center !important;
  }
  
  .wd-hero-sub {
    text-align: center !important;
  }
  
  .wd-hero-actions {
    justify-content: center !important;
    width: 100% !important;
  }
  
  .welcome-redesign .eyebrow {
    justify-content: center !important;
    width: 100% !important;
    text-align: center !important;
  }
}
`;

content += mobileFix;

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Removed mobile eyebrow lines and centered hero content');
