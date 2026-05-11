const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldSupport = `<a className="wd-float-support-icon" href="https://zalo.me/0888220044" target="_blank" rel="noopener noreferrer" title="Chat Hỗ Trợ">
            <MessageCircle size={30} />
          </a>`;
const newSupport = `<a className="wd-float-support-icon" href="https://zalo.me/0888220044" target="_blank" rel="noopener noreferrer" title="Chat Hỗ Trợ">
            <User size={22} strokeWidth={2.5} />
            <span>Hỗ trợ</span>
          </a>`;

if (content.includes(oldSupport)) {
    content = content.replace(oldSupport, newSupport);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Updated Support button in App.tsx');
} else {
    console.log('ERROR: Could not find Support button in App.tsx');
}
