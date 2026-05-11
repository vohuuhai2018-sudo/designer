const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update ProtectedImage for a more protective watermark pattern AND disable right-click
const oldEffectStart = 'const onLoaded = () => {';
const oldEffectEnd = 'setLoaded(true);';

// I'll be more specific to avoid replacing wrong onLoaded
const protectedImageSearch = 'const ProtectedImage = ({ src, alt, style, className }: { src: string, alt?: string, style?: any, className?: string }) => {';
const startSearchIdx = content.indexOf(protectedImageSearch);
const onLoadedIdx = content.indexOf('const onLoaded = () => {', startSearchIdx);
const setLoadedIdx = content.indexOf('setLoaded(true);', onLoadedIdx) + 16;

const newOnLoaded = `const onLoaded = () => {
      if (cancelled) return;
      loadedCount++;
      if (loadedCount === 2) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // 1. Draw Original Image
        ctx.drawImage(img, 0, 0);

        // 2. Add repeated watermark pattern for protection
        ctx.globalAlpha = 0.15; // Subtle repeated pattern
        const wmSize = canvas.width * 0.12;
        const wmH = (watermark.naturalHeight / watermark.naturalWidth) * wmSize;
        
        for(let x = -wmSize; x < canvas.width + wmSize; x += wmSize * 1.8) {
          for(let y = -wmH; y < canvas.height + wmH; y += wmH * 2.2) {
            ctx.save();
            ctx.translate(x + wmSize, y + wmH);
            ctx.rotate(-Math.PI / 8);
            ctx.drawImage(watermark, -wmSize/2, -wmH/2, wmSize, wmH);
            ctx.restore();
          }
        }

        // 3. Add large central watermark
        ctx.globalAlpha = 0.5;
        const mainWmW = canvas.width * 0.55;
        const mainWmH = (watermark.naturalHeight / watermark.naturalWidth) * mainWmW;
        ctx.drawImage(watermark, (canvas.width - mainWmW)/2, (canvas.height - mainWmH)/2, mainWmW, mainWmH);

        // 4. Add solid bottom-right branding
        ctx.globalAlpha = 0.85;
        const brandW = canvas.width * 0.4;
        const brandH = (watermark.naturalHeight / watermark.naturalWidth) * brandW;
        ctx.drawImage(watermark, canvas.width - brandW - (canvas.width * 0.02), canvas.height - brandH - (canvas.height * 0.02), brandW, brandH);

        setLoaded(true);
      }`;

if (onLoadedIdx !== -1 && setLoadedIdx !== -1) {
    content = content.slice(0, onLoadedIdx) + newOnLoaded + content.slice(setLoadedIdx);
}

// 2. Disable right-click on ProtectedImage canvas
const oldCanvasTag = '<canvas ref={canvasRef} style={{ ...style, display: loaded ? \'block\' : \'none\' }} className={className} />';
const newCanvasTag = '<canvas ref={canvasRef} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} style={{ ...style, display: loaded ? \'block\' : \'none\', userSelect: \'none\', WebkitUserSelect: \'none\' }} className={className} />';

if (content.includes(oldCanvasTag)) {
    content = content.replace(oldCanvasTag, newCanvasTag);
}

// 3. Update pass2-thumbs to use ProtectedImage
const oldPass2Img = '<img decoding="async" loading="lazy" src={url} alt={label} />';
const newPass2Img = '<ProtectedImage src={url} alt={label} style={{ width: \'100%\', height: \'100%\', objectFit: \'cover\', pointerEvents: \'none\' }} />';

if (content.includes(oldPass2Img)) {
    content = content.replace(oldPass2Img, newPass2Img);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Updated watermarking, pass2 thumbnails, and security restrictions');
