const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const newStyles = `
/* Result Actions & Download */
.result-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-zoom, .result-download {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--cream-200);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-700);
  cursor: pointer;
  transition: all 0.2s ease;
}

.result-zoom:hover, .result-download:hover {
  background: var(--cream-50);
  border-color: var(--bronze-400);
  color: var(--bronze-600);
  transform: translateY(-1px);
}

.result-download {
  background: var(--bronze-50);
  color: var(--bronze-600);
  border-color: var(--bronze-200);
}

.result-download:hover {
  background: var(--bronze-600);
  color: #fff;
  border-color: var(--bronze-600);
}
`;

fs.appendFileSync(filePath, newStyles, 'utf8');
console.log('SUCCESS: Added CSS for download button');
