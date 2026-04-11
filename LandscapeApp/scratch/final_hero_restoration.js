import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. RECONSTRUCT THE ADMINVIEW STATE (Accidentally deleted)
const adminHeader = `function AdminView({
  projects,
  onBack,
  onUpdateProject,
  onGenerateAiImage
}: {
  projects: Project[];
  onBack: () => void;
  onUpdateProject: (id: string, updates: ProjectUpdate) => Promise<Project>;
  onGenerateAiImage: (id: string, payload: { prompt: string; assets: AiUploadAsset[] }) => Promise<Project>;
}) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [actionFeedback, setActionFeedback] = useState('');
  const [showDesigner, setShowDesigner] = useState(false);
  const [designerReady, setDesignerReady] = useState(false);
  const [designerStatus, setDesignerStatus] = useState('Đang chuẩn bị trình thiết kế...');
  const [designerTab, setDesignerTab] = useState<'customer' | 'system'>('customer');
  const [showAIStudio, setShowAIStudio] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiStudioStatus, setAiStudioStatus] = useState('Sẵn sàng tổng hợp prompt và tài nguyên AI.');
  const fileRef = useRef<HTMLInputElement>(null);
  const designerFrameRef = useRef<HTMLIFrameElement>(null);
  const designerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedProject) return;
    const latest = projects.find(project => project.id === selectedProject.id);
    if (latest && latest !== selectedProject) {
      setSelectedProject(latest);
    }
  }, [projects, selectedProject]);

  useEffect(() => {
    if (!showDesigner || !selectedProject) return;
    setDesignerReady(false);
    setDesignerTab('customer');
    setDesignerStatus('Đang tải trình thiết kế và nạp ảnh gốc của khách hàng...');
  }, [showDesigner, selectedProject]);

  useEffect(() => {
    if (!showAIStudio || !selectedProject) return;
    setAiStudioStatus('Sẵn sàng tổng hợp prompt và tài nguyên AI.');
  }, [showAIStudio, selectedProject]);

  useEffect(() => {
    const handleDesignerMessage = async (event: MessageEvent) => {
      if (event.source !== designerFrameRef.current?.contentWindow) return;

      if (event.data === 'ready') {
        setDesignerReady(true);
        if (selectedProject) {
          setDesignerStatus('Đang nạp ảnh hiện trạng vào bàn làm việc...');
          try {
            const response = await fetch(selectedProject.rawImage);
            if (response.ok) {
              const buffer = await response.arrayBuffer();
              const frameWindow = designerFrameRef.current?.contentWindow;
              if (frameWindow) {
                frameWindow.postMessage(buffer, '*');
                setDesignerStatus('Ảnh khách hàng đã được nạp thành công. Bạn có thể bắt đầu vẽ.');
              }
            }
          } catch (e) {
            console.error('Initial push error:', e);
            setDesignerStatus('Không thể tự động nạp ảnh. Hãy dùng nút "Nạp lại ảnh gốc".');
          }
        }
        return;
      }

      if (event.data === 'ready') {
        setDesignerReady(true);
        setDesignerStatus('Ảnh gốc đã vào khung làm việc. Có thể kéo hoặc nạp thêm tài nguyên.');
        return;
      }

      if (event.data === 'OE_OPEN_FILE') {
        designerFileRef.current?.click();
      }
    };

    window.addEventListener('message', handleDesignerMessage);
    return () => window.removeEventListener('message', handleDesignerMessage);
  }, [selectedProject]);
`;

// Replace from function AdminView down to the messy message handler
const brokenAdmin = /function AdminView\(\{[\s\S]*?if \(event\.source !== designerFrameRef\.current\?\.contentWindow\) return;/;
c = c.replace(brokenAdmin, adminHeader + "\n      " + "if (event.source !== designerFrameRef.current?.contentWindow) return;");

// 2. FIX PUSH ASSET TO DESIGNER (Remove the restrictive ready-check)
const correctPushAsset = `  const pushAssetToDesigner = async (item: DesignerLibraryItem) => {
    // Note: We intentionally removed the strict !designerReady check to avoid race conditions.
    // The UI handles disabling buttons, so if this is called, we proceed.
    try {
      setDesignerStatus(\`Đang nạp \${item.label} vào bàn làm việc...\`);
      
      const response = await fetch(item.url);
      if (!response.ok) throw new Error('Không đọc được tài nguyên.');
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const script = \`app.open("\${base64data}", null, true);\`;
        if (postScriptToDesigner(script)) {
          setDesignerStatus(\`Đã nạp \${item.label} thành một lớp mới.\`);
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Designer asset load error:', error);
      setDesignerStatus(\`Không thể nạp nhanh \${item.label}. Bạn có thể kéo thả thủ công.\`);
    }
  };`;

const pushRegex = /const pushAssetToDesigner = async \(item: DesignerLibraryItem\) => \{[\s\S]*?\};/;
c = c.replace(pushRegex, correctPushAsset);

// 3. FINAL SYNTAX CLEANUP (Remove any redundant ready blocks that might have stayed)
c = c.replace(/if \(event\.data === 'ready'\) \{[\s\S]*?return;\s+\}\s+if \(event\.data === 'ready'\)/, "if (event.data === 'ready')");

fs.writeFileSync('src/App.tsx', c);
