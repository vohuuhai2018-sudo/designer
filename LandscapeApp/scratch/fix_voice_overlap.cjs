const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix UploadView (Voice hướng dẫn.wav)
const oldUploadEffect = `  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice hướng dẫn.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 2000);
    return () => clearTimeout(timer);
  }, []);`;

const newUploadEffect = `  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    const timer = setTimeout(() => {
      audio = new Audio('/assets/Voice hướng dẫn.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 2000);
    return () => {
      clearTimeout(timer);
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);`;

// 2. Fix BasicSelectionView (Voice tải mẫu.wav)
const oldSelectionEffect = `  useEffect(() => {
    if (subStep !== 'gallery') return;
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice tải mẫu.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 3000);
    return () => clearTimeout(timer);
  }, [subStep]);`;

const newSelectionEffect = `  useEffect(() => {
    if (subStep !== 'gallery') return;
    let audio: HTMLAudioElement | null = null;
    const timer = setTimeout(() => {
      audio = new Audio('/assets/Voice tải mẫu.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 3000);
    return () => {
      clearTimeout(timer);
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [subStep]);`;

content = content.replace(oldUploadEffect, newUploadEffect);
content = content.replace(oldSelectionEffect, newSelectionEffect);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Voice overlapping issue fixed by adding audio stop logic on unmount.');
