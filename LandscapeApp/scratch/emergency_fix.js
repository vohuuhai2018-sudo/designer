import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// The catastrophic mistake was replacing '' (empty string) with ' (single quote).
// We need to find patterns like (' ) or (", ') or similar and fix them.

// First, fix the most common one: useState(') -> useState('')
c = c.replace(/useState<string>\('\)/g, "useState<string>('')");
c = c.replace(/useState\('\)/g, "useState('')");

// Fix other common patterns where a closing quote might have been lost before a comma or bracket
c = c.replace(/\('\)/g, "('')");
c = c.replace(/, '\)/g, ", '')");
c = c.replace(/: '\)/g, ": '')");
c = c.replace(/= '\);/g, "= '';");

// Specifically fix the ones I added in handleDesignerMessage if they got mangled again
c = c.replace(/id: 'raw-initial'/g, "id: 'raw-initial'"); // Should be fine if they were ' initially

fs.writeFileSync('src/App.tsx', c);
