import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

const missingBlock = `                  {selectedProject.finalImage && (
                    <div className="final-preview-panel">
                      <label>Bản vẽ hoàn thiện</label>
                      <img className="final-preview-image" src={selectedProject.finalImage} alt="Bản vẽ hoàn thiện" />
                    </div>
                  )}
                </div>
              </div>

              <div className="requirement-section">
                <div className="section-card glass-panel">
                  <div className="section-header">
                    <CheckCircle2 size={18} /> <h3>Phân tích yêu cầu & Mẫu chọn</h3>
                  </div>

                  <div className="requirement-checklist">
                    <div className="check-item">
                      <label>Gói dịch vụ:</label>
                      <span className="val-tag service">{selectedProject.service}</span>
                    </div>

                    <div className="check-item">
                      <label>Nhánh xử lý:</label>
                      <span className="val-tag workflow">{getWorkflowLabel(selectedProject.workflowBranch)}</span>
                    </div>

                    {selectedProject.selections.thac && (
                      <div className="check-item">
                        <label>Thác nước:</label>
                        <span className="val-tag">{getAssetName(selectedProject.selections.thac, 'THAC')}</span>
                      </div>
                    )}

                    {selectedProject.selections.ke && selectedProject.selections.ke.length > 0 && (
                      <div className="check-item">
                        <label>Kè đá:</label>
                        <div className="tags-list">
                          {selectedProject.selections.ke.map(id => (
                            <span key={id} className="val-tag">{getAssetName(id, 'KE')}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedProject.selections.canh && selectedProject.selections.canh.length > 0 && (
                      <div className="check-item">
                        <label>Cảnh quan:</label>
                        <div className="tags-list">
                          {selectedProject.selections.canh.map(id => (
                            <span key={id} className="val-tag">{getAssetName(id, 'CANH')}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="note-display">
                    <label>Mô tả ý tưởng khách hàng:</label>
                    <div className="note-text">{selectedProject.note || 'Không có mô tả chi tiết.'}</div>
                  </div>
                </div>

                <div className="section-card glass-panel workflow-section">
                  <div className="section-header">
                    <Bot size={18} /> <h3>Nhánh tác vụ xử lý</h3>
                  </div>

                  <div className="workflow-grid">
                    {workflowOptions.map(option => (`;

// Replace from {selectedProject.finalImage to <button key={option.id}
const brokenReg = /\{\s*selectedProject\.finalImage\s*&&\s*\([\s\S]*?<img className="final-preview-image" src=\{selectedProject\.finalImage\} alt="Bản vẽ hoàn thiện" \/>\s*<\/div>\s*<button\s*key=\{option\.id\}/m;

c = c.replace(brokenReg, missingBlock + `\n                      <button\n                        key={option.id}`);

fs.writeFileSync('src/App.tsx', c);
