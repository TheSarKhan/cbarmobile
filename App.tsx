import React,{useState,useEffect,useRef,useCallback} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,Platform,RefreshControl,AppState,ActivityIndicator,useWindowDimensions,Animated,Easing,BackHandler,TextInput} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {NavigationContainer,useFocusEffect,useIsFocused,useNavigation} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {LinearGradient} from 'expo-linear-gradient';
import {CameraView,useCameraPermissions} from 'expo-camera';
import {C,S,Avatar,BackBar,fmtDate,AppContextType,Context,useApp,statusLabel,statusTone,Icon,Button,Field,Check,Badge,Box,Empty,Sheet,Tx,EXPENSE_CATEGORIES} from './src/ui';
import {Operations} from './src/OperationsSheet';
import AuthFlow from './src/AuthFlow';
import Onboarding from './src/Onboarding';
import PinPad from './src/PinPad';
import Liveness from './src/Liveness';
import type {LivenessResult} from './src/livenessTypes';
import {DEFAULT_API,storage,request,ApiError,minor,money,Row,hashPhones,CONNECTION_ERROR_MESSAGE} from './src/api';

const Tab=createBottomTabNavigator();

function Page({children,title,back}:{children:React.ReactNode;title?:string;back?:boolean}){
 const a=useApp();
 const nav=useNavigation<any>();
 return (
  <SafeAreaView style={S.page} edges={['top']}>
   <ScrollView
    contentContainerStyle={S.content}
    refreshControl={<RefreshControl refreshing={false} onRefresh={a.refresh} tintColor={C.primary}/>}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
   >
    {back&&<BackBar onBack={()=>nav.goBack()}/>}
    {!!title&&<Text style={styles.pageTitle}>{title}</Text>}
    {children}
   </ScrollView>
  </SafeAreaView>
 );
}

/** People the person sent money to most recently, then saved recipients, then the demo friends. */
function recentPeople(d:Row):{name:string;phone:string}[]{
 const out:{name:string;phone:string}[]=[];
 const seen=new Set<string>();
 const add=(name:string,phone:string)=>{
  if(!name||!phone||phone===d.user?.phone||seen.has(phone))return;
  seen.add(phone);out.push({name,phone});
 };
 (d.trustedBeneficiaries||[]).forEach((t:Row)=>add(t.nickname||t.maskedName,t.phone));
 [['Murad','+994501000002'],['Leyla','+994501000003'],['Kamran','+994501000004']].forEach(([n,p])=>add(n,p));
 return out.slice(0,8);
}

function Home({navigation}:any){
 const a=useApp(),d=a.data;
 const [hide,setHide]=useState(false);
 const focused=useIsFocused();
 const balMinor=d.wallet?.availableBalanceMinor||0;
 const whole=Math.floor(balMinor/100).toLocaleString('en-US').replace(/,/g,' ');
 const frac=String(Math.abs(balMinor%100)).padStart(2,'0');
 const firstName=String(d.user?.name||'').split(' ')[0];
 const people=recentPeople(d);
 const recent:Row[]=(d.transactions||[]).slice(0,5);

 return (
  <View style={styles.homeRoot}>
   <SafeAreaView edges={['top']} style={{backgroundColor:C.deep}}>
    {focused&&<StatusBar style="light"/>}
   </SafeAreaView>
   <ScrollView
    style={{flex:1}}
    contentContainerStyle={{paddingBottom:24}}
    refreshControl={<RefreshControl refreshing={false} onRefresh={a.refresh} tintColor="#fff"/>}
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
   >
    <View style={styles.homeHeader}>
     <View style={styles.homeTop}>
      <Avatar name={d.user?.name||'K'} size={46} dark/>
      <Text style={styles.hello}>Salam,{'\n'}{firstName||'dost'}!</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Profil və ayarlar" onPress={()=>navigation.navigate('Profile')} style={styles.gear}>
       <Icon name="settings-outline" size={22} color="#fff"/>
      </Pressable>
     </View>

     <View style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>Əsas balans</Text>
      <View style={styles.balanceRow}>
       {hide?(
        <Text style={styles.balanceWhole}>•••••</Text>
       ):(
        <Text style={styles.balanceWhole}>{whole}<Text style={styles.balanceFrac}>.{frac} ₼</Text></Text>
       )}
       <Pressable accessibilityRole="button" accessibilityLabel={hide?'Balansı göstər':'Balansı gizlət'} onPress={()=>setHide(!hide)} hitSlop={12} style={{marginLeft:10}}>
        <Icon name={hide?'eye-outline':'eye-off-outline'} color="rgba(255,255,255,0.7)" size={20}/>
       </Pressable>
      </View>
      {d.wallet?.heldAmountMinor>0&&(
       <Text style={styles.heldText}>{money(d.wallet.heldAmountMinor)} əməliyyat üçün rezerv edilib</Text>
      )}
      <View style={styles.actionRow}>
       {[['Artır','arrow-up','add'],['Çıxar','arrow-down','card-transfer'],['Köçür','swap-horizontal','send']].map(([label,icon,sheet],i)=>(
        <React.Fragment key={sheet}>
         {i>0&&<View style={styles.actionDivider}/>}
         <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={()=>a.open(sheet)} style={styles.action}>
          <Icon name={icon as any} size={20} color="#fff"/>
          <Text style={styles.actionText}>{label}</Text>
         </Pressable>
        </React.Fragment>
       ))}
      </View>
     </View>
    </View>

    <View style={styles.homeBody}>
     <Text style={styles.sectionTitle}>Son köçürmələr</Text>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:16,paddingRight:12}} style={{marginTop:14}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Yeni köçürmə" onPress={()=>a.open('send')} style={styles.person}>
       <View style={styles.addCircle}><Icon name="add" size={28} color={C.primary}/></View>
       <Text style={styles.personName}>Əlavə et</Text>
      </Pressable>
      {people.map(p=>(
       <Pressable key={p.phone} accessibilityRole="button" accessibilityLabel={p.name+' adlı şəxsə köçür'} onPress={()=>a.open('send:'+p.phone)} style={styles.person}>
        <Avatar name={p.name} size={60}/>
        <Text numberOfLines={1} style={styles.personName}>{p.name.split(' ')[0]}</Text>
       </Pressable>
      ))}
     </ScrollView>

     <View style={[S.between,{marginTop:26}]}>
      <Text style={styles.sectionTitle}>Son əməliyyatlar</Text>
      <Pressable accessibilityRole="button" onPress={()=>navigation.navigate('History')} hitSlop={10}>
       <Text style={styles.viewAll}>Hamısına bax</Text>
      </Pressable>
     </View>
     <View style={{marginTop:6}}>
      {recent.map((t:Row)=><Tx key={t.id} t={t} onPress={()=>a.open('tx-detail:'+t.id)}/>)}
      {!recent.length&&<Empty text="Əməliyyatların burada görünəcək." icon="receipt-outline"/>}
     </View>
    </View>
   </ScrollView>
  </View>
 );
}

