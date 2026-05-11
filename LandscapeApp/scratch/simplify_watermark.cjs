const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldOnLoaded = `    const onLoaded = () => {
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

        // 2. Add single large central watermark (faint)
        ctx.globalAlpha = 0.35; 
        const wmWidth = canvas.width * 0.65;
        const wmHeight = (watermark.naturalHeight / watermark.naturalWidth) * wmWidth;
        ctx.drawImage(watermark, (canvas.width - wmWidth)/2, (canvas.height - wmHeight)/2, wmWidth, wmHeight);

        setLoaded(true);
      }
    };`;

if (content.includes(oldOnLoaded)) {
    content = content.replace(oldOnLoaded, newOnLoaded);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Simplified watermark to a single central logo');
} else {
    console.log('ERROR: Could not find old onLoaded logic');
}
