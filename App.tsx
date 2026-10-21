import React,{useState,useEffect,useRef,useCallback} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,Platform,RefreshControl,AppState,ActivityIndicator,useWindowDimensions,Animated,Easing,Image,BackHandler} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {NavigationContainer,useFocusEffect} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {LinearGradient} from 'expo-linear-gradient';
import {CameraView,useCameraPermissions} from 'expo-camera';
import {C,S,CARD_IMAGES,AppContextType,Context,useApp,statusLabel,statusTone,Icon,Button,Field,Check,Badge,Box,Empty,Sheet,Tx,EXPENSE_CATEGORIES} from './src/ui';
import {Operations} from './src/OperationsSheet';
import AuthFlow from './src/AuthFlow';
import Onboarding from './src/Onboarding';
import PinPad from './src/PinPad';
import Liveness from './src/Liveness';
import type {LivenessResult} from './src/livenessTypes';
import {DEFAULT_API,storage,request,ApiError,minor,money,Row,hashPhones,CONNECTION_ERROR_MESSAGE} from './src/api';

const Tab=createBottomTabNavigator();

function Page({children}:{children:React.ReactNode}){
 const a=useApp();
 const unreadCount=(a.data.notifications||[]).filter((n:Row)=>!n.read).length;
 return (
  <SafeAreaView style={S.page} edges={['top']}>
   <ScrollView
    contentContainerStyle={S.content}
    refreshControl={<RefreshControl refreshing={false} onRefresh={a.refresh} tintColor={C.ink}/>}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
   >
    <View style={styles.pageTop}>
     <Text style={styles.wordmark}>kampus<Text style={{color:'#9bc26b'}}>.</Text></Text>
     <View style={S.row}>
      <Pressable
       accessibilityRole="button"
       accessibilityLabel="Mənim QR kodum"
       onPress={()=>a.open('my-qr')}
       style={styles.headerActionBtn}
      >
       <Icon name="qr-code-outline" size={20}/>
      </Pressable>
      <Pressable
       accessibilityRole="button"
       accessibilityLabel="Bildirişlər"
       onPress={()=>a.open('notifications')}
       style={styles.headerActionBtn}
      >
       <Icon name="notifications-outline" size={21}/>
       {unreadCount>0&&<View style={styles.dot}/>}
      </Pressable>
     </View>
    </View>
    {children}
   </ScrollView>
  </SafeAreaView>
 );
}

