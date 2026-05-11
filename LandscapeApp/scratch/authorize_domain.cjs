const fs = require('fs');
const path = require('path');

const envPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\server\\.env';
let content = fs.readFileSync(envPath, 'utf8');

const target = 'ALLOWED_ORIGINS=https://designer-jet.vercel.app,https://designer-psi-sepia.vercel.app,http://localhost:5173,http://localhost:5174';
const replacement = 'ALLOWED_ORIGINS=https://designer-jet.vercel.app,https://designer-psi-sepia.vercel.app,http://localhost:5173,http://localhost:5174,https://www.thietke5p.com,https://thietke5p.com';

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('SUCCESS: Added thietke5p.com to ALLOWED_ORIGINS');
} else {
    console.log('ERROR: Could not find ALLOWED_ORIGINS line');
}
