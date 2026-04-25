const fs = require('fs');

const filePath = 'D:/4. DỰ ÁN SƠN HẢI/1. WEB/APP VẼ/LandscapeApp/src/App.tsx';

// Read file
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Configuration
const START_LINE = 2739;
const END_LINE = 3053;

console.log('Analyzing lines ' + (START_LINE + 1) + ' to ' + (END_LINE + 1) + ' (AssetManagerView return statement)');
console.log('================================================================================');

// Stack to track open divs
const stack = [];

// Stats
let stats = {
    openingDivs: 0,
    selfClosingDivs: 0,
    closingDivs: 0
};

// Function to check if we're inside a string
function isInsideString(line, position) {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let escaped = false;
    
    for (let i = 0; i < position; i++) {
        const char = line[i];
        
        if (escaped) {
            escaped = false;
            continue;
        }
        
        if (char === '\\\\') {
            escaped = true;
            continue;
        }
        
        if (char === "'" && !inDoubleQuote && !inBacktick) {
            inSingleQuote = !inSingleQuote;
        } else if (char === '"' && !inSingleQuote && !inBacktick) {
            inDoubleQuote = !inDoubleQuote;
        } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
            inBacktick = !inBacktick;
        }
    }
    
    return inSingleQuote || inDoubleQuote || inBacktick;
}

// Function to extract className from a div opening tag
function extractClassName(line, startPos) {
    const classNameMatch = line.slice(startPos).match(/className\s*=\s*(?:{([^}]+)}|"([^"]+)"|'"'"'([^'"'"']+)'"'"'|`([^`]+)`)/);
    if (classNameMatch) {
        return classNameMatch[1] || classNameMatch[2] || classNameMatch[3] || classNameMatch[4];
    }
    return '(no className)';
}

// Function to process a single line
function processLine(lineNum, line) {
    let i = 0;
    const len = line.length;
    
    while (i < len) {
        // Check for closing div tag first
        if (line[i] === '<' && i + 5 <= len && line.slice(i, i + 6) === '</div>') {
            if (!isInsideString(line, i)) {
                stats.closingDivs++;
                if (stack.length > 0) {
                    const popped = stack.pop();
                    console.log('Line ' + (lineNum + 1) + ': Found </div> - closes div from line ' + (popped.line + 1) + ' (' + popped.className + ')');
                } else {
                    console.log('Line ' + (lineNum + 1) + ': WARNING - </div> with no matching <div>');
                }
                i += 6;
                continue;
            }
        }
        
        // Check for opening div tag
        if (line[i] === '<' && i + 3 <= len && line.slice(i, i + 4) === '<div') {
            const afterDiv = line.slice(i + 4);
            if (afterDiv.startsWith('/>')) {
                if (!isInsideString(line, i)) {
                    stats.selfClosingDivs++;
                    console.log('Line ' + (lineNum + 1) + ': Found <div/> (self-closing)');
                }
                i += 5;
                continue;
            } else if (afterDiv.startsWith('>') || /^\s/.test(afterDiv[0])) {
                if (!isInsideString(line, i)) {
                    stats.openingDivs++;
                    const className = extractClassName(line, i);
                    const stackItem = { line: lineNum, className };
                    stack.push(stackItem);
                    console.log('Line ' + (lineNum + 1) + ': Found <div...> - pushed to stack (' + className + ')');
                }
                i += 4;
                continue;
            }
        }
        
        i++;
    }
}

// Process each line in the range
console.log('');
console.log('Processing lines:');
console.log('');
for (let i = START_LINE; i <= END_LINE; i++) {
    processLine(i, lines[i]);
}

// Report results
console.log('');
console.log('================================================================================');
console.log('RESULTS:');
console.log('================================================================================');
console.log('Opening <div> tags: ' + stats.openingDivs);
console.log('Self-closing <div/> tags: ' + stats.selfClosingDivs);
console.log('Closing </div> tags: ' + stats.closingDivs);
console.log('Remaining in stack (UNCLOSED): ' + stack.length);

if (stack.length > 0) {
    console.log('');
    console.log('================================================================================');
    console.log('UNCLOSED DIVS (still in stack):');
    console.log('================================================================================');
    for (const item of stack) {
        console.log('Line ' + (item.line + 1) + ': <div class="' + item.className + '">');
    }
} else {
    console.log('');
    console.log('All divs are properly closed!');
}