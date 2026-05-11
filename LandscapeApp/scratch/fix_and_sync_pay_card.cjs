const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startTag = '<aside className={`pay-card ${isPaid ? \'is-paid\' : \'\'}`}>';
const endTag = '</aside>';
const startIdx = content.indexOf(startTag);
const endIdx = content.indexOf(endTag, startIdx) + endTag.length;

const fixedBlock = `<aside className={\`pay-card \${isPaid ? 'is-paid' : ''}\`}>
                  <div className="pay-shine" />
                  {isPaid ? (
                    <>
                      <div className="pay-eyebrow"><CheckCircle2 size={14} /> Đã thanh toán</div>
                      <div className="pay-title">Tải về toàn bộ tài liệu</div>
                      <div className="pay-desc">Bấm vào từng file để tải HD về máy.</div>
                      <div className="pay-downloads">
                        {[
                          ...(project?.aiResults || []),
                          ...((project as any)?.pass2Results?.tasks || []).filter((t: any) => t.url).map((t: any) => t.url)
                        ].map((url: string, i: number) => {
                          const isVid = url.endsWith('.mp4') || url.includes('/video/');
                          return (
                            <a key={\`\${url}-\${i}\`} href={url} download className="pay-download-btn">
                              ⬇ {isVid ? \`Video \${i + 1}\` : \`Ảnh \${i + 1}\`}
                            </a>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="pay-eyebrow"><Sparkles size={14} /> Bản HD không watermark</div>
                      <div className="pay-title">Gói Cơ Bản: Tải 4 ảnh phương án</div>
                      <div className="pay-desc">4 ảnh chất lượng cao. Miễn phí lên phương án. Tối đa 2 lần chỉnh sửa.</div>
                      <div className="pay-row">
                        <div className="pay-price">
                          <b>50.000<span>đ</span></b>
                          <i>/ trọn gói 4 phương án</i>
                        </div>
                        <button className="btn btn-pay" onClick={() => setPaymentOpen(true)}>
                          <CreditCard size={16} /> Thanh toán &amp; tải về
                        </button>
                      </div>
                      <div className="pay-trust">
                        <span><ShieldCheck size={13} /> Cổng VNPay bảo mật</span>
                        <span><RotateCcw size={13} /> Hoàn tiền nếu không hài lòng</span>
                      </div>
                    </>
                  )}
                </aside>`;

if (startIdx !== -1 && endIdx !== -1) {
    content = content.slice(0, startIdx) + fixedBlock + content.slice(endIdx);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Fixed Pay Card block and synced with Basic package');
} else {
    console.log('ERROR: Could not find Pay Card block boundaries');
}
