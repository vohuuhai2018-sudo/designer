const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const broken = `        setLoaded(true);
      }
      }
    };`;

const fixed = `        setLoaded(true);
      }
    };`;

if (content.includes(broken)) {
    content = content.replace(broken, fixed);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Fixed double brace syntax error');
} else {
    console.log('ERROR: Could not find broken braces');
}