function Home(){
 const a=useApp(),d=a.data;
 const [hide,setHide]=useState(false);
 const balMinor=d.wallet?.availableBalanceMinor||0;
 const whole=Math.floor(balMinor/100);
 const frac=String(Math.abs(balMinor%100)).padStart(2,'0');
 const savedCount=(d.trustedBeneficiaries?.length||0)+(d.cards?.length||0)||1;
 const linkedBanks=(d.openBanking?.consents||[]).filter((c:Row)=>c.status==='AUTHORIZED').length;

 return (
  <Page>
   <View style={styles.refBalanceCard}>
    <View style={S.between}>
     <Text style={styles.refBalanceLabel}>Mövcud balans</Text>
     {d.user?.name&&(
      <Text style={{fontSize:12,fontWeight:'600',color:C.muted}} numberOfLines={1}>
       {d.user.name}
      </Text>
     )}
    </View>

    <View style={[S.between,{marginTop:8,marginBottom:20}]}>
     {hide?(
      <Text style={styles.refBalanceWhole}>••••• <Text style={styles.refBalanceFraction}>₼</Text></Text>
     ):(
      <Text style={styles.refBalanceWhole}>
       {whole}<Text style={styles.refBalanceFraction}>.{frac} ₼</Text>
      </Text>
     )}
     <Pressable
      accessibilityRole="button"
      accessibilityLabel={hide?'Balansı göstər':'Balansı gizlət'}
      onPress={()=>setHide(!hide)}
      style={styles.eyeBtn}
     >
      <Icon name={hide?'eye-outline':'eye-off-outline'} color={C.ink} size={22}/>
     </Pressable>
    </View>

    {d.wallet?.heldAmountMinor>0&&(
     <View style={styles.heldBanner}>
      <Icon name="time-outline" size={16} color="#8a521b"/>
      <Text style={{color:'#8a521b',fontSize:12,fontWeight:'600',flex:1}}>
       {money(d.wallet.heldAmountMinor)} əməliyyat üçün rezerv edilib
      </Text>
     </View>
    )}

    <View style={styles.refActionRow}>
     <Pressable
      accessibilityRole="button"
      onPress={()=>a.open('add')}
      style={[styles.refActionBtn,{backgroundColor:C.lime}]}
     >
      <Icon name="add" size={20} color={C.ink}/>
      <Text style={[styles.refActionBtnText,{color:C.ink}]}>Balans artımı</Text>
     </Pressable>
     <Pressable
      accessibilityRole="button"
      onPress={()=>a.open('send')}
      style={[styles.refActionBtn,{backgroundColor:C.ink}]}
     >
      <Icon name="arrow-up" size={18} color="#FFFFFF"/>
      <Text style={styles.refActionBtnText}>Köçürmək</Text>
     </Pressable>
    </View>
   </View>

   <Pressable
    accessibilityRole="button"
    onPress={()=>a.open('card-transfer')}
    style={styles.savedPaymentsCard}
   >
    <View style={styles.savedPaymentsIcon}>
     <Icon name="receipt-outline" size={20} color={C.ink}/>
    </View>
    <View style={{flex:1}}>
     <Text style={styles.savedPaymentsTitle}>Mənim ödənişlərim</Text>
     <Text style={styles.savedPaymentsSub}>{savedCount} yadda saxladığın ödəniş və kart</Text>
    </View>
    <Icon name="chevron-forward" size={18} color={C.muted}/>
   </Pressable>

   <Pressable accessibilityRole="button" onPress={()=>a.open('banks-hub')} style={[styles.savedPaymentsCard,{marginTop:10}]}>
    <View style={styles.savedPaymentsIcon}>
     <Icon name="business-outline" size={20} color={C.ink}/>
    </View>
    <View style={{flex:1}}>
     <Text style={styles.savedPaymentsTitle}>Digər banklar</Text>
     <Text style={styles.savedPaymentsSub}>
      {linkedBanks>0?`${linkedBanks} bank bağlı · ${money(d.openBanking?.totalBalanceMinor||0)}`:'Kartlarını və xərclərini bir yerdə izlə'}
     </Text>
    </View>
    <Icon name="chevron-forward" size={18} color={C.muted}/>
   </Pressable>

   <Text style={styles.servicesHeader}>XİDMƏTLƏR VƏ FÜRSƏTLƏR</Text>

   <View style={styles.bentoGrid}>
    <View style={styles.bentoRow}>
     <Pressable
      accessibilityRole="button"
      onPress={()=>a.open('credit-hub')}
      style={[styles.bentoCard,styles.bentoCardForest]}
     >
      <View style={{zIndex:2}}>
       <Text style={styles.bentoTitleWhite}>{'Borc müraciəti\n1 500 ₼-dək'}</Text>
       <Text style={styles.bentoSubLime}>0% Sonra ödə · Kredit</Text>
      </View>
      <Image source={CARD_IMAGES.credit} style={styles.bentoImage} resizeMode="cover"/>
     </Pressable>

     <Pressable
      accessibilityRole="button"
      onPress={()=>a.open('add:BITCOIN')}
      style={styles.bentoCard}
     >
      <View style={{zIndex:2}}>
       <Text style={styles.bentoTitleDark}>Bitcoin ilə artım</Text>
       <Text style={styles.bentoValueDark}>BTC · Prototip</Text>
      </View>
      <Image source={CARD_IMAGES.btc} style={styles.bentoImage} resizeMode="cover"/>
     </Pressable>
    </View>

    <View style={styles.bentoRow}>
     <Pressable
      accessibilityRole="button"
      onPress={()=>a.open('cards-hub')}
      style={styles.bentoCard}
     >
      <View style={{zIndex:2}}>
       <Text style={styles.bentoTitleDark}>Virtual Kartlar</Text>
       <Text style={styles.bentoValueDark}>{d.cards?.length||0} aktiv</Text>
      </View>
      <Image source={CARD_IMAGES.virtualCard} style={styles.bentoImage} resizeMode="cover"/>
     </Pressable>

     <Pressable
      accessibilityRole="button"
      onPress={()=>a.open('split')}
      style={styles.bentoCard}
     >
      <View style={{zIndex:2}}>
       <Text style={styles.bentoTitleDark}>Hesabı böl</Text>
       <Text style={styles.bentoValueDark}>50 / 50</Text>
      </View>
      <Image source={CARD_IMAGES.split} style={styles.bentoImage} resizeMode="cover"/>
     </Pressable>
    </View>
   </View>
  </Page>
 );
}

