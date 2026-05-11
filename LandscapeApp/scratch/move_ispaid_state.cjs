const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const isPaidState = 'const isPaid = (project as any)?.payment?.status === \'paid\';';
const projectState = 'const [project, setProject] = useState<Project | null>(null);';

if (content.includes(isPaidState)) {
    content = content.replace(isPaidState, '');
    const idx = content.indexOf(projectState) + projectState.length;
    content = content.slice(0, idx) + '\\n  ' + isPaidState + content.slice(idx);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Moved isPaid state below project state');
} else {
    console.log('ERROR: Could not find isPaid state');
}
