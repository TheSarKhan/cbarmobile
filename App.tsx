import React,{useState,useEffect,useRef,useCallback} from 'react';
import {View,ScrollView,Pressable,StyleSheet,Platform,RefreshControl,AppState,ActivityIndicator,useWindowDimensions,Animated,Easing,BackHandler,Image} from 'react-native';
import {Text,TextInput} from './src/text';
import {StatusBar} from 'expo-status-bar';
import {useFonts} from 'expo-font';
import {PlusJakartaSans_400Regular,PlusJakartaSans_500Medium,PlusJakartaSans_600SemiBold,PlusJakartaSans_700Bold,PlusJakartaSans_800ExtraBold} from '@expo-google-fonts/plus-jakarta-sans';
import {FONT_FILES} from './src/text';
import {SafeAreaProvider,SafeAreaView,useSafeAreaInsets} from 'react-native-safe-area-context';
import {NavigationContainer,createNavigationContainerRef,useFocusEffect,useIsFocused,useNavigation} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {LinearGradient} from 'expo-linear-gradient';
import {CameraView,useCameraPermissions} from 'expo-camera';
import './src/qrWasm';
import {C,S,ILLUSTRATIONS,Avatar,BackBar,ErrorPopup,fmtDate,fmtDateTime,cardLabel,linkedCards,AppContextType,Context,useApp,statusLabel,statusTone,Icon,Button,Field,Check,Badge,Box,Empty,Sheet,Tx,EXPENSE_CATEGORIES} from './src/ui';
import {Operations} from './src/OperationsSheet';
import AuthFlow from './src/AuthFlow';
import Onboarding from './src/Onboarding';
import {BankMark} from './src/BanksSection';
import {AnalyticsView} from './src/Analytics';
import PinPad from './src/PinPad';
import Liveness from './src/Liveness';
import {recentRecipients} from './src/bugRules';
import type {LivenessResult} from './src/livenessTypes';
import {DEFAULT_API,storage,request,ApiError,minor,money,Row,hashPhones,errorCode,CONNECTION_ERROR_MESSAGE} from './src/api';

const Tab=createBottomTabNavigator();
const navRef=createNavigationContainerRef();

function Page({children,title,back,onBack}:{children:React.ReactNode;title?:string;back?:boolean;onBack?:()=>void}){
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
    {(back||!!onBack)&&<BackBar onBack={onBack||(()=>nav.goBack())}/>}
    {!!title&&<Text style={styles.pageTitle}>{title}</Text>}
    {children}
   </ScrollView>
  </SafeAreaView>
 );
}

const recentPeople=recentRecipients;