function Payments(){
 const a=useApp(),d=a.data;
 const [matched,setMatched]=useState<Row[]|null>(null);
 return (
  <Page back>
   <Text style={styles.profileTitle}>Ödənişlərim</Text>
   <Text style={[S.muted,{marginTop:8,marginBottom:20}]}>
    Pul göndər, bank kartına çıxar, hesabı dostlarla böl və ya pul istə.
   </Text>

   <View style={{flexDirection:'row',gap:10}}>
    <View style={{flex:1}}><Button title="Pul göndər" icon="arrow-up" onPress={()=>a.open('send')}/></View>
    <View style={{flex:1}}><Button title="Pul istə" secondary icon="arrow-down" onPress={()=>a.open('request')}/></View>
   </View>
   <View style={{flexDirection:'row',gap:10}}>
    <View style={{flex:1}}><Button title="Karta köçür" secondary icon="card-outline" onPress={()=>a.open('card-transfer')}/></View>
    <View style={{flex:1}}><Button title="Hesabı böl" secondary icon="people-outline" onPress={()=>a.open('split')}/></View>
   </View>

   {d.trustedBeneficiaries?.length>0&&(
    <>
     <View style={S.section}><Text style={S.h3}>Etibarlı alıcılar</Text><Badge text="SCA İSTİSNASI" tone="success"/></View>
     <Box style={{paddingVertical:6}}>
      {d.trustedBeneficiaries.map((tb:Row)=>(
       <View key={tb.id} style={S.listRow}>
        <Pressable accessibilityRole="button" style={[S.row,{flex:1,minHeight:48}]} onPress={()=>a.open('send:'+tb.phone)}>
         <View style={S.avatar}><Text style={S.avatarText}>{(tb.nickname||tb.maskedName||'K')[0]}</Text></View>
         <View style={{flex:1}}>
          <Text style={{color:C.ink,fontSize:13,fontWeight:'700'}}>{tb.nickname||tb.maskedName}</Text>
          <Text style={[S.muted,{fontSize:11}]}>{tb.phone} · Etibarlı siyahıda</Text>
         </View>
        </Pressable>
        <Pressable
         accessibilityRole="button"
         accessibilityLabel="Etibarlı alıcını sil"
         onPress={()=>a.act('trusted-beneficiaries/'+tb.id+'/delete',{}).catch(()=>{})}
         style={styles.iconHitTarget}
        >
         <Icon name="trash-outline" size={18} color={C.red}/>
        </Pressable>
       </View>
      ))}
     </Box>
    </>
   )}

   <View style={S.section}>
    <Text style={S.h3}>Kampus dostların</Text>
    <Pressable
     accessibilityRole="button"
     style={{minHeight:40,justifyContent:'center',paddingHorizontal:4}}
     onPress={()=>hashPhones(['+994501000001','+994501000002','+994501000003','+994501000004']).then(phoneHashes=>a.act('contacts/match',{phoneHashes})).then(r=>setMatched(r.matches)).catch(()=>{})}
    >
     <Text style={S.link}>Dostları tap ↗</Text>
    </Pressable>
   </View>
   <Box style={{paddingVertical:6}}>
    {(matched||[['M','Murad Əliyev','+994501000002',''],['L','Leyla Həsənova','+994501000003',''],['K','Kamran Quliyev','+994501000004','']].filter(x=>x[2]!==d.user?.phone).map(([initial,name,phone,hash])=>({maskedName:name,phone,phoneHash:hash,initial}))).map((c:any)=>(
     <Pressable key={c.phone} accessibilityRole="button" style={S.listRow} onPress={()=>a.open('send:'+c.phone)}>
      <View style={S.avatar}><Text style={S.avatarText}>{c.initial||(c.maskedName||'K')[0]}</Text></View>
      <View style={{flex:1}}>
       <Text style={{color:C.ink,fontSize:13,fontWeight:'700'}}>{c.maskedName}</Text>
       <Text style={[S.muted,{fontSize:11}]}>{c.phone}</Text>
      </View>
      <Icon name="arrow-up" size={18} color={C.muted}/>
     </Pressable>
    ))}
   </Box>

   {d.cardTransfers?.length>0&&(
    <>
     <View style={S.section}><Text style={S.h3}>Kart çıxarışları</Text></View>
     {d.cardTransfers.slice(0,4).map((t:Row)=>(
      <Box key={t.id}>
       <View style={S.between}>
        <View style={{flex:1}}>
         <Text style={S.h3}>{t.bankName} · •••• {t.last4}</Text>
         <Text style={[S.muted,{marginTop:2}]}>
          {({HELD:'Rezerv edilib',SENT:'Göndərilir',COMPLETED:'Çatdı',FAILED:'Alınmadı · rezerv açıldı',UNDER_REVIEW:'Şəbəkə cavabı gözlənilir'} as any)[t.status]||t.status}
         </Text>
        </View>
        <View style={{alignItems:'flex-end'}}>
         <Text style={{color:C.ink,fontWeight:'800',fontSize:14}}>{money(t.amountMinor)}</Text>
         <View style={{marginTop:4}}>
          <Badge text={statusLabel[t.status]||t.status} tone={statusTone(t.status)}/>
         </View>
        </View>
       </View>
      </Box>
     ))}
    </>
   )}

   {d.splits?.length>0&&(
    <>
     <View style={S.section}><Text style={S.h3}>Bölünmüş hesablar</Text></View>
     {d.splits.map((split:Row)=>(
      <Pressable key={split.id} accessibilityRole="button" onPress={()=>a.open('split-view:'+split.id)}>
       <Box>
        <View style={S.between}>
         <Text style={S.h3}>{split.note||'Ortaq hesab'}</Text>
         <Text style={S.h3}>{money(split.totalMinor)}</Text>
        </View>
        <Text style={[S.muted,{marginTop:4}]}>
         {split.participantCount} iştirakçı · {split.mode==='CUSTOM'?'Xüsusi məbləğ':'Bərabər bölgü'} · İrəliləyişə bax →
        </Text>
       </Box>
      </Pressable>
     ))}
    </>
   )}

   <View style={S.section}><Text style={S.h3}>Gələn sorğular</Text></View>
   <Box>
    {d.requests?.filter((r:Row)=>r.status==='OPEN').map((r:Row)=>(
     <View key={r.id} style={{marginBottom:16}}>
      <View style={[S.between,{marginBottom:12}]}>
       <View style={{flex:1}}>
        <Text style={{fontWeight:'700',fontSize:13,color:C.ink}}>{r.requesterName}</Text>
        <Text style={S.muted}>{r.note}</Text>
       </View>
       <Text style={S.h3}>{money(r.amountMinor)}</Text>
      </View>
      <View style={{flexDirection:'row',gap:10}}>
       <View style={{flex:1}}>
        <Button
         disabled={a.busy}
         title="Ödə"
         onPress={()=>a.act('payment-requests/'+r.id+'/pay',{amountMinor:r.amountMinor,recipientName:r.requesterName}).catch(()=>{})}
        />
       </View>
       <View style={{flex:1}}>
        <Button
         disabled={a.busy}
         title="İmtina et"
         secondary
         onPress={()=>a.act('payment-requests/'+r.id+'/decline',{}).catch(()=>{})}
        />
       </View>
      </View>
     </View>
    ))}
    {!d.requests?.some((r:Row)=>r.status==='OPEN')&&<Empty text="Hazırda gələn pul sorğusu yoxdur." icon="mail-open-outline"/>}
   </Box>

   <View style={S.section}><Text style={S.h3}>Köçürmələrin</Text></View>
   <Box style={{paddingVertical:6}}>
    {d.transfers?.slice(0,8).map((t:Row)=>(
     <View style={S.listRow} key={t.id}>
      <View style={S.tile}><Icon name="arrow-up" size={18}/></View>
      <View style={{flex:1}}>
       <Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>{t.recipientName}</Text>
       <Text style={[S.muted,{fontSize:11}]}>{statusLabel[t.status]||t.status}{t.trustedBeneficiary?' · Etibarlı':''}</Text>
      </View>
      <Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>{money(t.amountMinor)}</Text>
      {t.status==='SCHEDULED'&&(
       <Pressable
        accessibilityRole="button"
        style={styles.cancelInlineBtn}
        onPress={()=>a.act('transfers/'+t.id+'/cancel',{}).catch(()=>{})}
       >
        <Text style={{color:C.red,fontSize:11,fontWeight:'700'}}>Ləğv et</Text>
       </Pressable>
      )}
     </View>
    ))}
    {!d.transfers?.length&&<Empty text="Köçürmələrin burada görünəcək."/>}
   </Box>
  </Page>
 );
}

