import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,View} from 'react-native';
import {Text} from './text';
import type {FaceLandmarker} from '@mediapipe/tasks-vision';
import {Button,C,S} from './ui';
import {ACTION_TEXT} from './livenessTypes';
import type {LivenessProps} from './livenessTypes';

// Thresholds are tuned by eye; keep them together so they are easy to adjust after real-face testing.
const STEP_SECONDS=10;       // time allowed per action
const HOLD_FRAMES=3;         // consecutive frames an action must be seen
const TURN_RATIO=0.64;       // nose position between the cheek edges: >0.64 = left, <0.36 = right
const BLINK_CLOSED=0.55;
const BLINK_OPEN=0.25;
const SMILE_MIN=0.5;
const FRONTAL=[0.42,0.58];   // nose ratio window for the final straight-on photo
const FRONTAL_FRAMES=10;
const MAX_WIDTH=640;

// Metro rejects the library's own dynamic import(), so the browser loads it from /public (copied by scripts/copy-mediapipe.js).
const importModule=new Function('url','return import(url)') as (url:string)=>Promise<typeof import('@mediapipe/tasks-vision')>;

type Pose={ratio:number;blink:number;smile:number};

/** Reads one video frame: how many faces, and for a single face its head turn, blink and smile. */
function measure(res:any):{faces:number;pose?:Pose}{
 const faces=res.faceLandmarks?.length||0;
 if(faces!==1)return {faces};
 const lm=res.faceLandmarks[0];
 // Image-space coordinates of the unmirrored frame: a head turned to the person's left moves the nose towards the image's right edge.
 const lo=Math.min(lm[234].x,lm[454].x),hi=Math.max(lm[234].x,lm[454].x);
 const ratio=hi-lo>0.05?(lm[1].x-lo)/(hi-lo):0.5;
 const score=(name:string)=>res.faceBlendshapes?.[0]?.categories?.find((c:any)=>c.categoryName===name)?.score??0;
 return {faces,pose:{ratio,blink:Math.min(score('eyeBlinkLeft'),score('eyeBlinkRight')),smile:(score('mouthSmileLeft')+score('mouthSmileRight'))/2}};
}

function seen(action:string,p:Pose,memory:{eyesWereOpen:boolean}):boolean{
 switch(action){
  case 'TURN_LEFT':return p.ratio>TURN_RATIO;
  case 'TURN_RIGHT':return p.ratio<1-TURN_RATIO;
  case 'SMILE':return p.smile>SMILE_MIN;
  case 'BLINK':
   if(p.blink<BLINK_OPEN)memory.eyesWereOpen=true;
   return memory.eyesWereOpen&&p.blink>BLINK_CLOSED;
  default:return false;
 }
}

