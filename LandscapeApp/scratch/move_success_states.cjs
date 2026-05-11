const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const successViewHead = 'function SuccessView({';
const statesToMove = `  const [project, setProject] = useState<Project | null>(null);
  const [pass2Picked, setPass2Picked] = useState('');
  const [pass2Starting, setPass2Starting] = useState(false);
  const [pass2Msg, setPass2Msg] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previousImages, setPreviousImages] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const presetPay = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('pay') : null;
  const [paymentOpen, setPaymentOpen] = useState(!!presetPay);
  const isPaid = (project as any)?.payment?.status === 'paid';`;

// Remove them from their current location
const oldStates = `  const [pass2Picked, setPass2Picked] = useState('');
      const [pass2Starting, setPass2Starting] = useState(false);
  const [pass2Msg, setPass2Msg] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previousImages, setPreviousImages] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const presetPay = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('pay') : null;
  const [paymentOpen, setPaymentOpen] = useState(!!presetPay);
  const isPaid = (project as any)?.payment?.status === 'paid';`;

if (content.includes(oldStates)) {
    content = content.replace(oldStates, '');
    const bodyIdx = content.indexOf(') {', content.indexOf(successViewHead)) + 3;
    content = content.slice(0, bodyIdx) + statesToMove + content.slice(bodyIdx);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Moved states to top of SuccessView');
} else {
    console.log('ERROR: Could not find old states block');
}