function QrTab(){
 const a=useApp();
 const nav=useNavigation<any>();
 const [payload,setPayload]=useState(''),
  [qr,setQr]=useState<Row|null>(null),
  [qrPaid,setQrPaid]=useState<Row|null>(null),
  [camera,setCamera]=useState(true),
  [torch,setTorch]=useState(false),
  [manualOpen,setManualOpen]=useState(false),
  [permission,askPermission]=useCameraPermissions(),
  [funding,setFunding]=useState('WALLET'),
  [amount,setAmount]=useState('15'),
  [risk,setRisk]=useState(false);

 const [enterAnim]=useState(()=>new Animated.Value(0));

 useFocusEffect(useCallback(()=>{
  setCamera(true);
  enterAnim.setValue(0);
  Animated.timing(enterAnim,{
   toValue:1,
   duration:220,
   easing:Easing.out(Easing.cubic),
   useNativeDriver:true
  }).start();

  if(!permission?.granted){
   askPermission().catch(()=>{});
  }
  return ()=>enterAnim.stopAnimation();
 },[enterAnim,permission?.granted,askPermission]));

 async function run(fn:()=>Promise<any>){
  a.setError('');
  try{await fn();}catch(e){a.setError((e as Error).message);}
 }

 if(qrPaid){
  return (
   <Page>
    <Box style={{alignItems:'center',paddingVertical:26}}>
     <View style={[S.tile,{width:68,height:68,borderRadius:24,backgroundColor:C.lime,marginBottom:16}]}>
      <Icon name="checkmark" size={32}/>
     </View>
     <Badge text="QR ÖDƏNİŞ TAMAMLANDI" tone="success"/>
     <Text style={[S.h2,{marginTop:12}]}>{qrPaid.merchantName}</Text>
     <Text style={[S.amount,{marginVertical:14}]}>{money(qrPaid.amountMinor)}</Text>
     <Text style={[S.muted,{marginBottom:22,textAlign:'center'}]}>
      Ödəniş uğurla icra edildi və əməliyyat tarixçəsinə əlavə olundu.
     </Text>
     <View style={{width:'100%'}}>
      <Button title="Bu hesabı dostlarla böl" icon="people-outline" onPress={()=>{setQrPaid(null);a.open('split');}}/>
      <Button title="Yeni QR skan et" secondary onPress={()=>{setQrPaid(null);setQr(null);setPayload('');setCamera(true);}}/>
     </View>
    </Box>
   </Page>
  );
 }

 if(qr){
  const effectiveMinor=qr.amountMinor||minor(amount||'0');
  return (
   <Page>
    <Box>
     <View style={{alignItems:'center',marginBottom:20}}>
      <View style={[S.tile,{width:64,height:64,borderRadius:22,marginBottom:12,backgroundColor:C.lime}]}>
       <Icon name="cafe-outline" size={30}/>
      </View>
      <Badge text="EMVCo · KASSA QR"/>
      <Text style={[S.h2,{marginTop:10}]}>{qr.merchantName}</Text>
      {qr.amountMinor>0&&<Text style={[S.amount,{marginTop:10}]}>{money(qr.amountMinor)}</Text>}
     </View>

     {qr.amountMinor===0&&<Field label="Məbləğ · AZN" value={amount} onChange={setAmount} numeric/>}

     <Text style={S.label}>Ödəniş mənbəyi</Text>
     <View style={{flexDirection:'row',gap:8,marginBottom:16,flexWrap:'wrap'}}>
      {[['WALLET','Balans'],['BNPL','Sonra ödə'],...(a.data.cryptoEnabled?[['CRYPTO','USDT · Pilot']]:[])].map(([id,label])=>(
       <Pressable
        key={id}
        accessibilityRole="button"
        onPress={()=>setFunding(id)}
        style={[S.tab,funding===id&&{backgroundColor:C.lime,borderColor:C.ink}]}
       >
        <Text style={[S.tabText,funding===id&&{color:C.ink,fontWeight:'700'}]}>{label}</Text>
       </Pressable>
      ))}
     </View>

     <Box style={{backgroundColor:'#ede9f8',borderColor:'#c1b6e2'}}>
      <View style={[S.between,{marginBottom:6}]}>
       <Text style={S.muted}>Satıcı</Text>
       <Text style={S.h3}>{qr.merchantName}</Text>
      </View>
      <View style={[S.between,{marginBottom:6}]}>
       <Text style={S.muted}>Komissiya</Text>
       <Text style={S.h3}>0.00 ₼</Text>
      </View>
      <View style={S.between}>
       <Text style={S.muted}>Yekun ödəniş</Text>
       <Text style={S.h3}>{money(effectiveMinor)}</Text>
      </View>
     </Box>

     {funding==='BNPL'&&(
      <Text style={[S.muted,{marginBottom:16}]}>
       30 günə qaytar · faiz və komissiya 0% · mövcud limit {money(a.data.bnplAvailableMinor)}
      </Text>
     )}
     {funding==='CRYPTO'&&(
      <Check
       value={risk}
       onChange={setRisk}
       text="Demo kripto risk xəbərdarlığını qəbul edirəm. USDT satılır, satıcı AZN alır."
      />
     )}

     {a.error?<View style={S.error}><Text style={S.errorText}>{a.error}</Text></View>:null}

     <Button
      title="Ödənişi təsdiqlə"
      disabled={a.busy||(funding==='CRYPTO'&&!risk)}
      onPress={()=>run(async()=>{
       const paid=await a.act('payments/qr',{
        qrPayload:qr.qrPayload,
        amountMinor:effectiveMinor,
        fundingSource:funding,
        ...(funding==='CRYPTO'?{riskAccepted:risk}:{})
       });
       setQrPaid(paid);
      })}
     />
     <Button title="Başqa QR skan et" secondary onPress={()=>{setQr(null);setCamera(true);}}/>
    </Box>
   </Page>
  );
 }

 return (
  <Animated.View style={[styles.fullScanner,{opacity:enterAnim}]}>
   {camera&&permission?.granted?(
    <CameraView
     style={StyleSheet.absoluteFill}
     enableTorch={torch}
     barcodeScannerSettings={{barcodeTypes:['qr']}}
     onBarcodeScanned={async({data})=>{
      setCamera(false);
      setPayload(data);
      await run(async()=>setQr(await a.act('payments/qr/parse',{qrPayload:data})));
     }}
    />
   ):(
    <LinearGradient colors={['#120a33','#2a0a8a','#120a33']} style={StyleSheet.absoluteFill}/>
   )}

   <View style={styles.fullScannerTop}>
    <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={()=>nav.navigate('Home')} style={styles.backPill}>
     <Icon name="chevron-back" size={22} color="white"/>
    </Pressable>
    <Pressable
     accessibilityRole="button"
     accessibilityLabel="Fənər"
     onPress={()=>setTorch(!torch)}
     style={[styles.torchBtn,torch&&{backgroundColor:C.lime}]}
    >
     <Icon name={torch?'flash':'flash-outline'} size={20} color={torch?C.ink:'white'}/>
    </Pressable>
    <Pressable
     accessibilityRole="button"
     accessibilityLabel="QR mətni daxil et"
     onPress={()=>setManualOpen(true)}
     style={styles.torchBtn}
    >
     <Icon name="keypad-outline" size={20} color="white"/>
    </Pressable>
   </View>

   <View style={styles.reticleBox}>
    <View style={[styles.corner,styles.cornerTL]}/>
    <View style={[styles.corner,styles.cornerTR]}/>
    <View style={[styles.corner,styles.cornerBL]}/>
    <View style={[styles.corner,styles.cornerBR]}/>
   </View>

   <View style={{height:48}}>
    {!permission?.granted&&(
     <Pressable
      accessibilityRole="button"
      accessibilityLabel="Kameranı aktivləşdir"
      onPress={()=>askPermission().then(r=>{if(r.granted)setCamera(true);}).catch(()=>{})}
      style={styles.torchBtn}
     >
      <Icon name="camera-outline" size={20} color="white"/>
     </Pressable>
    )}
   </View>

   <Sheet title="QR kodu daxil et" visible={manualOpen} onClose={()=>setManualOpen(false)}>
    {a.error?<View style={S.error}><Text style={S.errorText}>{a.error}</Text></View>:null}
    <Field label="Kassadakı QR mətni" value={payload} onChange={setPayload} multiline placeholder="000201010212..."/>
    <Button
     title="QR kodu yoxla"
     disabled={a.busy||!payload}
     onPress={()=>run(async()=>{
      const parsed=await a.act('payments/qr/parse',{qrPayload:payload});
      setManualOpen(false);
      setQr(parsed);
     })}
    />
   </Sheet>
  </Animated.View>
 );
}

type CardLook={bg:string;text:string;sub:string;ring:string;blob:string};
const LOOKS:CardLook[]=[
 {bg:'#2a0a8a',text:'#fff',sub:'rgba(255,255,255,0.72)',ring:'#ffc42b',blob:'#4a2bb5'},
 {bg:'#7447e8',text:'#fff',sub:'rgba(255,255,255,0.78)',ring:'#ffd96a',blob:'#8a63ee'},
 {bg:'#e5dcff',text:'#1b1838',sub:'#5b5878',ring:'#bfa9ff',blob:'#d3c6fb'}
];

