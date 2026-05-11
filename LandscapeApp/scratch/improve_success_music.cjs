const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldEffect = `  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const isAuto = service === 'Gói Cơ Bản' || service === 'Gói Cơ bản' || service === 'Gói Nâng cao';
    if (!isAuto) return;
    const isDone = project?.status === 'done';

    if (!isDone) {
      if (!audioRef.current) {
        audioRef.current = new Audio('/assets/NHAC CHO 3.mp3');
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(e => console.log("Music blocked:", e));
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [project?.status, service]);`;

const newEffect = `  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<any>(null);

  useEffect(() => {
    const isAuto = service === 'Gói Cơ Bản' || service === 'Gói Cơ bản' || service === 'Gói Nâng cao';
    if (!isAuto) return;
    const isDone = project?.status === 'done';

    if (!isDone) {
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
    }

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [project?.status, service]);`;

if (content.includes(oldEffect)) {
    content = content.replace(oldEffect, newEffect);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Updated SuccessView music logic (fade out + robust play)');
} else {
    // Try slice
    const startIdx = content.indexOf('const audioRef = useRef<HTMLAudioElement | null>(null);');
    const endIdx = content.indexOf('}, [project?.status, service]);', startIdx) + 32;
    if (startIdx !== -1) {
        content = content.slice(0, startIdx) + newEffect + content.slice(endIdx);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('SUCCESS: Updated SuccessView music logic (slice approach)');
    } else {
        console.log('ERROR: Could not find audio logic');
    }
}
