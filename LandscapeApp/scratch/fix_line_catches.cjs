const fs = require('fs');
const f = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let lines = fs.readFileSync(f, 'utf8').split('\n');

// Line 1828 (index 1827)
if (lines[1827].includes('.catch(() => {') && lines[1828].includes('err')) {
    lines[1827] = lines[1827].replace('() =>', 'err =>');
}

// Line 2866 (index 2865)
if (lines[2865].includes('.catch(() => console.log("Autoplay blocked:", e))')) {
    lines[2865] = lines[2865].replace('() =>', 'e =>');
}

// Line 3892 (index 3891)
if (lines[3891].includes('.catch(() => console.log("Autoplay blocked:", e))')) {
    lines[3891] = lines[3891].replace('() =>', 'e =>');
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log("SUCCESS");