/** One card of the design: name and number on top, balance and a contactless mark at the bottom. */
function WalletCard({name,last4,label,value,look,compact=false}:{name:string;last4:string;label:string;value?:string;look:CardLook;compact?:boolean}){
 return (
  <View style={[styles.walletCard,{backgroundColor:look.bg},compact&&{height:150}]}>
   <View style={[styles.cardCircle,{borderColor:look.ring,opacity:0.0}]}/>
   <View style={[styles.cardBlob,{backgroundColor:look.blob}]}/>
   <View style={[styles.cardRing,{borderColor:look.ring}]}/>
   <View style={S.between}>
    <Text numberOfLines={1} style={[styles.cardName,{color:look.text,flex:1}]}>{name}</Text>
    <Text style={[styles.cardName,{color:look.text}]}>**** {last4}</Text>
   </View>
   {value!==undefined&&(
    <View style={styles.cardBottom}>
     <View>
      <Text style={[styles.cardLabel,{color:look.sub}]}>{label}</Text>
      <Text style={[styles.cardValue,{color:look.text}]}>{value}</Text>
     </View>
     <Icon name="wifi" size={22} color={look.text} />
    </View>
   )}
  </View>
 );
}

function CardsTab({navigation}:any){
 const a=useApp(),d=a.data;
 const [picked,setPicked]=useState<string|null>(null);
 const owner=d.user?.name||'Kampus';
 const walletLast4=String(d.user?.phone||'0000').slice(-4);
 const cards:Row[]=d.cards||[];
 const items=[
  ...cards.map((c:Row,i:number)=>({id:String(c.id),virtual:true,name:c.name||owner,last4:String(c.last4||'0000'),look:LOOKS[1+(i%2)],value:c.monthlyLimitMinor>0?money(Math.max(0,c.monthlyLimitMinor-(c.spentMinor||0))):'Limitsiz',label:c.monthlyLimitMinor>0?'Qalan limit':'Virtual kart'})),
  {id:'wallet',virtual:false,name:owner,last4:walletLast4,look:LOOKS[0],value:money(d.wallet?.availableBalanceMinor||0),label:'Balans'}
 ];
 const chosen=items.find(x=>x.id===picked);

 if(chosen){
  return (
   <Page back>
    <View style={{height:12}}/>
    <WalletCard name={chosen.name} last4={chosen.last4} label={chosen.label} value={chosen.value} look={chosen.look}/>
    <View style={styles.payHint}>
     <Icon name="qr-code-outline" size={30} color="#9b98ad"/>
     <Text style={styles.payHintText}>Ödəniş üçün kassadakı QR kodu skan et</Text>
    </View>
    {chosen.virtual&&<Button title="Kartı idarə et" secondary icon="options-outline" onPress={()=>a.open('cards-hub')}/>}
    <Button title="QR ilə ödə" icon="qr-code-outline" onPress={()=>{setPicked(null);navigation.navigate('QR');}}/>
    <Button title="Geri" secondary onPress={()=>setPicked(null)}/>
   </Page>
  );
 }

 return (
  <Page>
   <View style={[S.between,{marginBottom:18}]}>
    <Text style={[styles.pageTitle,{marginBottom:0}]}>Kartlarım</Text>
    <Pressable accessibilityRole="button" onPress={()=>a.open('new-card')} hitSlop={10}>
     <Text style={styles.addCard}>Kart əlavə et  +</Text>
    </Pressable>
   </View>
   <View style={{paddingBottom:30}}>
    {items.map((c,i)=>{
     const last=i===items.length-1;
     return (
      <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={c.name+' kartı'} onPress={()=>setPicked(c.id)} style={[!last&&{height:48},last&&{height:200}]}>
       <WalletCard name={c.name} last4={c.last4} label={c.label} value={last?c.value:undefined} look={c.look}/>
      </Pressable>
     );
    })}
   </View>
   {!cards.length&&(
    <Box style={{alignItems:'center',paddingVertical:20}}>
     <Text style={[S.muted,{textAlign:'center',marginBottom:12}]}>Virtual kartın hələ yoxdur. İnternet ödənişləri üçün limitli kart yarat.</Text>
     <Button title="Virtual kart yarat" icon="add" onPress={()=>a.open('new-card')}/>
    </Box>
   )}
  </Page>
 );
}

function MoreRow({icon,tint,color,label,sub,onPress,last}:{icon:any;tint:string;color:string;label:string;sub?:string;onPress:()=>void;last?:boolean}){
 return (
  <Pressable accessibilityRole="button" onPress={onPress} style={[styles.moreRow,last&&{borderBottomWidth:0}]}>
   <View style={[styles.moreIcon,{backgroundColor:tint}]}><Icon name={icon} size={19} color={color}/></View>
   <View style={{flex:1}}>
    <Text style={styles.moreLabel}>{label}</Text>
    {!!sub&&<Text style={styles.moreSub}>{sub}</Text>}
   </View>
   <Icon name="chevron-forward" size={17} color="#8d89a3"/>
  </Pressable>
 );
}

function MoreTab({navigation}:any){
 const a=useApp(),d=a.data;
 const unread=(d.notifications||[]).filter((n:Row)=>!n.read).length;
 const banks=(d.openBanking?.consents||[]).filter((c:Row)=>c.status==='AUTHORIZED').length;
 const P={tint:'#ece6ff',color:'#5632c0'},G={tint:'#dcf3e4',color:'#2f9e63'},R={tint:'#fde3e3',color:'#d04b4b'},B={tint:'#dde9ff',color:'#2b66d9'},Y={tint:'#fff1c9',color:'#a06d00'};
 return (
  <Page title="Daha çox">
   <View style={styles.moreGroup}>
    <MoreRow {...P} icon="swap-horizontal" label="Pul köçür" onPress={()=>a.open('send')}/>
    <MoreRow {...B} icon="arrow-down" label="Pul istə" onPress={()=>a.open('request')}/>
    <MoreRow {...G} icon="arrow-up" label="Balansı artır" onPress={()=>a.open('add')}/>
    <MoreRow {...R} icon="card-outline" label="Karta çıxar" onPress={()=>a.open('card-transfer')}/>
    <MoreRow {...P} icon="people-outline" label="Hesabı böl" onPress={()=>a.open('split')}/>
    <MoreRow {...Y} icon="receipt-outline" label="Ödənişlərim" sub="Etibarlı alıcılar, sorğular, bölünmüş hesablar" onPress={()=>navigation.navigate('Payments')} last/>
   </View>
   <View style={styles.moreGroup}>
    <MoreRow {...P} icon="pie-chart-outline" label="Analitika və büdcə" onPress={()=>navigation.navigate('History',{budget:true})}/>
    <MoreRow {...B} icon="business-outline" label="Digər banklar" sub={banks>0?`${banks} bank bağlı · ${money(d.openBanking?.totalBalanceMinor||0)}`:'Kartlarını və xərclərini bir yerdə izlə'} onPress={()=>a.open('banks-hub')}/>
    <MoreRow {...G} icon="school-outline" label="Sonra ödə və kredit" sub={`0% BNPL · ${money(d.bnplAvailableMinor)}`} onPress={()=>a.open('credit-hub')}/>
    <MoreRow {...P} icon="card-outline" label="Virtual kartlar" sub={`${d.cards?.length||0} aktiv`} onPress={()=>a.open('cards-hub')}/>
    <MoreRow {...Y} icon="diamond-outline" label="Kripto cüzdanı (Pilot)" onPress={()=>a.open('crypto-hub')}/>
    <MoreRow {...B} icon="qr-code-outline" label="Mənim QR kodum" onPress={()=>a.open('my-qr')} last/>
   </View>
   <View style={styles.moreGroup}>
    <MoreRow {...P} icon="notifications-outline" label="Bildirişlər" sub={unread>0?`${unread} yeni`:undefined} onPress={()=>a.open('notifications')}/>
    <MoreRow {...Y} icon="help-circle-outline" label="Kömək" onPress={()=>a.open('help')}/>
    <MoreRow {...G} icon="headset-outline" label="Bizimlə əlaqə" onPress={()=>a.open('contact')}/>
    <MoreRow {...P} icon="information-circle-outline" label="Haqqında" onPress={()=>a.open('about')} last/>
   </View>
   <Pressable accessibilityRole="button" onPress={a.logout} style={styles.logout}>
    <Icon name="log-out-outline" size={19} color={C.red}/>
    <Text style={styles.logoutText}>Hesabdan çıx</Text>
   </Pressable>
  </Page>
 );
}

