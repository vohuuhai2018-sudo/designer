const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.css';
let content = fs.readFileSync(filePath, 'utf8');

const oldStyles = `.wd-float-support-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #0068FF;
  color: #fff;
  box-shadow: 0 10px 30px rgba(0, 104, 255, 0.4);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
}`;

const newStyles = `.wd-float-support-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 24px;
  border-radius: 50px;
  background: #0068FF;
  color: #fff;
  box-shadow: 0 10px 30px rgba(0, 104, 255, 0.4);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  font-weight: 700;
  font-size: 15px;
}`;

if (content.includes(oldStyles)) {
    content = content.replace(oldStyles, newStyles);
    // Remove the width/height override in media query
    content = content.replace('.wd-float-support-icon {\n    width: 60px;\n    height: 60px;', '.wd-float-support-icon {\n    padding: 10px 20px;\n    font-size: 14px;');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Updated Support button CSS');
} else {
    console.log('ERROR: Could not find Support button CSS');
}
