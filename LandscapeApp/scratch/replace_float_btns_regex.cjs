const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /<div className="wd-float">[\s\S]*?<\/div>/;

const newBlock = `<div className="wd-float">
        <a className="wd-float-pill wd-float-support" href="https://zalo.me/0888220044" target="_blank" rel="noopener noreferrer">
          <MessageCircle size={20} /><span>Chat Hỗ Trợ</span>
        </a>
      </div>`;

if (regex.test(content)) {
    content = content.replace(regex, newBlock);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Replaced floating buttons using regex');
} else {
    console.log('ERROR: Regex did not match');
}
