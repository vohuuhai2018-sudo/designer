const fs = require('fs');
const f = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let lines = fs.readFileSync(f, 'utf8').split('\n');

let found = false;
for(let i=0; i<lines.length; i++) {
    if (lines[i].trim() === '<Sparkles size={18} />' && lines[i+1].includes('{pass2Starting')) {
        console.log("Found button UI at " + i);
        lines[i] = lines[i].replace('<Sparkles size={18} />', '{pass2Starting ? <Loader2 size={18} className="spin" /> : (isPaid ? <Sparkles size={18} /> : <CreditCard size={18} />)}');
        
        for(let k=i+1; k<i+10; k++) {
            if (lines[k].includes('? `Tiếp tục tạo bổ sung từ Phương án')) {
                const indent = lines[k].match(/^(\s*)/)[0];
                lines[k] = indent + "? (isPaid ";
                lines.splice(k+1, 0, 
                    indent + "    ? `Tiếp tục tạo bổ sung từ Phương án ${allImages.indexOf(pass2Picked) + 1}`",
                    indent + "    : `Thanh toán để tạo bổ sung từ PA ${allImages.indexOf(pass2Picked) + 1}`)"
                );
                found = true;
                break;
            }
        }
        if (found) break;
    }
}

if (found) {
    fs.writeFileSync(f, lines.join('\n'), 'utf8');
    console.log("SUCCESS");
} else {
    console.log("FAILED");
}
