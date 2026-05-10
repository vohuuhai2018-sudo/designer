const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const sectionRegex = /(<section id="top" className="wd-hero">[\s\S]*?<div className="wd-container">[\s\S]*?<div className="wd-hero-inner glass-hero">[\s\S]*?<\/div>)\s*<\/section>/;

if (sectionRegex.test(content)) {
    content = content.replace(sectionRegex, '$1\n        </div>\n      </section>');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully fixed App.tsx');
} else {
    console.log('Regex did not match. Trying fallback...');
    const endStripRegex = /(<div className="wd-hero-strip">[\s\S]*?<\/div>)\s*<\/div>\s*<\/section>/;
    if (endStripRegex.test(content)) {
        content = content.replace(endStripRegex, '$1\n        </div>\n        </div>\n      </section>');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Successfully fixed App.tsx with fallback');
    } else {
        console.log('Could not find the hero section to fix.');
    }
}
