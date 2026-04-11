import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');
c = c.replace(/''/g, "'");
fs.writeFileSync('src/App.tsx', c);
