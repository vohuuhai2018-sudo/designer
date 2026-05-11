const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const brokenBlock = `function UploadView({
  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice hướng dẫn.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  rawImage, onUpload, extraAssets, onExtraAssetsChange, onProceed, onBack, onJumpToStep, systemContent,
  service, note, referenceModelUrl, onNoteChange,
  interiorComboImages, interiorSiteImages, onInteriorSiteImageChange,
  mainBranch, selectedCategory
}: {
  rawImage: string;
  onUpload: (img: string) => void;
  extraAssets: string[];
  onExtraAssetsChange: (assets: string[]) => void;
  onProceed: () => void;
  onBack?: () => void;
  onJumpToStep?: (v: StepNavView) => void;
  systemContent: any;
  service?: string;
  note?: string;
  referenceModelUrl?: string;
  onNoteChange?: (note: string) => void;
  interiorComboImages?: string[];
  interiorSiteImages?: string[];
  onInteriorSiteImageChange?: (idx: number, img: string) => void;
  mainBranch?: MainBranch;
  selectedCategory?: string;
})`;

const fixedBlock = `function UploadView({
  rawImage, onUpload, extraAssets, onExtraAssetsChange, onProceed, onBack, onJumpToStep, systemContent,
  service, note, referenceModelUrl, onNoteChange,
  interiorComboImages, interiorSiteImages, onInteriorSiteImageChange,
  mainBranch, selectedCategory
}: {
  rawImage: string;
  onUpload: (img: string) => void;
  extraAssets: string[];
  onExtraAssetsChange: (assets: string[]) => void;
  onProceed: () => void;
  onBack?: () => void;
  onJumpToStep?: (v: StepNavView) => void;
  systemContent: any;
  service?: string;
  note?: string;
  referenceModelUrl?: string;
  onNoteChange?: (note: string) => void;
  interiorComboImages?: string[];
  interiorSiteImages?: string[];
  onInteriorSiteImageChange?: (idx: number, img: string) => void;
  mainBranch?: MainBranch;
  selectedCategory?: string;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice hướng dẫn.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 2000);
    return () => clearTimeout(timer);
  }, []);`;

if (content.includes(brokenBlock)) {
    content = content.replace(brokenBlock, fixedBlock);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Fixed UploadView syntax');
} else {
    // Try a more loose match
    const startIdx = content.indexOf('function UploadView({');
    const endIdx = content.indexOf('}) {', startIdx) + 4;
    
    content = content.slice(0, startIdx) + fixedBlock + content.slice(endIdx);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Fixed UploadView syntax (slice approach)');
}
