const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const oldMedia = /@media \(min-width: 900px\) \{[\s\S]*?\.wd-hero-inner \{[\s\S]*?\}\s*\}\s*$/;

const newMedia = `
@media (min-width: 900px) {
  .wd-hero {
    align-items: center;
    padding: 160px 0 100px;
    background: #fbf7ee; /* Base color to avoid white flash */
  }

  /* Smooth zoom animation for background */
  .wd-hero-bg {
    animation: heroZoom 20s infinite alternate ease-in-out;
  }
  @keyframes heroZoom {
    0% { transform: scale(1.0); }
    100% { transform: scale(1.08); }
  }

  .wd-hero-inner {
    text-align: left;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 40px;
    padding: 72px 64px;
    box-shadow: 
      0 32px 64px rgba(0,0,0,0.06), 
      inset 0 1px 0 rgba(255,255,255,0.9),
      inset 0 -1px 0 rgba(0,0,0,0.02);
    max-width: 720px;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    animation: fadeSlideLeft 1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  @keyframes fadeSlideLeft {
    0% { opacity: 0; transform: translateX(-40px); }
    100% { opacity: 1; transform: translateX(0); }
  }

  .wd-display {
    text-align: left;
    margin: 20px 0 28px;
    font-size: clamp(48px, 5.5vw, 82px);
    line-height: 1.05;
    letter-spacing: -0.03em;
  }

  .wd-hero-sub {
    text-align: left;
    max-width: 100%;
    font-size: 19px;
    line-height: 1.6;
    color: var(--ink-800);
    margin-bottom: 8px;
  }

  .wd-hero-actions {
    justify-content: flex-start;
    margin-top: 36px;
    gap: 16px;
  }

  /* Premium Buttons */
  .wd-hero-actions .btn {
    padding: 18px 36px;
    font-size: 16px;
    border-radius: 100px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .wd-hero-actions .btn-primary {
    background: var(--bronze-grad);
    border: 0;
    box-shadow: 0 12px 24px rgba(184, 134, 11, 0.25);
  }

  .wd-hero-actions .btn-primary:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 18px 36px rgba(184, 134, 11, 0.35);
  }

  .wd-hero-actions .btn-ghost-light {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(0, 0, 0, 0.08);
    color: var(--ink-900);
  }

  .wd-hero-actions .btn-ghost-light:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: var(--bronze-500);
    transform: translateY(-3px);
  }

  .wd-hero-strip {
    justify-content: flex-start;
    margin-top: 40px;
    padding: 14px 24px;
    background: rgba(255,255,255,0.75);
    backdrop-filter: blur(8px);
    border-radius: 100px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    border: 1px solid rgba(255,255,255,0.8);
    font-size: 15px;
  }
}
`;

// Replace the old media block with the new one.
// We'll search for the last occurrence of @media (min-width: 900px)
const lastIndex = content.lastIndexOf('@media (min-width: 900px)');
if (lastIndex !== -1) {
    content = content.substring(0, lastIndex) + newMedia;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully redesigned App.css for desktop');
} else {
    // If not found, just append
    content += newMedia;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Appended redesign to App.css');
}
