#!/usr/bin/env node
// Simple utility to copy a provided risk matrix image into backend/public/risk-matrix.png
// Usage: node backend/scripts/install-risk-matrix.js /full/path/to/risk-matrix.png
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) {
  console.error('Usage: node backend/scripts/install-risk-matrix.js /path/to/risk-matrix.png');
  process.exit(2);
}

if (!fs.existsSync(src)) {
  console.error('Source file does not exist:', src);
  process.exit(3);
}

const destDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
const dest = path.join(destDir, 'risk-matrix.png');

try {
  fs.copyFileSync(src, dest);
  console.log('Copied', src, '->', dest);
  process.exit(0);
} catch (e) {
  console.error('Failed to copy file:', e && e.message ? e.message : e);
  process.exit(4);
}
