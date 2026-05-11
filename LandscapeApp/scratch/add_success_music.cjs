const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const successViewStart = 'function SuccessView({';
const audioHook = `
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  }, [project?.status, service]);
`;

if (content.includes(successViewStart)) {
    // Find the end of props and opening brace
    const bodyIdx = content.indexOf(') {', content.indexOf(successViewStart)) + 3;
    content = content.slice(0, bodyIdx) + audioHook + content.slice(bodyIdx);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Added background music to SuccessView');
} else {
    console.log('ERROR: Could not find SuccessView');
}
