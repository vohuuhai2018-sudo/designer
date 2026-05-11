const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /\{\/\* Floating contact \*\/\}[\s\S]*?<div className="wd-float">[\s\S]*?<\/div>/;

if (regex.test(content)) {
    // There might be two now, one in WelcomeView and one in App return.
    // We want to remove the one inside the WelcomeView component.
    // The one in App return is inside createPortal.
    
    // Let's find the one NOT inside createPortal.
    content = content.replace(regex, (match) => {
        if (match.includes('createPortal')) return match; // Keep the portal one
        return ''; // Remove the direct one
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Removed direct floating button');
} else {
    console.log('ERROR: Could not find floating button to remove');
}