function HistoryTab({route}:any){
 const a=useApp(),d=a.data;
 const [budCat,setBudCat]=useState('Yemək'),
  [budLimit,setBudLimit]=useState('50'),
  [filterCat,setFilterCat]=useState('Hamısı'),
  [source,setSource]=useState('Hamısı'),
  [query,setQuery]=useState(''),
  [filters,setFilters]=useState(false),
  [budgets,setBudgets]=useState(false);

 useEffect(()=>{if(route?.params?.budget)setBudgets(true);},[route?.params?.budget]);

 const kampusTx:Row[]=d.transactions||[];
 const bankTx:Row[]=a.external||[];
 const bankNames=Array.from(new Set(bankTx.map(t=>String(t.bankName))));
 const bySource=source==='Hamısı'?[...kampusTx,...bankTx]:source==='Kampus'?kampusTx:bankTx.filter(t=>t.bankName===source);
 const allTx:Row[]=bySource.slice().sort((x,y)=>String(y.createdAt).localeCompare(String(x.createdAt)));
 const needle=query.trim().toLowerCase();
 const filteredTx=allTx
  .filter(t=>filterCat==='Hamısı'||t.category===filterCat)
  .filter(t=>!needle||String(t.name).toLowerCase().includes(needle)||String(t.category||'').toLowerCase().includes(needle));

 const groups:{label:string;items:Row[]}[]=[];
 const today=new Date().toDateString(),yesterday=new Date(Date.now()-86400000).toDateString();
 filteredTx.forEach(t=>{
  const day=new Date(t.createdAt);
  const label=day.toDateString()===today?'Bu gün':day.toDateString()===yesterday?'Dünən':fmtDate(t.createdAt)+' '+day.getFullYear();
  const last=groups[groups.length-1];
  if(last&&last.label===label)last.items.push(t);else groups.push({label,items:[t]});
 });

 return (
  <Page title="Tarixçə">
   <View style={{flexDirection:'row',gap:10}}>
    <View style={styles.searchBox}>
     <Icon name="search-outline" size={20} color="#6e6a85"/>
     <TextInput accessibilityLabel="Əməliyyat axtar" value={query} onChangeText={setQuery} placeholder="Axtar" placeholderTextColor="#aaa6bd" style={styles.searchInput}/>
    </View>
    <Pressable accessibilityRole="button" onPress={()=>setFilters(!filters)} style={[styles.filterBtn,filters&&{backgroundColor:C.lav}]}>
     <Icon name="options-outline" size={19} color={C.ink}/>
     <Text style={styles.filterText}>Filtr</Text>
    </Pressable>
   </View>

   {filters&&(
    <View style={{marginTop:12}}>
     {bankNames.length>0&&(
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}} contentContainerStyle={{gap:8}}>
       {['Hamısı','Kampus',...bankNames].map(name=>(
        <Pressable key={name} accessibilityRole="button" onPress={()=>setSource(name)} style={[S.tab,source===name&&{backgroundColor:C.primary}]}>
         <Text style={[S.tabText,source===name&&{color:'#fff',fontWeight:'700'}]}>{name}</Text>
        </Pressable>
       ))}
      </ScrollView>
     )}
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
      {['Hamısı',...EXPENSE_CATEGORIES,'Gəlir','Daxili köçürmə'].map(c=>(
       <Pressable key={c} accessibilityRole="button" onPress={()=>setFilterCat(c)} style={[S.tab,filterCat===c&&{backgroundColor:C.primary}]}>
        <Text style={[S.tabText,filterCat===c&&{color:'#fff',fontWeight:'700'}]}>{c}</Text>
       </Pressable>
      ))}
     </ScrollView>
    </View>
   )}

   <Pressable accessibilityRole="button" onPress={()=>setBudgets(!budgets)} style={styles.budgetBar}>
    <View style={{flex:1}}>
     <Text style={S.h3}>Bu ayın xərcləri: {money(d.analytics?.totalMinor||0)}</Text>
     <Text style={[S.muted,{marginTop:2}]}>
      {d.analytics?.externalMinor>0?`Digər banklar: ${money(d.analytics.externalMinor)} · `:''}Kateqoriya və büdcə
     </Text>
    </View>
    <Icon name={budgets?'chevron-up':'chevron-down'} size={18} color={C.muted}/>
   </Pressable>

   {budgets&&(
    <>
     <Box>
      <Text style={[S.h3,{marginBottom:12}]}>Kateqoriya üzrə aylıq büdcə</Text>
      <View style={{flexDirection:'row',gap:6,flexWrap:'wrap',marginBottom:12}}>
       {EXPENSE_CATEGORIES.map(c=>(
        <Pressable key={c} accessibilityRole="button" onPress={()=>setBudCat(c)} style={[S.tab,budCat===c&&{backgroundColor:C.primary}]}>
         <Text style={[S.tabText,budCat===c&&{color:'#fff',fontWeight:'700'}]}>{c}</Text>
        </Pressable>
       ))}
      </View>
      <Field label="Aylıq büdcə limiti · AZN" value={budLimit} onChange={setBudLimit} numeric/>
      <Button title="Büdcəni saxla" secondary disabled={a.busy} onPress={()=>a.act('budgets',{category:budCat,limitMinor:minor(budLimit)}).catch(()=>{})}/>
     </Box>
     {d.analytics?.categories?.map((cat:Row)=>{
      const bRow=(d.budgets||[]).find((x:Row)=>x.category===cat.category);
      const lim=bRow?.limitMinor||0;
      const pct=lim>0?Math.round(cat.amountMinor/lim*100):0;
      return (
       <Box key={cat.category}>
        <View style={S.between}>
         <Text style={S.h3}>{cat.category}</Text>
         <Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>{money(cat.amountMinor)}{lim>0?' / '+money(lim)+' ('+pct+'%)':''}</Text>
        </View>
        {lim>0&&pct>=80&&(
         <View style={{marginTop:8}}><Badge text={pct>=100?'BÜDCƏ AŞILIB (100%+)':'XƏBƏRDARLIQ (80%+)'} tone={pct>=100?'danger':'warn'}/></View>
        )}
        <View style={{height:7,backgroundColor:'#efecf8',marginTop:12,borderRadius:4,overflow:'hidden'}}>
         <View style={{height:7,borderRadius:4,backgroundColor:pct>=100?C.red:C.primary,width:Math.min(100,lim>0?pct:(cat.amountMinor/(d.analytics?.totalMinor||1)*100))+'%'}}/>
        </View>
       </Box>
      );
     })}
    </>
   )}

   {groups.map(g=>(
    <View key={g.label}>
     <Text style={styles.dayLabel}>{g.label}</Text>
     {g.items.map(t=><Tx key={t.id} t={t} onPress={()=>a.open('tx-detail:'+t.id)}/>)}
    </View>
   ))}
   {!groups.length&&<Empty text="Əməliyyat tapılmadı." icon="receipt-outline"/>}
  </Page>
 );
}

function ProfileTab(){
 const a=useApp(),d=a.data;
 const rows:[string,string,string,string][]=[
  ['person-outline','Ad və soyad',d.user?.name||'','#ece6ff'],
  ['call-outline','Mobil nömrə',d.user?.phone||'','#dcf3e4'],
  ['shield-checkmark-outline','Şəxsiyyət','SİMA · KYC təsdiqlənib','#dde9ff']
 ];
 return (
  <Page back>
   <Text style={styles.profileTitle}>Profil</Text>
   <View style={{alignItems:'center',marginVertical:22}}>
    <Avatar name={d.user?.name||'K'} size={104}/>
    <Text style={[S.h2,{marginTop:14}]}>{d.user?.name}</Text>
    <Text style={[S.muted,{marginTop:4}]}>{d.user?.phone}</Text>
   </View>
   <View style={styles.moreGroup}>
    {rows.map(([icon,label,value,tint],i)=>(
     <View key={label} style={[styles.moreRow,i===rows.length-1&&{borderBottomWidth:0}]}>
      <View style={[styles.moreIcon,{backgroundColor:tint}]}><Icon name={icon as any} size={19} color={C.primary}/></View>
      <View style={{flex:1}}>
       <Text style={styles.moreSub}>{label}</Text>
       <Text style={styles.moreLabel}>{value}</Text>
      </View>
     </View>
    ))}
   </View>
   <Text style={[S.muted,{marginBottom:18}]}>5 dəqiqə aktivlik olmadıqda sessiya avtomatik bağlanır.</Text>
   <Button title="Hesabdan çıx" danger icon="log-out-outline" onPress={a.logout}/>
  </Page>
 );
}

const VISIBLE_TABS=['Home','History','QR','Cards','More'];
const TAB_ICONS:Record<string,[string,string]>={
 Home:['home','home-outline'],
 History:['document-text','document-text-outline'],
 Cards:['card','card-outline'],
 More:['wallet','wallet-outline']
};
// screens that live under a visible tab keep that tab highlighted
const TAB_OWNER:Record<string,string>={Payments:'More',Profile:'Home'};