function Payments(){
 const a=useApp(),d=a.data;
 const [matched,setMatched]=useState<Row[]|null>(null);
 return (
  <Page>
   <Text style={S.eyebrow}>ÖDƏNİŞLƏR VƏ KÖÇÜRMƏLƏR</Text>
   <Text style={S.h1}>Bir nömrə kifayətdir.</Text>
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

     <Box style={{backgroundColor:'#f2f7ea',borderColor:'#cfe0b8'}}>
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
    <LinearGradient colors={['#0f261f','#17382e','#0d1f1a']} style={StyleSheet.absoluteFill}/>
   )}

   <View style={styles.fullScannerTop}>
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

function HistoryTab(){
 const a=useApp(),d=a.data;
 const [budCat,setBudCat]=useState('Yemək'),
  [budLimit,setBudLimit]=useState('50'),
  [filterCat,setFilterCat]=useState('Hamısı'),
  [source,setSource]=useState('Hamısı');

 const kampusTx:Row[]=d.transactions||[];
 const bankTx:Row[]=a.external||[];
 const bankNames=Array.from(new Set(bankTx.map(t=>String(t.bankName))));
 const bySource=source==='Hamısı'?[...kampusTx,...bankTx]:source==='Kampus'?kampusTx:bankTx.filter(t=>t.bankName===source);
 const allTx:Row[]=bySource.slice().sort((x,y)=>String(y.createdAt).localeCompare(String(x.createdAt)));
 const filteredTx=filterCat==='Hamısı'?allTx:allTx.filter(t=>t.category===filterCat);

 return (
  <Page>
   <Text style={S.eyebrow}>XƏRCLƏR VƏ BÜDCƏ</Text>
   <Text style={S.h1}>Tarixçə.</Text>
   <Text style={[S.muted,{marginTop:8,marginBottom:18}]}>
    Bu ayın xərcləri: <Text style={{color:C.ink,fontWeight:'700'}}>{money(d.analytics?.totalMinor||0)}</Text>
    {d.analytics?.externalMinor>0?` (o cümlədən digər banklar: ${money(d.analytics.externalMinor)})`:''}. Detallara baxmaq və kateqoriyanı dəyişmək üçün əməliyyata toxun.
   </Text>

   <Box>
    <Text style={[S.h3,{marginBottom:12}]}>Kateqoriya üzrə aylıq büdcə</Text>
    <View style={{flexDirection:'row',gap:6,flexWrap:'wrap',marginBottom:12}}>
     {EXPENSE_CATEGORIES.map(c=>(
      <Pressable
       key={c}
       accessibilityRole="button"
       onPress={()=>setBudCat(c)}
       style={[S.tab,budCat===c&&{backgroundColor:C.lime,borderColor:C.ink}]}
      >
       <Text style={[S.tabText,budCat===c&&{color:C.ink,fontWeight:'700'}]}>{c}</Text>
      </Pressable>
     ))}
    </View>
    <Field label="Aylıq büdcə limiti · AZN" value={budLimit} onChange={setBudLimit} numeric/>
    <Button
     title="Büdcəni saxla"
     secondary
     disabled={a.busy}
     onPress={()=>a.act('budgets',{category:budCat,limitMinor:minor(budLimit)}).catch(()=>{})}
    />
   </Box>

   {d.analytics?.categories?.map((cat:Row)=>{
    const bRow=(d.budgets||[]).find((x:Row)=>x.category===cat.category);
    const lim=bRow?.limitMinor||0;
    const pct=lim>0?Math.round(cat.amountMinor/lim*100):0;
    return (
     <Box key={cat.category}>
      <View style={S.between}>
       <Text style={S.h3}>{cat.category}</Text>
       <Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>
        {money(cat.amountMinor)}{lim>0?' / '+money(lim)+' ('+pct+'%)':''}
       </Text>
      </View>
      {lim>0&&pct>=80&&(
       <View style={{marginTop:8}}>
        <Badge text={pct>=100?'BÜDCƏ AŞILIB (100%+)':'XƏBƏRDARLIQ (80%+)'} tone={pct>=100?'danger':'warn'}/>
       </View>
      )}
      <View style={{height:7,backgroundColor:'#eef3e4',marginTop:12,borderRadius:4,overflow:'hidden'}}>
       <View style={{height:7,borderRadius:4,backgroundColor:pct>=100?C.red:'#8cb85c',width:Math.min(100,lim>0?pct:(cat.amountMinor/(d.analytics?.totalMinor||1)*100))+'%'}}/>
      </View>
     </Box>
    );
   })}

   <View style={S.section}>
    <Text style={S.h3}>Bütün əməliyyatlar</Text>
    <Text style={S.muted}>{filteredTx.length} qeyd</Text>
   </View>

   {bankNames.length>0&&(
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}} contentContainerStyle={{gap:8}}>
     {['Hamısı','Kampus',...bankNames].map(name=>(
      <Pressable
       key={name}
       accessibilityRole="button"
       onPress={()=>setSource(name)}
       style={[S.tab,source===name&&{backgroundColor:C.ink,borderColor:C.ink}]}
      >
       <Text style={[S.tabText,source===name&&{color:'#fff',fontWeight:'700'}]}>{name}</Text>
      </Pressable>
     ))}
    </ScrollView>
   )}

   <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}} contentContainerStyle={{gap:8}}>
    {['Hamısı',...EXPENSE_CATEGORIES,'Gəlir','Daxili köçürmə'].map(c=>(
     <Pressable
      key={c}
      accessibilityRole="button"
      onPress={()=>setFilterCat(c)}
      style={[S.tab,filterCat===c&&{backgroundColor:C.lime,borderColor:C.ink}]}
     >
      <Text style={[S.tabText,filterCat===c&&{color:C.ink,fontWeight:'700'}]}>{c}</Text>
     </Pressable>
    ))}
   </ScrollView>

   <Box style={{paddingVertical:4}}>
    {filteredTx.map((t:Row)=>(
     <Tx key={t.id} t={t} onPress={()=>a.open('tx-detail:'+t.id)}/>
    ))}
    {!filteredTx.length&&<Empty text="Bu kateqoriya üzrə əməliyyat tapılmadı."/>}
   </Box>
  </Page>
 );
}

