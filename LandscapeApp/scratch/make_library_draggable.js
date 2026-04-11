import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = '<div className="designer-resource-panel glass-panel">';
const replacement = `          <motion.div 
            drag
            dragMomentum={false}
            className="designer-resource-panel glass-panel"
            style={{ x: 0, y: 0 }}
          >`;

c = c.replace(targetStr, replacement);

// Also need to change the closing div for designer-resource-panel to </motion.div>
// I know the closing div is before </div>\n        </div>\n      </motion.div>\n    );\n  }\n\n  return (

const closingTarget = '              {visibleDesignerLibrary.length === 0 && (\n                <div className="designer-library-empty">Chưa có ảnh phù hợp trong nhóm tài nguyên này.</div>\n              )}\n            </div>\n          </div>';
const closingReplacement = '              {visibleDesignerLibrary.length === 0 && (\n                <div className="designer-library-empty">Chưa có ảnh phù hợp trong nhóm tài nguyên này.</div>\n              )}\n            </div>\n          </motion.div>';

c = c.replace(closingTarget, closingReplacement);

fs.writeFileSync('src/App.tsx', c);
