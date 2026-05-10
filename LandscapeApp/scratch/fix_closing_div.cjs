const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `          </div>
        </div>
      </section>`;

const replacement = `          </div>
          </div>
        </div>
      </section>`;

content = content.replace(target, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
