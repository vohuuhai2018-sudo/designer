const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetRegex = /<div className="link-share">[\s\S]*?<a className="share-chip" href={`mailto:[^>]+>[\s\S]*?<\/a>[\s\S]*?\{retryCount < 1 && !isShareView && onRetry && \([\s\S]*?<button className="share-chip" onClick=\{onRetry\} disabled=\{isRetrying\}>[\s\S]*?<RefreshCcw size=\{14\} className=\{isRetrying \? 'spin' : ''\} \/> \{isRetrying \? 'Đang gửi\.\.\.' : 'Thử lần 2'\}[\s\S]*?<\/button>[\s\S]*?\)\}[\s\S]*?<\/div>/;

const replacement = `<div className="link-share">
                    {retryCount < 1 && !isShareView && onRetry && (
                      <button className="btn-retry-prominent" onClick={onRetry} disabled={isRetrying}>
                        <RefreshCcw size={16} className={isRetrying ? 'spin' : ''} /> {isRetrying ? 'Đang tạo...' : 'Thử lần 2'}
                      </button>
                    )}
                  </div>`;

if (targetRegex.test(content)) {
  content = content.replace(targetRegex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("SUCCESS");
} else {
  console.log("NOT FOUND");
}
