const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const supportCSS = `
.wd-float-support { 
  background: #0068FF; 
  color: #fff; 
  box-shadow: 0 12px 24px rgba(0, 104, 255, 0.3);
  padding: 14px 28px !important;
}
.wd-float-support:hover {
  background: #0056D2;
  box-shadow: 0 18px 36px rgba(0, 104, 255, 0.45);
  transform: translateY(-4px) scale(1.02);
}
@media (max-width: 720px) {
  .wd-float-support span { display: inline !important; }
  .wd-float-support { border-radius: 999px !important; padding: 12px 20px !important; }
}
`;

content += supportCSS;
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added support button CSS');