function Home({navigation}:any){
 const a=useApp(),d=a.data;
 const [hide,setHide]=useState(true);
 const visibilityKey=d.user?.id?'balance-hidden-'+d.user.id:'';
 useEffect(()=>{if(!visibilityKey)return;let alive=true;storage.get(visibilityKey).then(value=>{if(alive)setHide(value==='1');}).catch(()=>{});return()=>{alive=false;};},[visibilityKey]);
 const toggleBalance=()=>setHide(previous=>{const next=!previous;if(visibilityKey)storage.set(visibilityKey,next?'1':'0').catch(()=>{});return next;});
 const focused=useIsFocused();
 const unreadCount=(d.notifications||[]).filter((n:Row)=>!n.read).length;
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
      <Avatar name={d.user?.name||'K'} avatar={d.user?.avatar} size={46} dark/>
      <Text style={styles.hello}>Salam,{'\n'}{firstName||'dost'}!</Text>
      <View style={{flexDirection:'row',alignItems:'center'}}>
       <Pressable accessibilityRole="button" accessibilityLabel="Bildirişlər" onPress={()=>a.open('notifications')} style={styles.gear}>
        <Icon name="notifications-outline" size={22} color="#fff"/>
        {unreadCount>0&&<View style={styles.bellDot}><Text style={styles.bellDotText}>{unreadCount>9?'9+':unreadCount}</Text></View>}
       </Pressable>
       <Pressable accessibilityRole="button" accessibilityLabel="Profil və ayarlar" onPress={()=>navigation.navigate('Profile')} style={styles.gear}>
        <Icon name="settings-outline" size={22} color="#fff"/>
       </Pressable>
      </View>
     </View>

     <View style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>Əsas balans</Text>
      <View style={styles.balanceRow}>
       {hide?(
        <Text style={styles.balanceWhole}>•••••</Text>
       ):(
        <Text style={styles.balanceWhole}>{whole}<Text style={styles.balanceFrac}>.{frac} ₼</Text></Text>
       )}
       <Pressable accessibilityRole="button" accessibilityLabel={hide?'Balansı göstər':'Balansı gizlət'} onPress={toggleBalance} hitSlop={12} style={{marginLeft:10}}>
        <Icon name={hide?'eye-outline':'eye-off-outline'} color="rgba(255,255,255,0.7)" size={20}/>
       </Pressable>
      </View>
      {d.wallet?.heldAmountMinor>0&&(
       <Text style={styles.heldText}>{money(d.wallet.heldAmountMinor)} əməliyyat üçün rezerv edilib</Text>
      )}
      <View style={styles.actionRow}>
       {[['Artır','arrow-up','add'],['Köçür','swap-horizontal','send-menu']].map(([label,icon,sheet],i)=>(
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
      <Pressable accessibilityRole="button" accessibilityLabel="Yeni köçürmə" onPress={()=>a.open('send-menu')} style={styles.person}>
       <View style={styles.addCircle}><Icon name="add" size={28} color={C.primary}/></View>
       <Text style={styles.personName}>Əlavə et</Text>
      </Pressable>
      {people.map(p=>(
       <Pressable key={p.phone} accessibilityRole="button" accessibilityLabel={p.name+' adlı şəxsə köçür'} onPress={()=>a.open('send:'+p.phone)} style={styles.person}>
        <Avatar name={p.name} avatar={p.avatar} size={60}/>
        <Text numberOfLines={1} style={styles.personName}>{p.name.split(' ')[0]}</Text>
       </Pressable>
      ))}
     </ScrollView>

     {d.insightsBrief?.enabled&&d.insightsBrief.monthSpentMinor>0&&(
      <Pressable accessibilityRole="button" accessibilityLabel="Analitikaya bax" onPress={()=>navigation.navigate('Analytics')} style={styles.insightCard}>
       <View style={styles.insightIcon}><Icon name="sparkles-outline" size={20} color={C.primary}/></View>
       <View style={{flex:1}}>
        <Text style={styles.insightTitle}>Bu ay {money(d.insightsBrief.monthSpentMinor)} xərcləmisən</Text>
        <Text style={styles.insightSub}>Ay sonu ~{money(d.insightsBrief.projectedMinor)}{d.insightsBrief.vsLastMonthPct!=null?` · keçən aya görə ${d.insightsBrief.vsLastMonthPct>0?'+':''}${d.insightsBrief.vsLastMonthPct}%`:''}</Text>
       </View>
       {d.insightsBrief.openAnomalies>0?<Badge text={`${d.insightsBrief.openAnomalies} QEYRİ-ADİ`} tone="warn"/>:<Icon name="chevron-forward" size={18} color="#8d89a3"/>}
      </Pressable>
     )}
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

/** Shared bills: the ones the customer started and the shares other people ask them to pay. */
function SplitBills(){
 const a=useApp(),d=a.data;
 return (
  <>
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

   {d.requests?.some((r:Row)=>r.status==='OPEN')&&(
    <>
    <View style={S.section}><Text style={S.h3}>Gələn hesab payları</Text></View>
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
    </Box>
    </>
   )}

  </>
 );
}

function QrTab(){
 const focused=useIsFocused();
 const a=useApp();
 const nav=useNavigation<any>();
 const [payload,setPayload]=useState(''),
  [qr,setQr]=useState<Row|null>(null),
  [qrPaid,setQrPaid]=useState<Row|null>(null),
  [topupReq,setTopupReq]=useState<Row|null>(null),
  [friendReq,setFriendReq]=useState<Row|null>(null),
  [camera,setCamera]=useState(true),
  [torch,setTorch]=useState(false),
  [manualOpen,setManualOpen]=useState(false),
  [permission,askPermission]=useCameraPermissions(),
  [funding,setFunding]=useState('WALLET'),
  [amount,setAmount]=useState('15');

 const [enterAnim]=useState(()=>new Animated.Value(0));
 const scanLock=useRef(false),scanFailed=useRef(false);
 // one scan is handled at a time; a failed one unlocks when its error popup is closed
 useEffect(()=>{
  if(!a.error&&scanFailed.current){scanFailed.current=false;scanLock.current=false;}
 },[a.error]);
 useEffect(()=>{if(camera)scanLock.current=false;},[camera]);

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
  return ()=>{
   enterAnim.stopAnimation();
   setCamera(false);
   setTorch(false);
  };
 },[enterAnim,permission?.granted,askPermission]));

 useEffect(()=>{
  return ()=>{
   setCamera(false);
   setTorch(false);
  };
 },[]);

 async function run(fn:()=>Promise<any>){
  a.setError('');
  try{await fn();}catch(e){a.setError((e as Error).message);}
 }

 /** A scanned code is either a merchant EMV QR or a Kampus top-up request from another customer. */
 async function openCode(data:string){
  const friend=data.match(/kampus-friend:([0-9a-f-]{36})/i);
  if(friend){
   setFriendReq({...await a.call('friends/qr/'+friend[1]),qrId:friend[1]});
   return;
  }
  const topup=data.match(/kampus-topup:([0-9a-f-]{36})/i);
  if(topup){
   setTopupReq(await a.call('topups/qr/'+topup[1]));
   setAmount('');
   return;
  }
  setQr(await a.act('payments/qr/parse',{qrPayload:data}));
 }

 if(friendReq){
  const added=friendReq.added,self=friendReq.self;
  return (
   <Page>
    <Box style={{alignItems:'center',paddingVertical:26}}>
     <Avatar name={friendReq.name} avatar={friendReq.avatar} size={84}/>
     <View style={{marginTop:14}}>
      <Badge text={added||friendReq.alreadyFriend?'DOST':'KAMPUS DOSTU'} tone={added||friendReq.alreadyFriend?'success':'neutral'}/>
     </View>
     <Text style={[S.h2,{marginTop:12}]}>{friendReq.name}</Text>
     <Text style={[S.muted,{marginVertical:14,textAlign:'center'}]}>
      {self?'Bu sənin öz QR kodundur. Dostun səni oxutsun.':added?'İndi '+friendReq.name+' ilə dostsunuz. Bir-birinizin siyahısında görünürsünüz.':friendReq.alreadyFriend?'Artıq dostsunuz.':'Dostluğa əlavə etsən, ikiniz də bir-birinizin dostlar siyahısında görünəcəksiniz.'}
     </Text>
     <View style={{width:'100%'}}>
      {!self&&!added&&!friendReq.alreadyFriend&&(
       <Button title="Dostluğa əlavə et" icon="person-add-outline" disabled={a.busy} onPress={()=>run(async()=>{await a.act('friends/add',{qrId:friendReq.qrId});setFriendReq({...friendReq,added:true});})}/>
      )}
      {(added||friendReq.alreadyFriend)&&<Button title="Dostlarım" icon="people-outline" onPress={()=>{setFriendReq(null);setCamera(true);a.open('friends');}}/>}
      <Button title="Yeni QR skan et" secondary onPress={()=>{setFriendReq(null);setPayload('');setCamera(true);}}/>
     </View>
    </Box>
   </Page>
  );
 }

 if(topupReq){
  const paid=topupReq.status==='PAID',typed=Math.max(0,Number(amount.replace(',','.'))||0);
  return (
   <Page>
    <Box style={{alignItems:'center',paddingVertical:26}}>
     <View style={[S.tile,{width:68,height:68,borderRadius:24,backgroundColor:C.lime,marginBottom:16}]}>
      <Icon name={paid?'checkmark':'arrow-up-outline'} size={32}/>
     </View>
     <Badge text={paid?'ÖDƏNİLDİ':'BALANS ARTIMI QR'} tone={paid?'success':'neutral'}/>
     <Text style={[S.h2,{marginTop:12}]}>{topupReq.requesterName}</Text>
     {paid?(
      <>
       <Text style={[S.amount,{marginVertical:14}]}>{money(topupReq.amountMinor)}</Text>
       <Text style={[S.muted,{marginBottom:22,textAlign:'center'}]}>Ödəniş tamamlandı. Pul {topupReq.requesterName} adlı istifadəçinin balansına keçdi.</Text>
      </>
     ):(
      <Text style={[S.muted,{marginVertical:14,textAlign:'center'}]}>Ödəmək istədiyin məbləği yaz. Pul sənin balansından çıxıb bu istifadəçinin balansına keçəcək.</Text>
     )}
     <View style={{width:'100%'}}>
      {!paid&&(
       <>
        <Field label="Məbləğ · AZN" value={amount} onChange={setAmount} numeric/>
        <Button
         title={`${typed>0?typed.toFixed(2)+' ₼ ':''}ödə`}
         disabled={a.busy||typed<=0}
         onPress={()=>run(async()=>{setTopupReq(await a.act('topups/qr/'+topupReq.id+'/pay',{amountMinor:minor(amount)}));})}
        />
       </>
      )}
      <Button title="Yeni QR skan et" secondary onPress={()=>{setTopupReq(null);setPayload('');setCamera(true);}}/>
     </View>
    </Box>
   </Page>
  );
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
      {[['WALLET','Balans'],['BNPL','Sonra ödə'],...linkedCards(a.data).map((x:Row)=>['CARD:'+x.id,cardLabel(x)])].map(([id,label])=>(
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
     <Button
      title="Ödənişi təsdiqlə"
      disabled={a.busy}
      onPress={()=>run(async()=>{
       try{
        const paid=await a.act('payments/qr',{
         qrPayload:qr.qrPayload,
         paymentToken:qr.paymentToken,
         amountMinor:effectiveMinor,
         fundingSource:funding.startsWith('CARD:')?'BANK_CARD':funding,
         ...(funding.startsWith('CARD:')?{accountId:funding.slice(5)}:{})
        });
        setQrPaid(paid);
       }catch(e){
        // an expired or spent payment session cannot be retried: go back to the scanner for a fresh one
        if(errorCode((e as Error).message).startsWith('TOKEN_')){setQr(null);setCamera(true);}
        throw e;
       }
      })}
     />
     <Button title="Başqa QR skan et" secondary onPress={()=>{setQr(null);setCamera(true);}}/>
    </Box>
   </Page>
  );
 }

 return (
  <Animated.View style={[styles.fullScanner,{opacity:enterAnim}]}>
   {focused&&camera&&permission?.granted?(
    <CameraView
     style={StyleSheet.absoluteFill}
     facing="back"
     enableTorch={torch}
     onMountError={()=>a.setError('Kamera başladıla bilmədi. İcazəni yoxla və QR bölməsini yenidən aç.')}
     barcodeScannerSettings={{barcodeTypes:['qr']}}
     onBarcodeScanned={async({data})=>{
      if(scanLock.current)return;
      scanLock.current=true;
      setPayload(data);
      try{
       await openCode(data);
       setCamera(false);
      }catch{
       // the popup explains what is wrong; the camera keeps running and scans again once it is closed
       scanFailed.current=true;
      }
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
    <Field label="Kassadakı QR mətni" value={payload} onChange={setPayload} multiline placeholder="000201010212..."/>
    <Button
     title="QR kodu yoxla"
     disabled={a.busy||!payload}
     onPress={()=>run(async()=>{
      await openCode(payload.trim());
      setManualOpen(false);
     })}
    />
   </Sheet>
  </Animated.View>
 );
}

type CardLook={bg:string;text:string;sub:string;ring:string;blob:string};

/** A bank card of the design: holder and last digits on top, balance and a contactless mark at the bottom. */
function WalletCard({name,last4,label,value,look,compact=false}:{name:string;last4:string;label:string;value?:string;look:CardLook;compact?:boolean}){
 return (
  <View style={[styles.walletCard,{backgroundColor:look.bg},compact&&{height:150}]}>
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

const bankLook=(color:string):CardLook=>({bg:color||C.deep,text:'#fff',sub:'rgba(255,255,255,0.78)',ring:'#ffc42b',blob:'rgba(255,255,255,0.16)'});
const lastDigits=(masked:any)=>String(masked||'').replace(/\D/g,'').slice(-4)||'••••';

/** Kampus is a wallet, not a bank: this tab only shows the cards and accounts of other banks, read-only. */
function CardsTab(){
 const a=useApp(),d=a.data;
 const [picked,setPicked]=useState<string|null>(null);
 const [syncing,setSyncing]=useState(false);
 const consents:Row[]=(d.openBanking?.consents||[]).filter((c:Row)=>c.status==='AUTHORIZED'||c.status==='EXPIRED');
 const accounts:Row[]=(d.openBanking?.accounts||[]).filter((x:Row)=>consents.some(c=>c.id===x.consentId));
 const bankCards=accounts.filter(x=>x.type==='CARD');
 const consentOf=(x:Row)=>consents.find(c=>c.id===x.consentId)||{};
 const account=picked?accounts.find(x=>x.id===picked):null;

 if(account){
  const consent=consentOf(account);
  const txs:Row[]=(a.external||[]).filter((t:Row)=>t.accountId===account.id).slice(0,10);
  const expired=consent.status==='EXPIRED';
  return (
   <Page onBack={()=>setPicked(null)}>
    <View style={{height:8}}/>
    <WalletCard name={account.name||consent.bankName||'Bank kartı'} last4={lastDigits(account.masked)} label={consent.bankName||'Balans'} value={money(account.balanceMinor)} look={bankLook(consent.bankColor)}/>
    <View style={[S.between,{marginTop:14}]}>
     <Badge text={expired?'İCAZƏNİN VAXTI BİTİB':'KAMPUS-A BAĞLI'} tone={expired?'danger':'success'}/>
     <Text style={S.muted}>{consent.lastSyncAt?'Yenilənib: '+fmtDateTime(consent.lastSyncAt):'Hələ yenilənməyib'}</Text>
    </View>
    {expired?(
     <View style={{marginTop:14}}><Button title="İcazəni yenilə" icon="refresh" onPress={()=>a.open('banks-hub')}/></View>
    ):(
     <View style={{marginTop:14}}>
      <Button
       title={syncing?'Yenilənir…':'Yenilə'}
       icon="refresh"
       secondary
       disabled={syncing}
       onPress={()=>{
        setSyncing(true);
        a.call('open-banking/consents/'+consent.id+'/sync',{}).then(()=>a.refresh()).catch(e=>a.setError((e as Error).message)).finally(()=>setSyncing(false));
       }}
      />
     </View>
    )}
    <Text style={[styles.sectionTitle,{marginTop:12,marginBottom:4}]}>Son əməliyyatlar</Text>
    {txs.map(t=><Tx key={t.id} t={t} onPress={()=>a.open('tx-detail:'+t.id)}/>)}
    {!txs.length&&<Empty text="Bu kart üzrə əməliyyat tapılmadı. Yenilə düyməsini sına." icon="receipt-outline"/>}
   </Page>
  );
 }

 return (
  <Page>
   <View style={[S.between,{marginBottom:18}]}>
    <Text style={[styles.pageTitle,{marginBottom:0}]}>Kartlarım</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Bank kartı əlavə et" onPress={()=>a.open('link-bank')} hitSlop={10}>
     <Text style={styles.addCard}>Kart əlavə et  +</Text>
    </Pressable>
   </View>

   {!consents.length&&(
    <View style={styles.emptyCards}>
     <Image source={ILLUSTRATIONS.bank} style={{width:96,height:104}} resizeMode="contain"/>
     <Text style={styles.emptyTitle}>Bank kartın hələ əlavə olunmayıb</Text>
     <Text style={[S.muted,{textAlign:'center',marginTop:6,marginBottom:18}]}>Kapital, PAŞA, ABB və Rabitəbank kartlarını bağla, balans və xərclərini bir yerdə izlə və kartlarından ödəniş et.</Text>
     <Button title="Bank kartı əlavə et" icon="add" onPress={()=>a.open('link-bank')}/>
    </View>
   )}

   {bankCards.length>0&&(
    <View style={{paddingBottom:30}}>
     {bankCards.map((x,i)=>{
      const last=i===bankCards.length-1;
      const consent=consentOf(x);
      return (
       <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={(consent.bankName||'')+' '+(x.name||'kart')} onPress={()=>setPicked(x.id)} style={[!last&&{height:48},last&&{height:200}]}>
        <WalletCard name={consent.bankName||x.name} last4={lastDigits(x.masked)} label={x.name||'Balans'} value={last?money(x.balanceMinor):undefined} look={bankLook(consent.bankColor)}/>
       </Pressable>
      );
     })}
    </View>
   )}

   {consents.length>0&&(
    <View style={[S.between,{marginBottom:10}]}>
     <Text style={styles.sectionTitle}>Hesablar</Text>
     <Pressable accessibilityRole="button" onPress={()=>a.open('banks-hub')} hitSlop={10}>
      <Text style={styles.viewAll}>Banklara bax</Text>
     </Pressable>
    </View>
   )}
   {consents.map(c=>{
    const own=accounts.filter(x=>x.consentId===c.id);
    const total=own.filter(x=>x.currency==='AZN').reduce((sum,x)=>sum+(x.balanceMinor||0),0);
    return (
     <View key={c.id} style={styles.moreGroup}>
      <View style={styles.bankHead}>
       <BankMark bank={c} size={34}/>
       <Text style={styles.bankHeadName}>{c.bankName}</Text>
       {c.status==='EXPIRED'?<Badge text="İCAZƏ BİTİB" tone="danger"/>:<Text style={styles.bankHeadTotal}>{money(total)}</Text>}
      </View>
      {own.map((x,i)=>(
       <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={c.bankName+' '+(x.name||'hesab')} onPress={()=>setPicked(x.id)} style={[styles.moreRow,i===own.length-1&&{borderBottomWidth:0}]}>
        <View style={[styles.moreIcon,{backgroundColor:C.lav}]}><Icon name={x.type==='CARD'?'card-outline':'wallet-outline'} size={19} color={C.primary}/></View>
        <View style={{flex:1,minWidth:0}}>
         <Text numberOfLines={1} style={styles.moreLabel}>{x.name}</Text>
         <Text style={styles.moreSub}>{x.masked}</Text>
        </View>
        <Text style={styles.bankBalance}>{money(x.balanceMinor)}</Text>
        <Icon name="chevron-forward" size={17} color="#8d89a3"/>
       </Pressable>
      ))}
      {!own.length&&<Text style={[S.muted,{padding:14}]}>Hələ hesab gətirilməyib. “Banklara bax” bölməsində yenilə.</Text>}
     </View>
    );
   })}
   {consents.length>0&&(
    <Pressable accessibilityRole="button" onPress={()=>a.open('link-bank')} style={styles.connectBank}>
     <View style={styles.connectIcon}><Icon name="business-outline" size={22} color={C.primary}/></View>
     <View style={{flex:1}}>
      <Text style={styles.moreLabel}>Başqa bank əlavə et</Text>
      <Text style={styles.moreSub}>Kapital, PAŞA, ABB, Rabitəbank</Text>
     </View>
     <Icon name="add" size={22} color={C.primary}/>
    </Pressable>
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
    <MoreRow {...P} icon="swap-horizontal" label="Pul köçür" onPress={()=>a.open('send-menu')}/>
    <MoreRow {...G} icon="arrow-up" label="Balansı artır" onPress={()=>a.open('add')}/>
    <MoreRow {...R} icon="card-outline" label="Karta çıxar" onPress={()=>a.open('card-transfer')}/>
    <MoreRow {...P} icon="people-outline" label="Hesabı böl" onPress={()=>a.open('split')}/>
    <MoreRow {...B} icon="business-outline" label="Bank proqramı (simulyasiya)" sub="AniPay qəbul hesabını təyin et" onPress={()=>a.open('anipay-bank')} last/>
   </View>
   <SplitBills/>
   <View style={styles.moreGroup}>
    <MoreRow {...P} icon="pie-chart-outline" label="Analitika və büdcə" sub="Proqnoz, abunəliklər, qeyri-adi ödənişlər" onPress={()=>navigation.navigate('Analytics')}/>
    <MoreRow {...B} icon="business-outline" label="Digər banklar" sub={banks>0?`${banks} bank bağlı · ${money(d.openBanking?.totalBalanceMinor||0)}`:'Kartlarını və xərclərini bir yerdə izlə'} onPress={()=>a.open('banks-hub')}/>
    <MoreRow {...G} icon="school-outline" label="Sonra ödə və kredit" sub={`0% BNPL · ${money(d.bnplAvailableMinor)}`} onPress={()=>a.open('credit-hub')}/>
    <MoreRow {...P} icon="people-circle-outline" label="Dostlar" sub="Kampus dostların" onPress={()=>a.open('friends')}/>
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

function AnalyticsTab(){
 return <Page back><AnalyticsView/></Page>;
}

function ProfileTab(){
 const a=useApp(),d=a.data;
 const [askDelete,setAskDelete]=useState(false);
 const [pinForm,setPinForm]=useState(false);
 const [curPin,setCurPin]=useState(''),[newPin,setNewPin]=useState(''),[repeatPin,setRepeatPin]=useState('');
 const pinLen=Number(d.user?.pinLength)||4;
 const pinError=newPin&&(!/^[0-9]+$/.test(newPin)||newPin.length!==pinLen)?`Yeni PIN ${pinLen} rəqəm olmalıdır.`:newPin&&newPin===curPin?'Yeni PIN köhnəsindən fərqli olmalıdır.':repeatPin&&repeatPin!==newPin?'PIN-lər uyğun gəlmir.':'';
 const pinReady=curPin.length>0&&newPin.length===pinLen&&repeatPin===newPin&&!pinError;
 async function changePin(){
  try{await a.call('auth/pin/change',{currentPin:curPin,newPin});setPinForm(false);setCurPin('');setNewPin('');setRepeatPin('');a.setMessage('PIN dəyişdirildi.');}
  catch(e){a.setError((e as Error).message);}
 }
 const rows:[string,string,string,string][]=[
  ['person-outline','Ad və soyad',d.user?.name||'','#ece6ff'],
  ['call-outline','Mobil nömrə',d.user?.phone||'','#dcf3e4'],
  ['card-outline','FİN kod',d.user?.finMasked||d.user?.fin||'—','#fef4e6'],
  ['document-text-outline','ŞV seriyası',d.user?.idSeriesMasked||d.user?.idSeries||'—','#f3e8ff'],
  ['shield-checkmark-outline','Şəxsiyyət statusu','SİMA · KYC təsdiqlənib','#dde9ff']
 ];
 return (
  <Page back>
   <Text style={styles.profileTitle}>Profil</Text>
   <View style={{alignItems:'center',marginVertical:22}}>
    <Avatar name={d.user?.name||'K'} avatar={d.user?.avatar} size={104}/>
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
   <Pressable accessibilityRole="switch" accessibilityState={{checked:d.insightsBrief?.enabled!==false}} onPress={()=>{a.act('analytics/consent',{enabled:d.insightsBrief?.enabled===false}).catch(()=>{});}} style={styles.prefRow}>
    <View style={[styles.moreIcon,{backgroundColor:C.lav}]}><Icon name="sparkles-outline" size={19} color={C.primary}/></View>
    <View style={{flex:1}}>
     <Text style={styles.moreLabel}>Xərc təhlili</Text>
     <Text style={styles.moreSub}>Proqnoz, abunəliklər və qeyri-adi ödəniş xəbərdarlıqları</Text>
    </View>
    <View style={[styles.switchTrack,d.insightsBrief?.enabled!==false&&{backgroundColor:C.primary}]}><View style={[styles.switchKnob,d.insightsBrief?.enabled!==false&&{alignSelf:'flex-end'}]}/></View>
   </Pressable>
   <Text style={[S.muted,{marginBottom:18}]}>5 dəqiqə aktivlik olmadıqda sessiya avtomatik bağlanır.</Text>
   {!pinForm?(
    <Button title="PIN-i dəyiş" secondary icon="key-outline" onPress={()=>setPinForm(true)}/>
   ):(
    <View style={{marginBottom:16}}>
     <Text style={[S.h3,{marginBottom:10}]}>PIN-i dəyiş</Text>
     <Field label="Cari PIN" value={curPin} onChange={t=>setCurPin(t.replace(/\D/g,'').slice(0,6))} secure numeric/>
     <Field label={`Yeni PIN (${pinLen} rəqəm)`} value={newPin} onChange={t=>setNewPin(t.replace(/\D/g,'').slice(0,6))} secure numeric error={pinError==='PIN-lər uyğun gəlmir.'?'':pinError} eager/>
     <Field label="Yeni PIN təkrar" value={repeatPin} onChange={t=>setRepeatPin(t.replace(/\D/g,'').slice(0,6))} secure numeric error={pinError==='PIN-lər uyğun gəlmir.'?pinError:''} eager/>
     <Button title="PIN-i yadda saxla" disabled={!pinReady||a.busy} onPress={()=>{void changePin();}}/>
     <Pressable accessibilityRole="button" onPress={()=>{setPinForm(false);setCurPin('');setNewPin('');setRepeatPin('');}} style={{alignItems:'center',padding:14}}><Text style={{color:C.muted,fontWeight:'600'}}>Ləğv et</Text></Pressable>
    </View>
   )}
   <Button title="Hesabdan çıx" danger icon="log-out-outline" onPress={a.logout}/>
   {!askDelete?(
    <Pressable accessibilityRole="button" onPress={()=>setAskDelete(true)} style={{alignItems:'center',padding:18}}>
     <Text style={{color:C.red,fontWeight:'700',fontSize:15}}>Hesabı sil</Text>
    </Pressable>
   ):(
    <View style={{marginTop:16,padding:16,borderRadius:18,backgroundColor:'#fff1f1',borderWidth:1,borderColor:'#f2c9c9'}}>
     <Text style={[S.h3,{marginBottom:6}]}>Hesabı silmək istəyirsən?</Text>
     <Text style={[S.muted,{marginBottom:14}]}>Əməliyyatlar, kartlar və şəxsi məlumatların silinir. Balansda qalan pul bağlanır. Eyni nömrə və FİN ilə yenidən qeydiyyatdan keçə bilərsən.</Text>
     <Button title="Bəli, hesabı sil" danger icon="trash-outline" disabled={a.busy} onPress={()=>{a.act('account/delete',{}).catch(()=>{});}}/>
     <Pressable accessibilityRole="button" onPress={()=>setAskDelete(false)} style={{alignItems:'center',padding:14}}><Text style={{color:C.muted,fontWeight:'600'}}>Ləğv et</Text></Pressable>
    </View>
   )}
  </Page>
 );
}

const AWAY_LOCK_MS=300_000;
const CANCELLED='Ləğv edildi';
const VISIBLE_TABS=['Home','History','QR','Cards','More'];
const TAB_ICONS:Record<string,[string,string]>={
 Home:['home','home-outline'],
 History:['document-text','document-text-outline'],
 Cards:['card','card-outline'],
 More:['wallet','wallet-outline']
};
// screens that live under a visible tab keep that tab highlighted
const TAB_OWNER:Record<string,string>={Profile:'Home',Analytics:'More'};

function CustomTabBar({state,descriptors,navigation}:any){
 // Android draws the app behind the system navigation buttons; the bar keeps clear of them.
 const insets=useSafeAreaInsets();
 const current=state.routes[state.index]?.name;
 const active=TAB_OWNER[current]||current;
 return (
  <View style={[styles.tabBarWrap,Platform.OS!=='web'&&{paddingBottom:Math.max(insets.bottom,10)+8}]}>
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
 const [fontsReady,fontError]=useFonts({
  [FONT_FILES[400]]:PlusJakartaSans_400Regular,[FONT_FILES[500]]:PlusJakartaSans_500Medium,[FONT_FILES[600]]:PlusJakartaSans_600SemiBold,
  [FONT_FILES[700]]:PlusJakartaSans_700Bold,[FONT_FILES[800]]:PlusJakartaSans_800ExtraBold
 });
 const {width:winWidth,height:winHeight}=useWindowDimensions();
 const [phoneFrame,setPhoneFrame]=useState(true);
 const [base,setBase]=useState(DEFAULT_API),
  [token,setToken]=useState(''),
  [device,setDevice]=useState(''),
  [data,setData]=useState<Row|null>(null),
  [busy,setBusy]=useState(false),
  [boot,setBoot]=useState(true),
  [signingOut,setSigningOut]=useState(false),
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
 const sessionVersion=useRef(0);
 const pendingSca=useRef(sca);
 useEffect(()=>{pendingSca.current=sca;},[sca]);
 const endSession=useCallback((forget:boolean)=>{
  const version=++sessionVersion.current;
  if(token)request(base,token,device,'auth/logout',{}).catch(()=>{});
  pendingSca.current?.reject(new Error('Ləğv edildi'));
  setSigningOut(true);setToken('');setData(null);setExternal([]);externalKey.current='';
  setSheet('');setSca(null);setScaPin('');setScaBusy(false);setKycStep(null);setError('');setMessage('');
  Promise.all([storage.remove('token'),...(forget?[storage.remove('lastUser')]:[])]).catch(()=>{}).finally(()=>{if(version===sessionVersion.current)setSigningOut(false);});
 },[base,token,device]);
 const logout=useCallback(()=>endSession(true),[endSession]);
 const lock=useCallback(()=>endSession(false),[endSession]);

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
    // A stored token never unlocks a new app instance. The remembered person must enter their PIN.
    if(saved)request(candidate,saved,d,'auth/logout',{}).catch(()=>{});
    await storage.remove('token');
    if(saved||await storage.get('onboarding_done'))setShowOnboarding(false);
   }finally{setBoot(false);}
  })();
 },[]);

 /** A failure from a session that is already gone, or that ended the session, is not shown: the PIN screen is the message. */
 const settleFailure=useCallback((e:unknown,version:number)=>{
  if(version!==sessionVersion.current)return new Error(CANCELLED);
  if(e instanceof ApiError&&e.status===401&&['SESSION_EXPIRED','UNAUTHENTICATED','DEVICE_MISMATCH'].includes(e.code)){lock();return new Error(CANCELLED);}
  return e;
 },[lock]);

 const call=useCallback(async(p:string,b?:Row)=>{
  const version=sessionVersion.current;
  try{const result=await request(base,token,device,p,b);if(version!==sessionVersion.current)throw new Error(CANCELLED);return result;}
  catch(e){throw settleFailure(e,version);}
 },[base,token,device,lock,settleFailure]);

 // Other banks' transactions are fetched on demand, not with every dashboard poll.
 const loadExternal=useCallback(async()=>{
  try{setExternal(await call('open-banking/transactions'));}catch{/* the next refresh retries */}
 },[call]);

 const refresh=useCallback(async()=>{
  if(!token||!device)return;
  try{
   const version=sessionVersion.current;
   const dashboard=await call('dashboard');
   if(version!==sessionVersion.current)return;
   setData(dashboard);
   const banks=dashboard.openBanking||{};
   const key=(banks.syncedAt||'')+'|'+(banks.accounts?.length||0);
   if(key!==externalKey.current){externalKey.current=key;void loadExternal();}
   setError(current=>current===CONNECTION_ERROR_MESSAGE?'':current);
  }catch(e){if((e as Error).message!==CANCELLED)setError((e as Error).message);}
 },[token,device,call,loadExternal]);

 useEffect(()=>{
  const bootId=setTimeout(()=>{void refresh();},0);
  const id=setInterval(()=>{
   if(lastInteraction.current>0&&Date.now()-lastInteraction.current>300_000){if(token)lock();return;}
   if(token)void refresh();
  },1800);
  return()=>{clearTimeout(bootId);clearInterval(id);};
 },[refresh,token,lock]);

 useEffect(()=>{if(!message)return;const id=setTimeout(()=>setMessage(''),5000);return()=>clearTimeout(id);},[message]);
 useEffect(()=>{
  // Leaving the app (another tab, camera, gallery, permission dialog) must not log the user out; only a long absence does.
  let leftAt=0;
  const sub=AppState.addEventListener('change',state=>{
   if(state!=='active'){if(!leftAt)leftAt=Date.now();return;}
   const away=leftAt?Date.now()-leftAt:0;
   leftAt=0;
   if(token&&away>AWAY_LOCK_MS)lock();
  });
  return()=>sub.remove();
 },[lock,token]);

 const act=useCallback(async(path:string,body:Row)=>{
  const version=sessionVersion.current;
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
   if(path==='account/delete'){storage.remove('lastUser').catch(()=>{});logout();return result;}
   await refresh();
   if(path.startsWith('open-banking/')||path.endsWith('/category'))await loadExternal();
   if(!path.endsWith('/parse')&&!path.endsWith('/read')&&true)
    setMessage(path==='transfers'?'Köçürmə yaradıldı. Statusu ödənişlərdə izlə.':'Əməliyyat uğurla tamamlandı.');
   return result;
  }catch(e){
   const failure=settleFailure(e,version);
   if((failure as Error).message!==CANCELLED)setError((failure as Error).message);
   throw failure;
  }finally{setBusy(false);}
 },[base,token,device,refresh,loadExternal,logout,settleFailure]);

 function finishOnboarding(){
  storage.set('onboarding_done','1').catch(()=>{});
  setShowOnboarding(false);
 }

 const authenticated=async(accessToken:string)=>{
  const version=sessionVersion.current;
  await storage.set('token',accessToken);
  if(version!==sessionVersion.current){await storage.remove('token');return;}
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
  setError:(m:string)=>{if(m!==CANCELLED)setError(m);},
  setMessage,
  goTo:(route:string)=>{if(navRef.isReady())navRef.navigate(route as never);}
 };
 const showSimulator=Platform.OS==='web'&&winWidth>500&&phoneFrame;

 const appBody=(
  <View
   style={{flex:1,backgroundColor:C.bg}}
   onTouchStart={()=>{lastInteraction.current=Date.now();}}
   onPointerDown={()=>{lastInteraction.current=Date.now();}}
  >
   {boot||signingOut||(!fontsReady&&!fontError)?(
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
   ):!data?.user?(
    <View style={[styles.loading,{padding:24,gap:16}]}>
     <ActivityIndicator color={C.ink}/>
     <Text style={S.muted}>Hesab məlumatların yüklənir…</Text>
     {!!error&&<><Text style={S.errorText}>{error}</Text><Button title="Yenidən yoxla" onPress={()=>void refresh()}/></>}
     <Button title="Hesabdan çıx" secondary onPress={logout}/>
    </View>
   ):(
    <Context.Provider value={context}>
     <NavigationContainer ref={navRef}>
      <Tab.Navigator tabBar={props=><CustomTabBar {...props}/>} screenOptions={{headerShown:false}}>
       <Tab.Screen name="Home" component={Home} options={{title:'Əsas'}}/>
       <Tab.Screen name="History" component={HistoryTab} options={{title:'Tarixçə'}}/>
       <Tab.Screen name="Cards" component={CardsTab} options={{title:'Kartlar'}}/>
       <Tab.Screen name="More" component={MoreTab} options={{title:'Daha çox'}}/>
       <Tab.Screen name="QR" component={QrTab} options={{title:'QR'}}/>
       <Tab.Screen name="Profile" component={ProfileTab} options={{title:'Profil'}}/>
       <Tab.Screen name="Analytics" component={AnalyticsTab} options={{title:'Analitika'}}/>
      </Tab.Navigator>
     </NavigationContainer>
     {!sheet&&!sca&&!kycStep&&!!error&&<ErrorPopup page message={error} onClose={()=>setError('')}/>}
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
         Ödəniş: {({BNPL:'Sonra ödə',WALLET:'Kampus balansı',BANK_CARD:'Bank kartı'} as any)[sca.body.fundingSource]}
        </Text>
       )}
       {sca?.path.includes('loan-offers/')&&(
        <Text style={[S.muted,{marginTop:8}]}>Partnyorun demo kredit müqaviləsinin qəbulunu təsdiqləyirsən.</Text>
       )}
      </Box>
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
 bellDot:{position:'absolute',top:5,right:3,minWidth:17,height:17,borderRadius:9,backgroundColor:C.yellow,alignItems:'center',justifyContent:'center',paddingHorizontal:3},
 bellDotText:{fontSize:10,fontWeight:'800',color:C.ink},
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
 insightCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#f6f3ff',borderRadius:16,padding:14,marginTop:22,minHeight:68},
 insightIcon:{width:42,height:42,borderRadius:12,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},
 insightTitle:{fontSize:14,fontWeight:'700',color:C.ink},
 insightSub:{fontSize:12,color:'#5d5a73',marginTop:2},
 homeBody:{backgroundColor:'#fff',paddingHorizontal:18,paddingTop:22,width:'100%',maxWidth:430,alignSelf:'center'},
 sectionTitle:{fontSize:14,fontWeight:'700',color:C.ink},
 viewAll:{fontSize:12,color:'#5d5a73'},
 person:{alignItems:'center',width:62,gap:7},
 addCircle:{width:60,height:60,borderRadius:30,backgroundColor:C.lav,alignItems:'center',justifyContent:'center'},
 personName:{fontSize:12,color:C.ink,maxWidth:62},
 walletCard:{height:200,borderRadius:20,padding:16,overflow:'hidden',shadowColor:'#1b1245',shadowOffset:{width:0,height:8},shadowOpacity:0.18,shadowRadius:14,elevation:4},
 cardBlob:{position:'absolute',right:-40,bottom:-70,width:210,height:210,borderRadius:105},
 cardRing:{position:'absolute',right:-30,bottom:-10,width:130,height:130,borderRadius:65,borderWidth:1.5},
 cardName:{fontSize:13,fontWeight:'700'},
 cardBottom:{position:'absolute',left:16,right:16,bottom:16,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},
 cardLabel:{fontSize:12},
 cardValue:{fontSize:24,fontWeight:'700',marginTop:2},
 addCard:{fontSize:14,fontWeight:'600',color:'#1d5bd6'},
 emptyCards:{alignItems:'center',backgroundColor:'#faf9fe',borderRadius:18,padding:22,marginBottom:18},
 emptyTitle:{fontSize:16,fontWeight:'800',color:C.ink,marginTop:14,textAlign:'center'},
 prefRow:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:'#ebe8f4',borderRadius:14,padding:14,marginBottom:14},
 switchTrack:{width:46,height:28,borderRadius:14,backgroundColor:'#d9d6e6',padding:3,justifyContent:'center'},
 switchKnob:{width:22,height:22,borderRadius:11,backgroundColor:'#fff',alignSelf:'flex-start'},
 bankHead:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,paddingVertical:12,backgroundColor:'#faf9fe',borderBottomWidth:1,borderBottomColor:'#f0eef6'},
 bankHeadName:{flex:1,fontSize:14,fontWeight:'700',color:C.ink},
 bankHeadTotal:{fontSize:13,fontWeight:'700',color:'#5d5a73'},
 bankBalance:{fontSize:13,fontWeight:'700',color:C.ink,marginRight:4},
 connectBank:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.lav,borderRadius:14,padding:14,minHeight:68,marginBottom:14},
 connectIcon:{width:42,height:42,borderRadius:12,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},
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
