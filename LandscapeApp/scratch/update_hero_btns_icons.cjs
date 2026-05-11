const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Star, Briefcase to imports
content = content.replace('Lightbulb', 'Lightbulb, Star, Briefcase');

// 2. Rename Header CTA
content = content.replace('onClick={() => scrollTo(\'canh-quan\')}>Đặt thiết kế</button>', 'onClick={() => scrollTo(\'canh-quan\')}>Thiết kế</button>');

// 3. Rename Hero CTA
content = content.replace('onClick={() => scrollTo(\'canh-quan\')}>Đặt thiết kế ngay <ArrowRight size={18} /></button>', 'onClick={() => scrollTo(\'canh-quan\')}>Thiết kế ngay <ArrowRight size={20} /></button>');

// 4. Update Hero Strip with Icons
const oldStrip = `<div className="wd-hero-strip">
            <span><b>4,9★</b> đánh giá</span>
            <span className="wd-strip-sep" />
            <span><b>5000+</b> dự án</span>
            <span className="wd-strip-sep" />
            <span><b>5 phút</b> AI render</span>
          </div>`;

const newStrip = `<div className="wd-hero-strip">
            <span><Star size={18} fill="#f59e0b" stroke="#f59e0b" /> <b>4,9</b> đánh giá</span>
            <span className="wd-strip-sep" />
            <span><Briefcase size={18} /> <b>5000+</b> dự án</span>
            <span className="wd-strip-sep" />
            <span><Zap size={18} /> <b>5 phút</b> AI render</span>
          </div>`;

if (content.includes(oldStrip)) {
    content = content.replace(oldStrip, newStrip);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Updated buttons and hero strip in App.tsx');
} else {
    console.log('ERROR: Could not find hero strip in App.tsx');
}
