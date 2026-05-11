const fs = require('fs');
const f = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/audioRef\.current\.volume = 0\.05; console\.log\("Background music volume set to 0\.05"\);/g, 'audioRef.current.volume = 0.3;');
fs.writeFileSync(f, c, 'utf8');
console.log('DONE: volume set to 0.3');
