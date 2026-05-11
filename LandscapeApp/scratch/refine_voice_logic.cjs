const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetEffect = `  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice tải mẫu.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);`;

const fixedEffect = `  useEffect(() => {
    if (subStep !== 'gallery') return;
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice tải mẫu.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 3000);
    return () => clearTimeout(timer);
  }, [subStep]);`;

if (content.includes(targetEffect)) {
    content = content.replace(targetEffect, fixedEffect);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Updated voice logic for BasicSelectionView');
} else {
    console.log('ERROR: Could not find the voice effect in App.tsx');
}
