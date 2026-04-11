import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. RE-CONSTRUCT THE DELETED LIBRARY FUNCTIONS
const restorationMarker = "const getSelectedThacVisual = \\(project: Project\\): DesignerLibraryItem\\[\\] => {";
const functionsToRestore = `const getSelectedThacVisual = (project: Project): DesignerLibraryItem[] => {
    if (!project.selections.thac) return [];

    for (const item of ASSETS.THAC) {
      if (item.id === project.selections.thac) {
        return [{
          id: \`selected-\${item.id}\`,
          label: \`Mẫu khách chọn: \${item.name}\`,
          url: item.url,
          group: 'Mẫu đã chọn',
          source: 'system',
          note: 'Tài nguyên đúng theo mẫu khách đã chọn.'
        }];
      }

      const variant = item.variants.find(candidate => candidate.id === project.selections.thac);
      if (variant) {
        return [{
          id: \`selected-\${variant.id}\`,
          label: \`Mẫu khách chọn: \${variant.name}\`,
          url: variant.url,
          group: 'Mẫu đã chọn',
          source: 'system',
          note: 'Tài nguyên đúng theo biến thể khách đã chọn.'
        }];
      }
    }

    return [];
  };

  const dedupeDesignerItems = (items: DesignerLibraryItem[]) => {
    const seen = new Set<string>();
    return items.filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  };

  const getDesignerCustomerLibrary = (project: Project) => {
    const items: DesignerLibraryItem[] = [
      {
        id: \`\${project.id}-raw\`,
        label: 'Ảnh hiện trạng gốc',
        url: project.rawImage,
        group: 'Khách hàng',
        source: 'customer',
        note: 'Ảnh gốc khách gửi ban đầu.'
      },
      {
        id: \`\${project.id}-annotated\`,
        label: 'Ảnh khoanh vùng',
        url: project.annotatedImage,
        group: 'Khách hàng',
        source: 'customer',
        note: 'Ảnh khu vực khách đã khoanh để xử lý.'
      },
      ...(project.extraAssets || []).map((url, index) => ({
        id: \`\${project.id}-extra-\${index}\`,
        label: \`Tài nguyên khách \${index + 1}\`,
        url,
        group: 'Khách hàng',
        source: 'customer' as const,
        note: 'Ảnh tham khảo bổ sung do khách cung cấp.'
      }))
    ];

    return items.filter(item => !isVideoAsset(item.url));
  };

  const getDesignerSystemLibrary = (project: Project) => {
    const systemAssets: DesignerLibraryItem[] = [];
    
    // Add selected items first
    systemAssets.push(...getSelectedThacVisual(project));

    // Add general KE library
    ASSETS.KE.forEach(group => {
      systemAssets.push(...group.variants.map(v => ({
        id: v.id,
        label: v.name,
        url: v.url,
        group: group.name,
        source: 'system' as const,
        note: \`Tài nguyên mẫu từ thư viện \${group.name.toLowerCase()}.\`
      })));
    });

    // Add CANH library
    ASSETS.CANH.forEach(group => {
      systemAssets.push(...group.variants.map(v => ({
        id: v.id,
        label: v.name,
        url: v.url,
        group: group.name,
        source: 'system' as const,
        note: \`Tài nguyên mẫu từ thư viện \${group.name.toLowerCase()}.\`
      })));
    });

    return dedupeDesignerItems(systemAssets);
  };
`;

// Replace the possibly mangled start of getSelectedThacVisual
const brokenStart = /const getSelectedThacVisual = \(project: Project\): DesignerLibraryItem\[\] => \{[\s\S]*?(?=const postScriptToDesigner|const pushAssetToDesigner|const postBufferToDesigner)/;
c = c.replace(brokenStart, functionsToRestore + "\n  ");

// 2. FIX PUSH ASSET TO DESIGNER (LAYER MODE)
const correctPushLogic = `const postScriptToDesigner = (script: string) => {
    const frameWindow = designerFrameRef.current?.contentWindow;
    if (!frameWindow) {
      setDesignerStatus('Khung làm việc chưa sẵn sàng để nhận lệnh.');
      return false;
    }
    frameWindow.postMessage(script, '*');
    return true;
  };

  const pushAssetToDesigner = async (item: DesignerLibraryItem) => {
    if (!designerReady) {
      setDesignerStatus('Trình thiết kế đang tải. Chờ một chút rồi thử lại.');
      return;
    }

    try {
      setDesignerStatus(\`Đang nạp \${item.label} vào bàn làm việc...\`);
      
      const response = await fetch(item.url);
      if (!response.ok) throw new Error('Không đọc được tài nguyên.');
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // Inject as a new layer in the current document (3rd param true)
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

// Find the pushAssetToDesigner block and replace it
const pushBlock = /const (?:postBufferToDesigner|postScriptToDesigner)[\s\S]*?(?=const handleDesignerLocalFile)/;
c = c.replace(pushBlock, correctPushLogic + "\n  ");

fs.writeFileSync('src/App.tsx', c);
