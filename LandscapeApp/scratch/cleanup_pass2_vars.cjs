const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Use a more robust regex that ignores whitespaces
content = content.replace(/const \[pass2W, setPass2W\] = useState\('4'\);[\r\n]*/, '');
content = content.replace(/const \[pass2L, setPass2L\] = useState\('4'\);[\r\n]*/, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
