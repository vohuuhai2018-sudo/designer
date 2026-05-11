const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldAudioLogic = `  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice trang chủ.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);`;

const newAudioLogic = `  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    let fadeTimer: any = null;
    let hasPlayed = false;

    const playWithFade = () => {
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
      }).catch(e => {
        console.log("Audio autoplay blocked by browser policy. Waiting for interaction.", e);
        hasPlayed = false; // Reset to try again on interaction
      });
    };

    const handleInteraction = () => {
      playWithFade();
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    // Initial delay attempt
    const timer = setTimeout(playWithFade, 3000);

    return () => {
      clearTimeout(timer);
      if (fadeTimer) clearInterval(fadeTimer);
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);`;

if (content.includes(oldAudioLogic)) {
    content = content.replace(oldAudioLogic, newAudioLogic);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Implemented reliable audio playback with fade-in effect for home page');
} else {
    console.log('ERROR: Could not find old audio logic in WelcomeView');
}
