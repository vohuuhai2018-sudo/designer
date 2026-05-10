const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
// We know line 2650 is "        </div>" and 2651 is "      </section>"
// But let's find the </section> after wd-hero-strip
const idx = lines.findIndex(line => line.includes('<section id="canh-quan"'));
if (idx > 0) {
  lines.splice(idx - 1, 0, '        </div>');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log("SUCCESS");
}
