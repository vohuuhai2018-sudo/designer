const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Update beforeUrl logic in SuccessView to handle interior site images
const oldBeforeLine = `const beforeUrl = project?.rawImage || project?.annotatedImage || url;`;

const newBeforeLine = `let beforeUrl = project?.rawImage || project?.annotatedImage;
                
                // Special logic for Interior Combo: Map results to corresponding site images
                if (project?.interiorPairs) {
                  const pairIdx = retryCount > 0 
                    ? (i < previousImages.length ? i : i - previousImages.length)
                    : i;
                  if (project.interiorPairs[pairIdx]) {
                    beforeUrl = project.interiorPairs[pairIdx].siteImage;
                  }
                }
                
                if (!beforeUrl) beforeUrl = url;`;

// Replace all occurrences in SuccessView (both processing slots and results grid)
content = content.split(oldBeforeLine).join(newBeforeLine);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed interior before-image mapping for combo projects');