export default function Liveness({actions,onDone,onCancel}:LivenessProps){
 const video=useRef<HTMLVideoElement|null>(null);
 const [phase,setPhase]=useState<'loading'|'running'|'error'>('loading');
 const [message,setMessage]=useState('Kamera açılır…');
 const [notice,setNotice]=useState('');
 const [step,setStep]=useState(0);
 const [seconds,setSeconds]=useState(STEP_SECONDS);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);

 useEffect(()=>{
  let stopped=false,frame=0;
  let stream:MediaStream|null=null,landmarker:FaceLandmarker|null=null;

  let released=false;
  const release=()=>{
   stopped=true;
   if(released)return;
   released=true;
   cancelAnimationFrame(frame);
   stream?.getTracks().forEach(t=>t.stop());
   landmarker?.close();
  };

  (async()=>{
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Bu brauzer kameranı dəstəkləmir. Səhifə HTTPS və ya localhost üzərindən açılmalıdır.');
    try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});}
    catch{throw new Error('Kameraya icazə verilmədi. Brauzerin ünvan çubuğundan kameranı icazələndirin.');}
    if(stopped){stream.getTracks().forEach(t=>t.stop());return;}
    const el=video.current;
    if(!el)return;
    el.srcObject=stream;
    await el.play();

    setMessage('Üz modeli yüklənir…');
    const mediapipe=await importModule('/mediapipe/vision_bundle.mjs');
    const fileset=await mediapipe.FilesetResolver.forVisionTasks('/mediapipe/wasm');
    const create=(delegate:'GPU'|'CPU')=>mediapipe.FaceLandmarker.createFromOptions(fileset,{
     baseOptions:{modelAssetPath:'/mediapipe/face_landmarker.task',delegate},
     runningMode:'VIDEO',
     numFaces:2,
     outputFaceBlendshapes:true
    });
    try{landmarker=await create('GPU');}catch{landmarker=await create('CPU');}
    if(stopped){landmarker.close();return;}
    setPhase('running');

    const run={index:0,held:0,frontal:0,deadline:Date.now()+STEP_SECONDS*1000,last:Date.now(),shownSeconds:STEP_SECONDS,done:[] as string[],memory:{eyesWereOpen:false}};
    const tick=()=>{
     if(stopped||!landmarker)return;
     frame=requestAnimationFrame(tick);
     if(el.readyState<2)return;
     const now=Date.now(),elapsed=now-run.last;
     run.last=now;
     const {faces,pose}=measure(landmarker.detectForVideo(el,performance.now()));
     if(!pose){
      // The clock only runs while exactly one face is in view.
      run.deadline+=elapsed;run.held=0;run.frontal=0;
      setMessage(faces===0?'Üzünüzü kadra gətirin':'Kadrda yalnız bir nəfər olmalıdır');
      return;
     }
     if(run.index<actions.length){
      const action=actions[run.index];
      setMessage(ACTION_TEXT[action]||action);
      const left=Math.max(0,Math.ceil((run.deadline-now)/1000));
      if(left!==run.shownSeconds){run.shownSeconds=left;setSeconds(left);}
      if(seen(action,pose,run.memory)){run.held+=1;}else run.held=0;
      if(run.held>=HOLD_FRAMES){
       run.done.push(action);run.index+=1;run.held=0;run.memory.eyesWereOpen=false;
       run.deadline=now+STEP_SECONDS*1000;run.shownSeconds=STEP_SECONDS;
       setStep(run.index);setSeconds(STEP_SECONDS);setNotice('');
      }else if(now>run.deadline){
       run.deadline=now+STEP_SECONDS*1000;run.memory.eyesWereOpen=false;
       setNotice('Vaxt bitdi. Eyni hərəkəti yenidən edin.');
      }
      return;
     }
     // All actions done: take the photo only when the face is looking straight at the camera with open eyes.
     setMessage('Düz kameraya baxın');
     const straight=pose.ratio>FRONTAL[0]&&pose.ratio<FRONTAL[1]&&pose.blink<BLINK_OPEN+0.1;
     run.frontal=straight?run.frontal+1:0;
     if(run.frontal<FRONTAL_FRAMES)return;
     const scale=Math.min(1,MAX_WIDTH/el.videoWidth);
     const canvas=document.createElement('canvas');
     canvas.width=Math.round(el.videoWidth*scale);canvas.height=Math.round(el.videoHeight*scale);
     canvas.getContext('2d')!.drawImage(el,0,0,canvas.width,canvas.height);
     const selfie=canvas.toDataURL('image/jpeg',0.85);
     const actionsDone=run.done;
     release();
     onDone({selfie,actions:actionsDone,mode:'MEDIAPIPE_WEB',facesCount:1});
    };
    frame=requestAnimationFrame(tick);
   }catch(e){
    if(stopped)return;
    release();
    setError((e as Error).message||'Kamera başladıla bilmədi.');
    setPhase('error');
   }
  })();

  return release;
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[attempt]);

 const retry=()=>{
  setPhase('loading');setMessage('Kamera açılır…');setNotice('');setStep(0);setSeconds(STEP_SECONDS);setError('');
  setAttempt(a=>a+1);
 };

 return (
  <View>
   <View style={{borderRadius:22,overflow:'hidden',backgroundColor:'#0f0d14',aspectRatio:4/5,maxHeight:430,alignSelf:'center',width:'100%'}}>
    {React.createElement('video',{ref:video,playsInline:true,muted:true,autoPlay:true,style:{width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)',display:'block'}})}
    <View pointerEvents="none" style={{position:'absolute',top:'8%',bottom:'8%',left:'18%',right:'18%',borderRadius:999,borderWidth:2,borderColor:phase==='running'?C.lime:'#ffffff66'}}/>
    {phase==='loading'&&<View style={{position:'absolute',top:0,bottom:0,left:0,right:0,alignItems:'center',justifyContent:'center',backgroundColor:'#0d1411cc'}}><ActivityIndicator color={C.lime}/></View>}
   </View>

   {phase==='error'?(
    <View style={{marginTop:14}}>
     <View style={S.error}><Text style={S.errorText}>{error}</Text></View>
     <Button title="Yenidən cəhd et" onPress={retry}/>
    </View>
   ):(
    <View style={{marginTop:14,alignItems:'center'}}>
     <View style={{flexDirection:'row',gap:6,marginBottom:10}}>
      {[...actions,'PHOTO'].map((_,i)=>(
       <View key={i} style={{width:i===step?22:8,height:8,borderRadius:4,backgroundColor:i<step?C.ink:i===step?C.lime:C.line}}/>
      ))}
     </View>
     <Text style={[S.h3,{textAlign:'center'}]}>{message}</Text>
     {phase==='running'&&step<actions.length&&<Text style={[S.muted,{marginTop:4}]}>{seconds} saniyə</Text>}
     {!!notice&&<Text style={[S.muted,{marginTop:4,color:C.ink}]}>{notice}</Text>}
    </View>
   )}
   <View style={{marginTop:12}}>
    <Button title="Ləğv et" secondary onPress={onCancel}/>
   </View>
  </View>
 );
}
