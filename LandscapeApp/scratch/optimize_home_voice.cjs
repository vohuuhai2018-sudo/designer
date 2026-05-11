const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Update WelcomeView audio logic to be more direct and remove the 3s delay
const oldWelcomeAudio = `    const playWithFade = () => {
      if (hasPlayed) return;
      hasPlayed = true;

      audio = new Audio('/assets/Voice trang chủ.wav');
      // Bỏ hiệu ứng to dần, phát âm lượng tối đa ngay lập tức
      audio.volume = 1;
      
      audio.play().then(() => {
        // Không cần setInterval để tăng volume
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
    const timer = setTimeout(playWithFade, 3000);`;

const newWelcomeAudio = `    const playDirectly = () => {
      if (hasPlayed) return;
      hasPlayed = true;

      audio = new Audio('/assets/Voice trang chủ.wav');
      audio.volume = 1; // Luôn giữ 100% âm lượng, không to nhỏ
      
      audio.play().then(() => {
        console.log("Home voice playing at full volume.");
      }).catch(e => {
        console.log("Autoplay blocked, will play on next interaction.");
        hasPlayed = false;
      });
    };

    const handleInteraction = () => {
      playDirectly();
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('mousedown', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    // Cố gắng phát ngay sau 500ms (giảm trễ từ 3000ms xuống)
    const timer = setTimeout(playDirectly, 500);`;

if (content.includes(oldWelcomeAudio)) {
    content = content.replace(oldWelcomeAudio, newWelcomeAudio);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Optimized home voice playback (removed delay and ramping)');
} else {
    console.log('ERROR: Could not find old WelcomeView audio logic');
}
