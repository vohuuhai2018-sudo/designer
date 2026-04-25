const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../src/App.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

const startIndex = cssContent.indexOf('/* Welcome View V3 - thietke5p.com */');
const endIndex = cssContent.indexOf('.admin-content { width: 100%; display: block; }');

if (startIndex !== -1 && endIndex !== -1) {
  const newCss = `/* Welcome View V3 - Premium Glassmorphism */
.welcome-v2 {
  background: #f8fafc !important; /* Lighter clean background as fallback */
  color: #0f172a !important;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
}

.founder-bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('/assets/BACK GROUND 1.jpeg') center center no-repeat;
  background-size: cover;
  opacity: 0.85; /* Giảm opacity một chút để focus vào content */
  filter: blur(4px); /* Thêm chút blur cho background ngoài cùng */
  z-index: 0;
}

.welcome-v2 .hero-content {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.85); /* Premium glassmorphism */
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 50px 40px;
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  width: 100%;
  max-width: 1050px;
  min-height: auto;
  text-align: center;
  margin: 40px auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

@media (max-width: 1100px) {
  .welcome-v2 .hero-content {
    max-width: 100%;
    height: 100%;
    min-height: 100dvh;
    border-radius: 0;
    border: none;
    padding: 40px 20px;
    margin: 0;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: none;
  }
  
  .welcome-v2 {
    background: #ffffff;
    padding: 0;
  }
}

.logo-tech-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 10;
}

.main-logo-image {
  height: auto;
  width: 80%;
  max-width: 400px;
  object-fit: contain;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 10px 15px rgba(0,0,0,0.05));
}

.logo-tech-container:hover .main-logo-image {
  transform: scale(1.03);
}

.welcome-v2 .main-title-v3 {
  font-size: 1.6rem !important;
  font-weight: 800;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  text-align: center;
  margin: 0 auto 40px;
  width: 100%;
  max-width: 850px;
  white-space: normal;
  letter-spacing: 0.2px;
  opacity: 1;
  display: block;
  line-height: 1.5;
}

.branch-cta-group-v2 {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  margin-bottom: 30px;
}

.btn-v2-main {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0,0,0,0.02);
}

.btn-v2-main:hover {
  border-color: rgba(59, 130, 246, 0.3); /* Subtle blue accent border */
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0,0,0,0.04);
  transform: translateY(-4px);
  background: #ffffff;
}

.btn-v2-icon {
  width: 110px;
  height: 110px;
  border-radius: 22px; /* Squircle feel */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: transparent;
  border: none;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08); /* Softer shadow */
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.btn-v2-main:hover .btn-v2-icon {
  box-shadow: 0 12px 25px rgba(0,0,0,0.12);
  transform: scale(1.03);
}

.full-width-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: inherit;
}

.btn-v2-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btn-v2-text strong {
  font-size: 1.5rem;
  color: #0f172a; /* Slate 900 */
  font-weight: 800;
  letter-spacing: 0.2px;
  white-space: normal;
}

.btn-v2-text span {
  font-size: 1.15rem;
  color: #64748b; /* Slate 500 */
  font-weight: 500;
  line-height: 1.4;
}

.arrow-float {
  margin-left: auto;
  opacity: 0.6;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  filter: grayscale(100%) opacity(0.7); /* Make it subtle initially */
}

.custom-arrow {
  width: 36px;
  height: 36px;
  object-fit: contain;
  flex-shrink: 0;
}

.btn-v2-main:hover .arrow-float {
  transform: translateX(6px);
  opacity: 1;
  filter: grayscale(0%) opacity(1); /* Reveal full color on hover */
}

.btn-my-projects-v2 {
  width: 100%;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  color: #334155;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 30px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
}

.btn-my-projects-v2:hover {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #0f172a;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}

.btn-my-projects-v2 span {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.btn-my-projects-v2 svg {
  color: #64748b; /* Subtle icon */
  transition: color 0.3s ease;
}

.btn-my-projects-v2:hover svg {
  color: #3b82f6; /* Accent color on hover */
}

.process-flow-v3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 8px;
  background: rgba(255, 255, 255, 0.6);
  padding: 16px 20px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 15px rgba(0,0,0,0.02);
  width: 100%;
}

.process-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 12px;
}

.step-icon {
  width: clamp(50px, 7vw, 85px);
  height: clamp(50px, 7vw, 85px);
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  padding: 2px; /* Small padding so the image breathes */
}

.process-step span {
  font-size: clamp(0.7rem, 1.2vw, 1.1rem);
  color: #334155;
  font-weight: 800;
  text-align: center;
  white-space: nowrap;
  letter-spacing: 0.2px;
}

.process-step:hover .step-icon {
  border-color: #e2e8f0;
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1);
}

.step-arrow {
  opacity: 0.4;
  transition: opacity 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.process-flow-v3:hover .step-arrow {
  opacity: 0.7;
}

.custom-arrow-small {
  width: clamp(16px, 2.5vw, 28px);
  height: clamp(16px, 2.5vw, 28px);
  object-fit: contain;
  filter: grayscale(100%); /* Make the arrow minimal */
}

/* Mobile Scaling Optimizations */
@media (max-width: 1100px) {
  .logo-tech-container {
    margin-bottom: 20px;
  }

  .welcome-v2 .main-title-v3 {
    font-size: 1.3rem !important;
    margin-bottom: 30px;
  }

  .branch-cta-group-v2 {
    gap: 12px;
    margin-bottom: 24px;
  }

  .btn-v2-main {
    padding: 14px 18px;
    gap: 16px;
    border-radius: 20px;
  }

  .btn-v2-icon {
    width: 85px;
    height: 85px;
    min-width: 85px;
    border-radius: 18px;
  }

  .btn-v2-text strong {
    font-size: 1.25rem;
  }

  .btn-v2-text span {
    font-size: 0.95rem;
  }
  
  .custom-arrow {
    width: 28px;
    height: 28px;
  }

  .process-flow-v3 {
    margin-top: auto;
    padding: 16px 12px;
    gap: 4px;
  }

  .step-icon {
    width: 70px;
    height: 70px;
    min-width: 70px;
    border-radius: 18px;
  }

  .process-step span {
    font-size: 0.9rem;
  }
}

`;
  
  const finalCss = cssContent.substring(0, startIndex) + newCss + cssContent.substring(endIndex);
  fs.writeFileSync(cssPath, finalCss, 'utf8');
  console.log('Successfully updated App.css with Premium UI for Welcome View');
} else {
  console.log('Could not find the start or end index in App.css');
}
