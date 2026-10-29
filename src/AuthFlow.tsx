import React,{useEffect,useRef,useState} from 'react';
import {Image,Keyboard,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {Text,TextInput} from './text';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ApiError,request,storage} from './api';
import type {Row} from './api';
import {Avatar,C,Check,ErrorPopupModal,Field,HeroArt,Icon,ILLUSTRATIONS,S,Sheet} from './ui';
import DatePickerField,{isAdult} from './DatePickerField';
import Liveness from './Liveness';
import PinPad from './PinPad';
import {ID_PREFIXES,ID_SERIES,MAX_NAME_LENGTH,BAD_NAME_CHARS} from './bugRules';
import type {LivenessResult} from './livenessTypes';

// The phone number decides the path: a known number asks for the PIN, a new one walks through registration step by step.
type Step='phone'|'pin'|'sms'|'identity'|'name'|'avatar'|'face'|'terms'|'secure';

const BACK:Partial<Record<Step,Step>>={pin:'phone',sms:'phone',identity:'sms',name:'identity',avatar:'name',face:'avatar',terms:'face',secure:'terms'};
// When the final request is refused, send the person to the step that owns the problem.
const ERROR_STEP:Record<string,Step>={
 PHONE_EXISTS:'phone',INVALID_PHONE:'phone',
 INVALID_OTP:'sms',OTP_LOCKED:'sms',
 FIN_REQUIRED:'identity',FIN_EXISTS:'identity',ID_SERIES_REQUIRED:'identity',ID_SERIES_EXISTS:'identity',AGE_RESTRICTED:'name',
 INVALID_NAME:'name',INVALID_BIRTH_DATE:'name',INVALID_AVATAR:'avatar',
 REJECTED_FACE_MATCH:'face',MULTIPLE_FACES:'face',INVALID_SELFIE:'face',SELFIE_REQUIRED:'face',LIVENESS_REQUIRED:'face'
};

const SERIES=ID_SERIES;
// The same rules the server applies, shown next to the field while the person types instead of after the last step.
const nameError=(v:string)=>{
 const t=v.normalize('NFC').trim();
 if(!t)return '';
 if(/[0-9]/.test(t))return 'Adda rəqəm ola bilməz.';
 if(BAD_NAME_CHARS.test(t))return 'Yalnız latın hərfləri yazın (Ə, Ö, Ü, Ğ, Ç, Ş, İ daxil).';
 if(t.length<2)return 'Ən azı 2 hərf yazın.';
 if(t.length>MAX_NAME_LENGTH)return `Maksimum ${MAX_NAME_LENGTH} simvol ola bilər.`;
 return '';
};
const finError=(v:string)=>!v?'':/[^A-Z0-9]/.test(v)?'FİN yalnız latın hərfləri və rəqəmlərdən ibarətdir.':v.length<7?'FİN 7 simvol olmalıdır.':'';
const seriesError=(v:string)=>!v||SERIES.test(v)?'':'Format: AZE + 8 rəqəm; AA, AB, MY, DY, MYI və DYI + 7 rəqəm.';
const NEW_PIN_LENGTH=4; // new accounts use four digits; older accounts keep the length they were created with
const CODE_LENGTH=6;
const RESEND_SECONDS=180;
const BG='#ffffff';
const BOX='#f3f0fb';
const HERO_BG='#f6f3ff';

type Props={
 base:string;
 device:string;
 onAuthenticated:(accessToken:string)=>Promise<void>;
 onConfig:()=>void;
 onReplayIntro:()=>void;
};

type LastUser={phone:string;name:string;pinLength?:number;avatar?:number|null};
const PHONE_FULL=/^\+994[0-9]{9}$/;
// A half-finished registration survives a page refresh or an app restart for half an hour (the face photo is never stored, so the camera step is redone).
const DRAFT_KEY='signupDraft';
const DRAFT_STEPS:string[]=['sms','identity','name','avatar','face','terms','secure'];
const DRAFT_TTL_MS=1_800_000;

const formatPhone=(digits:string)=>{
 const groups=[2,3,2,2];let at=0;
 return groups.map(size=>{const part=digits.slice(at,at+size);at+=size;return part;}).filter(Boolean).join(' ');
};
const mmss=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;

/** True while the on-screen keyboard is open; the artwork gives way so the field and the button stay in view. */
function useKeyboardOpen(){
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  const ios=Platform.OS==='ios';
  const show=Keyboard.addListener(ios?'keyboardWillShow':'keyboardDidShow',()=>setOpen(true));
  const hide=Keyboard.addListener(ios?'keyboardWillHide':'keyboardDidHide',()=>setOpen(false));
  return()=>{show.remove();hide.remove();};
 },[]);
 return open;
}

