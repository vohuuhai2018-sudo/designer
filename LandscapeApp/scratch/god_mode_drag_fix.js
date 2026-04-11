import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. RECONSTRUCT THE CORE DESIGNER LOGIC BLOCK
const coreLogic = `
  const [isDraggingToDesigner, setIsDraggingToDesigner] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DesignerLibraryItem | null>(null);

  const postBufferToDesigner = (buffer: ArrayBuffer) => {
    const frameWindow = designerFrameRef.current?.contentWindow;
    if (!frameWindow) {
      setDesignerStatus('Khung làm việc chưa sẵn sàng để nhận tài nguyên.');
      return false;
    }
    frameWindow.postMessage(buffer, '*');
    return true;
  };

  const postScriptToDesigner = (script: string) => {
    const frameWindow = designerFrameRef.current?.contentWindow;
    if (!frameWindow) {
      setDesignerStatus('Khung làm việc chưa sẵn sàng.');
      return false;
    }
    frameWindow.postMessage(script, '*');
    return true;
  };

  const pushAssetToDesigner = async (item: DesignerLibraryItem, pos?: { x: number, y: number, canvasWidth: number, canvasHeight: number }) => {
    try {
      setDesignerStatus(\`Đang nạp \${item.label}...\`);
      const response = await fetch(item.url);
      if (!response.ok) throw new Error('Không đọc được tài nguyên.');
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64data = reader.result as string;
        let script = \`app.open("\${base64data}", null, true);\`;
        
        if (pos) {
          const dx = pos.x - (pos.canvasWidth / 2);
          const dy = pos.y - (pos.canvasHeight / 2);
          script += \` app.activeDocument.activeLayer.translate(\${dx}, \${dy});\`;
        }

        if (postScriptToDesigner(script)) {
          setDesignerStatus(\`Đã nạp \${item.label} thành một lớp mới.\`);
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Designer asset load error:', error);
      setDesignerStatus(\`Lỗi nạp nhanh \${item.label}.\`);
    }
  };

  const handleDesignerAssetDragStart = (event: React.DragEvent<HTMLDivElement>, item: DesignerLibraryItem) => {
    setIsDraggingToDesigner(true);
    setDraggedItem(item);
    const absoluteUrl = toAbsoluteAssetUrl(item.url);
    event.dataTransfer.setData('text/plain', absoluteUrl);
    event.dataTransfer.setData('text/uri-list', absoluteUrl);
    event.dataTransfer.setData('text/html', \`<img src="\${absoluteUrl}" alt="\${item.label}" />\`);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleDesignerDragEnd = () => {
    setIsDraggingToDesigner(false);
    setDraggedItem(null);
  };

  const handleDesignerDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingToDesigner(false);
    if (!draggedItem) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    await pushAssetToDesigner(draggedItem, { x, y, canvasWidth: rect.width, canvasHeight: rect.height });
    setDraggedItem(null);
  };

  const handleDesignerLocalFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      setDesignerStatus(\`Đang đưa file \${file.name} vào khung làm việc...\`);
      const buffer = await file.arrayBuffer();
      if (postBufferToDesigner(buffer)) {
        setDesignerStatus(\`Đã nạp file \${file.name} vào trình thiết kế.\`);
      }
    } catch (error) {
      console.error('Designer local file error:', error);
      setDesignerStatus(\`Không thể nạp file \${file.name}.\`);
    }
  };
`;

// Replace the mangled designer logic block
const designLogicStart = /const postScriptToDesigner =[\s\S]*?(?=const handleDesignerAssetDragStart|const handleDesignerLocalFile)/;
c = c.replace(designLogicStart, coreLogic + "\n  ");

// Also clean up any messed up handleDesignerAssetDragStart that might have stayed outside
const trailingDragStart = /const handleDesignerAssetDragStart = [\s\S]*? \};/g;
c = c.replace(trailingDragStart, "");

// 2. UPDATE JSX TO INCLUDE THE OVERLAY
const iframeBlock = /<iframe[\s\S]*?\/>/;
const overlayBlock = `
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <iframe
              ref={designerFrameRef}
              src={getDesignerUrl()}
              className="photopea-iframe"
              title="Photoshop Online"
            />
            {isDraggingToDesigner && (
              <div 
                className="designer-drag-overlay"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDesignerDrop}
                onDragLeave={() => setIsDraggingToDesigner(false)}
              >
                <div className="overlay-message">Thả vào đây để nạp tài nguyên</div>
              </div>
            )}
          </div>
`;
c = c.replace(iframeBlock, overlayBlock);

// 3. Add handleDesignerDragEnd to the library cards
c = c.replace(/onDragStart=\{event => handleDesignerAssetDragStart\(event, item\)\}/g, "onDragStart={event => handleDesignerAssetDragStart(event, item)} onDragEnd={handleDesignerDragEnd}");

fs.writeFileSync('src/App.tsx', c);
