const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldPayCard = `<div className="pay-eyebrow"><Sparkles size={14} /> Bản HD không watermark</div>
                      <div className="pay-title">Tải bản vẽ chất lượng cao</div>
                      <div className="pay-desc">Ảnh 4K + video walkthrough + bản vẽ vector. Có hóa đơn VAT.</div>
                      <div className="pay-row">
                        <div className="pay-price">
                          <b>299.000<span>đ</span></b>
                          <i>/ trọn gói {allImages.length} phương án</i>
                        </div>`;

const newPayCard = `<div className="pay-eyebrow"><Sparkles size={14} /> Bản HD không watermark</div>
                      <div className="pay-title">Gói Cơ Bản: Tải 4 ảnh phương án</div>
                      <div className="pay-desc">4 ảnh chất lượng cao. Miễn phí lên phương án. Tối đa 2 lần chỉnh sửa.</div>
                      <div className="pay-row">
                        <div className="pay-price">
                          <b>50.000<span>đ</span></b>
                          <i>/ trọn gói 4 phương án</i>
                        </div>`;

if (content.includes(oldPayCard)) {
    content = content.replace(oldPayCard, newPayCard);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Updated Pay Card content in App.tsx');
} else {
    // Try a more flexible match
    const regex = /<div className="pay-eyebrow">.*?Bản HD không watermark<\/div>\s*<div className="pay-title">.*?<\/div>\s*<div className="pay-desc">.*?<\/div>\s*<div className="pay-row">\s*<div className="pay-price">\s*<b>299\.000<span>đ<\/span><\/b>\s*<i>\/ trọn gói \{allImages\.length\} phương án<\/i>/s;
    if (regex.test(content)) {
        content = content.replace(regex, newPayCard);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('SUCCESS: Updated Pay Card content in App.tsx with regex');
    } else {
        console.log('ERROR: Could not find Pay Card content');
    }
}
