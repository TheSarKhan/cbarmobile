import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Animated,Easing,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {money} from './api';
import type {Row} from './api';
import {BankMark} from './BanksSection';
import Liveness from './Liveness';
import type {LivenessResult} from './livenessTypes';
import {BackBar,C,ErrorPopup,Icon,ResultArt,S,fmtDate,useApp,useModalHost} from './ui';

type Phase='pick'|'notify'|'bank-request'|'cards'|'terms'|'document'|'sign'|'signed'|'bank-section';
const MONTHS=[1,2,3,6,12];
const LIMITS=[10_000,30_000,50_000,100_000,200_000];

/** Saves the signed PDF: a download in the browser, the share sheet (Save to Files) on a phone. */
async function savePdf(doc:Row){
 if(Platform.OS==='web'){
  const bytes=Uint8Array.from(atob(doc.dataBase64),ch=>ch.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const link=document.createElement('a');
  link.href=url;link.download=doc.filename;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10_000);
  return;
 }
 const file=new File(Paths.cache,doc.filename);
 file.create({overwrite:true});
 file.write(doc.dataBase64,{encoding:'base64'});
 if(await Sharing.isAvailableAsync())await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',UTI:'com.adobe.pdf',dialogTitle:'İcazə sənədini saxla'});
}

/**
 * Open banking the way a customer lives it. Kampus asks a bank; the bank app (simulated here, in its own colours) notifies its
 * customer, lets them pick cards, a period and a monthly limit, shows the consent as a PDF, has it signed with SİMA and lists Kampus
 * among the apps with access. Back in Kampus the shared cards appear and can pay.
 */