/** Counts down once per second; call `restart` to start over. */
function useCountdown(from:number){
 const [left,setLeft]=useState(from);
 const [round,setRound]=useState(0);
 useEffect(()=>{
  const id=setInterval(()=>setLeft(prev=>Math.max(0,prev-1)),1000);
  return()=>clearInterval(id);
 },[round]);
 return {left,restart:()=>{setLeft(from);setRound(r=>r+1);}};
}

/** Keyboard avoidance only where a text field can open the keyboard. */
function Avoiding({on,style,children}:{on:boolean;style:object;children:React.ReactNode}){
 return on?<KeyboardAvoidingView style={style} behavior="padding">{children}</KeyboardAvoidingView>:<View style={style}>{children}</View>;
}

function Screen({onBack,right,title,subtitle,children,footer,scroll=true,hero}:{onBack?:()=>void;right?:React.ReactNode;title?:string;subtitle?:string;children:React.ReactNode;footer?:React.ReactNode;scroll?:boolean;hero?:'phone'|'shield'}){
 const keyboardOpen=useKeyboardOpen();
 return (
  <SafeAreaView style={[s.screen,!!hero&&{backgroundColor:HERO_BG}]}>
   {/* the PIN screens have no text input: a keyboard-avoiding scroll view only made the pad jump on Android */}
   <Avoiding on={scroll} style={{flex:1}}>
    <View style={s.header}>
     {onBack?(
      <Pressable accessibilityRole="button" accessibilityLabel="Geri" hitSlop={12} onPress={onBack} style={s.iconButton}>
       <Icon name="chevron-back" size={24} color="#1d5bd6"/>
       <Text style={s.backText}>Geri</Text>
      </Pressable>
     ):<View style={s.iconButton}/>}
     <View style={{flexDirection:'row',gap:6}}>{right}</View>
    </View>
    {!!hero&&(
     <View style={{alignItems:'center',paddingBottom:22}}>
      <Text style={s.brand}>Kampus<Text style={{color:C.yellow}}>.</Text></Text>
      {!keyboardOpen&&<HeroArt kind={hero}/>}
     </View>
    )}
    <View style={[{flex:1},!!hero&&s.sheetTop]}>
    {scroll?(
     <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
      {!!title&&<Text style={s.title}>{title}</Text>}
      {!!subtitle&&<Text style={s.subtitle}>{subtitle}</Text>}
      {children}
     </ScrollView>
    ):(
     <View style={[s.body,{flex:1,justifyContent:'space-between'}]}>
      {title?<View>
       <Text style={s.title}>{title}</Text>
       {!!subtitle&&<Text style={s.subtitle}>{subtitle}</Text>}
      </View>:null}
      {children}
     </View>
    )}
    {!!footer&&<View style={s.footer}>{footer}</View>}
    </View>
   </Avoiding>
  </SafeAreaView>
 );
}

function Cta({title,onPress,disabled}:{title:string;onPress:()=>void;disabled?:boolean}){
 return (
  <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({pressed})=>[s.cta,disabled&&s.ctaOff,pressed&&!disabled&&{opacity:0.9}]}>
   <Text style={[s.ctaText,disabled&&s.ctaTextOff]}>{title}</Text>
  </Pressable>
 );
}

function ErrorText({text,onClose}:{text:string;onClose:()=>void}){
 return <ErrorPopupModal message={text} onClose={onClose}/>;
}

/** Large formatted number; typing goes into an invisible input laid over it. */
function PhoneEntry({digits,onChange}:{digits:string;onChange:(d:string)=>void}){
 const template='## ### ## ##';
 return (
  <View style={s.phoneWrap}>
   <Text style={s.phoneText}>
    <Text>+994 </Text>
    {template.split('').map((ch,i)=>{
     if(ch===' ')return <Text key={i}> </Text>;
     const at=template.slice(0,i).replace(/ /g,'').length;
     const typed=at<digits.length;
     return <Text key={i} style={typed?undefined:s.phoneGhost}>{typed?digits[at]:'_'}</Text>;
    })}
   </Text>
   <TextInput
    accessibilityLabel="Telefon nömrəsi"
    autoFocus
    caretHidden
    keyboardType="number-pad"
    textContentType="telephoneNumber"
    autoComplete="tel"
    value={digits}
    onChangeText={t=>{
     let d=t.replace(/\D/g,'');
     if(d.startsWith('994'))d=d.slice(3);
     else if(d.startsWith('0'))d=d.slice(1);
     onChange(d.slice(0,9));
    }}
    style={s.hiddenInput}
   />
  </View>
 );
}