function CustomTabBar({state,descriptors,navigation}:any){
 const current=state.routes[state.index]?.name;
 const active=TAB_OWNER[current]||current;
 return (
  <View style={styles.tabBarWrap}>
   <View style={styles.tabBarInner}>
    {VISIBLE_TABS.map(name=>state.routes.find((r:any)=>r.name===name)).filter(Boolean).map((route:any)=>{
     const label=descriptors[route.key].options.title||route.name;
     const focused=active===route.name;
     if(route.name==='QR'){
      return (
       <Pressable key={route.key} accessibilityRole="button" accessibilityLabel="QR ilə ödə" accessibilityState={{selected:focused}} onPress={()=>navigation.navigate('QR')} style={styles.tabItem}>
        <View style={[styles.qrButton,focused&&{backgroundColor:C.deep}]}>
         <Icon name="qr-code-outline" size={26} color="#fff"/>
        </View>
        <Text style={[styles.tabLabel,{marginTop:30},focused&&{color:C.primary,fontWeight:'700'}]}>{label}</Text>
       </Pressable>
      );
     }
     const [on,off]=TAB_ICONS[route.name];
     return (
      <Pressable key={route.key} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:focused}} onPress={()=>navigation.navigate(route.name)} style={styles.tabItem}>
       {focused&&<View style={styles.tabIndicator}/>}
       <Icon name={(focused?on:off) as any} size={22} color={focused?C.primary:'#5d5a73'}/>
       <Text style={[styles.tabLabel,focused&&{color:C.primary,fontWeight:'700'}]}>{label}</Text>
      </Pressable>
     );
    })}
   </View>
  </View>
 );
}

