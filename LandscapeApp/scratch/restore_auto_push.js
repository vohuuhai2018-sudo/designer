import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Restore the auto-push of raw image in handleDesignerMessage
const readyBlock = `      if (event.data === 'ready') {
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
      }`;

const simpleReadyBlock = /if \(event\.data === 'ready'\) \{[\s\S]*?return;\s+\}/;

c = c.replace(simpleReadyBlock, readyBlock);

fs.writeFileSync('src/App.tsx', c);
