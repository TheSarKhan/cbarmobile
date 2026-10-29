export type Pose={ratio:number;blink:number;smile:number};
/** This self-contained factory is also embedded in the native WebView. Keep dependencies inside it. */
export function createLivenessTracker(actions:string[]){
 const valid=['TURN_LEFT','TURN_RIGHT','BLINK','SMILE'];
 if(!actions.length||actions.some(a=>!valid.includes(a)))throw new Error('Canlılıq tapşırığı boşdur və ya düzgün deyil. Yenidən başlayın.');
 let index=0,phase='baseline',since=-1,closedAt=-1,photoSince=-1,lastTime=-1,lastSeen=-1;
 const done:string[]=[];
 function resetCurrent(){phase='baseline';since=-1;closedAt=-1;photoSince=-1;}
 function sample(p:Pose|null,now:number){
  if(!Number.isFinite(now)||now<=lastTime)return {index,ready:false};lastTime=now;
  if(!p||![p.ratio,p.blink,p.smile].every(Number.isFinite)){
   // the detector often drops the face for a few frames at the far end of a head turn: that must not cancel the turn
   const turning=index<actions.length&&actions[index].startsWith('TURN')&&phase==='action'&&since>=0;
   if(turning&&now-lastSeen<400)return {index,ready:false,actions:done.slice()};
   resetCurrent();return {index,ready:false};
  }
  lastSeen=now;
  const frontal=p.ratio>0.43&&p.ratio<0.57;
  const neutral=frontal&&p.blink<0.25;
  if(index===actions.length){
   if(!neutral)photoSince=-1;
   else if(photoSince<0)photoSince=now;
   return {index,ready:photoSince>=0&&now-photoSince>=500,actions:done.slice()};
  }
  const action=actions[index];
  if(phase==='baseline'){
   const resting=neutral&&(action!=='SMILE'||p.smile<0.3);
   if(!resting)since=-1;
   else if(since<0)since=now;
   if(since>=0&&now-since>=200){phase='action';since=-1;}
  }else if(action==='BLINK'){
   // A natural blink may occupy only one processed video frame: require open -> closed -> open,
   // rather than three closed frames, which missed quick blinks on slower devices.
   if(!frontal){resetCurrent();return {index,ready:false};}
   if(p.blink>=0.42&&closedAt<0)closedAt=now;
   if(closedAt>=0&&now-closedAt>1500){resetCurrent();return {index,ready:false};}
   if(closedAt>=0&&p.blink<0.25){if(now-closedAt>=30){done.push(action);index++;resetCurrent();}else closedAt=-1;}
  }else if(phase==='action'){
   const active=action==='TURN_LEFT'?p.ratio>0.6:action==='TURN_RIGHT'?p.ratio<0.4:p.smile>0.5;
   if(!active)since=-1;
   else if(since<0)since=now;
   if(since>=0&&now-since>=200){phase='return';since=-1;}
  }else if(phase==='return'){
   if(!neutral)since=-1;
   else if(since<0)since=now;
   if(since>=0&&now-since>=200){done.push(action);index++;resetCurrent();}
  }
  return {index,ready:false,actions:done.slice()};
 }
 return {sample,resetCurrent};
}
