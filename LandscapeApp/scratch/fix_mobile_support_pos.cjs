const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const oldMobileStyles = `@media (max-width: 720px) {
  .wd-float-support span { display: inline !important; }
  .wd-float-support { border-radius: 999px !important; padding: 12px 20px !important; }
}`;

const newMobileStyles = `@media (max-width: 720px) {
  .wd-float {
    bottom: 40px !important; /* Đẩy lên cao hơn để không bị che bởi thanh điều hướng browser */
    right: 20px !important;
  }
  .wd-float-support { 
    border-radius: 999px !important; 
    padding: 10px 18px !important; 
    font-size: 13px !important;
    box-shadow: 0 8px 20px rgba(0, 104, 255, 0.4) !important;
  }
  .wd-float-support span { display: inline !important; }
}`;

if (content.includes(oldMobileStyles)) {
    content = content.replace(oldMobileStyles, newMobileStyles);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Fixed mobile support button position');
} else {
    // Fallback: search for the last media query
    content += `\n/* Fix mobile float position */\n${newMobileStyles}`;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Appended mobile support button fix');
}