export function LinkBankFlow({hidden,close}:{hidden:boolean;close:()=>void}){
 const a=useApp();
 useModalHost(!hidden);
 const [phase,setPhase]=useState<Phase>('pick');
 const [banks,setBanks]=useState<Row[]>([]);
 const [consent,setConsent]=useState<Row|null>(null);
 const [chosen,setChosen]=useState<string[]>([]);
 const [months,setMonths]=useState(3);
 const [limit,setLimit]=useState(50_000);
 const [preview,setPreview]=useState<Row|null>(null);
 const [busy,setBusy]=useState(false);
 const [saved,setSaved]=useState('');
 const taken=new Set<string>((a.data.openBanking?.consents||[]).filter((c:Row)=>c.status==='AUTHORIZED').map((c:Row)=>c.bankId));

 useEffect(()=>{
  a.call('open-banking/banks').then(r=>setBanks(r.banks||[])).catch(e=>a.setError((e as Error).message));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 const bank:Row=consent?{color:consent.bankColor,initials:consent.bankInitials,name:consent.bankName}:{};
 const cards:Row[]=(consent?.offeredCards||[]).filter((c:Row)=>c.type==='CARD');
 const fail=(e:unknown)=>a.setError((e as Error).message);

 async function request(b:Row){
  setBusy(true);
  try{
   const c=await a.call('open-banking/consents',{bankId:b.id});
   setConsent(c);setChosen([]);setPhase('notify');
   await a.refresh();
  }catch(e){fail(e);}
  finally{setBusy(false);}
 }

 async function submitTerms(){
  if(!consent)return;
  setBusy(true);
  try{
   const c=await a.call('open-banking/consents/'+consent.id+'/select',{accountIds:chosen,months,monthlyLimitMinor:limit});
   setConsent(c);
   setPreview(await a.call('open-banking/consents/'+consent.id+'/document'));
   setPhase('document');
  }catch(e){fail(e);}
  finally{setBusy(false);}
 }

 async function sign(result:LivenessResult){
  if(!consent)return;
  setBusy(true);
  try{
   const r=await a.call('open-banking/consents/'+consent.id+'/sign',{selfie:result.selfie,livenessMode:result.mode,livenessActions:result.actions,facesCount:result.facesCount});
   setConsent(r.consent);
   setPreview(await a.call('open-banking/consents/'+consent.id+'/document'));
   await a.refresh();
   setPhase('signed');
  }catch(e){fail(e);setPhase('document');}
  finally{setBusy(false);}
 }

 async function download(){
  if(!preview)return;
  try{await savePdf(preview);setSaved(preview.filename);}catch(e){fail(e);}
 }

 async function abandon(){
  if(consent&&consent.status==='AWAITING_AUTHORIZATION')await a.call('open-banking/consents/'+consent.id+'/revoke',{}).catch(()=>{});
  await a.refresh();
  close();
 }

 function finish(){
  a.refresh().catch(()=>{});
  a.goTo('Cards');
  close();
 }

 return (
  <Modal visible={!hidden} animationType="slide" onRequestClose={abandon}>
   <SafeAreaProvider style={{flex:1}}>
    {phase==='pick'&&(
     <SafeAreaView style={f.white}>
      <ScrollView contentContainerStyle={f.body}>
       <BackBar onBack={close}/>
       <Text style={f.title}>Bank seç</Text>
       <Text style={f.sub}>Bankın tətbiqinə keçid ediləcək. Orada hansı kartları paylaşacağını, müddəti və aylıq limiti özün seçəcəksən.</Text>
       {!banks.length&&<ActivityIndicator color={C.primary} style={{marginVertical:24}}/>}
       {banks.filter(b=>!taken.has(b.id)).map(b=>(
        <Pressable key={b.id} accessibilityRole="button" accessibilityLabel={b.name} disabled={busy} onPress={()=>{void request(b);}} style={({pressed})=>[f.bankRow,pressed&&{opacity:0.7}]}>
         <BankMark bank={b}/>
         <Text style={f.bankName}>{b.name}</Text>
         {busy?<ActivityIndicator color={C.primary}/>:<Icon name="chevron-forward" size={18} color="#8d89a3"/>}
        </Pressable>
       ))}
       {!!banks.length&&banks.every(b=>taken.has(b.id))&&<Text style={S.muted}>Bütün mövcud banklar artıq bağlıdır.</Text>}
      </ScrollView>
     </SafeAreaView>
    )}

    {phase==='notify'&&consent&&<PhoneScreen consent={consent} onOpen={()=>setPhase('bank-request')} onCancel={abandon}/>}

    {phase==='bank-request'&&consent&&(
     <BankShell bank={bank} title="Açıq bankçılıq" onBack={()=>setPhase('notify')}
      footer={<><BankButton bank={bank} title="Davam et" onPress={()=>setPhase('cards')}/><BankButton bank={bank} title="Rədd et" ghost onPress={abandon}/></>}>
      <View style={f.requester}>
       <View style={f.kampusMark}><Text style={f.kampusMarkText}>K.</Text></View>
       <Text style={f.requesterTitle}>Kampus icazə istəyir</Text>
       <Text style={f.sub}>Kampus rəqəmsal cüzdanı kartlarınıza baxmaq və onlardan ödəniş etmək üçün sizdən razılıq istəyir.</Text>
      </View>
      {[['eye-outline','Kart balansı və son 90 günün əməliyyatları'],['swap-horizontal-outline','Sizin təsdiqlədiyiniz ödənişlər və köçürmələr'],['speedometer-outline','Seçdiyiniz aylıq limit daxilində'],['close-circle-outline','İstənilən vaxt bu bölmədən ləğv edə bilərsiniz']].map(([icon,text])=>(
       <View key={text} style={f.bullet}><Icon name={icon as any} size={20} color={bank.color}/><Text style={f.bulletText}>{text}</Text></View>
      ))}
     </BankShell>
    )}

    {phase==='cards'&&consent&&(
     <BankShell bank={bank} title="Kartları seçin" onBack={()=>setPhase('bank-request')}
      footer={<BankButton bank={bank} title="Davam et" disabled={!chosen.length} onPress={()=>setPhase('terms')}/>}>
      <Text style={f.bankLead}>Kampus-a hansı kartlarınıza giriş verirsiniz?</Text>
      {cards.map(c=>{
       const on=chosen.includes(c.id);
       return (
        <Pressable key={c.id} accessibilityRole="checkbox" accessibilityState={{checked:on}} accessibilityLabel={c.name} onPress={()=>setChosen(on?chosen.filter(x=>x!==c.id):[...chosen,c.id])} style={[f.cardPick,on&&{borderColor:bank.color,backgroundColor:'#fbfaff'}]}>
         <View style={[f.miniCard,{backgroundColor:bank.color}]}><Icon name="card" size={18} color="#fff"/></View>
         <View style={{flex:1}}>
          <Text style={f.cardName}>{c.name}</Text>
          <Text style={f.cardMeta}>{c.masked} · {money(c.balanceMinor)}</Text>
         </View>
         <View style={[f.check,on&&{backgroundColor:bank.color,borderColor:bank.color}]}>{on&&<Icon name="checkmark" size={15} color="#fff"/>}</View>
        </Pressable>
       );
      })}
      <Text style={f.hint}>Bir və ya bir neçə kart seçə bilərsiniz.</Text>
     </BankShell>
    )}

    {phase==='terms'&&consent&&(
     <BankShell bank={bank} title="Müddət və limit" onBack={()=>setPhase('cards')}
      footer={<BankButton bank={bank} title={busy?'Hazırlanır…':'Davam et'} disabled={busy} onPress={()=>{void submitTerms();}}/>}>
      <Text style={f.bankLead}>İcazə nə qədər müddətə verilsin?</Text>
      <View style={f.chips}>
       {MONTHS.map(m=>(
        <Pressable key={m} accessibilityRole="button" onPress={()=>setMonths(m)} style={[f.chip,months===m&&{backgroundColor:bank.color,borderColor:bank.color}]}>
         <Text style={[f.chipText,months===m&&{color:'#fff'}]}>{m} ay</Text>
        </Pressable>
       ))}
      </View>
      <Text style={[f.bankLead,{marginTop:22}]}>Aylıq ödəniş limiti</Text>
      <View style={f.chips}>
       {LIMITS.map(l=>(
        <Pressable key={l} accessibilityRole="button" onPress={()=>setLimit(l)} style={[f.chip,limit===l&&{backgroundColor:bank.color,borderColor:bank.color}]}>
         <Text style={[f.chipText,limit===l&&{color:'#fff'}]}>{money(l)}</Text>
        </Pressable>
       ))}
      </View>
      <View style={f.summary}>
       <Text style={f.hint}>Kampus bu kartlardan ayda ən çox {money(limit)} ödəniş edə bilər. İcazə {months} ay sonra avtomatik dayanır.</Text>
      </View>
     </BankShell>
    )}

    {phase==='document'&&consent&&preview&&(
     <BankShell bank={bank} title="İcazə sənədi" onBack={()=>setPhase('terms')}
      footer={<BankButton bank={bank} title="Sənədi imzala" icon="finger-print-outline" onPress={()=>setPhase('sign')}/>}>
      <PaperDoc data={preview.document}/>
     </BankShell>
    )}

    {phase==='sign'&&consent&&(
     <BankShell bank={bank} title="SİMA ilə imza" onBack={busy?undefined:()=>setPhase('document')}>
      <View style={f.simaHead}>
       <View style={f.simaMark}><Icon name="finger-print" size={24} color="#fff"/></View>
       <View style={{flex:1}}>
        <Text style={f.requesterTitle}>SİMA imzası</Text>
        <Text style={f.hint}>Şəxsiyyətinizi üz yoxlaması ilə təsdiqləyin. Yoxlamadan sonra sənəd imzalanacaq.</Text>
       </View>
      </View>
      {busy?(
       <View style={{alignItems:'center',paddingVertical:60}}><ActivityIndicator color={bank.color}/><Text style={[f.hint,{marginTop:12}]}>Sənəd imzalanır…</Text></View>
      ):(
       <Liveness actions={consent.signActions||[]} onDone={r=>{void sign(r);}} onCancel={()=>setPhase('document')}/>
      )}
     </BankShell>
    )}

    {phase==='signed'&&consent&&(
     <SafeAreaView style={f.white}>
      <ScrollView contentContainerStyle={[f.body,{alignItems:'center',paddingTop:40}]}>
       <ResultArt tone="success"/>
       <Text style={f.doneTitle}>Sənəd imzalandı</Text>
       <Text style={[f.sub,{textAlign:'center'}]}>SİMA ilə imzalanmış icazə sənədi hazırdır. Müqavilə № {consent.contractId}.</Text>
       {!!saved&&<Text style={[f.hint,{color:'#2f9e63',marginTop:8}]}>Saxlandı: {saved}</Text>}
      </ScrollView>
      <View style={f.footer}>
       <BankButton bank={bank} title="Sənədi yüklə" icon="download-outline" ghost onPress={()=>{void download();}}/>
       <BankButton bank={bank} title="Davam et" onPress={()=>setPhase('bank-section')}/>
      </View>
     </SafeAreaView>
    )}

    {phase==='bank-section'&&consent&&(
     <BankShell bank={bank} title="Açıq bankçılıq"
      footer={<BankButton bank={bank} title="Kampus-a keç" icon="arrow-forward" onPress={finish}/>}>
      <Text style={f.bankLead}>Hesablarınıza giriş olan tətbiqlər</Text>
      <View style={f.appRow}>
       <View style={f.kampusMark}><Text style={f.kampusMarkText}>K.</Text></View>
       <View style={{flex:1}}>
        <Text style={f.cardName}>Kampus</Text>
        <Text style={f.cardMeta}>{(consent.accountIds||[]).length} kart · {fmtDate(consent.expiresAt)} tarixinədək</Text>
        <Text style={f.cardMeta}>Aylıq limit: {money(consent.monthlyLimitMinor||0)}</Text>
       </View>
       <View style={f.activeBadge}><Text style={f.activeBadgeText}>AKTİV</Text></View>
      </View>
      <Text style={f.hint}>Bu icazəni istənilən vaxt buradan ləğv edə bilərsiniz.</Text>
     </BankShell>
    )}

    {!!a.error&&<ErrorPopup message={a.error} onClose={()=>a.setError('')}/>}
   </SafeAreaProvider>
  </Modal>
 );
}

/** The phone's lock screen where the bank's push notification arrives. */
function PhoneScreen({consent,onOpen,onCancel}:{consent:Row;onOpen:()=>void;onCancel:()=>void}){
 const [slide]=useState(()=>new Animated.Value(-140));
 useEffect(()=>{
  const id=setTimeout(()=>Animated.timing(slide,{toValue:0,duration:420,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start(),900);
  return()=>clearTimeout(id);
 },[slide]);
 const note=consent.notification||{};
 return (
  <LinearGradient colors={['#1b1245','#2a0a8a','#4b2bb0']} style={{flex:1}}>
   <SafeAreaView style={{flex:1}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Ləğv et" onPress={onCancel} hitSlop={12} style={f.phoneCancel}><Icon name="close" size={22} color="rgba(255,255,255,0.8)"/></Pressable>
    <Text style={f.phoneTime}>9:41</Text>
    <Text style={f.phoneDate}>Bankın tətbiqinə keçid edilir…</Text>
    <Animated.View style={[f.banner,{transform:[{translateY:slide}]}]}>
     <Pressable accessibilityRole="button" accessibilityLabel="Bildirişi aç" onPress={onOpen} style={f.bannerInner}>
      <BankMark bank={{color:consent.bankColor,initials:consent.bankInitials}} size={40}/>
      <View style={{flex:1}}>
       <View style={S.between}><Text style={f.bannerTitle}>{note.title||consent.bankName}</Text><Text style={f.bannerNow}>indi</Text></View>
       <Text numberOfLines={3} style={f.bannerBody}>{note.body}</Text>
      </View>
     </Pressable>
    </Animated.View>
   </SafeAreaView>
  </LinearGradient>
 );
}

/** Frame of the simulated bank app: its own colour, its own header, a footer for its action buttons. */
function BankShell({bank,title,onBack,children,footer}:{bank:Row;title:string;onBack?:()=>void;children:React.ReactNode;footer?:React.ReactNode}){
 return (
  <View style={f.white}>
   <SafeAreaView edges={['top']} style={{backgroundColor:bank.color}}>
    <View style={f.bankHeader}>
     {onBack?<Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={onBack} hitSlop={10} style={f.headerBtn}><Icon name="chevron-back" size={24} color="#fff"/></Pressable>:<View style={f.headerBtn}/>}
     <View style={{flex:1,alignItems:'center'}}>
      <Text style={f.headerTitle}>{title}</Text>
      <Text style={f.headerSub}>{bank.name} · mobil bank</Text>
     </View>
     <BankMark bank={{color:'rgba(255,255,255,0.22)',initials:bank.initials}} size={34}/>
    </View>
   </SafeAreaView>
   <ScrollView style={{flex:1}} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
   {!!footer&&<SafeAreaView edges={['bottom']} style={f.footer}>{footer}</SafeAreaView>}
  </View>
 );
}

function BankButton({bank,title,onPress,disabled,ghost,icon}:{bank:Row;title:string;onPress:()=>void;disabled?:boolean;ghost?:boolean;icon?:string}){
 return (
  <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({pressed})=>[f.bankBtn,{backgroundColor:ghost?'#f1eff7':bank.color},(pressed||disabled)&&{opacity:0.55}]}>
   {!!icon&&<Icon name={icon as any} size={19} color={ghost?bank.color:'#fff'}/>}
   <Text style={[f.bankBtnText,ghost&&{color:bank.color}]}>{title}</Text>
  </Pressable>
 );
}

/** The consent as a paper preview: the same content that goes into the PDF. */
function PaperDoc({data}:{data:Row}){
 return (
  <View style={f.paper}>
   <Text style={f.paperRef}>Sənəd № {data.reference}</Text>
   <Text style={f.paperTitle}>{data.title}</Text>
   {[...(data.parties||[]),...(data.terms||[])].map((row:Row)=>(
    <View key={row.label} style={f.paperRow}><Text style={f.paperLabel}>{row.label}</Text><Text style={f.paperValue}>{row.value}</Text></View>
   ))}
   {(data.sections||[]).map((section:Row)=>(
    <View key={section.heading} style={{marginTop:14}}>
     <Text style={f.paperHeading}>{section.heading}</Text>
     {(section.lines||[]).map((line:string)=><Text key={line} style={f.paperLine}>{line}</Text>)}
    </View>
   ))}
   <View style={[f.sigBox,data.signed&&{borderColor:'#2f9e63'}]}>
    {data.signed?(
     <>
      <Text style={[f.paperHeading,{color:'#2f9e63'}]}>SİMA ilə imzalanıb</Text>
      <Text style={f.paperLine}>Müqavilə №: {data.signature?.contractId}</Text>
      <Text style={f.paperLine}>İmza tarixi: {data.signature?.signedAt}</Text>
     </>
    ):<Text style={f.paperLine}>İmza gözlənilir. Sənədi SİMA ilə imzalayın.</Text>}
   </View>
  </View>
 );
}

const f=StyleSheet.create({
 white:{flex:1,backgroundColor:'#fff'},
 body:{padding:20,paddingBottom:24,width:'100%',maxWidth:430,alignSelf:'center'},
 footer:{paddingHorizontal:20,paddingBottom:12,paddingTop:8,gap:10,width:'100%',maxWidth:430,alignSelf:'center',borderTopWidth:1,borderTopColor:'#f0eef6',backgroundColor:'#fff'},
 title:{fontSize:26,fontWeight:'700',color:C.ink,marginTop:10},
 sub:{fontSize:14,lineHeight:21,color:'#5d5a73',marginTop:8,marginBottom:18},
 hint:{fontSize:12,lineHeight:18,color:'#76738a',marginTop:6},
 bankRow:{flexDirection:'row',alignItems:'center',gap:14,borderWidth:1,borderColor:'#ebe8f4',borderRadius:14,padding:14,marginBottom:10},
 bankName:{flex:1,fontSize:15,fontWeight:'700',color:C.ink},
 phoneCancel:{alignSelf:'flex-end',padding:16},
 phoneTime:{fontSize:76,fontWeight:'300',color:'#fff',textAlign:'center',marginTop:40},
 phoneDate:{fontSize:15,color:'rgba(255,255,255,0.75)',textAlign:'center',marginTop:4},
 banner:{position:'absolute',top:170,left:14,right:14},
 bannerInner:{flexDirection:'row',gap:12,backgroundColor:'rgba(255,255,255,0.96)',borderRadius:20,padding:14,shadowColor:'#000',shadowOpacity:0.25,shadowRadius:20,shadowOffset:{width:0,height:10},elevation:10},
 bannerTitle:{fontSize:14,fontWeight:'800',color:C.ink},
 bannerNow:{fontSize:11,color:'#76738a'},
 bannerBody:{fontSize:13,lineHeight:18,color:'#3d3a55',marginTop:3},
 bankHeader:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:14,paddingVertical:10},
 headerBtn:{width:36,height:36,alignItems:'center',justifyContent:'center'},
 headerTitle:{color:'#fff',fontSize:17,fontWeight:'800'},
 headerSub:{color:'rgba(255,255,255,0.8)',fontSize:11,marginTop:1},
 bankBtn:{minHeight:52,borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
 bankBtnText:{color:'#fff',fontSize:15,fontWeight:'700'},
 requester:{alignItems:'center',paddingVertical:10,marginBottom:6},
 kampusMark:{width:56,height:56,borderRadius:16,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'},
 kampusMarkText:{color:'#fff',fontSize:22,fontWeight:'800'},
 requesterTitle:{fontSize:18,fontWeight:'800',color:C.ink,marginTop:10,textAlign:'center'},
 bullet:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#f0eef6'},
 bulletText:{flex:1,fontSize:14,lineHeight:20,color:'#3d3a55'},
 bankLead:{fontSize:16,fontWeight:'700',color:C.ink,marginBottom:12},
 cardPick:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1.5,borderColor:'#ebe8f4',borderRadius:14,padding:14,marginBottom:10},
 miniCard:{width:44,height:30,borderRadius:7,alignItems:'center',justifyContent:'center'},
 cardName:{fontSize:14,fontWeight:'700',color:C.ink},
 cardMeta:{fontSize:12,color:'#76738a',marginTop:2},
 check:{width:24,height:24,borderRadius:12,borderWidth:1.5,borderColor:'#cfc9e2',alignItems:'center',justifyContent:'center'},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:8},
 chip:{minHeight:44,paddingHorizontal:16,borderRadius:12,borderWidth:1.5,borderColor:'#dedaeb',alignItems:'center',justifyContent:'center'},
 chipText:{fontSize:14,fontWeight:'700',color:C.ink},
 summary:{backgroundColor:'#f6f3ff',borderRadius:12,padding:14,marginTop:22},
 paper:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e5e2ee',borderRadius:6,padding:18,shadowColor:'#000',shadowOpacity:0.08,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:3},
 paperRef:{fontSize:10,color:'#8d89a3'},
 paperTitle:{fontSize:16,fontWeight:'800',color:C.deep,marginTop:4,marginBottom:12,lineHeight:22},
 paperRow:{borderBottomWidth:1,borderBottomColor:'#eeecf5',paddingVertical:7},
 paperLabel:{fontSize:10,color:'#8d89a3'},
 paperValue:{fontSize:12,fontWeight:'700',color:C.ink,marginTop:2,lineHeight:17},
 paperHeading:{fontSize:12,fontWeight:'800',color:C.ink,marginBottom:4},
 paperLine:{fontSize:11,lineHeight:17,color:'#3d3a55',marginBottom:3},
 sigBox:{marginTop:18,borderWidth:1,borderColor:'#cfcad9',borderStyle:'dashed',borderRadius:8,padding:12},
 simaHead:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:14},
 simaMark:{width:48,height:48,borderRadius:14,backgroundColor:'#0f766e',alignItems:'center',justifyContent:'center'},
 doneTitle:{fontSize:22,fontWeight:'800',color:C.ink,marginTop:14,marginBottom:6},
 appRow:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:'#ebe8f4',borderRadius:14,padding:14,marginBottom:12},
 activeBadge:{backgroundColor:'#dcf3e4',borderRadius:8,paddingHorizontal:8,paddingVertical:4},
 activeBadgeText:{color:'#2f9e63',fontSize:10,fontWeight:'800'}
});
