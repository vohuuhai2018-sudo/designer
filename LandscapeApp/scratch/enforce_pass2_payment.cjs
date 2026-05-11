const fs = require('fs');

const tsxPath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let tsx = fs.readFileSync(tsxPath, 'utf8');

const oldCode = `                    onClick={async () => {
                      if (!pass2Picked) return;
                      setPass2Starting(true);`;

const newCode = `                    onClick={async () => {
                      if (!pass2Picked) return;
                      
                      if (!isPaid) {
                        setPaymentOpen(true);
                        return;
                      }

                      setPass2Starting(true);`;

if (tsx.includes(oldCode)) {
  tsx = tsx.replace(oldCode, newCode);
  fs.writeFileSync(tsxPath, tsx, 'utf8');
  console.log('SUCCESS: Injected payment check for pass2 creation.');
} else {
  console.log('ERROR: Could not find the pass2 button onClick handler block.');
  // Try with different indentation just in case
  const oldCode2 = `                    onClick={async () => {
                      if (!pass2Picked) return;
                      setPass2Starting(true);`.replace(/\s+/g, ' ');
  console.log('Normalized search might be needed.');
}
