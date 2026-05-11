const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldLogicStart = `    const playWithFade = () => {
      if (hasPlayed) return;
      hasPlayed = true;

      audio = new Audio('/assets/Voice trang chủ.wav');
      audio.volume = 0;
      
      audio.play().then(() => {
        // Fade in smoothly over 3 seconds
        let vol = 0;
        fadeTimer = setInterval(() => {
          vol += 0.05;
          if (vol >= 1) {
            if (audio) audio.volume = 1;
            clearInterval(fadeTimer);
          } else {
            if (audio) audio.volume = vol;
          }
        }, 150);
      })`;

const newLogicStart = `    const playWithFade = () => {
      if (hasPlayed) return;
      hasPlayed = true;

      audio = new Audio('/assets/Voice trang chủ.wav');
      // Bỏ hiệu ứng to dần, phát âm lượng tối đa ngay lập tức
      audio.volume = 1;
      
      audio.play().then(() => {
        // Không cần setInterval để tăng volume
      })`;

if (content.includes(oldLogicStart)) {
    content = content.replace(oldLogicStart, newLogicStart);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Removed fade-in effect as requested');
} else {
    console.log('ERROR: Could not find audio logic to modify');
}
