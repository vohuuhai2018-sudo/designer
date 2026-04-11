import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /{selectedProject\.workflowBranch === 'chatgpt_image' && \([\s\S]*?<div className="chatgpt-helper-panel">[\s\S]*?<\/div>\s*\)\}/;

const newPanel = `                  {selectedProject.workflowBranch === 'chatgpt_image' && (
                    <div className="chatgpt-helper-panel" style={{ padding: '1rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', marginTop: '1rem' }}>
                      <p style={{ marginBottom: '1rem', color: '#64748b' }}>Tiến trình xử lý bằng AI được thực hiện độc lập tại <strong>Trạm AI (AI Studio)</strong>.</p>
                      <button className="btn-primary" onClick={() => setShowAIStudio(true)} style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bot size={18} /> Mở Trạm AI (để xem Master Prompt)
                      </button>
                    </div>
                  )}`;

c = c.replace(regex, newPanel);

fs.writeFileSync('src/App.tsx', c);
