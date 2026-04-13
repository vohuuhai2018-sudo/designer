
import fs from 'fs';

const filePath = 'd:/4. DỰ ÁN SƠN HẢI/1. WEB/APP VẼ/LandscapeApp/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the unsafe renaming block
const targetRename = `                          const newLib = { ...systemContent.library };
                          const catList = [...newLib[selectedCat as keyof typeof ASSETS]];
                          const pIdx = catList.findIndex((it: any) => it.id === selectedItem.id);
                          if (pIdx !== -1) {
                            const vars = [...catList[pIdx].variants];
                            vars[vIdx] = { ...vars[vIdx], name: e.target.value };
                            catList[pIdx] = { ...catList[pIdx], variants: vars };
                            newLib[selectedCat as keyof typeof ASSETS] = catList as any;
                            onSystemContentUpdate({ ...systemContent, library: newLib });
                            setSelectedItem(catList[pIdx]);
                          }`;

const replacementRename = `                          const currentLib = systemContent.library || ASSETS;
                          const newLib = { ...currentLib };
                          const cat = selectedCat as keyof typeof ASSETS;
                          const catList = [...(newLib[cat] || (ASSETS as any)[cat])];
                          const pIdx = catList.findIndex((it: any) => it.id === selectedItem.id);
                          if (pIdx !== -1) {
                            const vars = [...catList[pIdx].variants];
                            vars[vIdx] = { ...vars[vIdx], name: e.target.value };
                            catList[pIdx] = { ...catList[pIdx], variants: vars };
                            newLib[cat] = catList as any;
                            onSystemContentUpdate({ ...systemContent, library: newLib });
                            setSelectedItem(catList[pIdx]);
                          }`;

if (content.includes(targetRename)) {
    content = content.replace(targetRename, replacementRename);
    console.log('Renaming block updated.');
} else {
    console.log('Renaming block NOT found.');
}

// Update the broken Unsplash URL for HO
const oldUrl = 'https://images.unsplash.com/photo-1590424765691-8f3f8902636e?q=80&w=1200';
const newUrl = 'https://images.unsplash.com/photo-1590059132718-502424533173?q=80&w=1200';
content = content.split(oldUrl).join(newUrl);

fs.writeFileSync(filePath, content);
console.log('File updated successfully.');