export default function App(){
 const {width:winWidth,height:winHeight}=useWindowDimensions();
 const [phoneFrame,setPhoneFrame]=useState(true);
 const [base,setBase]=useState(DEFAULT_API),
  [token,setToken]=useState(''),
  [device,setDevice]=useState(''),
  [data,setData]=useState<Row|null>(null),
  [busy,setBusy]=useState(false),
  [boot,setBoot]=useState(true),
  [error,setError]=useState(''),
  [message,setMessage]=useState(''),
  [sheet,setSheet]=useState(''),
  [sca,setSca]=useState<{path:string;body:Row;resolve:(s:string)=>void;reject:(e:Error)=>void}|null>(null),
  [scaPin,setScaPin]=useState(''),
  [scaBusy,setScaBusy]=useState(false),
  [kycStep,setKycStep]=useState<{proof:string;actions:string[]}|null>(null),
  [showOnboarding,setShowOnboarding]=useState(true),
  [external,setExternal]=useState<Row[]>([]),
  [showConfig,setShowConfig]=useState(false);

 const lastInteraction=useRef(0);
 const externalKey=useRef('');
 const logout=useCallback(()=>{
  if(token)request(base,token,device,'auth/logout',{}).catch(()=>{});
  setToken('');
  setData(null);
  setExternal([]);
  externalKey.current='';
  setSheet('');
  setError('');
  storage.remove('token');
 },[base,token,device]);

 useEffect(()=>{
  const sub=BackHandler.addEventListener('hardwareBackPress',()=>{
   if(sca){
    sca.reject(new Error('Ləğv edildi'));
    setSca(null);
    return true;
   }
   if(sheet){
    setSheet('');
    setError('');
    return true;
   }
   return false;
  });
  return ()=>sub.remove();
 },[sca,sheet]);

 useEffect(()=>{
  lastInteraction.current=Date.now();
  (async()=>{
   try{
    let d=await storage.get('device');
    if(!d){d='mobile-'+Date.now()+'-'+Math.random().toString(36).slice(2);await storage.set('device',d);}
    setDevice(d);
    const url=await storage.get('api');
    // Web deployments stay on their configured origin. Native API changes are explicit.
    let candidate=DEFAULT_API;
    if(url&&!(process.env.EXPO_PUBLIC_DEPLOYED==='true'&&Platform.OS==='web')){
     try{const parsed=new URL(url);if(['http:','https:'].includes(parsed.protocol))candidate=url;}catch{}
    }
    setBase(candidate);
    const saved=await storage.get('token');
    if(saved)setToken(saved);
    if(saved||await storage.get('onboarding_done'))setShowOnboarding(false);
   }finally{setBoot(false);}
  })();
 },[]);

 const call=useCallback(async(p:string,b?:Row)=>{
  try{return await request(base,token,device,p,b);}
  catch(e){
   if(e instanceof ApiError&&e.status===401&&['SESSION_EXPIRED','UNAUTHENTICATED','DEVICE_MISMATCH'].includes(e.code)){logout();}
   throw e;
  }
 },[base,token,device,logout]);

 // Other banks' transactions are fetched on demand, not with every dashboard poll.
 const loadExternal=useCallback(async()=>{
  try{setExternal(await call('open-banking/transactions'));}catch{/* the next refresh retries */}
 },[call]);

 const refresh=useCallback(async()=>{
  if(!token||!device)return;
  try{
   const dashboard=await call('dashboard');
   setData(dashboard);
   const banks=dashboard.openBanking||{};
   const key=(banks.syncedAt||'')+'|'+(banks.accounts?.length||0);
   if(key!==externalKey.current){externalKey.current=key;void loadExternal();}
   setError(current=>current===CONNECTION_ERROR_MESSAGE?'':current);
  }catch(e){setError((e as Error).message);}
 },[token,device,call,loadExternal]);

 useEffect(()=>{
  const bootId=setTimeout(()=>{void refresh();},0);
  const id=setInterval(()=>{
   if(lastInteraction.current>0&&Date.now()-lastInteraction.current>300_000){if(token)logout();return;}
   if(token)void refresh();
  },1800);
  return()=>{clearTimeout(bootId);clearInterval(id);};
 },[refresh,token,logout]);

 useEffect(()=>{if(!message)return;const id=setTimeout(()=>setMessage(''),5000);return()=>clearTimeout(id);},[message]);
 useEffect(()=>{
  const sub=AppState.addEventListener('change',state=>{
   if(state==='active'&&Date.now()-lastInteraction.current>300_000)logout();
  });
  return()=>sub.remove();
 },[logout]);

 const act=useCallback(async(path:string,body:Row)=>{
  setBusy(true);setError('');
  const key=Date.now()+'-'+Math.random().toString(36).slice(2);
  try{
   let result;
   try{result=await request(base,token,device,path,body,undefined,key);}
   catch(e){
    if(e instanceof ApiError&&e.code==='SCA_REQUIRED'){
     const proof=await new Promise<string>((resolve,reject)=>{setScaPin('');setSca({path,body,resolve,reject});});
     result=await request(base,token,device,path,body,proof,key);
    }else throw e;
   }
   await refresh();
   if(path.startsWith('open-banking/')||path.endsWith('/category'))await loadExternal();
   if(!path.endsWith('/parse')&&!path.endsWith('/read')&&path!=='crypto/quotes')
    setMessage(path==='transfers'?'Köçürmə yaradıldı. Statusu ödənişlərdə izlə.':'Əməliyyat uğurla tamamlandı.');
   return result;
  }catch(e){
   if((e as Error).message!=='Ləğv edildi')setError((e as Error).message);
   throw e;
  }finally{setBusy(false);}
 },[base,token,device,refresh,loadExternal]);

 function finishOnboarding(){
  storage.set('onboarding_done','1').catch(()=>{});
  setShowOnboarding(false);
 }

 const authenticated=async(accessToken:string)=>{
  await storage.set('token',accessToken);
  await storage.set('api',base);
  lastInteraction.current=Date.now();
  setToken(accessToken);
 };

 const scaLength=Number(data?.user?.pinLength)||6;

 const confirmSca=async(pinValue:string)=>{
  if(!sca)return;
  setScaBusy(true);
  try{
   const r=await call('auth/sca',{pin:pinValue,payload:{action:sca.path,data:sca.body}});
   if(r.kycRequired){
    // Large amount: the PIN is only the first step, a fresh face check follows.
    setKycStep({proof:r.proof,actions:r.kycActions||[]});
    setError('');
   }else{
    sca.resolve(r.proof);
    setSca(null);
    setError('');
   }
  }catch(e){setError((e as Error).message);}
  finally{setScaPin('');setScaBusy(false);}
 };

 const finishKyc=async(result:LivenessResult)=>{
  if(!sca||!kycStep)return;
  try{
   await call('auth/sca/kyc',{proof:kycStep.proof,selfie:result.selfie,livenessMode:result.mode,livenessActions:result.actions,facesCount:result.facesCount});
   sca.resolve(kycStep.proof);
   setSca(null);setKycStep(null);setError('');
  }catch(e){
   // The proof is spent or refused: end this attempt with the reason, the person starts again with the PIN.
   sca.reject(e as Error);
   setSca(null);setKycStep(null);
  }
 };
 const cancelKyc=()=>{sca?.reject(new Error('Ləğv edildi'));setSca(null);setKycStep(null);};

 const context:AppContextType={
  base,
  data:data||{},
  call,
  act,
  refresh,
  busy,
  open:(s:string)=>{setError('');setSheet(s);},
  logout,
  error,
  message,
  external,
  setError,
  setMessage
 };
 const showSimulator=Platform.OS==='web'&&winWidth>500&&phoneFrame;

 const appBody=(
  <View
   style={{flex:1,backgroundColor:C.bg}}
   onTouchStart={()=>{lastInteraction.current=Date.now();}}
   onPointerDown={()=>{lastInteraction.current=Date.now();}}
  >
   {boot?(
    <View style={styles.loading}><ActivityIndicator color={C.ink}/></View>
   ):!token&&showOnboarding?(
    <Onboarding onFinish={finishOnboarding}/>
   ):!token?(
    <>
     <AuthFlow base={base} device={device} onAuthenticated={authenticated} onConfig={()=>setShowConfig(true)} onReplayIntro={()=>setShowOnboarding(true)}/>
     <Sheet title="API bağlantısını tənzimlə" visible={showConfig} onClose={()=>setShowConfig(false)}>
      <Field label="Backend API ünvanı" value={base} onChange={setBase} placeholder="http://192.168.1.10:8080/api/v1"/>
      <Button title="Yadda saxla və bağla" onPress={()=>setShowConfig(false)}/>
     </Sheet>
    </>
   ):(
    <Context.Provider value={context}>
     <NavigationContainer>
      <Tab.Navigator tabBar={props=><CustomTabBar {...props}/>} screenOptions={{headerShown:false}}>
       <Tab.Screen name="Home" component={Home} options={{title:'Əsas'}}/>
       <Tab.Screen name="History" component={HistoryTab} options={{title:'Tarixçə'}}/>
       <Tab.Screen name="Cards" component={CardsTab} options={{title:'Kartlar'}}/>
       <Tab.Screen name="More" component={MoreTab} options={{title:'Daha çox'}}/>
       <Tab.Screen name="Payments" component={Payments} options={{title:'Ödənişlərim'}}/>
       <Tab.Screen name="QR" component={QrTab} options={{title:'QR'}}/>
       <Tab.Screen name="Profile" component={ProfileTab} options={{title:'Profil'}}/>
      </Tab.Navigator>
     </NavigationContainer>
     {!sheet&&error&&(
      <Pressable style={styles.toastError} onPress={()=>setError('')}>
       <Text style={S.errorText}>{error}</Text>
      </Pressable>
     )}
     {message&&!sca&&(
      <Pressable style={styles.toast} onPress={()=>setMessage('')}>
       <Icon name="checkmark-circle" color="#503b8f" size={20}/>
       <Text style={[S.successText,{flex:1}]}>{message}</Text>
      </Pressable>
     )}
     {!!sheet&&<Operations key={sheet} hidden={!!sca} sheet={sheet} close={()=>{setSheet('');setError('');}}/>}
     <Sheet title="Üzünü təsdiqlə" visible={!!kycStep} onClose={cancelKyc}>
      <Box>
       <View style={S.row}>
        <Icon name="scan-outline" color="#6853a5" size={25}/>
        <Text style={[S.muted,{flex:1}]}>Məbləğ böyük olduğu üçün PIN-dən sonra üzünü də təsdiqləməlisən.</Text>
       </View>
       {sca?.body.amountMinor&&<Text style={[S.amount,{fontSize:28,marginTop:14}]}>{money(sca.body.amountMinor)}</Text>}
      </Box>
      {!!error&&<View style={S.error}><Text style={S.errorText}>{error}</Text></View>}
      {kycStep&&<Liveness actions={kycStep.actions} onDone={finishKyc} onCancel={cancelKyc}/>}
     </Sheet>
     <Sheet title="Əməliyyatı təsdiqlə" visible={!!sca&&!kycStep} onClose={()=>{sca?.reject(new Error('Ləğv edildi'));setSca(null);}}>
      <Box>
       <View style={S.row}>
        <Icon name="shield-checkmark-outline" color="#6853a5" size={25}/>
        <Text style={[S.muted,{flex:1}]}>Təhlükəsizlik üçün bu əməliyyatı PIN ilə təsdiqlə.</Text>
       </View>
       {sca?.body.amountMinor&&<Text style={[S.amount,{fontSize:32,marginTop:18}]}>{money(sca.body.amountMinor)}</Text>}
       {sca?.body.totalMinor&&<Text style={[S.muted,{marginTop:8}]}>Komissiya daxil cəmi: {money(sca.body.totalMinor)}</Text>}
       {sca?.body.recipientName&&<Text style={[S.muted,{marginTop:8}]}>Alan: {sca.body.recipientName}</Text>}
       {sca?.body.phone&&<Text style={[S.muted,{marginTop:8}]}>Alan: {sca.body.phone}</Text>}
       {sca?.body.fundingSource&&(
        <Text style={[S.muted,{marginTop:8}]}>
         Ödəniş: {({BNPL:'Sonra ödə',WALLET:'Kampus balansı',CRYPTO:'USDT · Pilot'} as any)[sca.body.fundingSource]}
        </Text>
       )}
       {sca?.path.includes('loan-offers/')&&(
        <Text style={[S.muted,{marginTop:8}]}>Partnyorun demo kredit müqaviləsinin qəbulunu təsdiqləyirsən.</Text>
       )}
      </Box>
      {!!error&&<View style={S.error}><Text style={S.errorText}>{error}</Text></View>}
      <PinPad
       value={scaPin}
       length={scaLength}
       onDigit={d=>{
        if(scaBusy||scaPin.length>=scaLength)return;
        const next=scaPin+d;
        setScaPin(next);
        if(next.length===scaLength)confirmSca(next);
       }}
       onDelete={()=>{if(!scaBusy)setScaPin(p=>p.slice(0,-1));}}
      />
     </Sheet>
    </Context.Provider>
   )}
  </View>
 );

 return (
  <SafeAreaProvider>
   <StatusBar style="dark"/>
   {Platform.OS==='web'&&winWidth>500?(
    <View style={styles.webBackdrop}>
     <View style={styles.webToolbar}>
      <Text style={{color:'#c6c0d7',fontSize:12,fontWeight:'600'}}>📱 Kampus Mobil Simulyator (393 × 852)</Text>
      <Pressable onPress={()=>setPhoneFrame(!phoneFrame)} style={styles.frameToggleBtn}>
       <Icon name={phoneFrame?'expand-outline':'phone-portrait-outline'} size={15} color={C.ink}/>
       <Text style={{fontSize:11,fontWeight:'700',color:C.ink}}>{phoneFrame?'Tam ekran':'Telefon çərçivəsi'}</Text>
      </Pressable>
     </View>
     {showSimulator?(
      <View style={[styles.phoneShell,{height:Math.min(852,winHeight-68)}]}>
       <View style={styles.phoneStatusBar}>
        <Text style={{fontSize:12,fontWeight:'700',color:C.ink}}>9:41</Text>
        <View style={styles.dynamicIsland}/>
        <View style={{flexDirection:'row',alignItems:'center',gap:5}}>
         <Icon name="cellular" size={13} color={C.ink}/>
         <Icon name="wifi" size={14} color={C.ink}/>
         <Icon name="battery-full" size={16} color={C.ink}/>
        </View>
       </View>
       <View style={{flex:1,overflow:'hidden'}}>{appBody}</View>
       <View style={styles.homeIndicatorWrap}><View style={styles.homeIndicator}/></View>
      </View>
     ):(
      <View style={{flex:1,width:'100%'}}>{appBody}</View>
     )}
    </View>
   ):(
    appBody
   )}
  </SafeAreaProvider>
 );
}

