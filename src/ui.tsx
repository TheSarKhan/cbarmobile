import React,{createContext,useContext} from 'react';
import {View,Text,Pressable,TextInput,StyleSheet,Modal,ScrollView,KeyboardAvoidingView,Platform} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Row,money} from './api';

export const C={
 ink:'#17352e',
 forest:'#173b30',
 muted:'#6e7d6c',
 lime:'#cbef93',
 bg:'#f7f8f3',
 line:'#e4eadc',
 red:'#b75042',
 amber:'#b8742a',
 green:'#4e7a27',
 white:'#ffffff'
};

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
 onboarding1:require('../assets/cards/onboarding-wallet-qr.jpg'),
 onboarding2:require('../assets/cards/onboarding-virtual-shield.jpg'),
 onboarding3:require('../assets/cards/onboarding-split-bnpl.jpg')
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
 setError:(e:string)=>void;
 setMessage:(s:string)=>void;
};

export const Context=createContext<AppContextType>(null!);
export const useApp=()=>useContext(Context);

export const AZ_MONTHS=['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];
export const EXPENSE_CATEGORIES=['Yemək','Abunəliklər','Köçürmələr','Nəqliyyat','Əyləncə'];

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
 icon
}:{
 title:string;
 onPress:()=>void;
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
    (pressed||disabled)&&{opacity:0.55}
   ]}
  >
   <Text numberOfLines={1} style={[S.buttonText,secondary&&{color:C.ink},danger&&{color:C.red}]}>
    {title}
   </Text>
   {!!icon&&<Icon name={icon} size={19} color={danger?C.red:secondary?C.ink:'white'}/>}
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
    placeholderTextColor="#9aa696"
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
   <View style={{width:24,height:24,borderRadius:7,borderWidth:1.5,borderColor:value?C.ink:C.line,backgroundColor:value?C.ink:C.white,alignItems:'center',justifyContent:'center'}}>
    {value&&<Icon name="checkmark" color="white" size={16}/>}
   </View>
   <Text style={{fontSize:12,lineHeight:18,color:C.ink,flex:1}}>{text}</Text>
  </Pressable>
 );
}

export function Badge({text,dark=false,tone}:{text:string;dark?:boolean;tone?:'success'|'warn'|'danger'|'neutral'}){
 const toneStyle=
  tone==='success'?{backgroundColor:'#e8f4d9',textColor:'#486c22'}:
  tone==='warn'?{backgroundColor:'#fcf1df',textColor:'#9a601e'}:
  tone==='danger'?{backgroundColor:'#fbe8e2',textColor:C.red}:
  null;
 return (
  <View style={[S.badge,dark&&{backgroundColor:'#355341'},toneStyle&&{backgroundColor:toneStyle.backgroundColor}]}>
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
   <View style={{width:48,height:48,borderRadius:16,backgroundColor:'#eef3e6',alignItems:'center',justifyContent:'center'}}>
    <Icon name={icon} size={24} color="#7d926b"/>
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
 const content=(
  <View style={S.listRow}>
   <View style={[S.tile,isIn&&{backgroundColor:'#e8f3d8'}]}>
    <Icon
     name={t.type==='QR'?'cafe-outline':t.type==='CRYPTO'?'logo-bitcoin':isIn?'arrow-down-outline':'arrow-up-outline'}
     color={isIn?'#4e7a27':C.ink}
     size={19}
    />
   </View>
   <View style={{flex:1,minWidth:0}}>
    <Text numberOfLines={1} style={{fontSize:13,color:C.ink,fontWeight:'600'}}>{t.name}</Text>
    <Text numberOfLines={1} style={[S.muted,{fontSize:11,marginTop:2}]}>{fmtDate(t.createdAt)} · {t.category}</Text>
   </View>
   <View style={{alignItems:'flex-end'}}>
    <Text style={{fontWeight:'700',fontSize:13,color:isIn?'#4e7a27':C.ink}}>
     {isIn?'+':'−'}{money(t.amountMinor)}
    </Text>
    {onPress&&<Text style={{fontSize:10,color:C.muted,marginTop:2}}>Detallar →</Text>}
   </View>
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
 button:{minHeight:50,backgroundColor:C.ink,borderRadius:14,paddingHorizontal:18,paddingVertical:13,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,marginBottom:10},
 buttonText:{color:'white',fontWeight:'700',fontSize:13},
 secondary:{backgroundColor:'#eaf0e2'},
 danger:{backgroundColor:'#fbe8e2'},
 input:{backgroundColor:'white',borderColor:C.line,borderWidth:1,borderRadius:13,paddingHorizontal:14,paddingVertical:12,fontSize:15,color:C.ink,minHeight:50},
 label:{fontSize:11,fontWeight:'600',color:C.muted,marginBottom:7},
 box:{padding:16,borderRadius:18,borderWidth:1,borderColor:C.line,backgroundColor:'white',marginBottom:12},
 row:{flexDirection:'row',alignItems:'center',gap:12},
 between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 badge:{backgroundColor:'#eaf2de',paddingHorizontal:9,paddingVertical:5,borderRadius:7,alignSelf:'flex-start'},
 badgeText:{color:'#557530',fontSize:10,fontWeight:'700',letterSpacing:0.4},
 section:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:22,marginBottom:10},
 link:{fontSize:12,color:'#5b7d34',fontWeight:'700',paddingVertical:6},
 avatar:{width:44,height:44,borderRadius:15,backgroundColor:'#e8efdd',alignItems:'center',justifyContent:'center'},
 avatarText:{fontSize:15,fontWeight:'700',color:'#58743b'},
 line:{height:1,backgroundColor:C.line,marginVertical:12},
 overlay:{flex:1,backgroundColor:'rgba(11,32,28,0.55)',justifyContent:'flex-end'},
 sheet:{backgroundColor:C.bg,borderTopLeftRadius:26,borderTopRightRadius:26,paddingHorizontal:20,paddingTop:10,width:'100%',maxWidth:430,alignSelf:'center'},
 handle:{width:38,height:4,borderRadius:2,backgroundColor:'#cfd8c3',alignSelf:'center',marginBottom:14},
 sheetHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
 closeBtn:{width:48,height:48,borderRadius:14,backgroundColor:'#eef3e6',alignItems:'center',justifyContent:'center'},
 error:{backgroundColor:'#fbe8e2',borderRadius:13,padding:14,marginBottom:14,borderWidth:1,borderColor:'#f3cfc4'},
 errorText:{color:C.red,fontSize:12,lineHeight:18,fontWeight:'500'},
 success:{padding:14,borderRadius:13,backgroundColor:'#e8f4d9',marginBottom:14},
 successText:{color:'#466b20',fontSize:12,lineHeight:18,fontWeight:'600'},
 amount:{fontSize:34,fontWeight:'800',letterSpacing:-1.1,color:C.ink},
 tab:{minHeight:48,paddingHorizontal:14,paddingVertical:10,borderRadius:12,backgroundColor:'#eaf0e2',alignItems:'center',justifyContent:'center'},
 tabText:{fontSize:12,color:C.muted,fontWeight:'600'},
 tile:{width:42,height:42,borderRadius:13,backgroundColor:'#eef3e6',alignItems:'center',justifyContent:'center'},
 listRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,minHeight:56,borderBottomWidth:1,borderBottomColor:'#eff3e9'},
 spacer:{height:20}
});
