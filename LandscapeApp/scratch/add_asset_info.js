import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const getAssetName = (id: string, category: 'THAC' | 'KE' | 'CANH') => {
    const list = ASSETS[category];
    for (const item of list) {
      if (item.id === id) return item.name;
      if ('variants' in item && item.variants) {
        const variant = item.variants.find(v => v.id === id);
        if (variant) return variant.name;
      }
    }
    return id;
  };`;

const replacement = `  const getAssetInfo = (id: string, category: 'THAC' | 'KE' | 'CANH'): { name: string, url: string } | null => {
    const list = ASSETS[category];
    for (const item of list) {
      if (item.id === id) return { name: item.name, url: item.url };
      if ('variants' in item && item.variants) {
        const variant = item.variants.find(v => v.id === id);
        if (variant) return { name: variant.name, url: variant.url };
      }
    }
    return null;
  };

  const getAssetName = (id: string, category: 'THAC' | 'KE' | 'CANH') => {
    const info = getAssetInfo(id, category);
    return info ? info.name : id;
  };`;

c = c.replace(target, replacement);

fs.writeFileSync('src/App.tsx', c);
