import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

const target = `            </div>
          </div>

              <div className="req-note-box">`;

const replacement = `            </div>
          </div>

          <div className="designer-requirements">
            <h3>YÊU CẦU CHI TIẾT</h3>
            <div className="req-block">
              <label>Mẫu chuẩn đã chọn:</label>
              <div className="req-tags-visual">
                {(() => {
                  const items = [];
                  if (selectedProject.selections.thac) items.push({ id: selectedProject.selections.thac, cat: 'THAC' });
                  (selectedProject.selections.ke || []).forEach(id => items.push({ id, cat: 'KE' }));
                  (selectedProject.selections.canh || []).forEach(id => items.push({ id, cat: 'CANH' }));
                  
                  if (items.length === 0) return <div className="req-tag-mini">Chưa chọn mẫu</div>;

                  return items.map((item, idx) => {
                    const info = getAssetInfo(item.id, item.cat);
                    return (
                      <div key={idx} className="req-asset-preview" title={info?.name || item.id}>
                         <div className="req-asset-thumb">
                           <img src={info?.url} alt={info?.name} />
                         </div>
                         <div className="req-asset-info">
                            <div className="req-asset-name">{info?.name || item.id}</div>
                         </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="req-block">
              <label>Ghi chú ý tưởng:</label>
              <div className="req-note-box">`;

c = c.replace(target, replacement);

fs.writeFileSync('src/App.tsx', c);
