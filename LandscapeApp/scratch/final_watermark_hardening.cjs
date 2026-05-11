const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Force update BeforeAfterSlider to use ProtectedImage for 'after' image
// Using regex to be safe
const sliderRegex = /<img\s+src=\{after\}\s+alt=\{alt\s+\|\|\s+'Sau'\}\s+draggable=\{false\}\s+style=\{\{\s*position:\s*'absolute',\s*inset:\s*0,\s*width:\s*'100%',\s*height:\s*'100%',\s*objectFit:\s*'cover',\s*pointerEvents:\s*'none'\s*\}\}\s*\/>/;

const protectedSliderImg = `<ProtectedImage src={after} alt={alt || 'Sau'} 
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />`;

if (sliderRegex.test(content)) {
    content = content.replace(sliderRegex, protectedSliderImg);
    console.log('SUCCESS: Replaced img with ProtectedImage in BeforeAfterSlider');
} else {
    console.log('ERROR: Could not find img tag in BeforeAfterSlider with regex');
}

// 2. Add back a subtle diagonal pattern for better protection (as requested by "rủi ro họ chụp")
const oldOnLoaded = `    const onLoaded = () => {
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

const protectedOnLoaded = `    const onLoaded = () => {
      if (cancelled) return;
      loadedCount++;
      if (loadedCount === 2) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // 1. Draw Original Image
        ctx.drawImage(img, 0, 0);

        // 2. Add VERY subtle diagonal pattern (prevents easy AI removal/cropping)
        ctx.globalAlpha = 0.08; 
        const patternSize = canvas.width * 0.15;
        const patternH = (watermark.naturalHeight / watermark.naturalWidth) * patternSize;
        for(let x = -patternSize; x < canvas.width + patternSize; x += patternSize * 2.5) {
          for(let y = -patternH; y < canvas.height + patternH; y += patternH * 3) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-Math.PI / 8);
            ctx.drawImage(watermark, 0, 0, patternSize, patternH);
            ctx.restore();
          }
        }

        // 3. Add single clear watermark at bottom-right
        ctx.globalAlpha = 0.7; 
        const wmWidth = canvas.width * 0.35;
        const wmHeight = (watermark.naturalHeight / watermark.naturalWidth) * wmWidth;
        const padding = canvas.width * 0.02;
        ctx.drawImage(watermark, canvas.width - wmWidth - padding, canvas.height - wmHeight - padding, wmWidth, wmHeight);

        setLoaded(true);
      }
    };`;

if (content.includes(oldOnLoaded)) {
    content = content.replace(oldOnLoaded, protectedOnLoaded);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('DONE: Final security hardening for images');
