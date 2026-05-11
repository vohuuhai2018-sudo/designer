const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const target = `.done-sub {
  font-size: 16px;
  color: var(--ink-700);
  line-height: 1.6;
  margin: 0;
}`;

const replacement = `.done-sub {
  font-size: 17px;
  color: var(--ink-700);
  line-height: 1.6;
  margin: 16px auto 0;
  max-width: 720px;
  text-wrap: balance;
}`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Adjusted done-sub style');
} else {
    console.log('ERROR: Could not find .done-sub styles exactly');
}
