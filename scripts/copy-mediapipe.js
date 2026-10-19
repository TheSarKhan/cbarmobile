// Face detection runs in the browser; its WASM runtime is copied from node_modules so nothing loads from a CDN.
const fs = require('fs');
const path = require('path');
const from = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const to = path.join(__dirname, '..', 'public', 'mediapipe', 'wasm');
fs.mkdirSync(to, { recursive: true });
for (const file of fs.readdirSync(from)) fs.copyFileSync(path.join(from, file), path.join(to, file));
fs.copyFileSync(path.join(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'vision_bundle.mjs'), path.join(__dirname, '..', 'public', 'mediapipe', 'vision_bundle.mjs'));
