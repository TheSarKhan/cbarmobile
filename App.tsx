import React,{useState,useEffect,useRef,useCallback} from 'react';
import {View,Text,ScrollView,Pressable,StyleSheet,Platform,RefreshControl,AppState,ActivityIndicator,useWindowDimensions,Animated,Easing,Image,BackHandler} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {NavigationContainer,useFocusEffect} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {LinearGradient} from 'expo-linear-gradient';
import {CameraView,useCameraPermissions} from 'expo-camera';
import {C,S,CARD_IMAGES,AppContextType,Context,useApp,statusLabel,statusTone,Icon,Button,Field,Check,Badge,Box,Empty,Sheet,Tx} from './src/ui';
import {Operations} from './src/OperationsSheet';
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
  [filterCat,setFilterCat]=useState('Hamısı');

 const allTx:Row[]=d.transactions||[];
 const filteredTx=filterCat==='Hamısı'?allTx:allTx.filter(t=>t.category===filterCat);

 return (
  <Page>
   <Text style={S.eyebrow}>XƏRCLƏR VƏ BÜDCƏ</Text>
   <Text style={S.h1}>Tarixçə.</Text>
   <Text style={[S.muted,{marginTop:8,marginBottom:18}]}>
    Bu ayın xərcləri: <Text style={{color:C.ink,fontWeight:'700'}}>{money(d.analytics?.totalMinor||0)}</Text>. Detallara baxmaq və kateqoriyanı dəyişmək üçün əməliyyata toxun.
   </Text>

   <Box>
    <Text style={[S.h3,{marginBottom:12}]}>Kateqoriya üzrə aylıq büdcə</Text>
    <View style={{flexDirection:'row',gap:6,flexWrap:'wrap',marginBottom:12}}>
     {['Yemək','Abunəliklər','Köçürmələr','Nəqliyyat','Əyləncə'].map(c=>(
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

   <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}} contentContainerStyle={{gap:8}}>
    {['Hamısı','Yemək','Abunəliklər','Köçürmələr','Nəqliyyat','Əyləncə'].map(c=>(
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
  [phone,setPhone]=useState('+994501000001'),
  [pin,setPin]=useState(process.env.EXPO_PUBLIC_DEPLOYED==='true'?'':'123456'),
  [signup,setSignup]=useState(false),
  [otp,setOtp]=useState<Row|null>(null),
  [code,setCode]=useState(''),
  [name,setName]=useState(''),
  [fin,setFin]=useState('7AZ9999'),
  [birth,setBirth]=useState('2003-03-15'),
  [livenessDone,setLivenessDone]=useState(false),
  [simaSigned,setSimaSigned]=useState(false),
  [consent,setConsent]=useState(false),
  [showAdvSignup,setShowAdvSignup]=useState(false),
  [showConfig,setShowConfig]=useState(false);

 const lastInteraction=useRef(0);
 const logout=useCallback(()=>{
  if(token)request(base,token,device,'auth/logout',{}).catch(()=>{});
  setToken('');
  setData(null);
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
    if(url)setBase(url);
    const saved=await storage.get('token');
    if(saved)setToken(saved);
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

 const refresh=useCallback(async()=>{
  if(!token||!device)return;
  try{
   setData(await call('dashboard'));
   setError(current=>current===CONNECTION_ERROR_MESSAGE?'':current);
  }catch(e){setError((e as Error).message);}
 },[token,device,call]);

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
   if(!path.endsWith('/parse')&&!path.endsWith('/read')&&path!=='crypto/quotes')
    setMessage(path==='transfers'?'Köçürmə yaradıldı. Statusu ödənişlərdə izlə.':'Əməliyyat uğurla tamamlandı.');
   return result;
  }catch(e){
   if((e as Error).message!=='Ləğv edildi')setError((e as Error).message);
   throw e;
  }finally{setBusy(false);}
 },[base,token,device,refresh]);

 async function login(){
  setBusy(true);setError('');
  try{
   const r=await request(base,'',device,'auth/login',{phone,pin,deviceId:device});
   if(r.user.role!=='USER')throw new Error('Mobil tətbiqə tələbə hesabı ilə daxil olun.');
   await storage.set('token',r.accessToken);
   await storage.set('api',base);
   lastInteraction.current=Date.now();
   setToken(r.accessToken);
   setPin('');
  }catch(e){setError((e as Error).message);}
  finally{setBusy(false);}
 }

 async function register(){
  setBusy(true);setError('');
  try{
   if(!otp){const r=await request(base,'',device,'auth/otp',{phone});setOtp(r);setCode(r.demoCode);return;}
   const r=await request(base,'',device,'auth/register',{
    otpId:otp.id||otp.otpId,
    otp:code,
    name,
    fin,
    birthDate:birth,
    facesCount:livenessDone?1:2,
    simaSigned,
    pin,
    deviceId:device,
    termsAccepted:consent,
    dataConsent:consent
   });
   await storage.set('token',r.accessToken);
   await storage.set('api',base);
   lastInteraction.current=Date.now();
   setToken(r.accessToken);
   setPin('');
   setSignup(false);
   setOtp(null);
  }catch(e){setError((e as Error).message);}
  finally{setBusy(false);}
 }

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
   ):!token?(
    <SafeAreaView style={S.page}>
     <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[S.content,{flexGrow:1,paddingTop:14,paddingBottom:28}]}
     >
      <View style={[S.between,{marginBottom:14}]}>
       <Text style={[styles.wordmark,{fontSize:27}]}>kampus<Text style={{color:'#9bc26b'}}>.</Text></Text>
       <View style={S.row}>
        <Badge text="DEMO"/>
        <Pressable
         accessibilityRole="button"
         accessibilityLabel="API bağlantısını tənzimlə"
         onPress={()=>setShowConfig(true)}
         style={styles.authGearBtn}
        >
         <Icon name="options-outline" size={19} color={C.ink}/>
        </Pressable>
       </View>
      </View>

      <View style={styles.authHeroCard}>
       <Image source={CARD_IMAGES.authHero} style={styles.authHeroImg} resizeMode="cover"/>
       <View style={styles.authHeroContent}>
        <Text style={styles.authHeroTitle}>
         {signup?'Rəqəmsal tələbə hesabın':'Pulun da səninlə olsun'}
        </Text>
        <Text style={styles.authHeroSub}>
         {signup
          ?'SİMA və eKYC ilə saniyələr içində hesab aç, dərhal istifadəyə başla.'
          :'Komissiyasız köçürmə, 0% Sonra ödə və virtual kartlar tək tətbiqdə.'}
        </Text>
       </View>
      </View>

      <View style={styles.authVisualRow}>
       <View style={styles.authVisualMiniCard}>
        <Image source={CARD_IMAGES.credit} style={styles.authVisualMiniImg} resizeMode="cover"/>
        <Text style={styles.authVisualMiniTitle}>0% Sonra ödə</Text>
        <Text style={styles.authVisualMiniSub}>1 500 ₼-dək</Text>
       </View>
       <View style={styles.authVisualMiniCard}>
        <Image source={CARD_IMAGES.virtualCard} style={styles.authVisualMiniImg} resizeMode="cover"/>
        <Text style={styles.authVisualMiniTitle}>Virtual kart</Text>
        <Text style={styles.authVisualMiniSub}>Ani rəqəmsal</Text>
       </View>
       <View style={styles.authVisualMiniCard}>
        <Image source={CARD_IMAGES.split} style={styles.authVisualMiniImg} resizeMode="cover"/>
        <Text style={styles.authVisualMiniTitle}>Hesabı böl</Text>
        <Text style={styles.authVisualMiniSub}>Dostlarla 50/50</Text>
       </View>
      </View>

      <View style={styles.authSegmentWrap}>
       <Pressable
        accessibilityRole="button"
        onPress={()=>{setSignup(false);setOtp(null);setError('');}}
        style={[styles.authSegmentBtn,!signup&&styles.authSegmentBtnActive]}
       >
        <Text style={[styles.authSegmentText,!signup&&styles.authSegmentTextActive]}>Daxil ol</Text>
       </Pressable>
       <Pressable
        accessibilityRole="button"
        onPress={()=>{setSignup(true);setOtp(null);setError('');}}
        style={[styles.authSegmentBtn,signup&&styles.authSegmentBtnActive]}
       >
        <Text style={[styles.authSegmentText,signup&&styles.authSegmentTextActive]}>Yeni hesab</Text>
       </Pressable>
      </View>

      {error&&<View style={S.error}><Text style={S.errorText}>{error}</Text></View>}

      {!signup?(
       <View style={styles.authFormCard}>
        <Text style={[S.label,{marginBottom:10}]}>TƏLƏBƏ HESABINI SEÇ (1 TOXUNUŞLA)</Text>
        <View style={styles.demoPeopleRow}>
         {([
          ['Aytən','+994501000001','I kurs',CARD_IMAGES.credit],
          ['Murad','+994501000002','III kurs',CARD_IMAGES.virtualCard],
          ['Leyla','+994501000003','Magistr',CARD_IMAGES.split]
         ] as const).map(([n,p,role,img])=>{
          const active=phone===p;
          return (
           <Pressable
            key={p}
            accessibilityRole="button"
            onPress={()=>{setPhone(p);setPin(process.env.EXPO_PUBLIC_DEPLOYED==='true'?'':'123456');setError('');}}
            style={[styles.demoPersonCard,active&&styles.demoPersonCardActive]}
           >
            <Image source={img} style={styles.demoPersonBgImg} resizeMode="cover"/>
            <View style={S.between}>
             <View style={[styles.demoPersonAvatar,active&&{backgroundColor:C.lime}]}>
              <Text style={[styles.demoPersonAvatarText,active&&{color:C.ink}]}>{n[0]}</Text>
             </View>
             <Icon
              name={active?'checkmark-circle':'ellipse-outline'}
              size={18}
              color={active?C.ink:C.muted}
             />
            </View>
            <Text style={styles.demoPersonName}>{n}</Text>
            <Text style={styles.demoPersonSub} numberOfLines={1}>{role}</Text>
           </Pressable>
          );
         })}
        </View>

        <View style={[S.line,{marginVertical:14}]}/>

        <Field label="Telefon nömrəsi" value={phone} onChange={setPhone} placeholder="+994501000001"/>
        <Field label="6 rəqəmli PIN" value={pin} onChange={setPin} secure numeric placeholder="••••••"/>
        <Button
         title={busy?'Daxil olunur…':'Daxil ol'}
         icon="arrow-forward"
         disabled={busy}
         onPress={login}
        />
       </View>
      ):(
       <>
        {!otp?(
         <View style={styles.authFormCard}>
          <View style={styles.signupStepHeader}>
           <View style={{flex:1,paddingRight:10}}>
            <Badge text="ADDIM 1 / 2" tone="success"/>
            <Text style={[S.h2,{marginTop:8}]}>Nömrəni daxil et</Text>
            <Text style={[S.muted,{marginTop:4}]}>
             Yalnız mobil nömrə kifayətdir — kimlik məlumatları SİMA-dan avtomatik gələcək.
            </Text>
           </View>
           <Image source={CARD_IMAGES.topupCard} style={styles.signupStepImg} resizeMode="cover"/>
          </View>

          <Field label="Telefon nömrəsi" value={phone} onChange={setPhone} placeholder="+994501000001"/>
          <Button
           title={busy?'Göndərilir…':'SMS kodu al'}
           icon="chatbubble-ellipses-outline"
           disabled={busy}
           onPress={register}
          />
         </View>
        ):(
         <View style={styles.authFormCard}>
          <View style={styles.signupStepHeader}>
           <View style={{flex:1,paddingRight:10}}>
            <Badge text="SMS + EKYC SİMULYASİYASI" tone="success"/>
            <Text style={[S.h3,{marginTop:8}]}>SMS kod ({otp.demoCode}) təsdiqləndi</Text>
            <Text style={[S.muted,{marginTop:4,fontSize:11}]}>
             SİMA FİN: {fin} · Doğum: {birth}
            </Text>
           </View>
           <Image source={CARD_IMAGES.topupBank} style={styles.signupStepImg} resizeMode="cover"/>
          </View>

          <Field label="Ad və soyad" value={name} onChange={setName} placeholder="Məsələn, Əli Vəliyev"/>
          <Field label="6 rəqəmli PIN təyin et" value={pin} onChange={setPin} secure numeric placeholder="••••••"/>

          <Pressable
           accessibilityRole="button"
           onPress={()=>{
            const next=!(livenessDone&&simaSigned&&consent);
            setLivenessDone(next);
            setSimaSigned(next);
            setConsent(next);
           }}
           style={[
            styles.simaOneTapCard,
            livenessDone&&simaSigned&&consent&&styles.simaOneTapCardActive
           ]}
          >
           <Image source={CARD_IMAGES.topupTerminal} style={styles.simaOneTapImg} resizeMode="cover"/>
           <View style={{flex:1}}>
            <Text style={{fontSize:13,fontWeight:'800',color:C.ink}}>
             SİMA İmza və Canlılıq təsdiqi
            </Text>
            <Text style={{fontSize:11,color:C.muted,marginTop:2,lineHeight:16}}>
             Demo canlılıq addımını, SİMA elektron imzanı və xidmət şərtlərini təsdiqləyirəm (kamera və ML Kit yoxlaması aparılmır).
            </Text>
           </View>
           <Icon
            name={livenessDone&&simaSigned&&consent?'checkmark-circle':'ellipse-outline'}
            size={24}
            color={livenessDone&&simaSigned&&consent?C.ink:C.muted}
           />
          </Pressable>

          <Pressable
           accessibilityRole="button"
           onPress={()=>setShowAdvSignup(!showAdvSignup)}
           style={{paddingVertical:8,alignItems:'center',marginBottom:4}}
          >
           <Text style={[S.link,{fontSize:11}]}>
            {showAdvSignup?'Test parametrlərini gizlət ▲':'FİN / SMS kodunu əllə dəyiş (Test) ▼'}
           </Text>
          </Pressable>

          {showAdvSignup&&(
           <View style={{backgroundColor:'#f7f8f3',borderRadius:16,padding:12,marginBottom:12,borderWidth:1,borderColor:C.line}}>
            <Field label="SMS kodu" value={code} onChange={setCode} numeric/>
            <Field label="FİN kod (7 simvol · 17YASLI və ya LOWFACE)" value={fin} onChange={setFin}/>
            <Field label="Doğum tarixi · YYYY-MM-DD" value={birth} onChange={setBirth}/>
           </View>
          )}

          <Button
           title={busy?'Yaradılır…':'SİMA ilə təsdiqlə və yarat'}
           icon="shield-checkmark-outline"
           disabled={busy||!consent||!livenessDone||!simaSigned}
           onPress={register}
          />
          <Button
           title="Nömrəni dəyiş"
           secondary
           disabled={busy}
           onPress={()=>setOtp(null)}
          />
         </View>
        )}
       </>
      )}

      <Sheet title="API bağlantısını tənzimlə" visible={showConfig} onClose={()=>setShowConfig(false)}>
       <Field label="Backend API ünvanı" value={base} onChange={setBase} placeholder="http://192.168.1.10:8080/api/v1"/>
       <Button title="Yadda saxla və bağla" onPress={()=>setShowConfig(false)}/>
      </Sheet>
     </ScrollView>
    </SafeAreaView>
   ):!data?(
    <View style={styles.loading}>
     <ActivityIndicator color={C.ink}/>
     {error&&(
      <View style={{width:'100%',maxWidth:340,marginTop:16}}>
       <Text style={[S.errorText,{marginBottom:16,textAlign:'center'}]}>{error}</Text>
       <Button title="Yenidən yoxla" onPress={refresh}/>
       <Button title="Girişə qayıt" secondary onPress={logout}/>
      </View>
     )}
    </View>
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
     <Sheet title="Əməliyyatı təsdiqlə" visible={!!sca} onClose={()=>{sca?.reject(new Error('Ləğv edildi'));setSca(null);}}>
      <Box>
       <View style={S.row}>
        <Icon name="shield-checkmark-outline" color="#7fa157" size={25}/>
        <Text style={[S.muted,{flex:1}]}>Təhlükəsizlik üçün bu əməliyyatı 6 rəqəmli PIN ilə təsdiqlə.</Text>
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
      {error&&<View style={S.error}><Text style={S.errorText}>{error}</Text></View>}
      <Field label="6 rəqəmli PIN" value={scaPin} onChange={setScaPin} secure numeric/>
      <Button
       title="Təsdiqlə"
       disabled={scaPin.length!==6}
       onPress={async()=>{
        try{
         const r=await call('auth/sca',{pin:scaPin,payload:{action:sca!.path,data:sca!.body}});
         sca!.resolve(r.proof);
         setSca(null);
         setError('');
        }catch(e){setError((e as Error).message);}
       }}
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
 authHeroCard:{backgroundColor:'#173b30',borderRadius:24,overflow:'hidden',marginBottom:12,borderWidth:1,borderColor:'#254c3c'},
 authHeroImg:{width:'100%',height:158},
 authHeroContent:{paddingHorizontal:18,paddingTop:14,paddingBottom:16},
 authHeroTitle:{fontSize:22,fontWeight:'800',color:'#FFFFFF',letterSpacing:-0.6},
 authHeroSub:{fontSize:12,color:'#bfd1b6',lineHeight:18,marginTop:5},
 authVisualRow:{flexDirection:'row',gap:8,marginBottom:14},
 authVisualMiniCard:{flex:1,backgroundColor:'#FFFFFF',borderRadius:18,padding:10,borderWidth:1,borderColor:C.line,overflow:'hidden',minHeight:92,justifyContent:'flex-end'},
 authVisualMiniImg:{position:'absolute',right:-6,top:-6,width:52,height:52,borderRadius:12},
 authVisualMiniTitle:{fontSize:11,fontWeight:'800',color:C.ink,letterSpacing:-0.2,marginTop:28},
 authVisualMiniSub:{fontSize:10,color:C.muted,marginTop:1},
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
