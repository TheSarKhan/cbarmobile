import {setZXingModuleOverrides} from 'barcode-detector/ponyfill';

// Browsers without a native BarcodeDetector (Safari, desktop Chrome) decode QR with zxing's WASM, which defaults to a CDN.
// Serve it from /public (copied by scripts/copy-mediapipe.js) so scanning works offline and behind blocked networks.
setZXingModuleOverrides({locateFile:(file:string,prefix:string)=>file.endsWith('.wasm')?'/zxing/'+file:prefix+file});
