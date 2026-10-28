require('./build-liveness').generate();
// Face detection runs in the browser; its WASM runtime is copied from node_modules so nothing loads from a CDN.
const fs = require('fs');
const path = require('path');
const from = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const to = path.join(__dirname, '..', 'public', 'mediapipe', 'wasm');
fs.mkdirSync(to, { recursive: true });
for (const file of fs.readdirSync(from)) fs.copyFileSync(path.join(from, file), path.join(to, file));
fs.copyFileSync(path.join(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'vision_bundle.mjs'), path.join(__dirname, '..', 'public', 'mediapipe', 'vision_bundle.mjs'));

// QR decoding in browsers without a native BarcodeDetector: same no-CDN rule.
fs.mkdirSync(path.join(__dirname, '..', 'public', 'zxing'), { recursive: true });
fs.copyFileSync(path.join(__dirname, '..', 'node_modules', 'zxing-wasm', 'dist', 'reader', 'zxing_reader.wasm'), path.join(__dirname, '..', 'public', 'zxing', 'zxing_reader.wasm'));

fs.writeFileSync(path.join(__dirname, '..', 'public', 'version.json'), JSON.stringify({version:require('../app.json').expo.version,camera:require('expo-camera/package.json').version})+'\n');
