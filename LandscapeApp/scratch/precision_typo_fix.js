import fs from 'fs';

let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Fix the double/wrong characters introduced by previous scripts
c = c.replace(/dif \(file\)/g, "if (file)");
c = c.replace(/dinitial=/g, "initial=");

// 2. Fix the line 483 specifically with a string match
const mangledLine483 = "<h3>Mẹo nhỏ  Ồ có phác thảo  ẹp:</h3>";
const cleanLine483 = "<h3>Mẹo nhỏ để có bản phác thảo đẹp:</h3>";
c = c.split(mangledLine483).join(cleanLine483);

// Search and replace any other occurrences of these specific mangled fragments
c = c.replace(/ Ồ/g, "để");
c = c.replace(/ ẹp/g, "đẹp");
c = c.replace(/mu n/g, "muốn");
c = c.replace(/H  trợ/g, "Hỗ trợ");

// Restore any other mangled Vietnamese titles observed
c = c.replace(/áº£nh/g, "ảnh");
c = c.replace(/PhÃ¡c tháº£o/g, "Phác thảo");
c = c.replace(/dá»± Ã¡n/g, "dự án");

fs.writeFileSync('src/App.tsx', c);
