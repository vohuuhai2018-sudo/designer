const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Set volume to 0.05 (5%) and add logging
content = content.replace(/audioRef\.current\.volume = 0\.15;/g, 'audioRef.current.volume = 0.05; console.log("Background music volume set to 0.05");');

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Further reduced background music volume to 5% and added logging.');
