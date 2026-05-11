const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const uploadViewStart = 'function UploadView({';
const uploadVoiceEffect = `
  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice hướng dẫn.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
`;

if (content.includes(uploadViewStart)) {
    // Insert after the component body start
    const bodyIdx = content.indexOf('{', content.indexOf(uploadViewStart)) + 1;
    content = content.slice(0, bodyIdx) + uploadVoiceEffect + content.slice(bodyIdx);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Added voice to UploadView');
} else {
    console.log('ERROR: Could not find UploadView');
}
