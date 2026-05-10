const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Injection 1: State and handler
const stateTarget = "const [selectedImage, setSelectedImage] = useState<any>(null);";
const stateInjection = `const [selectedImage, setSelectedImage] = useState<any>(null);
  const [isUploadingCustom, setIsUploadingCustom] = useState(false);
  const customFileInputRef = useRef<HTMLInputElement>(null);

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 10MB.');
      return;
    }

    setIsUploadingCustom(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result;
        // Gửi lên API upload hiện có
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64data })
        });
        const uploadData = await uploadRes.json();
        
        if (uploadData.url) {
          // Bật modal preview
          setSelectedImage({
             name: 'Ảnh mẫu tự tải lên',
             url: uploadData.url,
             images: [],
             id: 'custom_upload_' + Date.now()
          });
        } else {
          alert('Tải ảnh lên thất bại. Vui lòng thử lại.');
        }
        setIsUploadingCustom(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tải ảnh.');
      setIsUploadingCustom(false);
    }
  };`;

if (content.includes(stateTarget) && !content.includes('isUploadingCustom')) {
  content = content.replace(stateTarget, stateInjection);
}

// Injection 2: UI Button
const uiTarget = "className=\"lib-grid\"\r\n            >\r\n              {galleryImages.map";
// For robustness, use regex
const uiTargetRegex = /(className="lib-grid"\s*>\s*)\{galleryImages\.map/m;
const uiInjection = `$1
              {/* Nút tải ảnh tuỳ chỉnh */}
              <div 
                className="lib-card custom-upload-card" 
                onClick={() => !isUploadingCustom && customFileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--bronze-300)',
                  background: 'var(--cream-50)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isUploadingCustom ? 'wait' : 'pointer',
                  minHeight: '200px',
                  boxShadow: 'none',
                  opacity: isUploadingCustom ? 0.7 : 1
                }}
              >
                {isUploadingCustom ? (
                   <Loader2 className="animate-spin" size={32} color="var(--bronze-500)" />
                ) : (
                   <>
                     <Plus size={32} color="var(--bronze-500)" style={{ marginBottom: 12 }} />
                     <span style={{ color: 'var(--bronze-700)', fontWeight: 600, fontSize: '14px' }}>Tải ảnh của bạn</span>
                     <span style={{ color: 'var(--ink-400)', fontSize: '12px', marginTop: 4 }}>(JPG, PNG &lt; 10MB)</span>
                   </>
                )}
                <input 
                   type="file" 
                   ref={customFileInputRef} 
                   accept="image/jpeg, image/png, image/webp" 
                   style={{ display: 'none' }} 
                   onChange={handleCustomUpload} 
                />
              </div>

              {galleryImages.map`;

if (uiTargetRegex.test(content) && !content.includes('custom-upload-card')) {
  content = content.replace(uiTargetRegex, uiInjection);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
