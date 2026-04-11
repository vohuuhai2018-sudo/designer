import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');
const searchStr = "      if (event.data === 'ready') {\n        setDesignerReady(true);\n        setDesignerStatus('áº¢nh gá»‘c Ä‘Ã£ vÃ o khung lÃ m viá»‡c. CÃ³ thá»ƒ kÃ©o hoáº·c náº¡p thÃªm tÃ i nguyÃªn.');\n        return;\n      }";
// Actually, let's just find the first one and keep it, and delete the second one if it exists.
// Or just match the mangled vietnamese string precisely.
const parts = c.split(searchStr);
if (parts.length > 1) {
    c = parts.join("");
}
fs.writeFileSync('src/App.tsx', c);
