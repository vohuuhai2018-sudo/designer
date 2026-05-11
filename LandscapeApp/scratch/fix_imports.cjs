const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The lines are:
// 62:   FileCheck2,
// 63:   MessageCircle,
// 64:   UploadCloud,

const target = `  FileCheck2,
  MessageCircle,
  UploadCloud,`;

const replacement = `  FileCheck2,
  UploadCloud,`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Removed duplicate MessageCircle');
} else {
    console.log('ERROR: Target imports not found');
}
