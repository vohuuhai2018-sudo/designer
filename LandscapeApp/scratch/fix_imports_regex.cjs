const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /FileCheck2,\s+MessageCircle,\s+UploadCloud,/;

const replacement = `FileCheck2,
  UploadCloud,`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Removed duplicate MessageCircle using regex');
} else {
    console.log('ERROR: Regex did not match imports');
}
