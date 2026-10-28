import React,{createContext,useContext,useEffect,useState} from 'react';
import {View,Pressable,StyleSheet,Modal,ScrollView,KeyboardAvoidingView,Platform,Image} from 'react-native';
import {Text,TextInput} from './text';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Row,money,errorCode} from './api';

export const C={
 ink:'#1b1838',
 forest:'#2a0a8a',
 muted:'#76738a',
 lime:'#e4d9ff',
 bg:'#ffffff',
 line:'#ebe8f4',
 red:'#d04b4b',
 amber:'#b8742a',
 green:'#2f9e63',
 white:'#ffffff',
 primary:'#5632c0',
 deep:'#2a0a8a',
 lav:'#efe9ff',
 yellow:'#ffc42b',
 yellowInk:'#2a1b00'
};

export const ILLUSTRATIONS={
 avatars:[
  require('../assets/illustrations/avatar-1.png'),require('../assets/illustrations/avatar-2.png'),require('../assets/illustrations/avatar-3.png'),require('../assets/illustrations/avatar-4.png'),
  require('../assets/illustrations/avatar-5.png'),require('../assets/illustrations/avatar-6.png'),require('../assets/illustrations/avatar-7.png'),require('../assets/illustrations/avatar-8.png')
 ],
 phone:require('../assets/illustrations/hero-phone.png'),
 shield:require('../assets/illustrations/hero-shield.png'),
 success:require('../assets/illustrations/result-success.png'),
 failed:require('../assets/illustrations/result-failed.png'),
 review:require('../assets/illustrations/result-review.png'),
 bank:require('../assets/illustrations/bank-notification-icon.png')
};

// the demo people keep a face that matches their name; everybody else gets one from a hash of the name
const DEMO_FACES:Record<string,number>={aytən:7,murad:0,leyla:5,kamran:6,admin:2};
function faceFor(name:string){
 const first=String(name||'').trim().split(/\s+/)[0].toLowerCase();
 if(first in DEMO_FACES)return DEMO_FACES[first];
 let h=0;
 for(const ch of String(name||'?'))h=(h*31+ch.charCodeAt(0))>>>0;
 return h%ILLUSTRATIONS.avatars.length;
}

/** `avatar` is the face the person picked when registering (0-7); older accounts and contacts without one get a face from their name. */
export function Avatar({name,size=48,avatar}:{name:string;size?:number;dark?:boolean;avatar?:number|null}){
 // -1 means "someone outside Kampus": a neutral picture instead of a random face
 if(avatar===-1)return <View accessibilityLabel={name} style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#e6e0f7',alignItems:'center',justifyContent:'center'}}><Icon name="person" size={Math.round(size*0.5)} color={C.primary}/></View>;
 const index=typeof avatar==='number'&&avatar>=0&&avatar<ILLUSTRATIONS.avatars.length?avatar:faceFor(name);
 return <Image accessibilityLabel={name} source={ILLUSTRATIONS.avatars[index]} style={{width:size,height:size,borderRadius:size/2}} resizeMode="cover"/>;
}

/** Result artwork: a coloured disc with a paper receipt on it, as in the design. */
export function ResultArt({tone}:{tone:'success'|'failed'|'review'}){
 return <Image accessibilityRole="image" source={ILLUSTRATIONS[tone]} style={{width:200,height:196}} resizeMode="contain"/>;
}

/** Hero artwork of the sign-in screens: a tilted phone, or a shield with a lock. */
export function HeroArt({kind}:{kind:'phone'|'shield'}){
 return (
  <View style={{height:176,alignItems:'center',justifyContent:'center'}}>
   <Image source={ILLUSTRATIONS[kind]} style={{width:kind==='phone'?146:172,height:172}} resizeMode="contain"/>
  </View>
 );
}

type ErrorTone='danger'|'warn'|'info';
type ErrorLook={icon:React.ComponentProps<typeof Ionicons>['name'];title:string;tone:ErrorTone};
const ERROR_TONES:Record<ErrorTone,{bg:string;fg:string}>={
 danger:{bg:'#fde3e3',fg:'#d04b4b'},
 warn:{bg:'#fff1c9',fg:'#b07400'},
 info:{bg:'#ece6ff',fg:'#5632c0'}
};

