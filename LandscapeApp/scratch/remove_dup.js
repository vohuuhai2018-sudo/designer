import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Find the second occurrence of "const handleRunChatGptAutomation = async () => {"
// and remove it along with its body.

const lines = c.split('\\n');
let count = 0;
let startIndex = -1;
let openBrackets = 0;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleRunChatGptAutomation = async () => {')) {
    count++;
    if (count === 2) {
      startIndex = i;
      openBrackets = 1;
      // Start counting brackets to find the end of the function
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].includes('{')) openBrackets += (lines[j].match(/\\{/g) || []).length;
        if (lines[j].includes('}')) openBrackets -= (lines[j].match(/\\}/g) || []).length;
        if (openBrackets === 0) {
          endIndex = j;
          break;
        }
      }
      break;
    }
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 1);
  fs.writeFileSync('src/App.tsx', lines.join('\\n'));
  console.log('Removed second duplicate successfully.');
} else {
  console.log('Could not find second occurrence.');
}
