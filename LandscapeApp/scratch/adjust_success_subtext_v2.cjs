const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /\.done-sub \{[\s\S]*?font-size: 16px;[\s\S]*?\}/;

const replacement = `.done-sub {
  font-size: 17px;
  color: var(--ink-700);
  line-height: 1.65;
  margin: 16px auto 0;
  max-width: 680px;
  text-wrap: balance;
  opacity: 0.9;
}`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Adjusted done-sub style (regex)');
} else {
    console.log('ERROR: Could not find .done-sub style');
}
