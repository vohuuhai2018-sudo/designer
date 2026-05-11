const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const brokenTarget = `function BasicSelectionView({
  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice tải mẫu.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  systemContent, onSelect, mainBranch, subStep, setSubStep, onBack, onJumpToStep,
  selectedCategory, onCategoryChange`;

const fixedReplacement = `function BasicSelectionView({
  systemContent, onSelect, mainBranch, subStep, setSubStep, onBack, onJumpToStep,
  selectedCategory, onCategoryChange
}: {
  systemContent: any, 
  onSelect: (url: string, category?: string, images?: string[]) => void, 
  mainBranch: MainBranch, 
  subStep: 'category' | 'gallery', 
  setSubStep: (v: 'category' | 'gallery') => void, 
  onBack?: () => void,
  onJumpToStep?: (v: StepNavView) => void,
  selectedCategory: string,
  onCategoryChange: (cat: string) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice tải mẫu.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);`;

// Since I have another block with the same props, I need to be careful.
// I'll replace the exact broken block.

if (content.includes(brokenTarget)) {
    content = content.replace(brokenTarget, fixedReplacement);
    // Remove the extra type definition block that comes after
    const extraType = `}: {
  systemContent: any, 
  onSelect: (url: string, category?: string, images?: string[]) => void, 
  mainBranch: MainBranch, 
  subStep: 'category' | 'gallery', 
  setSubStep: (v: 'category' | 'gallery') => void, 
  onBack?: () => void,
  onJumpToStep?: (v: StepNavView) => void,
  selectedCategory: string,
  onCategoryChange: (cat: string) => void
}) {`;
    // But wait, the replacement already includes this.
    // I need to see what's after brokenTarget.
}

// Let's use a more robust way.
const startIdx = content.indexOf('function BasicSelectionView({');
const endIdx = content.indexOf('}) {', startIdx) + 4;
// Re-construct the whole function header and start of body.

const correctHeader = `function BasicSelectionView({
  systemContent, onSelect, mainBranch, subStep, setSubStep, onBack, onJumpToStep,
  selectedCategory, onCategoryChange
}: {
  systemContent: any, 
  onSelect: (url: string, category?: string, images?: string[]) => void, 
  mainBranch: MainBranch, 
  subStep: 'category' | 'gallery', 
  setSubStep: (v: 'category' | 'gallery') => void, 
  onBack?: () => void,
  onJumpToStep?: (v: StepNavView) => void,
  selectedCategory: string,
  onCategoryChange: (cat: string) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      const audio = new Audio('/assets/Voice tải mẫu.wav');
      audio.play().catch(e => console.log("Autoplay blocked:", e));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);`;

content = content.slice(0, startIdx) + correctHeader + content.slice(endIdx);

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS: Fixed BasicSelectionView");
