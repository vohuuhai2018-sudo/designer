const fs = require('fs');
const path = require('path');

const envPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\.env';
let content = fs.readFileSync(envPath, 'utf8');

const target = 'VITE_API_URL=http://127.0.0.1:5000';
const replacement = 'VITE_API_URL=https://automatic-resisting-clumsily.ngrok-free.dev';

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('SUCCESS: Updated VITE_API_URL to public ngrok URL');
} else {
    console.log('ERROR: Could not find VITE_API_URL line');
}