/** Picks the icon and heading of the error popup from the server code (or, failing that, the wording). */
export function errorLook(message:string):ErrorLook{
 const code=errorCode(message);
 const has=(re:RegExp)=>re.test(code);
 if(code==='CONNECTION_ERROR')return {icon:'cloud-offline-outline',title:'Bağlantı yoxdur',tone:'danger'};
 if(has(/CARD_DECLINED|CARD_NO_FUNDS/))return {icon:'card-outline',title:'Kart rədd edildi',tone:'danger'};
 if(has(/CARD_EXPIRED/))return {icon:'card-outline',title:'Kartın müddəti bitib',tone:'warn'};
 if(has(/QR_CLOSED/))return {icon:'qr-code-outline',title:'QR artıq aktiv deyil',tone:'warn'};
 if(has(/INSUFFICIENT_FUNDS|BNPL_FUND/))return {icon:'wallet-outline',title:'Balans çatmır',tone:'danger'};
 if(has(/PIN_LOCKOUT|ACCOUNT_LOCKED/))return {icon:'lock-closed-outline',title:'Hesab müvəqqəti bloklanıb',tone:'danger'};
 if(has(/INVALID_CREDENTIALS/))return {icon:'keypad-outline',title:'PIN düzgün deyil',tone:'danger'};
 if(has(/FROZEN|BLACKLIST|BLOCKED|MULE|CARD_CLOSED/))return {icon:'ban-outline',title:'Əməliyyat bloklanıb',tone:'danger'};
 if(has(/SESSION_EXPIRED|UNAUTHENTICATED|DEVICE_MISMATCH|DEVICE_REQUIRED/))return {icon:'time-outline',title:'Sessiya başa çatıb',tone:'warn'};
 if(has(/KYC|SELFIE|FACE|LIVENESS/))return {icon:'scan-outline',title:'Üz yoxlaması',tone:'danger'};
 if(has(/SCA_/))return {icon:'shield-checkmark-outline',title:'Təsdiq lazımdır',tone:'warn'};
 if(has(/RATE_LIMIT|OTP_LOCKED|OTP_RATE/))return {icon:'hourglass-outline',title:'Bir az gözlə',tone:'warn'};
 if(has(/LIMIT/))return {icon:'speedometer-outline',title:'Limit aşılıb',tone:'warn'};
 if(has(/OTP|CODE_/))return {icon:'chatbubble-ellipses-outline',title:'Kod düzgün deyil',tone:'danger'};
 if(has(/TOKEN_EXPIRED/))return {icon:'timer-outline',title:'Ödəniş sessiyası bitdi',tone:'warn'};
 if(has(/TOKEN_USED/))return {icon:'checkmark-done-outline',title:'Artıq istifadə olunub',tone:'warn'};
 if(has(/TOKEN/))return {icon:'qr-code-outline',title:'Ödəniş sessiyası yenilənməlidir',tone:'warn'};
 if(has(/QR/))return {icon:'qr-code-outline',title:'QR kod düzgün deyil',tone:'danger'};
 if(has(/NOT_FOUND/))return {icon:'search-outline',title:'Tapılmadı',tone:'warn'};
 if(has(/EXISTS|ALREADY/))return {icon:'people-outline',title:'Artıq mövcuddur',tone:'warn'};
 if(has(/AGE_RESTRICTED|BIRTH/))return {icon:'calendar-outline',title:'Yaş məhdudiyyəti',tone:'warn'};
 if(has(/OVERDUE|BNPL|LOAN|DEBT/))return {icon:'receipt-outline',title:'Borc məhdudiyyəti',tone:'warn'};
 if(has(/FEATURE_DISABLED|UNAVAILABLE|NOT_IMPLEMENTED|SIMULATOR/))return {icon:'construct-outline',title:'Xidmət əlçatmazdır',tone:'warn'};
 if(has(/INVALID|REQUIRED|MISMATCH|CATEGORY|AMOUNT/))return {icon:'create-outline',title:'Məlumat düzgün deyil',tone:'info'};
 if(/seçimini istifadə et/.test(message))return {icon:'swap-horizontal-outline',title:'Başqa üsul seç',tone:'info'};
 if(/Məbləğ|nömrə|daxil edin/i.test(message))return {icon:'create-outline',title:'Məlumat düzgün deyil',tone:'info'};
 return {icon:'alert-circle-outline',title:'Xəta baş verdi',tone:'danger'};
}

