import {LIVENESS_FACTORY_SOURCE} from './livenessTrackerSource';
const KNOWN_ACTIONS=['TURN_LEFT','TURN_RIGHT','BLINK','SMILE'];

/**
 * The same MediaPipe liveness check as src/Liveness.web.tsx, as a self-contained page for a native WebView.
 * It is loaded with an https base URL so the WebView treats it as a secure context and allows the camera;
 * the model and WASM runtime come from `${base}/mediapipe`. Results go back through postMessage:
 *   {type:'done',selfie,actions,facesCount} | {type:'error',message} | {type:'cancel'}
 * Keep the thresholds in step with Liveness.web.tsx.
 */
export function livenessHtml(base:string,actions:string[]){
 if(!actions.length||actions.some(a=>!KNOWN_ACTIONS.includes(a)))throw new Error('Canlılıq tapşırığı düzgün deyil.');
 const safeActions=actions;
 return `<!doctype html>
<html lang="az"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#120a33;color:#fff;font-family:-apple-system,system-ui,sans-serif}
#wrap{min-height:100%;display:flex;flex-direction:column;align-items:center;padding:14px}
#stage{position:relative;width:100%;max-width:380px;aspect-ratio:4/5;border-radius:22px;overflow:hidden;background:#0f0d14}
video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block}
#oval{position:absolute;top:8%;bottom:8%;left:18%;right:18%;border-radius:999px;border:2px solid rgba(255,255,255,.4)}
#oval.on{border-color:#e4d9ff}
#dots{display:flex;gap:6px;margin:14px 0 10px}.dot{width:8px;height:8px;border-radius:4px;background:#2b2244}.dot.cur{width:22px;background:#e4d9ff}.dot.done{background:#fff}
#msg{font-size:18px;font-weight:800;text-align:center}#sub{font-size:13px;color:rgba(255,255,255,.75);margin-top:4px;min-height:18px;text-align:center}
button{margin-top:14px;border:0;border-radius:14px;padding:13px 22px;font-size:15px;font-weight:700;background:rgba(255,255,255,.14);color:#fff}
#retry{display:none;background:#e4d9ff;color:#1b1838}
</style></head><body>
<div id="wrap">
 <div id="stage"><video id="v" playsinline muted autoplay></video><div id="oval"></div></div>
 <div id="dots"></div><div id="msg">Kamera açılır…</div><div id="sub"></div>
 <button id="retry">Yenidən cəhd et</button><button id="cancel">Ləğv et</button>
</div>
<script type="module">
const BASE=${JSON.stringify(base)};
const ACTIONS=${JSON.stringify(safeActions)};
const TEXT={TURN_LEFT:'Başınızı sola çevirin və bir an saxlayın',TURN_RIGHT:'Başınızı sağa çevirin və bir an saxlayın',BLINK:'Gözünüzü qırpın',SMILE:'Gülümsəyin'};
const STEP_SECONDS=10,MAX_WIDTH=640;
const makeTracker=(${LIVENESS_FACTORY_SOURCE});let tracker=makeTracker(ACTIONS);
const $=id=>document.getElementById(id);
const video=$('v'),oval=$('oval');
const send=m=>{const s=JSON.stringify(m);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else console.log(s);};
const dots=[...ACTIONS,'PHOTO'].map(()=>{const d=document.createElement('div');d.className='dot';$('dots').appendChild(d);return d;});
const paint=i=>dots.forEach((d,k)=>{d.className='dot'+(k<i?' done':k===i?' cur':'');});
const say=(t,s)=>{$('msg').textContent=t;$('sub').textContent=s||'';};
let stream=null,landmarker=null,frame=0,stopped=false;

function measure(res){
 const faces=res.faceLandmarks?res.faceLandmarks.length:0;
 if(faces!==1)return {faces};
 const lm=res.faceLandmarks[0];
 const lo=Math.min(lm[234].x,lm[454].x),hi=Math.max(lm[234].x,lm[454].x);
 const ratio=hi-lo>0.05?(lm[1].x-lo)/(hi-lo):0.5;
 const score=n=>{const c=res.faceBlendshapes&&res.faceBlendshapes[0]&&res.faceBlendshapes[0].categories.find(x=>x.categoryName===n);return c?c.score:0;};
 return {faces,pose:{ratio,blink:Math.min(score('eyeBlinkLeft'),score('eyeBlinkRight')),smile:(score('mouthSmileLeft')+score('mouthSmileRight'))/2}};
}
function release(){
 stopped=true;cancelAnimationFrame(frame);
 if(stream)stream.getTracks().forEach(t=>t.stop());
 if(landmarker){try{landmarker.close();}catch(e){}}
 stream=null;landmarker=null;
}
function fail(message){
 release();oval.className='';say('Kamera yoxlaması başlamadı',message);
 $('retry').style.display='inline-block';
 send({type:'error',message});
}
async function start(){
 stopped=false;tracker=makeTracker(ACTIONS);$('retry').style.display='none';paint(0);say('Kamera açılır…');
 try{
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Bu pəncərədə kamera dəstəklənmir.');
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});}
  catch(e){throw new Error('Kameraya icazə verilmədi. Tətbiq ayarlarından kameranı icazələndirin.');}
  if(stopped){stream.getTracks().forEach(t=>t.stop());stream=null;return;}
  video.srcObject=stream;await video.play();
  if(stopped){release();return;}
  say('Üz modeli yüklənir…');
  const mp=await import(BASE+'/mediapipe/vision_bundle.mjs');
  const fileset=await mp.FilesetResolver.forVisionTasks(BASE+'/mediapipe/wasm');
  const make=delegate=>mp.FaceLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:BASE+'/mediapipe/face_landmarker.task',delegate},runningMode:'VIDEO',numFaces:2,outputFaceBlendshapes:true});
  try{landmarker=await make('GPU');}catch(e){landmarker=await make('CPU');}
  if(stopped){release();return;}
  oval.className='on';
  const run={index:0,deadline:Date.now()+STEP_SECONDS*1000,last:Date.now(),done:[]};let lastVideoTime=-1;
  const tick=()=>{
   if(stopped||!landmarker)return;
   frame=requestAnimationFrame(tick);
   if(video.readyState<2||video.currentTime===lastVideoTime)return;lastVideoTime=video.currentTime;
   const now=Date.now(),elapsed=now-run.last;run.last=now;
   const r=measure(landmarker.detectForVideo(video,performance.now()));
   if(!r.pose){run.deadline+=elapsed;tracker.sample(null,now);say(r.faces===0?'Üzünüzü kadra gətirin':'Kadrda yalnız bir nəfər olmalıdır');return;}
   const tracked=tracker.sample(r.pose,now);
   if(run.index<ACTIONS.length){
    const action=ACTIONS[run.index];
    say(TEXT[action]||action,Math.max(0,Math.ceil((run.deadline-now)/1000))+' saniyə');
    if(tracked.index>run.index){run.done=tracked.actions||[];run.index=tracked.index;run.deadline=now+STEP_SECONDS*1000;paint(run.index);}
    else if(now>run.deadline){run.deadline=now+STEP_SECONDS*1000;tracker.resetCurrent();say(TEXT[action]||action,'Vaxt bitdi. Eyni hərəkəti yenidən edin.');}
    return;
   }
   say('Düz kameraya baxın');
   if(!tracked.ready)return;
   const scale=Math.min(1,MAX_WIDTH/video.videoWidth),canvas=document.createElement('canvas');
   canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
   canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
   const selfie=canvas.toDataURL('image/jpeg',0.85),done=run.done;
   release();say('Hazırdır ✓');
   send({type:'done',selfie,actions:done,facesCount:1});
  };
  paint(0);frame=requestAnimationFrame(tick);
 }catch(e){fail((e&&e.message)||'Kamera başladıla bilmədi.');}
}
$('cancel').onclick=()=>{release();send({type:'cancel'});};
$('retry').onclick=start;
window.addEventListener('pagehide',release);
window.addEventListener('unload',release);
start();
</script></body></html>`;
}