function ProfileTab(){
 const a=useApp(),d=a.data;
 const unreadCount=(d.notifications||[]).filter((n:Row)=>!n.read).length;
 return (
  <Page>
   <Text style={S.eyebrow}>HESAB VƏ XİDMƏTLƏR</Text>
   <Text style={S.h1}>Profil.</Text>

   <Box style={{marginTop:16}}>
    <View style={S.row}>
     <View style={[S.avatar,{width:52,height:52,borderRadius:18,backgroundColor:C.lime}]}>
      <Text style={[S.avatarText,{color:C.ink,fontSize:18}]}>{(d.user?.name||'K')[0]}</Text>
     </View>
     <View style={{flex:1}}>
      <Text style={S.h2}>{d.user?.name}</Text>
      <Text style={S.muted}>{d.user?.phone}</Text>
     </View>
     <Badge text="SİMA · KYC" tone="success"/>
    </View>
    <View style={[S.between,{marginTop:14,paddingTop:12,borderTopWidth:1,borderTopColor:C.line}]}>
     <Text style={[S.muted,{fontSize:11}]}>
      5 dəqiqə aktivlik olmadıqda sessiya avtomatik bağlanır.
     </Text>
     <Pressable accessibilityRole="button" onPress={()=>a.open('my-qr')} style={{paddingVertical:4,paddingHorizontal:8}}>
      <Text style={S.link}>QR kodum →</Text>
     </Pressable>
    </View>
   </Box>

   <View style={S.section}><Text style={S.h3}>Maliyyə alətləri</Text></View>
   <Box style={{paddingVertical:6}}>
    <Pressable accessibilityRole="button" style={S.listRow} onPress={()=>a.open('cards-hub')}>
     <View style={S.tile}><Icon name="card-outline" size={20}/></View>
     <View style={{flex:1}}>
      <Text style={S.h3}>Virtual kartlarım ({d.cards?.length||0})</Text>
      <Text style={S.muted}>Limitlər, 30s PAN/CVV, satıcı bloklama</Text>
     </View>
     <Icon name="chevron-forward" size={18} color={C.muted}/>
    </Pressable>

    <Pressable accessibilityRole="button" style={S.listRow} onPress={()=>a.open('banks-hub')}>
     <View style={S.tile}><Icon name="business-outline" size={20}/></View>
     <View style={{flex:1}}>
      <Text style={S.h3}>Digər banklarım ({(d.openBanking?.consents||[]).filter((c:Row)=>c.status==='AUTHORIZED').length})</Text>
      <Text style={S.muted}>Hesab və kartları bağla, xərcləri izlə</Text>
     </View>
     <Icon name="chevron-forward" size={18} color={C.muted}/>
    </Pressable>

    <Pressable accessibilityRole="button" style={S.listRow} onPress={()=>a.open('credit-hub')}>
     <View style={S.tile}><Icon name="school-outline" size={20}/></View>
     <View style={{flex:1}}>
      <Text style={S.h3}>Sonra ödə və Partnyor krediti</Text>
      <Text style={S.muted}>0% BNPL ({money(d.bnplAvailableMinor)}) · BOKT təklifləri</Text>
     </View>
     <Icon name="chevron-forward" size={18} color={C.muted}/>
    </Pressable>

    <Pressable accessibilityRole="button" style={[S.listRow,{borderBottomWidth:0}]} onPress={()=>a.open('crypto-hub')}>
     <View style={S.tile}><Icon name="diamond-outline" size={20}/></View>
     <View style={{flex:1}}>
      <Text style={S.h3}>Kripto cüzdanı (USDT Pilot)</Text>
      <Text style={S.muted}>Al/Sat, TRC-20 depozit və çıxarış</Text>
     </View>
     <Icon name="chevron-forward" size={18} color={C.muted}/>
    </Pressable>
   </Box>

   <Button
    title={unreadCount>0?`Bildirişlər (${unreadCount} yeni)`:'Bildirişlər'}
    secondary
    icon="notifications-outline"
    onPress={()=>a.open('notifications')}
   />
   <Button title="Hesabdan çıx" danger icon="log-out-outline" onPress={a.logout}/>
  </Page>
 );
}

