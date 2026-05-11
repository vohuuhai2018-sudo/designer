const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `<h1 className="done-title">Bản vẽ đã sẵn sàng.<br /><em>Anh/chị thấy thế nào?</em></h1>`;
const replacement = `<h1 className="done-title">Bản vẽ đã sẵn sàng.</h1>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Removed text from success view');
} else {
    console.log('ERROR: Could not find target text in App.tsx');
}
