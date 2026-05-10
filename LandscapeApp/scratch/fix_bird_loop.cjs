const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// Match the exact indentation from debug output (19 spaces)
const old = `                   onEnded={(e) => { e.currentTarget.currentTime = 1; e.currentTarget.play(); }}`;

const replacement = `                   loop
                   onTimeUpdate={(e) => {
                     const v = e.currentTarget;
                     if (v.duration && v.currentTime < 0.95) { v.currentTime = 1; }
                   }}`;

if (content.includes(old)) {
  content = content.replace(old, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('SUCCESS: Replaced onEnded with loop + onTimeUpdate');
} else {
  console.log('ERROR: Target string not found');
}