function CustomTabBar({state,descriptors,navigation}:any){
 return (
  <View style={styles.tabBarWrap}>
   <View style={styles.tabBarInner}>
    {state.routes.map((route:any,index:number)=>{
     const {options}=descriptors[route.key];
     const label=options.title||route.name;
     const focused=state.index===index;
     const isQr=route.name==='QR';
     const iconName=({
      Home:focused?'home':'home-outline',
      Payments:focused?'swap-horizontal':'swap-horizontal-outline',
      QR:'qr-code-outline',
      History:focused?'time':'time-outline',
      Profile:focused?'person':'person-outline'
     } as any)[route.name];

     return (
      <Pressable
       key={route.key}
       accessibilityRole="button"
       accessibilityLabel={label}
       onPress={()=>navigation.navigate(route.name)}
       style={styles.tabItem}
      >
       {isQr?(
        <View style={[styles.qrButton,focused&&{backgroundColor:C.ink}]}>
         <Icon name="qr-code-outline" size={23} color={focused?C.lime:C.ink}/>
        </View>
       ):(
        <View style={[styles.tabIconWrap,focused&&{backgroundColor:'#ecf4df'}]}>
         <Icon name={iconName} size={20} color={focused?C.ink:'#8d998a'}/>
        </View>
       )}
       <Text style={[styles.tabLabel,focused&&{color:C.ink,fontWeight:'700'},isQr&&{marginTop:4}]}>
        {label}
       </Text>
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
       <Tab.Screen name="Home" component={Home} options={{title:'Ana səhifə'}}/>
       <Tab.Screen name="Payments" component={Payments} options={{title:'Ödənişlər'}}/>
       <Tab.Screen name="QR" component={QrTab} options={{title:'QR'}}/>
       <Tab.Screen name="History" component={HistoryTab} options={{title:'Tarixçə'}}/>
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
       <Icon name="checkmark-circle" color="#668b3f" size={20}/>
       <Text style={[S.successText,{flex:1}]}>{message}</Text>
      </Pressable>
     )}
     {!!sheet&&<Operations key={sheet} hidden={!!sca} sheet={sheet} close={()=>{setSheet('');setError('');}}/>}
     <Sheet title="Üzünü təsdiqlə" visible={!!kycStep} onClose={cancelKyc}>
      <Box>
       <View style={S.row}>
        <Icon name="scan-outline" color="#7fa157" size={25}/>
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
        <Icon name="shield-checkmark-outline" color="#7fa157" size={25}/>
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
      <Text style={{color:'#c8d6c1',fontSize:12,fontWeight:'600'}}>📱 Kampus Mobil Simulyator (393 × 852)</Text>
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
 webBackdrop:{flex:1,backgroundColor:'#14241f',alignItems:'center',justifyContent:'center',paddingVertical:12},
 webToolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',width:393,marginBottom:10,paddingHorizontal:4},
 frameToggleBtn:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:C.lime,paddingHorizontal:12,paddingVertical:6,borderRadius:999},
 phoneShell:{width:393,backgroundColor:C.bg,borderRadius:44,borderWidth:10,borderColor:'#253831',overflow:'hidden',shadowColor:'#000',shadowOffset:{width:0,height:20},shadowOpacity:0.45,shadowRadius:40},
 phoneStatusBar:{height:38,backgroundColor:C.bg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:24,paddingTop:4},
 dynamicIsland:{width:96,height:22,borderRadius:12,backgroundColor:'#111d19'},
 homeIndicatorWrap:{height:18,backgroundColor:'white',alignItems:'center',justifyContent:'center'},
 homeIndicator:{width:120,height:4,borderRadius:2,backgroundColor:'#cad2c0'},
 pageTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
 wordmark:{fontSize:25,fontWeight:'800',letterSpacing:-1.4,color:C.ink},
 headerActionBtn:{width:48,height:48,borderRadius:16,backgroundColor:'#edf2e4',alignItems:'center',justifyContent:'center'},
 dot:{position:'absolute',right:11,top:11,width:8,height:8,borderRadius:4,backgroundColor:'#7ea84c',borderWidth:1.5,borderColor:'#edf2e4'},
 iconHitTarget:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'},
 cancelInlineBtn:{minHeight:40,paddingHorizontal:10,justifyContent:'center'},
 refBalanceCard:{backgroundColor:'#FFFFFF',borderRadius:24,padding:20,marginBottom:12,borderWidth:1,borderColor:C.line},
 refBalanceLabel:{fontSize:13,color:C.muted,fontWeight:'500'},
 refBalanceWhole:{fontSize:42,fontWeight:'800',color:C.ink,letterSpacing:-1.4},
 refBalanceFraction:{fontSize:23,fontWeight:'700',color:C.muted,letterSpacing:-0.5},
 eyeBtn:{width:48,height:48,borderRadius:24,backgroundColor:'#f0f4e9',alignItems:'center',justifyContent:'center'},
 heldBanner:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fdf4e7',borderColor:'#f2d7b6',borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingVertical:8,marginBottom:14},
 refActionRow:{flexDirection:'row',gap:10},
 refActionBtn:{flex:1,minHeight:50,borderRadius:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},
 refActionBtnText:{color:'#FFFFFF',fontSize:13,fontWeight:'700',letterSpacing:-0.2},
 savedPaymentsCard:{backgroundColor:'#FFFFFF',borderRadius:20,paddingHorizontal:16,paddingVertical:14,minHeight:68,flexDirection:'row',alignItems:'center',gap:12,marginBottom:22,borderWidth:1,borderColor:C.line},
 savedPaymentsIcon:{width:42,height:42,borderRadius:14,backgroundColor:'#f0f4e9',alignItems:'center',justifyContent:'center'},
 savedPaymentsTitle:{fontSize:14,fontWeight:'700',color:C.ink,letterSpacing:-0.2},
 savedPaymentsSub:{fontSize:11,color:C.muted,marginTop:2},
 servicesHeader:{fontSize:10,fontWeight:'700',color:C.muted,letterSpacing:1.4,marginBottom:10,paddingHorizontal:2},
 bentoGrid:{gap:12},
 bentoRow:{flexDirection:'row',gap:12},
 bentoCard:{flex:1,height:154,backgroundColor:'#FFFFFF',borderRadius:22,padding:16,overflow:'hidden',justifyContent:'space-between',position:'relative',borderWidth:1,borderColor:C.line},
 bentoCardForest:{backgroundColor:'#173b30',borderColor:'#173b30'},
 bentoTitleWhite:{fontSize:15,fontWeight:'800',color:'#FFFFFF',lineHeight:20,letterSpacing:-0.3},
 bentoSubLime:{fontSize:11,fontWeight:'600',color:C.lime,marginTop:4},
 bentoTitleDark:{fontSize:13,fontWeight:'600',color:C.muted,letterSpacing:-0.2},
 bentoValueDark:{fontSize:18,fontWeight:'800',color:C.ink,marginTop:4,letterSpacing:-0.5},
 bentoImage:{position:'absolute',right:-6,bottom:-6,width:94,height:94,borderRadius:18},
 loading:{flex:1,justifyContent:'center',alignItems:'center',padding:24},
 toast:{position:'absolute',bottom:88,left:16,right:16,backgroundColor:'#ecf6df',borderColor:'#d1e5b3',borderWidth:1,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:10,maxWidth:400,alignSelf:'center'},
 toastError:{position:'absolute',bottom:88,left:16,right:16,backgroundColor:'#fae9df',borderRadius:14,padding:14,maxWidth:400,alignSelf:'center'},
 tabBarWrap:{backgroundColor:'white',borderTopWidth:1,borderTopColor:C.line,paddingTop:6,paddingBottom:Platform.OS==='web'?8:20},
 tabBarInner:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around',maxWidth:430,width:'100%',alignSelf:'center',paddingHorizontal:6},
 tabItem:{flex:1,minHeight:48,alignItems:'center',justifyContent:'center',paddingVertical:2},
 tabIconWrap:{width:40,height:30,borderRadius:15,alignItems:'center',justifyContent:'center'},
 qrButton:{width:48,height:48,borderRadius:16,backgroundColor:C.lime,alignItems:'center',justifyContent:'center',marginTop:-20,borderWidth:3,borderColor:'white',shadowColor:'#17352e',shadowOffset:{width:0,height:4},shadowOpacity:0.15,shadowRadius:8,elevation:4},
 tabLabel:{fontSize:10,color:'#839081',fontWeight:'500',marginTop:3},
 fullScanner:{flex:1,backgroundColor:'#0d1f1a',justifyContent:'space-between',alignItems:'center',paddingVertical:24,paddingHorizontal:20},
 fullScannerTop:{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:12,zIndex:2},
 torchBtn:{width:48,height:48,borderRadius:24,backgroundColor:'rgba(15,38,31,0.75)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(203,239,147,0.28)'},
 reticleBox:{width:236,height:236,position:'relative'},
 corner:{position:'absolute',width:36,height:36,borderColor:C.lime},
 cornerTL:{top:0,left:0,borderTopWidth:4,borderLeftWidth:4,borderTopLeftRadius:18},
 cornerTR:{top:0,right:0,borderTopWidth:4,borderRightWidth:4,borderTopRightRadius:18},
 cornerBL:{bottom:0,left:0,borderBottomWidth:4,borderLeftWidth:4,borderBottomLeftRadius:18},
 cornerBR:{bottom:0,right:0,borderBottomWidth:4,borderRightWidth:4,borderBottomRightRadius:18},
 authGearBtn:{width:40,height:40,borderRadius:13,backgroundColor:'#ebf0e2',alignItems:'center',justifyContent:'center'},
 authSegmentWrap:{flexDirection:'row',backgroundColor:'#e8eee0',borderRadius:16,padding:4,marginBottom:14},
 authSegmentBtn:{flex:1,minHeight:44,borderRadius:13,alignItems:'center',justifyContent:'center'},
 authSegmentBtnActive:{backgroundColor:'#FFFFFF',shadowColor:'#17352e',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:4,elevation:2},
 authSegmentText:{fontSize:13,fontWeight:'600',color:C.muted},
 authSegmentTextActive:{color:C.ink,fontWeight:'800'},
 authFormCard:{backgroundColor:'#FFFFFF',borderRadius:24,padding:18,marginBottom:14,borderWidth:1,borderColor:C.line},
 demoPeopleRow:{flexDirection:'row',gap:8},
 demoPersonCard:{flex:1,backgroundColor:'#f7f8f3',borderRadius:18,padding:10,borderWidth:1.5,borderColor:C.line,overflow:'hidden',position:'relative',minHeight:96,justifyContent:'space-between'},
 demoPersonCardActive:{backgroundColor:'#f1f7e7',borderColor:C.ink},
 demoPersonBgImg:{position:'absolute',right:-10,bottom:-10,width:48,height:48,borderRadius:12,opacity:0.9},
 demoPersonAvatar:{width:32,height:32,borderRadius:16,backgroundColor:C.ink,alignItems:'center',justifyContent:'center'},
 demoPersonAvatarText:{color:'#FFFFFF',fontSize:13,fontWeight:'800'},
 demoPersonName:{fontSize:13,fontWeight:'800',color:C.ink,marginTop:8},
 demoPersonSub:{fontSize:10,color:C.muted,marginTop:1},
 signupStepHeader:{flexDirection:'row',alignItems:'center',backgroundColor:'#f7f8f3',borderRadius:18,padding:12,marginBottom:16,borderWidth:1,borderColor:C.line},
 signupStepImg:{width:68,height:68,borderRadius:14},
 simaOneTapCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#f7f8f3',borderRadius:18,padding:12,marginBottom:10,borderWidth:1.5,borderColor:C.line},
 simaOneTapCardActive:{backgroundColor:'#eef6e2',borderColor:C.ink},
 simaOneTapImg:{width:52,height:52,borderRadius:14}
});
