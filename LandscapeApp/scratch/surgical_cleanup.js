import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Clean up the duplicated pushAssetToDesigner logic
const duplicateBlock = /reader\.readAsDataURL\(blob\);\s+\} catch \(error\) \{\s+console\.error\('Designer asset load error:', error\);\s+setDesignerStatus\(`Không thể nạp nhanh \${item\.label}\. Bạn có thể kéo thả thủ công\.`\);\s+\}\s+\};/g;

let count = 0;
c = c.replace(duplicateBlock, (match) => {
    count++;
    if (count === 2) return ""; // Remove the second one
    return match;
});

// Also fix the double close brace if any
c = c.replace(/\}\s+catch \(error\) \{\s+console\.error\('Designer asset load error:', error\);\s+setDesignerStatus\(`Không thể nạp nhanh \${item\.label}\. Bạn có thể kéo thả thủ công\.`\);\s+\}\s+\};\s+const handleDesignerLocalFile/g, "} catch (error) { console.error('Designer asset load error:', error); setDesignerStatus(`Không thể nạp nhanh ${item.label}. Bạn có thể kéo thả thủ công.`); } }; const handleDesignerLocalFile");

fs.writeFileSync('src/App.tsx', c);
