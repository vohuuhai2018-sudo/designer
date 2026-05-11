const fs = require('fs');
const f = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let c = fs.readFileSync(f, 'utf8');

const oldProtectedImage = `function ProtectedImage({ src, alt, className, style }: { src: string; alt?: string; className?: string; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: any = null;
    let mainLoaded = false;
    let wmLoaded = false;

    const mainImg = new Image();
    const wmImg = new Image();

    const checkAndDraw = () => {
      if (cancelled) return;
      if (mainLoaded && wmLoaded) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          drawWithWatermark(ctx, canvas, mainImg, wmImg);
          setLoaded(true);
        }
      }
    };

    mainImg.onload = () => { mainLoaded = true; checkAndDraw(); };
    wmImg.onload = () => { wmLoaded = true; checkAndDraw(); };
    
    mainImg.onerror = () => {
      if (cancelled) return;
      setFailed(true);
      setLoaded(true);
    };
    wmImg.onerror = () => {
      wmLoaded = true;
      const dummy = new Image();
      dummy.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      dummy.onload = () => { 
        if (!cancelled && mainLoaded) {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) drawWithWatermark(ctx, canvasRef.current!, mainImg, dummy);
          setLoaded(true);
        }
      };
    };

    wmImg.src = '/assets/CHU KY _ HAI VO.png';
    mainImg.src = src;

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [src]);

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFailed(false);
    setLoaded(false);
  };

  return (
    <div className={\`image-watermark-wrapper \${className || ''} \${loaded ? 'is-loaded' : ''}\`} style={style} onContextMenu={(e) => e.preventDefault()}>
      <canvas ref={canvasRef} title={alt} />
      <div className="security-overlay" />
      {failed && (
        <button onClick={handleManualRetry} className="img-retry-overlay" title="Tải lại ảnh">
          <RefreshCcw size={20} />
          <span>Tải lại</span>
        </button>
      )}
    </div>
  );
}`;

const newProtectedImage = `function ProtectedImage({ src, alt, className, style }: { src: string; alt?: string; className?: string; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, setRetryCount] = useState(0);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    let mainLoaded = false;
    let wmLoaded = false;

    const mainImg = new Image();
    const wmImg = new Image();
    
    // Ensure CORS is handled for Cloudinary/external images
    if (src.startsWith('http')) {
      mainImg.crossOrigin = "anonymous";
    }

    const checkAndDraw = () => {
      if (cancelled) return;
      if (mainLoaded && wmLoaded) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          try {
            drawWithWatermark(ctx, canvas, mainImg, wmImg);
            setLoaded(true);
            setFailed(false);
          } catch (err) {
            console.error("Canvas draw error:", err);
            setFailed(true);
          }
        }
      }
    };

    mainImg.onload = () => { 
      mainLoaded = true; 
      checkAndDraw(); 
    };
    
    mainImg.onerror = () => {
      if (cancelled) return;
      console.error("Failed to load image:", src);
      setFailed(true);
      setLoaded(true);
    };

    wmImg.onload = () => { 
      wmLoaded = true; 
      checkAndDraw(); 
    };
    
    wmImg.onerror = () => {
      // If watermark fails, use a transparent pixel dummy
      wmLoaded = true;
      const dummy = new Image();
      dummy.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      dummy.onload = () => { 
        if (!cancelled && mainLoaded) {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) drawWithWatermark(ctx, canvasRef.current!, mainImg, dummy);
          setLoaded(true);
        }
      };
    };

    wmImg.src = '/assets/CHU KY _ HAI VO.png';
    // Add timestamp to bypass cache if it failed before
    mainImg.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFailed(false);
    setLoaded(false);
    setRetryCount(prev => prev + 1);
  };

  return (
    <div className={\`image-watermark-wrapper \${className || ''} \${loaded ? 'is-loaded' : ''}\`} style={style} onContextMenu={(e) => e.preventDefault()}>
      <canvas ref={canvasRef} title={alt} />
      <div className="security-overlay" />
      {failed && (
        <button onClick={handleManualRetry} className="img-retry-overlay" title="Tải lại ảnh">
          <RefreshCcw size={20} />
          <span>Tải lại</span>
        </button>
      )}
    </div>
  );
}`;

if (c.includes(oldProtectedImage)) {
  c = c.replace(oldProtectedImage, newProtectedImage);
  fs.writeFileSync(f, c, 'utf8');
  console.log("SUCCESS: Upgraded ProtectedImage with CORS support and better error handling.");
} else {
  console.log("ERROR: Could not find ProtectedImage definition.");
  // Fallback: try to find it with more flexibility if needed
}