function CodeBoxes({value,onChange}:{value:string;onChange:(v:string)=>void}){
 const input=useRef<React.ComponentRef<typeof TextInput>>(null);
 return (
  <Pressable accessibilityLabel="SMS kodu" onPress={()=>input.current?.focus()} style={s.codeRow}>
   {Array.from({length:CODE_LENGTH},(_,i)=>(
    <View key={i} style={[s.codeBox,i===Math.min(value.length,CODE_LENGTH-1)&&s.codeBoxActive]}>
     <Text style={s.codeDigit}>{value[i]||''}</Text>
    </View>
   ))}
   <TextInput
    ref={input}
    autoFocus
    caretHidden
    maxLength={CODE_LENGTH}
    keyboardType="number-pad"
    textContentType="oneTimeCode"
    autoComplete="sms-otp"
    value={value}
    onChangeText={t=>onChange(t.replace(/\D/g,'').slice(0,CODE_LENGTH))}
    style={s.hiddenInput}
  />
  </Pressable>
 );
}

export default function AuthFlow({base,device,onAuthenticated,onConfig,onReplayIntro}:Props){
 const [step,setStep]=useState<Step>('phone');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [digits,setDigits]=useState('');
 const [pin,setPin]=useState('');
 const [pinLength,setPinLength]=useState(6);
 const [newPin,setNewPin]=useState('');
 const [newPinAgain,setNewPinAgain]=useState('');
 const [otp,setOtp]=useState<Row|null>(null);
 const [code,setCode]=useState('');
 const [verified,setVerified]=useState(false);
 const [fin,setFin]=useState('');
 const [series,setSeries]=useState('');
 const [seriesLetters,setSeriesLetters]=useState<string>('AA');
 const [prefixOpen,setPrefixOpen]=useState(false);
 const [seriesTouched,setSeriesTouched]=useState(false);
 const seriesDigits=series.startsWith(seriesLetters)?series.slice(seriesLetters.length):'';
 const seriesShown=!!seriesError(series)&&(seriesTouched||seriesDigits.length>=(seriesLetters==='AZE'?8:7));
 const [first,setFirst]=useState('');
 const [last,setLast]=useState('');
 const [birth,setBirth]=useState('');
 const [avatar,setAvatar]=useState<number|null>(null);
 const [kyc,setKyc]=useState<LivenessResult|null>(null);
 const [camera,setCamera]=useState(false);
 const [consent,setConsent]=useState(false);
 const [simaSigned,setSimaSigned]=useState(false);
 const [lastUser,setLastUser]=useState<LastUser|null>(null);
 const [ready,setReady]=useState(false);
 const [remembered,setRemembered]=useState(false);
 const countdown=useCountdown(RESEND_SECONDS);

 const phone='+994'+digits;
 const call=(path:string,body:Row)=>request(base,'',device,path,body);
 const go=(next:Step)=>{setError('');setCamera(false);setStep(next);};

 // The device remembers who signed in last, so the PIN screen can greet them without the server revealing names.
 useEffect(()=>{
  storage.get('lastUser').then(async raw=>{
   let saved:LastUser|null=null;
   if(raw)try{saved=JSON.parse(raw);}catch{/* a corrupt value is treated as nobody remembered */}
   if(saved&&PHONE_FULL.test(saved.phone)){
    setLastUser(saved);setDigits(saved.phone.slice(4));setPinLength(saved.pinLength||6);setRemembered(true);setStep('pin');
    // Quietly confirm the account still exists and learn its PIN length; offline, the saved details are used.
    call('auth/identify',{phone:saved.phone}).then(r=>{
     if(!r.registered)forget();else setPinLength(Number(r.pinLength)||saved.pinLength||6);
    }).catch(()=>{});
   }else{
    try{
     const draft=JSON.parse(await storage.get(DRAFT_KEY)||'null');
     if(draft&&Date.now()-draft.savedAt<DRAFT_TTL_MS&&PHONE_FULL.test(draft.phone)&&draft.otp&&DRAFT_STEPS.includes(draft.step)){
      setDigits(draft.phone.slice(4));setOtp(draft.otp);setCode(draft.code||'');setVerified(!!draft.verified);
      setFin(draft.fin||'');setSeries(draft.series||'');setSeriesLetters(draft.seriesLetters||'AA');
      setFirst(draft.first||'');setLast(draft.last||'');setBirth(draft.birth||'');setAvatar(typeof draft.avatar==='number'?draft.avatar:null);
      setConsent(!!draft.consent);setSimaSigned(!!draft.simaSigned);
      setStep((draft.step==='terms'||draft.step==='secure'?'face':draft.step) as Step);
     }
    }catch{/* an unreadable draft means starting from the phone number */}
   }
   setReady(true);
  }).catch(()=>setReady(true));
 // Runs once on mount: it only reads what was saved.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);


 // Keep the draft up to date while a new person registers; leaving the flow (or finishing it) drops it.
 useEffect(()=>{
  if(!ready||lastUser||remembered)return;
  if(!DRAFT_STEPS.includes(step)||!otp){if(step==='phone')storage.remove(DRAFT_KEY).catch(()=>{});return;}
  storage.set(DRAFT_KEY,JSON.stringify({savedAt:Date.now(),step,phone,otp,code,verified,fin,series,seriesLetters,first,last,birth,avatar,consent,simaSigned})).catch(()=>{});
 },[ready,lastUser,remembered,step,phone,otp,code,verified,fin,series,seriesLetters,first,last,birth,avatar,consent,simaSigned]);

 async function run(task:()=>Promise<void>,redirectOnError=false){
  setBusy(true);setError('');
  try{await task();}
  catch(e){
   setError((e as Error).message);
   const target=e instanceof ApiError?ERROR_STEP[e.code]:undefined;
   if(redirectOnError&&target){if(target==='sms'){setVerified(false);setCode('');}setStep(target);}
  }finally{setBusy(false);}
 }

 const sendCode=async()=>{
  const r=await call('auth/otp',{phone});
  setOtp(r);setCode('');setVerified(false);countdown.restart();setStep('sms');
 };

 const continueFromPhone=()=>run(async()=>{
  const r=await call('auth/identify',{phone});
  if(r.registered){setPin('');setPinLength(Number(r.pinLength)||6);setStep('pin');return;}
  await sendCode();
 });

 const login=(pinValue:string)=>run(async()=>{
  try{
   const r=await call('auth/login',{phone,pin:pinValue,deviceId:device});
   if(r.user.role!=='USER')throw new Error('Mobil tətbiqə tələbə hesabı ilə daxil olun.');
   storage.set('lastUser',JSON.stringify({phone,name:r.user.name,pinLength:Number(r.user.pinLength)||pinLength,avatar:r.user.avatar??null})).catch(()=>{});
   await onAuthenticated(r.accessToken);
  }catch(e){setPin('');throw e;}
 });

 const pressDigit=(d:string)=>{
  if(busy||pin.length>=pinLength)return;
  const next=pin+d;
  setPin(next);setError('');
  if(next.length===pinLength)login(next);
 };
 const pressDelete=()=>{if(!busy)setPin(p=>p.slice(0,-1));};

 const confirming=newPin.length===NEW_PIN_LENGTH;
 const pressNewDigit=(d:string)=>{
  if(busy)return;
  setError('');
  if(!confirming){setNewPin(p=>p+d);return;}
  if(newPinAgain.length>=NEW_PIN_LENGTH)return;
  const next=newPinAgain+d;
  setNewPinAgain(next);
  if(next.length<NEW_PIN_LENGTH)return;
  if(next===newPin)createAccount(next);
  else{setError('PIN-lər uyğun gəlmir. Yenidən yaz.');setNewPin('');setNewPinAgain('');}
 };
 const deleteNew=()=>{if(busy)return;if(confirming)setNewPinAgain(p=>p.slice(0,-1));else setNewPin(p=>p.slice(0,-1));};

 // Desktop browsers type the PIN on the keyboard instead of tapping the pad.
 useEffect(()=>{
  if(Platform.OS!=='web'||step!=='pin')return;
  const onKey=(e:KeyboardEvent)=>{
   if(/^[0-9]$/.test(e.key))pressDigit(e.key);
   else if(e.key==='Backspace')pressDelete();
  };
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[step,pin,busy]);

 const verifyCode=()=>run(async()=>{
  await call('auth/otp/verify',{otpId:otp?.otpId,otp:code});
  setVerified(true);setStep('identity');
 });

 const createAccount=(pinValue:string)=>run(async()=>{
  if(!otp||!kyc)return;
  const r=await call('auth/register',{
   otpId:otp.otpId,otp:code,
   name:first.trim(),surname:last.trim(),
   fin,idSeries:series,birthDate:birth,
   facesCount:kyc.facesCount,simaSigned,
   livenessMode:kyc.mode,livenessActions:kyc.actions,selfie:kyc.selfie,
   pin:pinValue,deviceId:device,termsAccepted:consent,dataConsent:consent,avatar
  });
  storage.remove(DRAFT_KEY).catch(()=>{});
  storage.set('lastUser',JSON.stringify({phone,name:`${first.trim()} ${last.trim()}`,pinLength:NEW_PIN_LENGTH,avatar})).catch(()=>{});
  await onAuthenticated(r.accessToken);
 },true).finally(()=>{setNewPin('');setNewPinAgain('');});

 const back=()=>go(BACK[step]??'phone');

 // "Another number": forget who signed in last and ask for the phone number again.
 function forget(){
  storage.remove('lastUser').catch(()=>{});storage.remove(DRAFT_KEY).catch(()=>{});
  setLastUser(null);setRemembered(false);setDigits('');setPin('');setError('');setStep('phone');
 }

 const known=lastUser&&lastUser.phone===phone?lastUser:null;

 if(!ready)return <View style={s.screen}/>;

 if(step==='phone'){
  return (
   <Screen
    hero="phone"
    title="Mobil nömrəni yaz"
    subtitle="Sənə SMS ilə təsdiq kodu göndərəcəyik"
    right={<>
     <Pressable accessibilityRole="button" accessibilityLabel="Tanışlığa yenidən bax" hitSlop={8} onPress={onReplayIntro} style={s.iconButton}><Icon name="play-circle-outline" size={24} color={C.muted}/></Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel="API bağlantısını tənzimlə" hitSlop={8} onPress={onConfig} style={s.iconButton}><Icon name="options-outline" size={22} color={C.muted}/></Pressable>
    </>}
    footer={<Cta title={busy?'Yoxlanılır…':'Davam et'} disabled={busy||digits.length!==9} onPress={continueFromPhone}/>}
   >
    <View style={{flex:1,justifyContent:'center',minHeight:200}}>
     <PhoneEntry digits={digits} onChange={d=>{setDigits(d);setError('');}}/>
     <ErrorText text={error} onClose={()=>setError('')}/>
    </View>
   </Screen>
  );
 }

 if(step==='pin'){
  return (
   <Screen
    onBack={remembered?undefined:back}
    scroll={false}
    right={<Pressable accessibilityRole="button" accessibilityLabel="API bağlantısını tənzimlə" hitSlop={8} onPress={onConfig} style={s.iconButton}><Icon name="options-outline" size={22} color={C.muted}/></Pressable>}
   >
    <View style={s.pinTop}>
     <View style={s.avatar}>
      {known?<Avatar name={known.name} avatar={known.avatar} size={88}/>:<Icon name="person" size={38} color="#9a9a9e"/>}
     </View>
     <Text style={s.pinName}>{known?known.name.toUpperCase():`+994 ${formatPhone(digits)}`}</Text>
     <Text style={s.pinHint}>Giriş üçün PIN kodu daxil et</Text>
     <ErrorText text={error} onClose={()=>setError('')}/>
    </View>
    <View>
     <PinPad value={pin} length={pinLength} onDigit={pressDigit} onDelete={pressDelete}/>
     <Pressable accessibilityRole="button" disabled={busy} onPress={forget} style={{alignItems:'center',paddingBottom:14}}>
      <Text style={s.resend}>Başqa nömrə ilə daxil ol</Text>
     </Pressable>
    </View>
   </Screen>
  );
 }

 if(step==='sms'){
  const canResend=countdown.left===0&&!busy;
  return (
   <Screen
    onBack={back}
    title="OTP kod"
    subtitle={`+994 ${formatPhone(digits)} nömrəsinə SMS ilə gələn ${CODE_LENGTH} rəqəmli kodu daxil et`}
    footer={verified?<Cta title="Davam et" onPress={()=>go('identity')}/>:<Cta title={busy?'Yoxlanılır…':'Davam et'} disabled={busy||code.length!==CODE_LENGTH} onPress={verifyCode}/>}
   >
    {verified?(
     <><View style={s.okRow}><Icon name="checkmark-circle" size={22} color="#2f9e63"/><Text style={s.okText}>Nömrə təsdiqləndi</Text></View><ErrorText text={error} onClose={()=>setError('')}/></>
    ):(
     <View style={{marginTop:40}}>
      <CodeBoxes value={code} onChange={t=>{setCode(t);setError('');}}/>
      <ErrorText text={error} onClose={()=>setError('')}/>
      <Text style={s.testHint}>Test rejimi: SMS provayderi qoşulmayıb, kod burada göstərilir: <Text style={{fontWeight:'800',color:C.ink,letterSpacing:2}}>{otp?.demoCode}</Text></Text>
      <Pressable accessibilityRole="button" disabled={!canResend} onPress={()=>run(sendCode)} style={{alignItems:'center',marginTop:36}}>
       <Text style={s.resend}>
        Kodu yenidən göndər{canResend?'':': '}
        {!canResend&&<Text style={s.resendTime}>{mmss(countdown.left)}</Text>}
       </Text>
      </Pressable>
     </View>
    )}
   </Screen>
  );
 }

 if(step==='identity'){
  return (
   <Screen onBack={back} title="Şəxsiyyət vəsiqən" subtitle="FİN kodunu və ŞV seriyasını vəsiqənin üzərindən yaz."
    footer={<Cta title="Davam et" disabled={busy||fin.length!==7||!SERIES.test(series)} onPress={()=>run(async()=>{await call('auth/identity/validate',{otpId:otp?.otpId,otp:code,fin,idSeries:series});go('name');})}/>}>
    <View style={{marginTop:28}}>
     <Field label="FİN kod" value={fin} onChange={t=>setFin(t.toUpperCase().replace(/\s/g,'').slice(0,7))} placeholder="7 simvol" error={finError(fin)} eager={/[^A-Z0-9]/.test(fin)}/>
     <Text style={S.label}>ŞV seriyası</Text>
     <View style={{flexDirection:'row',gap:10,alignItems:'flex-start'}}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Seriya prefiksi: ${seriesLetters}`} onPress={()=>setPrefixOpen(true)}
       style={[S.input,{width:112,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingRight:12}]}>
       <Text style={{fontSize:16,fontWeight:'700',color:C.ink}}>{seriesLetters}</Text>
       <Icon name="chevron-down" size={18} color={C.muted}/>
      </Pressable>
      <View style={{flex:1}}>
       <TextInput accessibilityLabel="ŞV seriyasının rəqəmləri" style={[S.input,seriesShown&&{borderColor:C.red}]} value={seriesDigits} placeholder={seriesLetters==='AZE'?'12345678':'1234567'}
        placeholderTextColor="#9a95a7" keyboardType="number-pad" onBlur={()=>setSeriesTouched(true)}
        onChangeText={t=>{const d=t.replace(/\D/g,'').slice(0,seriesLetters==='AZE'?8:7);setSeries(d?seriesLetters+d:'');}}/>
       {seriesShown&&<Text style={{color:C.red,fontSize:13,fontWeight:'600',marginTop:6}}>{seriesError(series)}</Text>}
      </View>
     </View>
     <Sheet title="Seriya prefiksi" visible={prefixOpen} onClose={()=>setPrefixOpen(false)}>
      {ID_PREFIXES.map(prefix=>(
       <Pressable key={prefix} accessibilityRole="button" accessibilityLabel={`Seriya ${prefix}`} onPress={()=>{setSeriesLetters(prefix);setSeries(seriesDigits?prefix+seriesDigits.slice(0,prefix==='AZE'?8:7):'');setPrefixOpen(false);}}
        style={{paddingVertical:16,paddingHorizontal:6,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#eeeaf7'}}>
        <Text style={{fontSize:17,fontWeight:seriesLetters===prefix?'800':'600',color:C.ink}}>{prefix}</Text>
        {seriesLetters===prefix&&<Icon name="checkmark" size={20} color={C.primary}/>}
       </Pressable>
      ))}
     </Sheet>
     <ErrorText text={error} onClose={()=>setError('')}/>
    </View>
   </Screen>
  );
 }

 if(step==='name'){
  return (
   <Screen onBack={back} title="Ad və soyad" subtitle="Vəsiqədəki kimi yaz. Doğum tarixi yaş yoxlaması üçün lazımdır."
    footer={<Cta title="Davam et" disabled={!first.trim()||!last.trim()||!!nameError(first)||!!nameError(last)||!isAdult(birth)} onPress={()=>go('avatar')}/>}>
    <View style={{marginTop:28}}>
     <View style={{flexDirection:'row',gap:12,alignItems:'flex-start'}}>
      <View style={{flex:1}}>
       <Field label="Ad" value={first} onChange={t=>setFirst(t.slice(0,MAX_NAME_LENGTH))} placeholder="Əli" maxLength={MAX_NAME_LENGTH} error={first.length===MAX_NAME_LENGTH?'50 simvol limitinə çatdın.':nameError(first)} eager={/[0-9]/.test(first)||BAD_NAME_CHARS.test(first.trim())||first.length>=MAX_NAME_LENGTH}/>
      </View>
      <View style={{flex:1}}>
       <Field label="Soyad" value={last} onChange={t=>setLast(t.slice(0,MAX_NAME_LENGTH))} placeholder="Vəliyev" maxLength={MAX_NAME_LENGTH} error={last.length===MAX_NAME_LENGTH?'50 simvol limitinə çatdın.':nameError(last)} eager={/[0-9]/.test(last)||BAD_NAME_CHARS.test(last.trim())||last.length>=MAX_NAME_LENGTH}/>
      </View>
     </View>
     <DatePickerField label="Doğum tarixi" value={birth} onChange={setBirth}/>
     {!!birth&&!isAdult(birth)&&<Text style={s.error}>Hesab yalnız 18 yaşdan yuxarı şəxslər üçündür.</Text>}
     <ErrorText text={error} onClose={()=>setError('')}/>
    </View>
   </Screen>
  );
 }


 if(step==='avatar'){
  return (
   <Screen onBack={back} title="Avatarını seç" subtitle="Bu şəkil tətbiqdə və dostlarının siyahısında görünəcək."
    footer={<Cta title="Davam et" disabled={avatar===null} onPress={()=>go('face')}/>}>
    <View style={{marginTop:28,flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:18}}>
     {ILLUSTRATIONS.avatars.map((_:unknown,i:number)=>(
      <Pressable key={i} accessibilityRole="button" accessibilityLabel={'Avatar '+(i+1)} accessibilityState={{selected:avatar===i}} onPress={()=>setAvatar(i)}
       style={{width:'22%',alignItems:'center',borderRadius:999,padding:3,borderWidth:3,borderColor:avatar===i?C.primary:'transparent',opacity:avatar===null||avatar===i?1:0.55}}>
       <Avatar name={first||"K"} avatar={i} size={72}/>
      </Pressable>
     ))}
    </View>
    <ErrorText text={error} onClose={()=>setError('')}/>
   </Screen>
  );
 }

 if(step==='face'){
  if(camera){
   return (
    <Screen onBack={()=>setCamera(false)} title="Üzünü təsdiqlə">
     <View style={{marginTop:20}}>
      <Liveness actions={otp?.livenessActions||[]} onDone={r=>{setKyc(r);setCamera(false);}} onCancel={()=>setCamera(false)}/>
     </View>
    </Screen>
   );
  }
  return (
   <Screen onBack={back} title={kyc?'Üz yoxlaması tamamlandı':'Üzünü təsdiqlə'}
    subtitle={kyc?'Selfi çəkildi və hesabla birlikdə şifrələnmiş saxlanılacaq.':'Kamera açılacaq. Üzünü çərçivədə tut və göstərilən hərəkətləri et.'}
    footer={kyc?<Cta title="Davam et" onPress={()=>go('terms')}/>:<Cta title="Kameranı aç" onPress={()=>setCamera(true)}/>}>
    {kyc&&(
     <View style={{alignItems:'center',marginTop:28}}>
      <Image source={{uri:kyc.selfie}} style={{width:160,height:200,borderRadius:20}} resizeMode="cover"/>
      <Pressable accessibilityRole="button" onPress={()=>{setKyc(null);setCamera(true);}} style={{paddingVertical:14}}>
       <Text style={s.resend}>Yenidən çək</Text>
      </Pressable>
     </View>
    )}
    <ErrorText text={error} onClose={()=>setError('')}/>
   </Screen>
  );
 }

 if(step==='terms'){
  return (
   <Screen onBack={back} title="Razılıq" subtitle="Hesab açmaq üçün iki şərti təsdiqlə."
    footer={<Cta title="Davam et" disabled={!consent||!simaSigned} onPress={()=>go('secure')}/>}>
    <View style={{marginTop:28}}>
     <Check value={consent} onChange={setConsent} text="Xidmət şərtləri ilə və selfi daxil olmaqla şəxsi məlumatlarımın emalı ilə razıyam."/>
     <Check value={simaSigned} onChange={setSimaSigned} text="Müqaviləni SİMA İmza ilə imzalayıram (test rejimi)."/>
    </View>
   </Screen>
  );
 }

 return (
  <Screen
   onBack={confirming?()=>{setError('');setNewPin('');setNewPinAgain('');}:back}
   scroll={false}
   title={confirming?'PIN-i təkrar yaz':'PIN təyin et'}
   subtitle={confirming?'Eyni 4 rəqəmi bir daha daxil et.':`Hər girişdə istifadə edəcəyin ${NEW_PIN_LENGTH} rəqəmli PIN yaz.`}
  >
   <View>
    <ErrorText text={busy?'':error} onClose={()=>setError('')}/>
    {busy&&<Text style={[s.testHint,{marginTop:14}]}>Hesab yaradılır…</Text>}
    <PinPad value={confirming?newPinAgain:newPin} length={NEW_PIN_LENGTH} onDigit={pressNewDigit} onDelete={deleteNew}/>
   </View>
  </Screen>
 );
}

const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:BG},
 header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:10,minHeight:56},
 iconButton:{minWidth:40,height:40,alignItems:'center',justifyContent:'center',flexDirection:'row'},
 backText:{fontSize:15,fontWeight:'600',color:'#1d5bd6'},
 brand:{fontSize:24,fontWeight:'800',color:C.primary,letterSpacing:-0.6,marginBottom:6},
 sheetTop:{backgroundColor:'#fff',borderTopLeftRadius:0,borderTopRightRadius:0},
 body:{flexGrow:1,paddingHorizontal:24,paddingBottom:16},
 footer:{paddingHorizontal:24,paddingTop:8,paddingBottom:16},
 title:{fontSize:24,fontWeight:'700',color:'#141414',letterSpacing:-0.4,marginTop:16},
 subtitle:{fontSize:16,lineHeight:22,color:'#707074',marginTop:8},
 error:{fontSize:13,lineHeight:18,color:C.red,fontWeight:'600',textAlign:'center',marginTop:14},
 cta:{height:54,borderRadius:12,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'},
 ctaOff:{backgroundColor:'#e4e1ee'},
 ctaText:{fontSize:17,fontWeight:'600',color:'#ffffff'},
 ctaTextOff:{color:'#a4a4a8'},
 hiddenInput:{position:'absolute',top:0,left:0,right:0,bottom:0,opacity:0.015,color:'transparent',backgroundColor:'transparent',borderWidth:0,...(Platform.OS==='web'?{outlineStyle:'none'}:null)} as object,
 phoneWrap:{alignItems:'center',justifyContent:'center',paddingVertical:24},
 phoneText:{fontSize:34,fontWeight:'600',color:'#141414',letterSpacing:-0.5,textAlign:'center'},
 phoneGhost:{color:'#c6c6ca'},
 codeRow:{flexDirection:'row',gap:10},
 codeBox:{flex:1,height:84,maxWidth:60,borderRadius:12,backgroundColor:BOX,borderWidth:1.5,borderColor:'transparent',alignItems:'center',justifyContent:'center'},
 codeBoxActive:{borderColor:C.primary,backgroundColor:'#fff'},
 codeDigit:{fontSize:28,fontWeight:'700',color:'#141414'},
 testHint:{fontSize:12,lineHeight:17,color:'#8a8a8e',textAlign:'center',marginTop:22},
 resend:{fontSize:16,color:'#707074'},
 resendTime:{color:'#443081',fontWeight:'700'},
 okRow:{flexDirection:'row',alignItems:'center',gap:10,marginTop:36,backgroundColor:'#e4def7',borderRadius:16,padding:16},
 okText:{fontSize:15,fontWeight:'700',color:C.ink},
 pinTop:{alignItems:'center',marginTop:6,paddingHorizontal:24},
 avatar:{width:88,height:88,borderRadius:44,backgroundColor:BOX,alignItems:'center',justifyContent:'center'},
 avatarText:{fontSize:30,fontWeight:'500',color:'#707074'},
 pinName:{fontSize:20,fontWeight:'600',color:'#141414',marginTop:10,letterSpacing:0.3},
 pinHint:{fontSize:15,color:'#707074',marginTop:12},
 seriesChipsLabel:{fontSize:13,color:'#707074',marginBottom:6,fontWeight:'600'},
 seriesChipsRow:{flexDirection:'row',gap:8,marginBottom:10,flexWrap:'wrap'},
 seriesChip:{paddingHorizontal:12,paddingVertical:6,borderRadius:16,backgroundColor:BOX,borderWidth:1,borderColor:'#dcd6f0'},
 seriesChipActive:{backgroundColor:C.primary,borderColor:C.primary},
 seriesChipText:{fontSize:13,fontWeight:'700',color:C.ink},
 seriesChipTextActive:{color:'#ffffff'},
});
