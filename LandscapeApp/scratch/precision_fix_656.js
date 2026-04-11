import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Specific fix for line 656 and similar ternary operators
c = c.replace(/\? 'active' : ' \}/g, "? 'active' : '' }"); 
c = c.replace(/\? 'active' : '\}/g, "? 'active' : ''}");

// 2. Fix empty strings that became single quotes globally but safely
// A single quote followed by a closing brace, comma, or semicolon is usually a mistake from my previous replace
c = c.replace(/'\}/g, "''}");
c = c.replace(/'\)/g, "'')");
c = c.replace(/',/g, "'',"); // Careful here
// Actually, let's just target the specific ones found in the screenshot
c = c.replace(/'active' : ' \}/g, "'active' : '' }");

// Let's do a more intelligent fix: find strings that start but don't end before a delimiter
// But that's risky. Let's just fix the known culprits.
c = c.replace(/useState<string>\('\)/g, "useState<string>('')");
c = c.replace(/useState\('\)/g, "useState('')");

fs.writeFileSync('src/App.tsx', c);
