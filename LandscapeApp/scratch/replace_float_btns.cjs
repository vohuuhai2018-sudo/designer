const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldBlock = `<div className="wd-float">
        <a className="wd-float-pill wd-float-tel" href="tel:0888220044">
          <PhoneCall size={18} /><span>08 88220044</span>
        </a>
        <a className="wd-float-pill wd-float-zalo" href="https://zalo.me/0888220044" target="_blank" rel="noopener noreferrer">
          <MessageCircle size={18} /><span>Chat Zalo</span>
        </a>
      </div>`;

const newBlock = `<div className="wd-float">
        <a className="wd-float-pill wd-float-support" href="https://zalo.me/0888220044" target="_blank" rel="noopener noreferrer">
          <MessageCircle size={20} /><span>Chat Hỗ Trợ</span>
        </a>
      </div>`;

if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Replaced floating buttons');
} else {
    console.log('ERROR: Target block not found');
}
