import React,{createContext,useContext} from 'react';
import {View,Text,Pressable,TextInput,StyleSheet,Modal,ScrollView,KeyboardAvoidingView,Platform} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Row,money} from './api';

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

const AVATAR_TINTS=['#fde3c8','#f6c9d8','#ffd2c2','#ffe9a8','#e0d4ff','#cdeedd','#cfe3ff','#eadfce'];
export function tintFor(name:string){
 let h=0;
 for(const ch of String(name||'?'))h=(h*31+ch.charCodeAt(0))>>>0;
 return AVATAR_TINTS[h%AVATAR_TINTS.length];
}

export function Avatar({name,size=48,dark=false}:{name:string;size?:number;dark?:boolean}){
 const letter=(String(name||'K').trim()[0]||'K').toUpperCase();
 return (
  <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:dark?'rgba(255,255,255,0.16)':tintFor(name),alignItems:'center',justifyContent:'center'}}>
   <Text style={{fontSize:size*0.4,fontWeight:'800',color:dark?'#fff':C.deep}}>{letter}</Text>
  </View>
 );
}

/** Round result artwork: a coloured disc with a paper receipt on it, as in the design. */
export function ResultArt({tone}:{tone:'success'|'failed'|'review'}){
 const color=tone==='success'?'#4ca66b':tone==='failed'?'#e05a5a':C.yellow;
 const soft=tone==='success'?'#d8efe0':tone==='failed'?'#f8d9d9':'#fff0c2';
 const icon=tone==='success'?'checkmark':tone==='failed'?'close':'hourglass-outline';
 return (
  <View style={{width:190,height:170,alignItems:'center',justifyContent:'center'}}>
   {[[8,38,10],[170,26,8],[22,128,7],[162,118,12]].map(([l,t,d],i)=>(
    <View key={i} style={{position:'absolute',left:l,top:t,width:d,height:d,borderRadius:d/2,backgroundColor:soft}}/>
   ))}
   <View style={{width:132,height:132,borderRadius:66,backgroundColor:color,alignItems:'center',justifyContent:'flex-end',overflow:'hidden'}}>
    <View style={{width:62,height:92,borderTopLeftRadius:10,borderTopRightRadius:10,backgroundColor:'#fff',alignItems:'center',paddingTop:14}}>
     <Ionicons name={icon} size={30} color={color}/>
     <View style={{width:36,height:3,borderRadius:2,backgroundColor:'#d9d7e2',marginTop:14}}/>
     <View style={{width:36,height:3,borderRadius:2,backgroundColor:'#d9d7e2',marginTop:5}}/>
    </View>
   </View>
  </View>
 );
}

/** Hero artwork of the login screens: a tilted phone, or a shield with a lock. */
export function HeroArt({kind}:{kind:'phone'|'shield'}){
 if(kind==='phone'){
  return (
   <View style={{height:170,alignItems:'center',justifyContent:'flex-end'}}>
    <View style={{width:92,height:158,borderRadius:16,backgroundColor:C.primary,padding:5,transform:[{rotate:'-6deg'}],shadowColor:C.primary,shadowOpacity:0.25,shadowRadius:14,shadowOffset:{width:0,height:10},elevation:6}}>
     <View style={{flex:1,borderRadius:12,backgroundColor:'#e9e4ff',alignItems:'center',justifyContent:'center'}}>
      <Ionicons name="chatbubble-ellipses" size={34} color="#fff"/>
      <View style={{position:'absolute',top:12,right:12,width:10,height:10,borderRadius:5,backgroundColor:C.yellow}}/>
    </View>
    </View>
    <View style={{width:130,height:10,borderRadius:5,backgroundColor:'rgba(86,50,192,0.12)',marginTop:2}}/>
   </View>
  );
 }
 return (
  <View style={{height:170,alignItems:'center',justifyContent:'center'}}>
   <View style={{width:118,height:132,borderRadius:34,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'}}>
    <View style={{width:88,height:100,borderRadius:26,backgroundColor:'#7b5ae0',alignItems:'center',justifyContent:'center'}}>
     <Ionicons name="lock-closed" size={36} color="#fff"/>
    </View>
    <View style={{position:'absolute',right:-12,bottom:-6,width:42,height:42,borderRadius:21,backgroundColor:C.yellow,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:'#f6f3ff'}}>
     <Ionicons name="checkmark" size={22} color={C.yellowInk}/>
    </View>
   </View>
  </View>
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
 authHero:require('../assets/cards/auth-login-hero.jpg'),
 credit:require('../assets/cards/credit-cash.jpg'),
 btc:require('../assets/cards/btc-topup.jpg'),
 virtualCard:require('../assets/cards/virtual-card.jpg'),
 split:require('../assets/cards/split-bill.jpg'),
 btcHero:require('../assets/cards/btc-hero-banner.jpg'),
 btcLightning:require('../assets/cards/btc-lightning.jpg'),
 btcOnchain:require('../assets/cards/btc-onchain.jpg'),
 topupCard:require('../assets/cards/topup-card.jpg'),
 topupBank:require('../assets/cards/topup-bank.jpg'),
 topupTerminal:require('../assets/cards/topup-terminal.jpg'),
 onboarding1:require('../assets/cards/onboarding-wallet-qr.png'),
 onboarding2:require('../assets/cards/onboarding-virtual-shield.png'),
 onboarding3:require('../assets/cards/onboarding-split-bnpl.png')
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
};

export const Context=createContext<AppContextType>(null!);
export const useApp=()=>useContext(Context);

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
 if(['SCHEDULED','HELD','SENT','UNDER_REVIEW','OPEN'].includes(status))return 'warn';
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
 multiline=false
}:{
 label:string;
 value:string;
 onChange:(t:string)=>void;
 placeholder?:string;
 secure?:boolean;
 numeric?:boolean;
 multiline?:boolean;
}){
 return (
  <View style={{marginBottom:16}}>
   <Text style={S.label}>{label}</Text>
   <TextInput
    accessibilityLabel={label}
    style={[S.input,multiline&&{minHeight:92,textAlignVertical:'top'}]}
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    placeholderTextColor="#9a95a7"
    secureTextEntry={secure}
    keyboardType={numeric?'decimal-pad':'default'}
    autoCapitalize="none"
    multiline={multiline}
   />
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

export function Sheet({title,visible,onClose,children}:{title:string;visible:boolean;onClose:()=>void;children:React.ReactNode}){
 const inset=useSafeAreaInsets();
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
   </KeyboardAvoidingView>
  </Modal>
 );
}

export function Tx({t,onPress}:{t:Row;onPress?:()=>void}){
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
      name={t.type==='QR'?'cafe-outline':t.type==='CRYPTO'?'logo-bitcoin':isIn?'arrow-down-outline':'arrow-up-outline'}
      color={isIn?C.green:C.primary}
      size={19}
     />
    </View>
   )}
   <View style={{flex:1,minWidth:0}}>
    <Text numberOfLines={1} style={{fontSize:14,color:C.ink,fontWeight:'700'}}>{t.name}</Text>
    <Text numberOfLines={1} style={[S.muted,{fontSize:11,marginTop:2}]}>{fmtDate(t.createdAt)} · {t.category}{external?' · '+t.bankName:''}</Text>
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
 spacer:{height:20}
});
