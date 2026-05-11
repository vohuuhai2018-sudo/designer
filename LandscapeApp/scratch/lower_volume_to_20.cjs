const fs = require('fs');

const tsxPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let tsx = fs.readFileSync(tsxPath, 'utf8');

tsx = tsx.replace(/audioRef\.current\.volume = 0\.3;/g, 'audioRef.current.volume = 0.2;');

fs.writeFileSync(tsxPath, tsx, 'utf8');
console.log('SUCCESS: Reduced background music volume to 20% (0.2).');
