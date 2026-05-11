const fs = require('fs');
const f = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let c = fs.readFileSync(f, 'utf8');

// Fix unused 'e' in catch blocks
c = c.replace(/\.catch\((e|err) =>/g, '.catch(() =>');

fs.writeFileSync(f, c, 'utf8');
console.log("SUCCESS: Removed unused 'e' variables in catch blocks.");
