const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Specific removal from WelcomeView
const removalTarget = `      {/* Floating contact */}
      <div className="wd-float">
        <a className="wd-float-support-icon" href="https://zalo.me/0888220044" target="_blank" rel="noopener noreferrer" title="Chat Hỗ Trợ">
          <MessageCircle size={30} />
        </a>
      </div>`;

if (content.indexOf(removalTarget) !== -1) {
    content = content.replace(removalTarget, '');
    console.log('SUCCESS: Removed floating button from WelcomeView');
} else {
    // Try with different line endings if any
    const removalTargetLF = removalTarget.replace(/\r\n/g, '\n');
    if (content.indexOf(removalTargetLF) !== -1) {
        content = content.replace(removalTargetLF, '');
        console.log('SUCCESS: Removed floating button from WelcomeView (LF)');
    } else {
        console.log('ERROR: Could not find floating button in WelcomeView exactly');
    }
}

// Add to App main return
const portalCode = `      </div>
      {createPortal(
        <div className="wd-float">
          <a className="wd-float-support-icon" href="https://zalo.me/0888220044" target="_blank" rel="noopener noreferrer" title="Chat Hỗ Trợ">
            <MessageCircle size={30} />
          </a>
        </div>,
        document.body
      )}
    </>`;

const targetLine = '      </div>\r\n    </>';
const targetLineLF = '      </div>\n    </>';

if (content.indexOf(targetLine) !== -1) {
    content = content.replace(targetLine, portalCode);
    console.log('SUCCESS: Added floating button to App main return via Portal (CRLF)');
} else if (content.indexOf(targetLineLF) !== -1) {
    content = content.replace(targetLineLF, portalCode);
    console.log('SUCCESS: Added floating button to App main return via Portal (LF)');
} else {
    console.log('ERROR: Could not find App return target');
}

fs.writeFileSync(filePath, content, 'utf8');
