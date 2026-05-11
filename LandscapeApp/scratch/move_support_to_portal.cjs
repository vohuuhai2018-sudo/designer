const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove from WelcomeView
const regexRemove = /\{[\s\S]*?Floating contact[\s\S]*?<div className="wd-float">[\s\S]*?<\/div>/;
if (regexRemove.test(content)) {
    content = content.replace(regexRemove, '');
    console.log('SUCCESS: Removed floating button from WelcomeView');
} else {
    console.log('ERROR: Could not find floating button in WelcomeView');
}

// Add to App main return (using createPortal)
// The end of App return is:
// 2318:       </div>
// 2319:     </>
// 2320:     </MotionConfig>

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

const targetLine = '      </div>\n    </>';
if (content.includes(targetLine)) {
    content = content.replace(targetLine, portalCode);
    console.log('SUCCESS: Added floating button to App main return via Portal');
} else {
    console.log('ERROR: Could not find App return target');
}

fs.writeFileSync(filePath, content, 'utf8');
