const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Change initial volume for NHAC CHO 3.mp3
const oldVolumeLine = `      audioRef.current.volume = 1;`;
const newVolumeLine = `      audioRef.current.volume = 0.15;`; // Giảm xuống mức nhẹ nhàng (15%)

// 2. Change reset volume in fade out logic
const oldResetLine = `              audioRef.current.volume = 1;`;
const newResetLine = `              audioRef.current.volume = 0.15;`;

content = content.replace(oldVolumeLine, newVolumeLine);
content = content.replace(oldResetLine, newResetLine);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Reduced background music volume to 15%');
