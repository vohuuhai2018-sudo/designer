const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix Music Logic: Stop music more reliably when status is 'done'
const oldMusicLogic = `    if (!isDone) {
      if (!audioRef.current) {
        audioRef.current = new Audio('/assets/NHAC CHO 3.mp3');
        audioRef.current.loop = true;
      }
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      audioRef.current.volume = 1;
      audioRef.current.play().catch(e => {
          console.log("Music blocked, waiting for interaction:", e);
          // Thử lại khi có tương tác bất kỳ vào cửa sổ
          const playOnAction = () => {
              audioRef.current?.play().catch(() => {});
              window.removeEventListener('click', playOnAction);
          };
          window.addEventListener('click', playOnAction);
      });
    } else {
      if (audioRef.current && !audioRef.current.paused) {
        // Fade out
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = setInterval(() => {
          if (audioRef.current) {
            if (audioRef.current.volume > 0.05) {
              audioRef.current.volume -= 0.05;
            } else {
              audioRef.current.pause();
              audioRef.current.volume = 1;
              audioRef.current.currentTime = 0;
              clearInterval(fadeIntervalRef.current);
            }
          }
        }, 150);
      }
    }`;

const newMusicLogic = `    if (!isDone) {
      if (!audioRef.current) {
        audioRef.current = new Audio('/assets/NHAC CHO 3.mp3');
        audioRef.current.loop = true;
      }
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      audioRef.current.volume = 1;
      audioRef.current.play().catch(e => {
          console.log("Music blocked, waiting for interaction.");
          const playOnAction = () => {
              if (audioRef.current && !project?.status.includes('done')) {
                audioRef.current.play().catch(() => {});
              }
              window.removeEventListener('mousedown', playOnAction);
              window.removeEventListener('touchstart', playOnAction);
          };
          window.addEventListener('mousedown', playOnAction);
          window.addEventListener('touchstart', playOnAction);
      });
    } else {
      // FORCE STOP / FADE OUT
      const stopMusic = () => {
        if (!audioRef.current) return;
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        
        fadeIntervalRef.current = setInterval(() => {
          if (audioRef.current) {
            if (audioRef.current.volume > 0.1) {
              audioRef.current.volume -= 0.1;
            } else {
              audioRef.current.pause();
              audioRef.current.volume = 1;
              audioRef.current.currentTime = 0;
              clearInterval(fadeIntervalRef.current);
              fadeIntervalRef.current = null;
            }
          } else {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
        }, 100); // Faster fade out (1s total)
      };
      stopMusic();
    }`;

if (content.includes(oldMusicLogic)) {
    content = content.replace(oldMusicLogic, newMusicLogic);
}

// 2. Fix Interior Before/After Slider bug
// Often in interior, rawImage might be missing or annotatedImage should be used.
const oldBeforeUrl = `const beforeUrl = project?.rawImage || url;`;
const newBeforeUrl = `const beforeUrl = project?.rawImage || project?.annotatedImage || url;`;

content = content.replace(new RegExp(oldBeforeUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newBeforeUrl);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed music termination and interior slider before-image logic');
