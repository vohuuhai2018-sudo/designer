const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update ProtectedImage watermark position (Bottom-Right)
const oldOnLoaded = `    const onLoaded = () => {
      if (cancelled) return;
      loadedCount++;
      if (loadedCount === 2) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // 1. Draw Original Image
        ctx.drawImage(img, 0, 0);

        // 2. Add single large central watermark (faint)
        ctx.globalAlpha = 0.35; 
        const wmWidth = canvas.width * 0.65;
        const wmHeight = (watermark.naturalHeight / watermark.naturalWidth) * wmWidth;
        ctx.drawImage(watermark, (canvas.width - wmWidth)/2, (canvas.height - wmHeight)/2, wmWidth, wmHeight);

        setLoaded(true);
      }
    };`;

const newOnLoaded = `    const onLoaded = () => {
      if (cancelled) return;
      loadedCount++;
      if (loadedCount === 2) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // 1. Draw Original Image
        ctx.drawImage(img, 0, 0);

        // 2. Add single watermark at bottom-right (clear but subtle)
        ctx.globalAlpha = 0.65; 
        const wmWidth = canvas.width * 0.38;
        const wmHeight = (watermark.naturalHeight / watermark.naturalWidth) * wmWidth;
        // Padding from edges: 2%
        const padding = canvas.width * 0.02;
        ctx.drawImage(watermark, canvas.width - wmWidth - padding, canvas.height - wmHeight - padding, wmWidth, wmHeight);

        setLoaded(true);
      }
    };`;

if (content.includes(oldOnLoaded)) {
    content = content.replace(oldOnLoaded, newOnLoaded);
}

// 2. Update BeforeAfterSlider to use ProtectedImage for the 'after' image
const oldSliderImg = `<img src={after} alt={alt || 'Sau'} draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />`;

const newSliderImg = `<ProtectedImage src={after} alt={alt || 'Sau'} 
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />`;

if (content.includes(oldSliderImg)) {
    content = content.replace(oldSliderImg, newSliderImg);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Moved watermark to bottom-right and applied to BeforeAfterSlider');
