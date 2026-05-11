const fs = require('fs');
const f = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let c = fs.readFileSync(f, 'utf8');

// Fix the 3 broken lines
c = c.replace(".catch(() => {\n          console.error('Failed to load projects:', err);", ".catch(err => {\n          console.error('Failed to load projects:', err);");
c = c.replace('audio.play().catch(() => console.log("Autoplay blocked:", e));', 'audio.play().catch(e => console.log("Autoplay blocked:", e));');
c = c.replace('const audio = new Audio(\'/assets/Voice tải mẫu.wav\');\n      audio.play().catch(() => console.log("Autoplay blocked:", e));', 'const audio = new Audio(\'/assets/Voice tải mẫu.wav\');\n      audio.play().catch(e => console.log("Autoplay blocked:", e));');

fs.writeFileSync(f, c, 'utf8');
console.log("SUCCESS: Fixed broken catch blocks.");
