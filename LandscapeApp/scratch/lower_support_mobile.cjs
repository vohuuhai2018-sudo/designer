const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

// Search for all occurrences of .wd-float inside media queries that set bottom
// and replace them with a lower value.

content = content.replace(/bottom:\s*40px\s*!important;/g, 'bottom: 12px !important;');
content = content.replace(/bottom:\s*30px\s*!important;/g, 'bottom: 12px !important;');
content = content.replace(/bottom:\s*max\(48px,[^)]+\)\s*!important;/g, 'bottom: 12px !important;');
content = content.replace(/bottom:\s*120px\s*!important;/g, 'bottom: 12px !important;');

// Also check for any other large bottom values for .wd-float on mobile
content = content.replace(/\.wd-float\s*\{\s*bottom:\s*[^;!]+!important;/g, '.wd-float { bottom: 12px !important;');

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Lowered support button position on mobile');