// A page-level popup would sit behind an open Modal, so it steps aside while a sheet or full-screen flow shows its own.
let openModals=0;
const modalListeners=new Set<()=>void>();
const notifyModals=()=>modalListeners.forEach(listener=>listener());
/** Call from every Modal that hosts an ErrorPopup of its own, with whether it is currently visible. */
export function useModalHost(active:boolean){
 useEffect(()=>{
  if(!active)return;
  openModals+=1;notifyModals();
  return()=>{openModals-=1;notifyModals();};
 },[active]);
}
function useModalOpen(){
 const [,redraw]=useState(0);
 useEffect(()=>{
  const listener=()=>redraw(n=>n+1);
  modalListeners.add(listener);
  return()=>{modalListeners.delete(listener);};
 },[]);
 return openModals>0;
}

/** A large centred error popup with its own icon. It is an overlay of its parent, so it also works inside a Modal; `page` marks the one that belongs to the page behind any Modal. */
export function ErrorPopup({message,onClose,page=false}:{message:string;onClose:()=>void;page?:boolean}){
 const look=errorLook(message);
 const tone=ERROR_TONES[look.tone];
 const modalOpen=useModalOpen();
 if(page&&modalOpen)return null;
 return (
  <View accessibilityViewIsModal style={S.popupLayer}>
   <Pressable accessibilityLabel="Bağla" style={StyleSheet.absoluteFill} onPress={onClose}/>
   <View accessibilityRole="alert" style={S.popupCard}>
    <View style={[S.popupIcon,{backgroundColor:tone.bg}]}>
     <Ionicons name={look.icon} size={44} color={tone.fg}/>
    </View>
    <Text style={S.popupTitle}>{look.title}</Text>
    <Text style={S.popupText}>{message}</Text>
    <Pressable accessibilityRole="button" onPress={onClose} style={({pressed})=>[S.popupButton,pressed&&{opacity:0.8}]}>
     <Text style={S.buttonText}>Aydındır</Text>
    </Pressable>
   </View>
  </View>
 );
}

/** The same popup in a Modal of its own, for screens that have no other Modal open. */
export function ErrorPopupModal({message,onClose}:{message:string;onClose:()=>void}){
 if(!message)return null;
 return (
  <Modal visible transparent animationType="fade" onRequestClose={onClose}>
   <ErrorPopup message={message} onClose={onClose}/>
  </Modal>
 );
}

