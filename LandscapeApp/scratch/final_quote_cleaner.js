import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// The file is currently plagued with multi-quote errors like ''' or '' at the end of strings.

// 1. Fix the triple quotes to double (empty string)
c = c.replace(/'''/g, "''");

// 2. Fix the specific draw/select mangled strings
c = c.replace(/'draw''/g, "'draw'");
c = c.replace(/'select''/g, "'select'");

// 3. Fix any other strings that ended with double single quotes by accident
// Pattern: string content followed by ''
c = c.replace(/'([^']+)''/g, "'$1'");

// 4. Ensure empty string initializers are correct
c = c.replace(/useState<string>\(''\)/g, "useState<string>('')"); // Standard
c = c.replace(/useState\(''\)/g, "useState('')");

fs.writeFileSync('src/App.tsx', c);