const styles=StyleSheet.create({
 pageTitle:{fontSize:26,fontWeight:'700',color:C.ink,letterSpacing:-0.4,marginBottom:16},
 profileTitle:{fontSize:24,fontWeight:'700',color:C.ink,marginTop:4},
 homeRoot:{flex:1,backgroundColor:'#fff'},
 homeHeader:{backgroundColor:C.deep,paddingHorizontal:18,paddingTop:10,paddingBottom:26},
 homeTop:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:20},
 hello:{flex:1,color:'#fff',fontSize:15,fontWeight:'600',lineHeight:20},
 gear:{width:44,height:44,alignItems:'center',justifyContent:'center'},
 balanceCard:{backgroundColor:'rgba(255,255,255,0.1)',borderRadius:20,borderWidth:1,borderColor:'rgba(255,255,255,0.14)',paddingTop:18,paddingHorizontal:14,paddingBottom:6,alignItems:'center',width:'100%',maxWidth:430,alignSelf:'center'},
 balanceLabel:{color:'rgba(255,255,255,0.7)',fontSize:12},
 balanceRow:{flexDirection:'row',alignItems:'center',marginTop:6,marginBottom:14},
 balanceWhole:{color:'#fff',fontSize:38,fontWeight:'700',letterSpacing:-1},
 balanceFrac:{fontSize:21,fontWeight:'600',color:'rgba(255,255,255,0.75)'},
 heldText:{color:'#ffd96a',fontSize:11,fontWeight:'600',marginBottom:10},
 actionRow:{flexDirection:'row',alignItems:'center',alignSelf:'stretch',marginTop:2},
 action:{flex:1,minHeight:64,alignItems:'center',justifyContent:'center',gap:6},
 actionText:{color:'#fff',fontSize:12,fontWeight:'600'},
 actionDivider:{width:1,height:34,backgroundColor:'rgba(255,255,255,0.18)'},
 homeBody:{backgroundColor:'#fff',paddingHorizontal:18,paddingTop:22,width:'100%',maxWidth:430,alignSelf:'center'},
 sectionTitle:{fontSize:14,fontWeight:'700',color:C.ink},
 viewAll:{fontSize:12,color:'#5d5a73'},
 person:{alignItems:'center',width:62,gap:7},
 addCircle:{width:60,height:60,borderRadius:30,backgroundColor:C.lav,alignItems:'center',justifyContent:'center'},
 personName:{fontSize:12,color:C.ink,maxWidth:62},
 walletCard:{height:200,borderRadius:20,padding:16,overflow:'hidden',shadowColor:'#1b1245',shadowOffset:{width:0,height:8},shadowOpacity:0.18,shadowRadius:14,elevation:4},
 cardCircle:{position:'absolute',left:-70,top:-70,width:190,height:190,borderRadius:95,borderWidth:1},
 cardBlob:{position:'absolute',right:-40,bottom:-70,width:210,height:210,borderRadius:105},
 cardRing:{position:'absolute',right:-30,bottom:-10,width:130,height:130,borderRadius:65,borderWidth:1.5},
 cardName:{fontSize:13,fontWeight:'700'},
 cardBottom:{position:'absolute',left:16,right:16,bottom:16,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},
 cardLabel:{fontSize:12},
 cardValue:{fontSize:24,fontWeight:'700',marginTop:2},
 addCard:{fontSize:14,fontWeight:'600',color:'#1d5bd6'},
 payHint:{alignItems:'center',gap:10,marginVertical:46},
 payHintText:{fontSize:14,color:'#9b98ad'},
 moreGroup:{borderWidth:1,borderColor:'#ebe8f4',borderRadius:14,marginBottom:14,overflow:'hidden',backgroundColor:'#fff'},
 moreRow:{flexDirection:'row',alignItems:'center',gap:12,minHeight:56,paddingHorizontal:14,borderBottomWidth:1,borderBottomColor:'#f0eef6'},
 moreIcon:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center'},
 moreLabel:{fontSize:14,fontWeight:'600',color:C.ink},
 moreSub:{fontSize:11,color:'#76738a',marginTop:1},
 logout:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,minHeight:52,borderRadius:12,backgroundColor:'#fdecec',marginTop:2,marginBottom:12},
 logoutText:{color:C.red,fontWeight:'700',fontSize:14},
 searchBox:{flex:1,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:'#dedaeb',borderRadius:10,paddingHorizontal:12,minHeight:48},
 searchInput:{flex:1,fontSize:14,color:C.ink,minHeight:46},
 filterBtn:{flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderColor:'#dedaeb',borderRadius:10,paddingHorizontal:12,minHeight:48},
 filterText:{fontSize:13,fontWeight:'600',color:C.ink},
 budgetBar:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#f6f3ff',borderRadius:12,padding:14,marginTop:14,marginBottom:6,minHeight:56},
 dayLabel:{fontSize:13,fontWeight:'700',color:'#5d5a73',marginTop:18,marginBottom:2},
 tabBarWrap:{backgroundColor:'white',borderTopWidth:1,borderTopColor:'#ebe8f4',paddingBottom:Platform.OS==='web'?6:18},
 tabBarInner:{flexDirection:'row',maxWidth:430,width:'100%',alignSelf:'center'},
 tabItem:{flex:1,minHeight:56,alignItems:'center',justifyContent:'center',gap:3,paddingTop:4},
 tabIndicator:{position:'absolute',top:-1,left:'12%',right:'12%',height:2.5,backgroundColor:C.primary,borderRadius:2},
 tabLabel:{fontSize:11,color:'#5d5a73',fontWeight:'500'},
 qrButton:{position:'absolute',top:-26,width:56,height:56,borderRadius:28,backgroundColor:C.primary,alignItems:'center',justifyContent:'center',borderWidth:4,borderColor:'#fff',shadowColor:C.primary,shadowOffset:{width:0,height:6},shadowOpacity:0.3,shadowRadius:10,elevation:6},
 backPill:{width:48,height:48,borderRadius:24,backgroundColor:'rgba(18,10,51,0.7)',alignItems:'center',justifyContent:'center',marginRight:'auto',borderWidth:1,borderColor:'rgba(228,217,255,0.3)'},
 webBackdrop:{flex:1,backgroundColor:'#1b1245',alignItems:'center',justifyContent:'center',paddingVertical:12},
 webToolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',width:393,marginBottom:10,paddingHorizontal:4},
 frameToggleBtn:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:C.lime,paddingHorizontal:12,paddingVertical:6,borderRadius:999},
 phoneShell:{width:393,backgroundColor:C.bg,borderRadius:44,borderWidth:10,borderColor:'#2a2150',overflow:'hidden',shadowColor:'#000',shadowOffset:{width:0,height:20},shadowOpacity:0.45,shadowRadius:40},
 phoneStatusBar:{height:38,backgroundColor:C.bg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:24,paddingTop:4},
 dynamicIsland:{width:96,height:22,borderRadius:12,backgroundColor:'#120a33'},
 homeIndicatorWrap:{height:18,backgroundColor:'white',alignItems:'center',justifyContent:'center'},
 homeIndicator:{width:120,height:4,borderRadius:2,backgroundColor:'#c4bfd3'},
 iconHitTarget:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'},
 cancelInlineBtn:{minHeight:40,paddingHorizontal:10,justifyContent:'center'},
 loading:{flex:1,justifyContent:'center',alignItems:'center',padding:24},
 toast:{position:'absolute',bottom:88,left:16,right:16,backgroundColor:'#e4def7',borderColor:'#beb0e8',borderWidth:1,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:10,maxWidth:400,alignSelf:'center'},
 toastError:{position:'absolute',bottom:88,left:16,right:16,backgroundColor:'#fae9df',borderRadius:14,padding:14,maxWidth:400,alignSelf:'center'},
 fullScanner:{flex:1,backgroundColor:'#120a33',justifyContent:'space-between',alignItems:'center',paddingVertical:24,paddingHorizontal:20},
 fullScannerTop:{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:12,zIndex:2},
 torchBtn:{width:48,height:48,borderRadius:24,backgroundColor:'rgba(18,10,51,0.75)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(228,217,255,0.28)'},
 reticleBox:{width:236,height:236,position:'relative'},
 corner:{position:'absolute',width:36,height:36,borderColor:C.lime},
 cornerTL:{top:0,left:0,borderTopWidth:4,borderLeftWidth:4,borderTopLeftRadius:18},
 cornerTR:{top:0,right:0,borderTopWidth:4,borderRightWidth:4,borderTopRightRadius:18},
 cornerBL:{bottom:0,left:0,borderBottomWidth:4,borderLeftWidth:4,borderBottomLeftRadius:18},
 cornerBR:{bottom:0,right:0,borderBottomWidth:4,borderRightWidth:4,borderBottomRightRadius:18},
});
