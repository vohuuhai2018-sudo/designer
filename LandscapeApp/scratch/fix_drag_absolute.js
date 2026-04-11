import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

const correctDragStart = `  const handleDesignerAssetDragStart = (event: React.DragEvent<HTMLDivElement>, item: DesignerLibraryItem) => {
    const absoluteUrl = toAbsoluteAssetUrl(item.url);
    event.dataTransfer.setData('text/plain', absoluteUrl);
    event.dataTransfer.setData('text/uri-list', absoluteUrl);
    event.dataTransfer.setData('text/html', \`<img src="\${absoluteUrl}" alt="\${item.label}" />\`);
    event.dataTransfer.effectAllowed = 'copy';
  };`;

// Using a slightly more flexible regex to catch the current state
const dragRegex = /const handleDesignerAssetDragStart = \(event: React\.DragEvent<HTMLDivElement>,item: DesignerLibraryItem\) => \{[\s\S]*?\};/;

c = c.replace(dragRegex, correctDragStart);

fs.writeFileSync('src/App.tsx', c);
