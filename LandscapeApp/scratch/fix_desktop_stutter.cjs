const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /position:\s*i === 0 \? 'relative' : 'absolute',[\s\S]*?zIndex:\s*i === idx \? 1 : 0/;

const replacementStr = `position: i === 0 ? 'relative' : 'absolute',
            top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: i === idx ? 1 : 0,
            transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: i === idx ? 1 : 0,
            willChange: 'opacity',
            transform: 'translateZ(0)',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden'`;

if (regex.test(content)) {
  content = content.replace(regex, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("SUCCESS");
} else {
  console.log("NOT FOUND");
}
