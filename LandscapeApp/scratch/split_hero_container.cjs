const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace('<div className="wd-container wd-hero-inner">', '<div className="wd-container">\n          <div className="wd-hero-inner">');
content = content.replace('          </div>\n          <div className="wd-hero-strip">', '          </div>\n          <div className="wd-hero-strip">');

// Need to add closing div for wd-hero-inner.
// Let's find wd-hero-strip and its closing div
//          <div className="wd-hero-strip">
//            ...
//          </div>
//        </div> <- This was closing wd-container wd-hero-inner
// We need to make it:
//          </div>
//        </div>
//        </div>

const targetStrip = `          <div className="wd-hero-strip">
            <span><Star size={12}/> 4.9+ đánh giá</span>
            <span className="dot"></span>
            <span><Check size={12}/> 5000+ dự án</span>
            <span className="dot"></span>
            <span><Zap size={12}/> 5 phút AI render</span>
          </div>
        </div>`;

const newStrip = `          <div className="wd-hero-strip">
            <span><Star size={12}/> 4.9+ đánh giá</span>
            <span className="dot"></span>
            <span><Check size={12}/> 5000+ dự án</span>
            <span className="dot"></span>
            <span><Zap size={12}/> 5 phút AI render</span>
          </div>
          </div>
        </div>`;

content = content.replace(targetStrip, newStrip);

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