export function BackBar({onBack,title,right}:{onBack:()=>void;title?:string;right?:React.ReactNode}){
 return (
  <View style={{flexDirection:'row',alignItems:'center',minHeight:48,marginBottom:6}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={onBack} hitSlop={10} style={{flexDirection:'row',alignItems:'center',minHeight:48,minWidth:70}}>
    <Ionicons name="chevron-back" size={20} color="#1d5bd6"/>
    <Text style={{color:'#1d5bd6',fontSize:15,fontWeight:'600'}}>Geri</Text>
   </Pressable>
   {!!title&&<Text numberOfLines={1} style={{flex:1,textAlign:'center',fontSize:16,fontWeight:'700',color:C.ink,marginRight:70}}>{title}</Text>}
   {right}
  </View>
 );
}

export const CARD_IMAGES={
 credit:require('../assets/cards/credit-cash.jpg'),
 topupCard:require('../assets/cards/topup-card.jpg'),
};

export type AppContextType={
 base:string;
 data:Row;
 call:(p:string,b?:Row)=>Promise<any>;
 act:(p:string,b:Row)=>Promise<any>;
 refresh:()=>Promise<void>;
 busy:boolean;
 open:(s:string)=>void;
 logout:()=>void;
 error:string;
 message:string;
 external:Row[];
 setError:(e:string)=>void;
 setMessage:(s:string)=>void;
 goTo:(route:string)=>void;
};

export const Context=createContext<AppContextType>(null!);
export const useApp=()=>useContext(Context);

/** Bank cards shared with Kampus under a live consent: these can fund payments, transfers and top-ups. */
export function linkedCards(data:Row):Row[]{
 const live=new Set<string>((data.openBanking?.consents||[]).filter((c:Row)=>c.status==='AUTHORIZED').map((c:Row)=>c.id));
 return (data.openBanking?.accounts||[]).filter((x:Row)=>x.type==='CARD'&&live.has(x.consentId));
}

/** Short name of a shared card for pickers: bank and last four digits. */
export const cardLabel=(x:Row)=>String(x.bankName).split(' ')[0]+' · '+String(x.masked).replace(/\D/g,'').slice(-4);

export const AZ_MONTHS=['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];
export const EXPENSE_CATEGORIES=['Yemək','Abunəliklər','Köçürmələr','Nəqliyyat','Əyləncə','Alış-veriş','Kommunal','Digər'];

export function fmtDate(v:any){
 const d=new Date(v);
 if(Number.isNaN(d.getTime()))return '';
 return d.getDate()+' '+AZ_MONTHS[d.getMonth()];
}

export function fmtDateTime(v:any){
 const d=new Date(v);
 if(Number.isNaN(d.getTime()))return '';
 const hh=String(d.getHours()).padStart(2,'0');
 const mm=String(d.getMinutes()).padStart(2,'0');
 return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export const statusLabel:Record<string,string>={
 COMPLETED:'Tamamlandı',
 SCHEDULED:'Göndərilir (5s ləğv)',
 CANCELLED:'Ləğv edildi',
 REJECTED:'Rədd edildi',
 FAILED:'Uğursuz · rezerv açıldı',
 HELD:'Rezerv edilib',
 SENT:'Bank şəbəkəsindədir',
 AWAITING_RECIPIENT:'Alıcı qəbul etməlidir',
 REFUNDED:'Geri qaytarıldı',
 UNDER_REVIEW:'Admin yoxlamasında',
 AVAILABLE:'Təklif hazırdır',
 DECLINED:'İmtina edildi',
 ACCEPTED:'Qəbul edildi',
 ACTIVE:'Aktiv',
 FROZEN:'Dondurulub',
 CLOSED:'Bağlanıb',
 PAID:'Ödənilib',
 OPEN:'Gözləyir'
};

export function statusTone(status?:string):'success'|'warn'|'danger'|'neutral'{
 if(!status)return 'neutral';
 if(['COMPLETED','PAID','ACCEPTED','ACTIVE','AVAILABLE'].includes(status))return 'success';
 if(['SCHEDULED','HELD','SENT','UNDER_REVIEW','OPEN','AWAITING_RECIPIENT'].includes(status))return 'warn';
 if(['CANCELLED','REJECTED','FAILED','DECLINED','CLOSED'].includes(status))return 'danger';
 return 'neutral';
}

export function Icon({name,size=22,color=C.ink}:{name:React.ComponentProps<typeof Ionicons>['name'];size?:number;color?:string}){
 return <Ionicons name={name} size={size} color={color}/>;
}

export function Button({
 title,
 onPress,
 secondary=false,
 danger=false,
 disabled=false,
 yellow=false,
 icon
}:{
 title:string;
 onPress:()=>void;
 yellow?:boolean;
 secondary?:boolean;
 danger?:boolean;
 disabled?:boolean;
 icon?:React.ComponentProps<typeof Ionicons>['name'];
}){
 return (
  <Pressable
   accessibilityRole="button"
   disabled={disabled}
   onPress={onPress}
   style={({pressed})=>[
    S.button,
    secondary&&S.secondary,
    danger&&S.danger,
    yellow&&{backgroundColor:C.yellow},
    (pressed||disabled)&&{opacity:0.55}
   ]}
  >
   <Text numberOfLines={1} style={[S.buttonText,secondary&&{color:C.primary},danger&&{color:C.red},yellow&&{color:C.yellowInk}]}>
    {title}
   </Text>
   {!!icon&&<Icon name={icon} size={19} color={danger?C.red:yellow?C.yellowInk:secondary?C.primary:'white'}/>}
  </Pressable>
 );
}

export function Field({
 label,
 value,
 onChange,
 placeholder,
 secure=false,
 numeric=false,
 digits=false,
 multiline=false,
 error='',
 eager=false,
 maxLength
}:{
 label:string;
 value:string;
 onChange:(t:string)=>void;
 placeholder?:string;
 secure?:boolean;
 numeric?:boolean;
 digits?:boolean;
 multiline?:boolean;
 error?:string;
 eager?:boolean;
 maxLength?:number;
}){
 const [touched,setTouched]=useState(false);
 const shown=!!error&&(touched||eager);
 return (
  <View style={{marginBottom:16}}>
   <Text style={S.label}>{label}</Text>
   <TextInput
    accessibilityLabel={label}
    style={[S.input,multiline&&{minHeight:92,textAlignVertical:'top'},shown&&{borderColor:C.red}]}
    onBlur={()=>setTouched(true)}
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    placeholderTextColor="#9a95a7"
    secureTextEntry={secure}
    keyboardType={digits?'number-pad':numeric?'decimal-pad':'default'}
    autoCapitalize="none"
    multiline={multiline}
    maxLength={maxLength}
   />
   {shown&&<Text style={{color:C.red,fontSize:13,fontWeight:'600',marginTop:6}}>{error}</Text>}
  </View>
 );
}

export function Check({value,onChange,text}:{value:boolean;onChange:(v:boolean)=>void;text:string}){
 return (
  <Pressable
   accessibilityRole="checkbox"
   accessibilityState={{checked:value}}
   aria-checked={value}
   onPress={()=>onChange(!value)}
   style={{flexDirection:'row',gap:12,alignItems:'center',marginBottom:16,minHeight:48,paddingVertical:4}}
  >
   <View style={{width:24,height:24,borderRadius:7,borderWidth:1.5,borderColor:value?C.primary:'#cfc9e2',backgroundColor:value?C.primary:C.white,alignItems:'center',justifyContent:'center'}}>
    {value&&<Icon name="checkmark" color="white" size={16}/>}
   </View>
   <Text style={{fontSize:12,lineHeight:18,color:C.ink,flex:1}}>{text}</Text>
  </Pressable>
 );
}

export function Badge({text,dark=false,tone}:{text:string;dark?:boolean;tone?:'success'|'warn'|'danger'|'neutral'}){
 const toneStyle=
  tone==='success'?{backgroundColor:'#dfd8f5',textColor:'#331e70'}:
  tone==='warn'?{backgroundColor:'#fcf1df',textColor:'#9a601e'}:
  tone==='danger'?{backgroundColor:'#fbe8e2',textColor:C.red}:
  null;
 return (
  <View style={[S.badge,dark&&{backgroundColor:'#3c3454'},toneStyle&&{backgroundColor:toneStyle.backgroundColor}]}>
   <Text style={[S.badgeText,dark&&{color:C.lime},toneStyle&&{color:toneStyle.textColor}]}>{text}</Text>
  </View>
 );
}

export function Box({children,style}:{children:React.ReactNode;style?:any}){
 return <View style={[S.box,style]}>{children}</View>;
}

export function Empty({text,icon='leaf-outline'}:{text:string;icon?:React.ComponentProps<typeof Ionicons>['name']}){
 return (
  <View style={{paddingVertical:26,paddingHorizontal:16,alignItems:'center',gap:10}}>
   <View style={{width:48,height:48,borderRadius:16,backgroundColor:'#e9e5f4',alignItems:'center',justifyContent:'center'}}>
    <Icon name={icon} size={24} color="#746994"/>
   </View>
   <Text style={{color:C.muted,textAlign:'center',fontSize:12,lineHeight:19}}>{text}</Text>
  </View>
 );
}

/**
 * A full-screen flow. On the phone it is a Modal; in the browser it is a layer inside the app, so it stays inside the
 * phone frame of the simulator instead of covering the whole window.
 */
export function FullScreen({visible,onRequestClose,animationType='slide',children}:{visible:boolean;onRequestClose:()=>void;animationType?:'none'|'slide';children:React.ReactNode}){
 if(Platform.OS!=='web')return <Modal visible={visible} animationType={animationType} onRequestClose={onRequestClose}>{children}</Modal>;
 if(!visible)return null;
 return <View style={[StyleSheet.absoluteFill,{zIndex:100,backgroundColor:'#fff'}]}>{children}</View>;
}

export function Sheet({title,visible,onClose,children}:{title:string;visible:boolean;onClose:()=>void;children:React.ReactNode}){
 const inset=useSafeAreaInsets();
 const app=useContext(Context);
 useModalHost(visible);
 return (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
   <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={S.overlay}>
    <Pressable style={{flex:1,minHeight:36}} onPress={onClose}/>
    <View style={[S.sheet,{paddingBottom:Math.max(24,inset.bottom),maxHeight:'90%'}]}>
     <View style={S.handle}/>
     <View style={S.sheetHeading}>
      <Text numberOfLines={1} style={[S.h2,{flex:1,paddingRight:12}]}>{title}</Text>
      <Pressable
       accessibilityRole="button"
       accessibilityLabel="Bağla"
       onPress={onClose}
       hitSlop={10}
       style={S.closeBtn}
      >
       <Icon name="close" color={C.ink} size={20}/>
      </Pressable>
     </View>
     <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}
     </ScrollView>
    </View>
    {!!app?.error&&visible&&<ErrorPopup message={app.error} onClose={()=>app.setError('')}/>}
   </KeyboardAvoidingView>
  </Modal>
 );
}

export function Tx({t,onPress}:{t:Row;onPress?:()=>void}){
 const flag=useApp().data.insightsBrief?.flags?.[t.id];
 const isIn=t.direction==='IN';
 const external=t.source==='OPEN_BANKING';
 const content=(
  <View style={S.listRow}>
   {external?(
    <View style={[S.tile,{backgroundColor:t.bankColor||C.deep}]}>
     <Text style={{color:'#fff',fontSize:12,fontWeight:'800'}}>{t.bankInitials||'B'}</Text>
    </View>
   ):(
    <View style={[S.tile,isIn&&{backgroundColor:'#dcf3e4'}]}>
     <Icon
      name={t.type==='QR'?'cafe-outline':isIn?'arrow-down-outline':'arrow-up-outline'}
      color={isIn?C.green:C.primary}
      size={19}
     />
    </View>
   )}
   <View style={{flex:1,minWidth:0}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
     <Text numberOfLines={1} style={{fontSize:14,color:C.ink,fontWeight:'700',flexShrink:1}}>{t.name}</Text>
     {flag==='ANOMALY'&&<View style={{backgroundColor:'#fdecec',borderRadius:6,paddingHorizontal:6,paddingVertical:2}}><Text style={{fontSize:9,fontWeight:'800',color:'#d04b4b'}}>QEYRİ-ADİ</Text></View>}
     {flag==='RECURRING'&&<View style={{backgroundColor:C.lav,borderRadius:6,paddingHorizontal:6,paddingVertical:2}}><Text style={{fontSize:9,fontWeight:'800',color:C.primary}}>TƏKRAR</Text></View>}
    </View>
    <Text numberOfLines={1} style={[S.muted,{fontSize:11,marginTop:2}]}>{fmtDate(t.createdAt)} · {t.category}{external?' · '+t.bankName:''}</Text>
    {!!t.note&&<Text numberOfLines={1} style={{fontSize:12,color:C.ink,marginTop:2,fontStyle:'italic'}}>“{t.note}”</Text>}
   </View>
   <Text style={{fontWeight:'600',fontSize:13,color:isIn?C.green:C.red}}>
    {isIn?'+':'−'}{money(t.amountMinor)}
   </Text>
   {!!onPress&&<Icon name="chevron-forward" size={16} color="#8d89a3"/>}
  </View>
 );
 if(!onPress)return content;
 return (
  <Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>pressed&&{opacity:0.7}}>
   {content}
  </Pressable>
 );
}

export const S=StyleSheet.create({
 page:{flex:1,backgroundColor:C.bg},
 content:{padding:18,paddingBottom:32,maxWidth:430,width:'100%',alignSelf:'center'},
 h1:{fontSize:26,fontWeight:'800',color:C.ink,letterSpacing:-0.8},
 h2:{fontSize:19,fontWeight:'700',letterSpacing:-0.4,color:C.ink},
 h3:{fontSize:14,fontWeight:'700',color:C.ink},
 muted:{color:C.muted,fontSize:12,lineHeight:18},
 eyebrow:{fontSize:10,letterSpacing:1.5,fontWeight:'700',color:C.muted,marginBottom:6},
 button:{minHeight:52,backgroundColor:C.primary,borderRadius:12,paddingHorizontal:18,paddingVertical:13,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,marginBottom:10},
 buttonText:{color:'white',fontWeight:'700',fontSize:14},
 secondary:{backgroundColor:C.lav},
 danger:{backgroundColor:'#fbe8e2'},
 input:{backgroundColor:'white',borderColor:'#dedaeb',borderWidth:1,borderRadius:10,paddingHorizontal:14,paddingVertical:12,fontSize:15,color:C.ink,minHeight:50},
 label:{fontSize:11,fontWeight:'600',color:C.muted,marginBottom:7},
 box:{padding:16,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:'white',marginBottom:12},
 row:{flexDirection:'row',alignItems:'center',gap:12},
 between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 badge:{backgroundColor:'#e3ddf3',paddingHorizontal:9,paddingVertical:5,borderRadius:7,alignSelf:'flex-start'},
 badgeText:{color:'#402d78',fontSize:10,fontWeight:'700',letterSpacing:0.4},
 section:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:22,marginBottom:10},
 link:{fontSize:12,color:C.primary,fontWeight:'700',paddingVertical:6},
 avatar:{width:44,height:44,borderRadius:15,backgroundColor:'#e1dcf0',alignItems:'center',justifyContent:'center'},
 avatarText:{fontSize:15,fontWeight:'700',color:'#483877'},
 line:{height:1,backgroundColor:C.line,marginVertical:12},
 overlay:{flex:1,backgroundColor:'rgba(16,10,33,0.55)',justifyContent:'flex-end'},
 sheet:{backgroundColor:C.bg,borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:20,paddingTop:10,width:'100%',maxWidth:430,alignSelf:'center'},
 handle:{width:38,height:4,borderRadius:2,backgroundColor:'#c8c2d9',alignSelf:'center',marginBottom:14},
 sheetHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
 closeBtn:{width:48,height:48,borderRadius:14,backgroundColor:'#e9e5f4',alignItems:'center',justifyContent:'center'},
 error:{backgroundColor:'#fbe8e2',borderRadius:13,padding:14,marginBottom:14,borderWidth:1,borderColor:'#f3cfc4'},
 errorText:{color:C.red,fontSize:12,lineHeight:18,fontWeight:'500'},
 success:{padding:14,borderRadius:13,backgroundColor:'#dfd8f5',marginBottom:14},
 successText:{color:'#311c6f',fontSize:12,lineHeight:18,fontWeight:'600'},
 amount:{fontSize:34,fontWeight:'800',letterSpacing:-1.1,color:C.ink},
 tab:{minHeight:48,paddingHorizontal:14,paddingVertical:10,borderRadius:12,backgroundColor:'#e5e1f1',alignItems:'center',justifyContent:'center'},
 tabText:{fontSize:12,color:C.muted,fontWeight:'600'},
 tile:{width:42,height:42,borderRadius:12,backgroundColor:C.lav,alignItems:'center',justifyContent:'center'},
 listRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,minHeight:60,borderBottomWidth:1,borderBottomColor:'#f0eef6'},
 spacer:{height:20},
 popupLayer:{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:1000,elevation:1000,backgroundColor:'rgba(18,10,51,0.6)',alignItems:'center',justifyContent:'center',padding:24},
 popupCard:{width:'100%',maxWidth:340,backgroundColor:'#fff',borderRadius:24,paddingHorizontal:22,paddingTop:28,paddingBottom:20,alignItems:'center'},
 popupIcon:{width:88,height:88,borderRadius:44,alignItems:'center',justifyContent:'center',marginBottom:16},
 popupTitle:{fontSize:19,fontWeight:'800',color:C.ink,textAlign:'center',letterSpacing:-0.3},
 popupText:{fontSize:14,lineHeight:21,color:'#5d5a73',textAlign:'center',marginTop:8,marginBottom:20},
 popupButton:{alignSelf:'stretch',minHeight:50,borderRadius:12,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'}
});
