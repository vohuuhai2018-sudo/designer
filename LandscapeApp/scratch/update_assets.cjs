const fs = require('fs');
const path = require('path');

const publicAssetsDir = path.join(__dirname, '..', 'public', 'assets');
const appTsxPath = path.join(__dirname, '..', 'src', 'App.tsx');

// Mapping folder names to object keys and human-readable names
const mapping = {
  'THIẾT KẾ CẢNH QUAN': {
    'MẪU FARM & DU LỊCH': { key: 'FARM', name: 'FARM & DU LỊCH' },
    'MẪU HỒ BƠI THIÊN NHIÊN': { key: 'HO_BOI', name: 'HỒ BƠI THIÊN NHIÊN' },
    'MẪU HỒ KOI CỔ ĐIỂN': { key: 'HO', name: 'HỒ KOI CỔ ĐIỂN' },
    'MẪU HỒ KOI HIỆN ĐẠI': { key: 'HO_HIEN_DAI', name: 'HỒ KOI HIỆN ĐẠI' },
    'MẪU QUÁN CÀ PHÊ': { key: 'CAFE', name: 'QUÁN CÀ PHÊ' },
    'MẪU TƯỜNG CÂY & VƯỜN NHIỆT ĐỚI': { key: 'TUONG_CAY', name: 'TƯỜNG CÂY & VƯỜN NHIỆT ĐỚI' },
    'MẪU TƯỜNG ĐÁ TRANG TRÍ': { key: 'TUONG_DA', name: 'TƯỜNG ĐÁ TRANG TRÍ' }
  },
  'THIẾT KẾ KIẾN TRÚC': {
    'MẪU NHÀ BIỆT THỰ': { key: 'BIET_THU', name: 'NHÀ BIỆT THỰ' },
    'MẪU NHÀ CẤP 4': { key: 'NHA_CAP_4', name: 'NHÀ CẤP 4' },
    'MẪU NHÀ PHỐ': { key: 'NHA_PHO', name: 'NHÀ PHỐ' },
    'MẪU NHÀ TIỀN CHẾ': { key: 'NHA_TIEN_CHE', name: 'NHÀ TIỀN CHẾ' },
    'MẪU NHÀ VƯỜN': { key: 'NHA_VUON', name: 'NHÀ VƯỜN' }
  },
  'THIẾT KẾ NỘI THẤT': {
    'NỘI THẤT CỔ ĐIỂN': { key: 'TAN_CO_DIEN', name: 'Nội Thất Tân Cổ Điển', isInterior: true },
    'NỘI THẤT GỖ TÂN CỔ ĐIỂN': { key: 'TAN_CO_DIEN_GO', name: 'Nội Thất Tân Cổ Điển Gỗ', isInterior: true },
    'NỘI THẤT HIỆN ĐẠI': { key: 'HIEN_DAI', name: 'Nội Thất Hiện Đại', isInterior: true },
    'NỘI THẤT INDOCHINE': { key: 'Indochine', name: 'Nội Thất Indochine', isInterior: true },
    'NỘI THẤT WABI SABI': { key: 'WABI_SABI', name: 'Nội Thất Wabi Sabi', isInterior: true }
  }
};

let outputBlocks = [];

function escapeStr(str) {
  return str.replace(/'/g, "\\'");
}

for (const [mainDir, cats] of Object.entries(mapping)) {
  for (const [catDir, conf] of Object.entries(cats)) {
    const fullDir = path.join(publicAssetsDir, mainDir, catDir);
    if (!fs.existsSync(fullDir)) {
      console.warn(`Directory not found: ${fullDir}`);
      continue;
    }

    if (conf.isInterior) {
      // Interior: directories inside like '1', '2', etc. each containing 4 images.
      const subDirs = fs.readdirSync(fullDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => parseInt(d.name))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
      
      let variants = [];
      let rootUrl = '';
      
      for (let i = 0; i < subDirs.length; i++) {
        const itemDirName = subDirs[i].toString();
        const itemDir = path.join(fullDir, itemDirName);
        const images = fs.readdirSync(itemDir)
          .filter(f => f.match(/\.(png|jpe?g|gif|webp)$/i))
          .sort()
          .map(img => `/assets/${mainDir}/${catDir}/${itemDirName}/${img}`);
          
        if (images.length === 0) continue;
        
        const firstImageUrl = images[0];
        if (!rootUrl) rootUrl = firstImageUrl;
        
        let formattedName = conf.name;
        // The old code names them like "Tân Cổ Điển 1"
        if (conf.name.startsWith('Nội Thất ')) {
          formattedName = conf.name.replace('Nội Thất ', '');
        }
        
        variants.push(`      {
        id: '${conf.key}_v${subDirs[i]}',
        url: '${escapeStr(firstImageUrl)}',
        name: '${escapeStr(formattedName)} ${subDirs[i]}',
        images: [${images.map(url => `'${escapeStr(url)}'`).join(', ')}]
      }`);
      }
      
      if (variants.length > 0) {
        outputBlocks.push(`  ${conf.key}: [{
    id: '${conf.key}_root',
    name: '${escapeStr(conf.name)}',
    variants: [
${variants.join(',\n')}
    ]
  }]`);
      }
    } else {
      // Landscape & Architecture: flat list of images
      const images = fs.readdirSync(fullDir)
        .filter(f => f.match(/\.(png|jpe?g|gif|webp)$/i))
        .sort()
        .map(img => `/assets/${mainDir}/${catDir}/${img}`);
        
      if (images.length === 0) continue;
      
      const rootUrl = images[0];
      
      let variants = images.map((url, i) => {
        return `      { id: '${conf.key}_v${i+1}', url: '${escapeStr(url)}', name: 'Mẫu ${String(i+1).padStart(2, '0')}' }`;
      });
      
      outputBlocks.push(`  ${conf.key}: [{
    id: '${conf.key}_root',
    url: '${escapeStr(rootUrl)}',
    name: '${escapeStr(conf.name)}',
    variants: [
${variants.join(',\n')}
    ]
  }]`);
    }
  }
}

const newAssetsBlock = outputBlocks.join(',\n');

// Read App.tsx
let content = fs.readFileSync(appTsxPath, 'utf8');

// The ASSETS block has a static part and a dynamic part. 
// Let's find '  CANH: [' and the closing '],' and replace everything after it until '};' (before SYSTEM_REFERENCE_LIBRARY)

const startMarker = "  CANH: [";
const endMarker = "const SYSTEM_REFERENCE_LIBRARY";

let startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.log('Could not find start marker');
  process.exit(1);
}

// Find the first '],' after startIndex
let endOfCanhIndex = content.indexOf("],", startIndex);
if (endOfCanhIndex === -1) {
  console.log('Could not find end of CANH');
  process.exit(1);
}

// The insertion point is right after '],' and newline
let insertPos = endOfCanhIndex + 2;

let endIndex = content.indexOf(endMarker, insertPos);
if (endIndex === -1) {
  console.log('Could not find end marker');
  process.exit(1);
}

// We need to slice up to insertPos, then insert ',\n', then our newAssetsBlock, then '};\n' then the rest starting at endIndex
// Wait, ASSETS must be closed with `};\n` before SYSTEM_REFERENCE_LIBRARY
let beforeStr = content.substring(0, insertPos);
let afterStr = content.substring(endIndex);

let hasCRLF = content.includes('\r\n');
let newline = hasCRLF ? '\r\n' : '\n';

let newContent = beforeStr + newline + newAssetsBlock + newline + '};' + newline + afterStr;

fs.writeFileSync(appTsxPath, newContent, 'utf8');
console.log('App.tsx updated successfully!');
process.exit(0);
