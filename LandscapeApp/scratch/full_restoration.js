import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Restore the accidentally deleted state block
const marker = "onUpdateProject";
// We need to find the specific broken area.
// Looking at the diff, it deleted from after projects: Project[]; down to the fileRef.

const brokenPart = /onGenerateAiImage\s*}\s*:\s*{\s*projects\s*:\s*Project\[\]\s*;\s*const\s+fileRef/g;
const restoration = `onBack: () => void;
  onUpdateProject: (id: string, updates: ProjectUpdate) => Promise<Project>;
}) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [actionFeedback, setActionFeedback] = useState('');
  const [showDesigner, setShowDesigner] = useState(false);
  const [designerReady, setDesignerReady] = useState(false);
  const [designerStatus, setDesignerStatus] = useState('Đang chuẩn bị trình thiết kế...');
  const [designerTab, setDesignerTab] = useState<'customer' | 'system'>('customer');
  const [showAIStudio, setShowAIStudio] = useState(false);
  const [aiStudioStatus, setAiStudioStatus] = useState('Sẵn sàng tổng hợp prompt và tài nguyên AI.');
  const fileRef`;

c = c.replace(brokenPart, restoration);

// 2. Fix the mangled empty strings
c = c.replace(/useState<string>\('\)/g, "useState<string>('')");
c = c.replace(/useState\('\)/g, "useState('')");

// 3. Clean up any other mangled artifacts
c = c.replace(/id: 'raw-initial'/g, "id: 'raw-initial'"); 

fs.writeFileSync('src/App.tsx', c);
