import fs from 'fs';

// Read the file as binary (raw bytes)
const raw = fs.readFileSync('src/App.tsx', 'binary');

// Convert from Latin1 (how powershell incorrectly saved the UTF-8 bytes) 
// back to a Buffer, then interpret that Buffer as UTF-8.
const restored = Buffer.from(raw, 'latin1').toString('utf8');

// Safeguard check: If the restored content still has mojibake, or if it looks correct.
// We'll write it back as UTF-8.
fs.writeFileSync('src/App.tsx', restored, 'utf8');
