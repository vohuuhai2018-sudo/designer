import fs from 'fs';

const filePath = 'src/App.tsx';
let c = fs.readFileSync(filePath, 'utf8');

c = c.replace(/\bdif\b/g, 'if');
c = c.replace(/\bdid\b/g, 'id');
c = c.replace(/\bdicon\b/g, 'icon');
c = c.replace(/\bdimg\b/g, 'img');
c = c.replace(/\bdindex\b/g, 'index');
c = c.replace(/\bditem\b/g, 'item');
c = c.replace(/\bdinput\b/g, 'input');
c = c.replace(/\bdisSelected\b/g, 'isSelected');
c = c.replace(/\bdisDisabled\b/g, 'isDisabled');
c = c.replace(/\bdisVideoAsset\b/g, 'isVideoAsset');
c = c.replace(/\bconstd(?=[A-Za-z_])/g, 'const ');
c = c.replace(/\breturnd(?=[A-Za-z_])/g, 'return ');
c = c.replace(/\belsedif\b/g, 'else if');
c = c.replace(/\bdin\b/g, 'in');
c = c.replace(/errordinstanceof/g, 'error instanceof');
c = c.replace(/<motion\.divinitial/g, '<motion.div initial');

fs.writeFileSync(filePath, c, 'utf8');
console.log('fix-code-tokens-done');
