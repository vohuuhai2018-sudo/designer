const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add Voice to WelcomeView
const welcomeViewStart = 'function WelcomeView({ onStart, onAdmin, onMyProjects, systemContent }: { onStart: (branch: MainBranch) => void, onAdmin: () => void, onMyProjects: () => void, systemContent?: any }) {';
const welcomeVoiceEffect = `
  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice trang chủ.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
`;

if (content.includes(welcomeViewStart)) {
    // Insert after the component declaration and state
    content = content.replace(welcomeViewStart, welcomeViewStart + welcomeVoiceEffect);
    console.log('SUCCESS: Added voice to WelcomeView');
}

// Add Voice to BasicSelectionView
const basicSelectionStart = 'function BasicSelectionView({';
const basicSelectionVoiceEffect = `
  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice tải mẫu.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
`;

if (content.includes(basicSelectionStart)) {
    // Insert after the component declaration
    // We need to be careful with the props destructuring.
    // I'll find the start of the body.
    const bodyIdx = content.indexOf('{', content.indexOf(basicSelectionStart)) + 1;
    content = content.slice(0, bodyIdx) + basicSelectionVoiceEffect + content.slice(bodyIdx);
    console.log('SUCCESS: Added voice to BasicSelectionView');
}

fs.writeFileSync(filePath, content, 'utf8');
