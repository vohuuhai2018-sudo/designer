const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const projectState = 'const [project, setProject] = useState<Project | null>(null);';
const successViewHead = 'function SuccessView({';

if (content.includes(projectState)) {
    // Remove it from current place
    content = content.replace(projectState, '');
    // Insert at top
    const bodyIdx = content.indexOf(') {', content.indexOf(successViewHead)) + 3;
    content = content.slice(0, bodyIdx) + '\\n  ' + projectState + content.slice(bodyIdx);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Moved project state to top');
} else {
    console.log('ERROR: Could not find project state');
}
