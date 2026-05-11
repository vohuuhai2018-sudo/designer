const fs = require('fs');
const f = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let c = fs.readFileSync(f, 'utf8');

// 1. Fix TS error at line 5341
c = c.replace("link.href = task.url;", "link.href = task.url as string;");

// 2. Disable music block properly
const musicStart = "if (!isDone) {";
const musicMarker = "audioRef.current = new Audio(''); // Tạm tắt nhạc chờ";
const startIdx = c.lastIndexOf(musicStart, c.indexOf(musicMarker));

if (startIdx !== -1) {
    let braceCount = 0;
    let endIdx = -1;
    for(let i=startIdx; i<c.length; i++) {
        if (c[i] === '{') braceCount++;
        else if (c[i] === '}') braceCount--;
        
        if (braceCount === 0 && i > startIdx) {
            endIdx = i;
            break;
        }
    }
    if (endIdx !== -1) {
        const before = c.substring(0, startIdx);
        const block = c.substring(startIdx, endIdx + 1);
        const after = c.substring(endIdx + 1);
        
        const newContent = before + "/*\n    " + block + "\n    */" + after;
        c = newContent;
        console.log("SUCCESS: Commented out music block and fixed TS error.");
    }
}

fs.writeFileSync(f, c, 'utf8');
