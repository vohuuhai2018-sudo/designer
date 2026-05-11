const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const broken = `function SuccessView({ projectId, service, onReset, retryCount = 0, onRetry, isRetrying = false, onBack, isShareView = false }: { projectId: string; service: string; onReset: () => void; retryCount?: number; onRetry?: () => void; isRetrying?: boolean; onBack?: () => void; isShareView?: boolean }) {\\n  const [project, setProject] = useState<Project | null>(null);\\n  const isPaid = (project as any)?.payment?.status === 'paid';`;

const fixed = `function SuccessView({ projectId, service, onReset, retryCount = 0, onRetry, isRetrying = false, onBack, isShareView = false }: { projectId: string; service: string; onReset: () => void; retryCount?: number; onRetry?: () => void; isRetrying?: boolean; onBack?: () => void; isShareView?: boolean }) {
  const [project, setProject] = useState<Project | null>(null);
  const isPaid = (project as any)?.payment?.status === 'paid';`;

if (content.includes(broken)) {
    content = content.replace(broken, fixed);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Fixed newline literals');
} else {
    // Loose match
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('SuccessView') && lines[i].includes('\\n')) {
            lines[i] = lines[i].split('\\n').join('\n');
            fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
            console.log('SUCCESS: Fixed newline literals (line search)');
            break;
        }
    }
}
