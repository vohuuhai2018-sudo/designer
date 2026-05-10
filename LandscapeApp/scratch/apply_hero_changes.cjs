const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldTitle = 'Hồ koi sân vườn<br /><em>đẹp như mơ.</em>';
const newTitle = 'Kiến tạo không gian<br /><em>sống đẹp như mơ.</em>';

const oldSub = 'Hệ thống thiết kế bản vẽ nhanh nhất Việt Nam. Cảnh quan, kiến trúc, nội thất — AI render chỉ 5 phút, hoặc KTS thiết kế chuyên sâu trong 24h.';
const newSub = 'Giải pháp thiết kế bản vẽ toàn diện và nhanh chóng nhất. Cảnh quan, kiến trúc, nội thất — AI render thần tốc trong 5 phút, hoặc KTS chuyên môn cao thiết kế tinh xảo trong 24h.';

content = content.replace(oldTitle, newTitle);
content = content.replace(oldSub, newSub);

// Split wd-container and wd-hero-inner
const targetDiv = '<div className="wd-container wd-hero-inner">';
const newDiv = '<div className="wd-container">\n          <div className="wd-hero-inner glass-hero">';
content = content.replace(targetDiv, newDiv);

// Close the inner div.
// Original:
//           <div className="wd-hero-strip">
//             <span><b>4,9★</b> đánh giá</span>
//             <span className="wd-strip-sep" />
//             <span><b>5000+</b> dự án</span>
//             <span className="wd-strip-sep" />
//             <span><b>5 phút</b> AI render</span>
//           </div>
//         </div>
//       </section>

const targetEnd = `          <div className="wd-hero-strip">
            <span><b>4,9★</b> đánh giá</span>
            <span className="wd-strip-sep" />
            <span><b>5000+</b> dự án</span>
            <span className="wd-strip-sep" />
            <span><b>5 phút</b> AI render</span>
          </div>
        </div>
      </section>`;

const newEnd = `          <div className="wd-hero-strip">
            <span><b>4,9★</b> đánh giá</span>
            <span className="wd-strip-sep" />
            <span><b>5000+</b> dự án</span>
            <span className="wd-strip-sep" />
            <span><b>5 phút</b> AI render</span>
          </div>
          </div>
        </div>
      </section>`;

content = content.replace(targetEnd, newEnd);

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
