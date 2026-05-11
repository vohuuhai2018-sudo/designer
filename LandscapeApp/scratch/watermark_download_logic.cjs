const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Download to imports
content = content.replace('UploadCloud,', 'UploadCloud, Download,');

// 2. Update ProtectedImage for a more protective watermark pattern
const oldProtectedImageEffect = `    const img = new Image();
    const watermark = new Image();

    img.crossOrigin = "anonymous";
    watermark.crossOrigin = "anonymous";

    let loadedCount = 0;
    const onLoaded = () => {
      if (cancelled) return;
      loadedCount++;
      if (loadedCount === 2) {
        // Cấu hình kích thước canvas theo ảnh gốc để không mất nét
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // 1. Vẽ ảnh gốc
        ctx.drawImage(img, 0, 0);

        // 2. Cấu hình Logo "nướng" vào ảnh
        const wmWidth = canvas.width * 0.45; // 45% chiều rộng ảnh
        const wmHeight = (watermark.naturalHeight / watermark.naturalWidth) * wmWidth;
        const x = canvas.width - wmWidth - (canvas.width * 0.02); // Cách lề 2%
        const y = canvas.height - wmHeight - (canvas.height * 0.02);

        ctx.globalAlpha = 0.85;
        // Hiệu ứng đổ bóng trực tiếp vào pixels
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        
        ctx.drawImage(watermark, x, y, wmWidth, wmHeight);
        setLoaded(true);
      }
    };`;

const newProtectedImageEffect = `    const img = new Image();
    const watermark = new Image();

    img.crossOrigin = "anonymous";
    watermark.crossOrigin = "anonymous";

    let loadedCount = 0;
    const onLoaded = () => {
      if (cancelled) return;
      loadedCount++;
      if (loadedCount === 2) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // 1. Draw Original Image
        ctx.drawImage(img, 0, 0);

        // 2. Add repeated watermark pattern for protection
        ctx.globalAlpha = 0.35; // Subtle repeated pattern
        const wmSize = canvas.width * 0.15;
        const wmH = (watermark.naturalHeight / watermark.naturalWidth) * wmSize;
        
        for(let x = 0; x < canvas.width; x += wmSize * 2) {
          for(let y = 0; y < canvas.height; y += wmH * 2) {
            ctx.save();
            ctx.translate(x + wmSize, y + wmH);
            ctx.rotate(-Math.PI / 6);
            ctx.drawImage(watermark, -wmSize/2, -wmH/2, wmSize, wmH);
            ctx.restore();
          }
        }

        // 3. Add large central watermark
        ctx.globalAlpha = 0.65;
        const mainWmW = canvas.width * 0.5;
        const mainWmH = (watermark.naturalHeight / watermark.naturalWidth) * mainWmW;
        ctx.drawImage(watermark, (canvas.width - mainWmW)/2, (canvas.height - mainWmH)/2, mainWmW, mainWmH);

        // 4. Add solid bottom-right branding
        ctx.globalAlpha = 0.9;
        const brandW = canvas.width * 0.35;
        const brandH = (watermark.naturalHeight / watermark.naturalWidth) * brandW;
        ctx.drawImage(watermark, canvas.width - brandW - 20, canvas.height - brandH - 20, brandW, brandH);

        setLoaded(true);
      }
    };`;

if (content.includes(oldProtectedImageEffect)) {
    content = content.replace(oldProtectedImageEffect, newProtectedImageEffect);
}

// 3. Update BeforeAfterSlider to use ProtectedImage
const oldBASliderRender = `<img src={after} alt={alt || 'Sau'} draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />`;
const newBASliderRender = `<ProtectedImage src={after} alt={alt || 'Sau'} 
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />`;

if (content.includes(oldBASliderRender)) {
    content = content.replace(oldBASliderRender, newBASliderRender);
}

// 4. Update SuccessView Result Card to add Download button
const oldResultMeta = `<div className="result-meta">
                      <span className="result-name">Phương án {num}</span>
                      <button className="result-zoom" onClick={(e) => { e.stopPropagation(); setPreviewImage(url); }} aria-label="Phóng to">
                        <Search size={14} />
                      </button>`;
const newResultMeta = `<div className="result-meta">
                      <span className="result-name">Phương án {num}</span>
                      <div className="result-actions">
                        <button className="result-zoom" onClick={(e) => { e.stopPropagation(); setPreviewImage(url); }} title="Phóng to">
                          <Search size={14} />
                        </button>
                        <button className="result-download" onClick={(e) => { 
                          e.stopPropagation(); 
                          if (!isPaid) {
                            setPaymentOpen(true);
                          } else {
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = \`thietke5p-\${num}.jpg\`;
                            link.click();
                          }
                        }} title="Tải ảnh gốc">
                          <Download size={14} />
                        </button>
                      </div>`;

if (content.includes(oldResultMeta)) {
    content = content.replace(oldResultMeta, newResultMeta);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Integrated watermarking and download-with-payment logic');
