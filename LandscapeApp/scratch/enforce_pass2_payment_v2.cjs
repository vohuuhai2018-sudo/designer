const fs = require('fs');

const tsxPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let lines = fs.readFileSync(tsxPath, 'utf8').split('\n');

let found = false;
for (let i = 0; i < lines.length; i++) {
  // Look for the pass2 button onClick handler
  if (lines[i].includes('onClick={async () => {') && lines[i+1].includes('if (!pass2Picked) return;') && lines[i+2].includes('setPass2Starting(true);')) {
    // Make sure we are in the pass2-cta button context (check lines above)
    let isPass2Cta = false;
    for (let j = i-1; j > i-10; j--) {
      if (lines[j] && lines[j].includes('pass2-cta')) {
        isPass2Cta = true;
        break;
      }
    }
    
    if (isPass2Cta) {
      console.log(`Found target at line ${i+1}`);
      const indent = lines[i+1].match(/^(\s*)/)[0];
      const newLines = [
        `${indent}if (!isPaid) {`,
        `${indent}  setPaymentOpen(true);`,
        `${indent}  return;`,
        `${indent}}`,
        ''
      ];
      lines.splice(i+2, 0, ...newLines);
      found = true;
      break;
    }
  }
}

if (found) {
  fs.writeFileSync(tsxPath, lines.join('\n'), 'utf8');
  console.log('SUCCESS: Injected payment check for pass2 creation.');
} else {
  console.log('ERROR: Could not find the target block using line scanning.');
}
