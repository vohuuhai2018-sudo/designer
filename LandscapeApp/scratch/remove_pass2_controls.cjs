const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetRegex = /<div className="pass2-controls">[\s\S]*?<div className="num-fixed">2 video <Lock size=\{14\} \/><\/div>\s*<\/div>\s*<\/div>/;

if (targetRegex.test(content)) {
  content = content.replace(targetRegex, '');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("SUCCESS");
} else {
  console.log("NOT FOUND");
}
