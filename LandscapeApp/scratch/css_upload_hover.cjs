const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.css');
let content = fs.readFileSync(filePath, 'utf8');

const cssToAdd = `
/* Custom Upload Card */
.custom-upload-card {
  transition: all 0.2s ease;
}
.custom-upload-card:hover {
  background: var(--cream-100) !important;
  border-color: var(--bronze-500) !important;
}
`;

if (!content.includes('.custom-upload-card {')) {
  content += cssToAdd;
  fs.writeFileSync(filePath, content, 'utf8');
}
