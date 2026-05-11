const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /setLoaded\(true\);\s*\}\s*\}\s*\};/;
const replacement = `setLoaded(true);
      }
    };`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Fixed double brace syntax error with regex');
} else {
    console.log('ERROR: Could not find broken braces with regex');
}
