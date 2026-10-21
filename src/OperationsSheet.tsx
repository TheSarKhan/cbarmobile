import React,{useState,useEffect} from 'react';
import {View,Text,Pressable,StyleSheet,ActivityIndicator,Animated,Easing,Image} from 'react-native';
import {C,S,CARD_IMAGES,useApp,fmtDate,fmtDateTime,statusLabel,statusTone,Icon,Button,Field,Check,Badge,Box,Empty,Sheet,Tx,EXPENSE_CATEGORIES} from './ui';
import {CardTransferForm} from './CardTransferSheet';
import {CardsSection,CreditSection,CryptoSection} from './HubSections';
import {BanksSection} from './BanksSection';
import {TransferFlow} from './TransferFlow';
import {minor,money,Row} from './api';


export function Operations({sheet,close,hidden=false}:{sheet:string;close:()=>void;hidden?:boolean}){
 const a=useApp();
 const [amount,setAmount]=useState('50'),
  [phone,setPhone]=useState(sheet.startsWith('send:')?sheet.split(':')[1]:'+994501000002'),
  [note,setNote]=useState(''),
  [source,setSource]=useState(sheet==='add:BITCOIN'?'BITCOIN':''),
  [btcNet,setBtcNet]=useState<'LIGHTNING'|'ONCHAIN'>('LIGHTNING'),
  [copied,setCopied]=useState(false),
  [selCard,setSelCard]=useState('KAPITAL'),
  [selBank,setSelBank]=useState('KAPITAL'),
  [termCode,setTermCode]=useState<Row|null>(null),
  [recipient,setRecipient]=useState<Row|null>(null),
  [transfer,setTransfer]=useState<Row|null>(null),
  [count,setCount]=useState(5);
 const [cardName,setCardName]=useState(''),
  [cardType,setCardType]=useState('STANDARD'),
  [merchant,setMerchant]=useState(''),
  [limit,setLimit]=useState('100');
 const [detail,setDetail]=useState<any>(null),
  [selected,setSelected]=useState<string[]>(['+994501000002','+994501000003','+994501000004'].filter(p=>p!==a.data.user?.phone)),
  [splitMode,setSplitMode]=useState<'EQUAL'|'CUSTOM'>('EQUAL'),
  [customShares,setCustomShares]=useState<Record<string,string>>({'+994501000002':'5','+994501000003':'5','+994501000004':'5'});
 const [flowAnim]=useState(()=>new Animated.Value(1));

 const switchSource=(next:string)=>{
  setTermCode(null);
  flowAnim.setValue(0);
  setSource(next);
  Animated.timing(flowAnim,{
   toValue:1,
   duration:220,
   easing:Easing.out(Easing.cubic),
   useNativeDriver:true
  }).start();
 };

 const kind=sheet.split(':')[0];
 const paramId=sheet.split(':')[1]||'';

 const addTitles:Record<string,string>={
  '':'Balans artımı',
  CARD:'Bank kartı ilə artım',
  BITCOIN:'Bitcoin ilə artım',
  OPEN_BANKING:'Bank hesabından artım',
  TERMINAL:'Ödəniş terminalı'
 };
 const title:Record<string,string>={
  add:addTitles[source]||'Balans artımı',
  send:'Pul göndər',
  request:'Pul istə',
  'my-qr':'Mənim QR kodum',
  'new-card':'Yeni virtual kart',
  notifications:'Bildirişlər',
  history:'Əməliyyat tarixçəsi',
  'tx-detail':'Əməliyyat detalları',
  'banks-hub':'Digər banklar',
  'card-transfer':'Karta köçürmə',
  split:'Hesabı böl',
  'split-view':'Hesabın irəliləyişi',
  schedule:'Ödəniş qrafiki',
  'cards-hub':'Virtual kartlarım',
  'credit-hub':'Sonra ödə və Kredit',
  'crypto-hub':'Kripto cüzdanı (Pilot)',
  help:'Kömək',
  contact:'Bizimlə əlaqə',
  about:'Kampus haqqında'
 };

 useEffect(()=>{
  if(!transfer)return;
  const tick=()=>setCount(Math.max(0,Math.ceil((transfer.executeAt-Date.now())/1000)));
  tick();
  const id=setInterval(tick,200);
  return()=>clearInterval(id);
 },[transfer]);

 async function run(fn:()=>Promise<any>){
  a.setError('');
  try{await fn();}catch(e){a.setError((e as Error).message);}
 }

 useEffect(()=>{
  if(kind==='schedule'||kind==='split-view'){
   a.call(kind==='schedule'?'partner-loans/'+paramId+'/schedule':'splits/'+paramId)
    .then(setDetail)
    .catch(e=>a.setError(e.message));
  }
 },[a,kind,paramId,a.data.transactions?.length]);

 const errorView=a.error?(
  <View style={S.error}>
   <Text style={S.errorText}>{a.error}</Text>
  </View>
 ):null;

 const parsedAzn=Math.max(0,Number(amount.replace(',','.'))||0);
 const btcVal=parsedAzn/115000;
 const satsVal=Math.round(btcVal*100_000_000);
 const btcAddress=btcNet==='LIGHTNING'
  ?'lnbc1kampus'+String(a.data.user?.id||'u1').toLowerCase()+'p994azn'
  :'bc1qkampus'+String(a.data.user?.id||'u1').toLowerCase()+'segwit994';

 const txItem=kind==='tx-detail'?[...(a.data.transactions||[]),...(a.external||[])].find((x:Row)=>String(x.id)===paramId):null;

 if(kind==='send')return <TransferFlow initialPhone={sheet.startsWith('send:')?sheet.split(':')[1]:''} hidden={hidden} close={close}/>;

 return (
  <Sheet title={title[kind]||'Kampus'} visible={!!sheet&&(!hidden||kind==='card-transfer')} onClose={close}>
   {errorView}
   {kind==='card-transfer'&&<CardTransferForm {...a}/>}
   {kind==='cards-hub'&&<CardsSection/>}
   {kind==='credit-hub'&&<CreditSection/>}
   {kind==='crypto-hub'&&<CryptoSection/>}
   {kind==='banks-hub'&&<BanksSection/>}

   {kind==='help'&&(
    <>
     {[
      ['PIN-i unutdum','Telefon nömrənlə daxil ol, PIN səhifəsində “Başqa nömrə ilə daxil ol” seçib yenidən qeydiyyatdan keç. Hesabın bloklanıbsa, bir neçə dəqiqə sonra yenidən yoxla.'],
      ['Köçürmə niyə gecikir?','Köçürmələr 5 saniyəlik ləğv pəncərəsindən sonra icra olunur. Böyük məbləğlər və yeni cihaz yoxlamaya düşə bilər, bu halda vəsait rezerv edilir.'],
      ['Böyük məbləğ üçün üz yoxlaması','500 ₼ və yuxarı köçürmələr PIN-dən sonra qısa üz yoxlaması istəyir.'],
      ['Digər bankların kartları','“Daha çox” bölməsində “Digər banklar” vasitəsilə hesab və kartlarını yalnız oxumaq üçün bağlaya bilərsən.']
     ].map(([q,r])=>(
      <Box key={q}>
       <Text style={S.h3}>{q}</Text>
       <Text style={[S.muted,{marginTop:6}]}>{r}</Text>
      </Box>
     ))}
    </>
   )}
   {kind==='contact'&&(
    <>
     <Box>
      <Text style={S.h3}>Dəstək xidməti</Text>
      <Text style={[S.muted,{marginTop:6}]}>Hər gün 09:00–21:00. Cavab müddəti adətən bir saatdan azdır.</Text>
     </Box>
     <Box>
      <View style={S.row}><Icon name="mail-outline" size={20} color={C.primary}/><Text style={S.h3}>support@kampus.az</Text></View>
      <View style={[S.row,{marginTop:12}]}><Icon name="call-outline" size={20} color={C.primary}/><Text style={S.h3}>+994 12 000 00 00</Text></View>
     </Box>
    </>
   )}
   {kind==='about'&&(
    <Box>
     <Text style={S.h3}>Kampus.</Text>
     <Text style={[S.muted,{marginTop:8}]}>Kampus tələbələr üçün rəqəmsal cüzdandır: pul köçürmələri, QR ödənişləri, virtual kartlar, hesabı bölmək və digər bankların kartlarını bir yerdə izləmək.</Text>
     <Text style={[S.muted,{marginTop:8}]}>Bu proqram nümayiş mühitində işləyir. Bank və ödəniş şəbəkəsi qoşulmaları simulyasiyadır.</Text>
    </Box>
   )}

   {kind==='my-qr'&&(
    <>
     <Box style={{alignItems:'center',paddingVertical:24}}>
      <View style={os.myQrFrame}>
       <Icon name="qr-code-outline" size={96} color={C.ink}/>
      </View>
      <Text style={S.h2}>{a.data.user?.name}</Text>
      <Text style={[S.muted,{marginTop:4}]}>{a.data.user?.phone}</Text>
      <View style={{marginTop:10}}>
       <Badge text="KAMPUS DAXİLİ · 0% KOMİSSİYA" tone="success"/>
      </View>
     </Box>
     <Button title="Pul istə" icon="arrow-down" onPress={()=>a.open('request')}/>
    </>
   )}

   {kind==='tx-detail'&&(
    txItem?(
     <>
      <Box style={{alignItems:'center',paddingVertical:22}}>
       <View style={[S.tile,{width:56,height:56,borderRadius:20,backgroundColor:txItem.direction==='IN'?'#ded6f5':'#e9e5f3',marginBottom:12}]}>
        <Icon
         name={txItem.source==='OPEN_BANKING'?'business-outline':txItem.type==='QR'?'cafe-outline':txItem.type==='CRYPTO'?'logo-bitcoin':txItem.direction==='IN'?'arrow-down-outline':'arrow-up-outline'}
         color={txItem.direction==='IN'?C.green:C.ink}
         size={26}
        />
       </View>
       <Badge text={txItem.direction==='IN'?'MƏDAXİL · TAMAMLANIB':'MƏXARİC · TAMAMLANIB'} tone={txItem.direction==='IN'?'success':'neutral'}/>
       <Text style={[S.amount,{fontSize:32,marginTop:12,color:txItem.direction==='IN'?C.green:C.ink}]}>
        {txItem.direction==='IN'?'+':'−'}{money(txItem.amountMinor)}
       </Text>
       <Text style={[S.h3,{marginTop:8,textAlign:'center'}]}>{txItem.name}</Text>
       <Text style={[S.muted,{marginTop:4}]}>{fmtDateTime(txItem.createdAt)}</Text>
      </Box>

      <Box>
       <Text style={[S.label,{marginBottom:10}]}>ƏMƏLİYYAT MƏLUMATLARI</Text>
       <View style={[S.between,{marginBottom:8}]}>
        <Text style={S.muted}>Növ</Text>
        <Text style={S.h3}>{txItem.source==='OPEN_BANKING'?'DİGƏR BANK':(txItem.type||'ÖDƏNİŞ')}</Text>
       </View>
       {txItem.source==='OPEN_BANKING'&&(
        <View style={[S.between,{marginBottom:8}]}>
         <Text style={S.muted}>Bank</Text>
         <Text style={S.h3}>{txItem.bankName}</Text>
        </View>
       )}
       <View style={[S.between,{marginBottom:8}]}>
        <Text style={S.muted}>Kateqoriya</Text>
        <Text style={S.h3}>{txItem.category||'Digər'}</Text>
       </View>
       {txItem.source!=='OPEN_BANKING'&&(
        <View style={[S.between,{marginBottom:8}]}>
         <Text style={S.muted}>Komissiya</Text>
         <Text style={S.h3}>0.00 ₼</Text>
        </View>
       )}
       <View style={S.between}>
        <Text style={S.muted}>Əməliyyat kodu</Text>
        <Text style={[S.muted,{fontWeight:'700',color:C.ink}]}>#{String(txItem.id).slice(0,12)}</Text>
       </View>
      </Box>

      <Box>
       <Text style={[S.label,{marginBottom:10}]}>KATEQORİYANI DƏYİŞ</Text>
       <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        {EXPENSE_CATEGORIES.map(c=>(
         <Pressable
          key={c}
          accessibilityRole="button"
          onPress={()=>a.act('transactions/'+txItem.id+'/category',{category:c}).catch(()=>{})}
          style={[S.tab,txItem.category===c&&{backgroundColor:C.lime,borderColor:C.ink}]}
         >
          <Text style={[S.tabText,txItem.category===c&&{color:C.ink,fontWeight:'700'}]}>{c}</Text>
         </Pressable>
        ))}
       </View>
      </Box>

      {txItem.direction==='OUT'&&(
       <Button title="Bu xərci dostlarla böl" secondary icon="people-outline" onPress={()=>a.open('split')}/>
      )}
      <Button title="Bağla" secondary onPress={close}/>
     </>
    ):(
     <Empty text="Əməliyyat tapılmadı." icon="receipt-outline"/>
    )
   )}

   {kind==='add'&&(
    <Animated.View style={{opacity:flowAnim,transform:[{translateY:flowAnim.interpolate({inputRange:[0,1],outputRange:[10,0]})}]}}>
     {!source?(
      <>
       <Text style={[S.muted,{marginBottom:16}]}>Balansınızı artırmaq üçün uyğun üsulu seçin:</Text>
       <View style={os.bentoGrid}>
        <View style={os.bentoRow}>
         <Pressable accessibilityRole="button" onPress={()=>switchSource('CARD')} style={os.topupMethodCard}>
          <View style={{zIndex:2}}>
           <Text style={os.topupMethodTitle}>Bank kartı</Text>
           <Text style={os.topupMethodSub}>Visa · Mastercard</Text>
          </View>
          <Image source={CARD_IMAGES.topupCard} style={os.topupMethodImg} resizeMode="cover"/>
         </Pressable>

         <Pressable accessibilityRole="button" onPress={()=>switchSource('BITCOIN')} style={os.topupMethodCard}>
          <View style={{zIndex:2}}>
           <Text style={os.topupMethodTitle}>Bitcoin</Text>
           <Text style={os.topupMethodSub}>BTC → AZN · Prototip</Text>
          </View>
          <Image source={CARD_IMAGES.btc} style={os.topupMethodImg} resizeMode="cover"/>
         </Pressable>
        </View>

        <View style={os.bentoRow}>
         <Pressable accessibilityRole="button" onPress={()=>switchSource('OPEN_BANKING')} style={os.topupMethodCard}>
          <View style={{zIndex:2}}>
           <Text style={os.topupMethodTitle}>Bank hesabı</Text>
           <Text style={os.topupMethodSub}>IBAN · Açıq Bank</Text>
          </View>
          <Image source={CARD_IMAGES.topupBank} style={os.topupMethodImg} resizeMode="cover"/>
         </Pressable>

         <Pressable accessibilityRole="button" onPress={()=>switchSource('TERMINAL')} style={os.topupMethodCard}>
          <View style={{zIndex:2}}>
           <Text style={os.topupMethodTitle}>Terminal</Text>
           <Text style={os.topupMethodSub}>MilliÖN · eManat</Text>
          </View>
          <Image source={CARD_IMAGES.topupTerminal} style={os.topupMethodImg} resizeMode="cover"/>
         </Pressable>
        </View>
       </View>
      </>
     ):(
      <>
       <Pressable accessibilityRole="button" onPress={()=>switchSource('')} style={os.flowBackRow}>
        <Icon name="arrow-back" size={18} color={C.ink}/>
        <Text style={os.flowBackText}>Digər artım üsulları</Text>
       </Pressable>

       {source==='CARD'&&(
        <>
         <View style={os.flowHeroWhite}>
          <View style={{flex:1,paddingRight:12}}>
           <Text style={os.flowHeroTitleDark}>Bank kartı ilə mədaxil</Text>
           <Text style={os.flowHeroSubDark}>İstənilən yerli bank kartından komissiyasız və anında balans artımı.</Text>
          </View>
          <Image source={CARD_IMAGES.topupCard} style={os.flowHeroSideImg} resizeMode="cover"/>
         </View>

         <Text style={S.label}>Kart seçin</Text>
         <View style={{gap:10,marginBottom:18}}>
          {[
           ['KAPITAL','Kapital Bank · Birbank','•••• 4821 · Visa'],
           ['ABB','ABB · TamKart','•••• 9014 · Mastercard'],
           ['NEW','Yeni kart · demo','Kart məlumatı daxil etmədən simulyasiya']
          ].map(([id,name,sub])=>(
           <Pressable
            key={id}
            accessibilityRole="button"
            onPress={()=>setSelCard(id)}
            style={[os.selectRowCard,selCard===id&&os.selectRowCardActive]}
           >
            <View style={os.selectRowIcon}>
             <Icon name={id==='NEW'?'add-outline':'card-outline'} size={20} color={C.ink}/>
            </View>
            <View style={{flex:1}}>
             <Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>{name}</Text>
             <Text style={{fontSize:11,color:C.muted,marginTop:2}}>{sub}</Text>
            </View>
            <Icon name={selCard===id?'checkmark-circle':'ellipse-outline'} size={20} color={selCard===id?C.ink:C.muted}/>
           </Pressable>
          ))}
         </View>

         {selCard==='NEW'&&(
          <Box>
           <Badge text="KART BAĞLANTISI · DEMO"/>
           <Text style={[S.muted,{marginTop:10}]}>Bu balans artımı simulyasiya olunur. Real kart nömrəsi, müddət və CVV daxil edilmir.</Text>
          </Box>
         )}

         <Field label="Məbləğ · AZN" value={amount} onChange={setAmount} numeric/>
         <Box style={{backgroundColor:'#ede9f8',borderColor:'#c1b6e2'}}>
          <View style={[S.between,{marginBottom:4}]}>
           <Text style={S.muted}>Komissiya (0%)</Text>
           <Text style={S.h3}>0.00 ₼</Text>
          </View>
          <View style={S.between}>
           <Text style={S.muted}>Balansa oturacaq məbləğ</Text>
           <Text style={S.h3}>{parsedAzn.toFixed(2)} ₼</Text>
          </View>
         </Box>
         <Button
          title={`Kartdan +${parsedAzn.toFixed(2)} ₼ artır`}
          disabled={a.busy||parsedAzn<=0}
          icon="arrow-forward"
          onPress={()=>run(async()=>{await a.act('topups',{amountMinor:minor(amount),source:'CARD'});close();})}
         />
        </>
       )}

       {source==='BITCOIN'&&(
        <>
         <Box>
          <Badge text="BTC EKRANI · PROTOTİP"/>
          <Text style={[S.muted,{marginTop:10}]}>Bitcoin ünvanı və invoice bu ekranda nümunədir. Balans artırmaq üçün işlək USDT pilotuna keç.</Text>
         </Box>
         <View style={os.btcHeroCard}>
          <Image source={CARD_IMAGES.btcHero} style={os.btcHeroImg} resizeMode="cover"/>
          <View style={os.btcHeroBody}>
           <Text style={os.btcHeroTitle}>Bitcoin göndər, AZN olaraq xərclə</Text>
           <Text style={os.btcHeroSub}>
            1 BTC = 115 000 ₼ · Köçürdüyün BTC avtomatik AZN-ə çevrilir və dərhal balansına əlavə olunur.
           </Text>
          </View>
         </View>

         <Text style={S.label}>Şəbəkə</Text>
         <View style={{flexDirection:'row',gap:10,marginBottom:18}}>
          <Pressable
           accessibilityRole="button"
           onPress={()=>{setBtcNet('LIGHTNING');setCopied(false);}}
           style={[os.btcNetCard,btcNet==='LIGHTNING'&&os.btcNetCardActive]}
          >
           <Image source={CARD_IMAGES.btcLightning} style={os.btcNetIcon} resizeMode="cover"/>
           <View style={{flex:1}}>
            <Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>Lightning</Text>
            <Text style={{fontSize:10,color:C.muted,marginTop:2}}>Ani · Rüsumsuz</Text>
           </View>
           <Icon name={btcNet==='LIGHTNING'?'checkmark-circle':'ellipse-outline'} size={18} color={btcNet==='LIGHTNING'?C.ink:C.muted}/>
          </Pressable>

          <Pressable
           accessibilityRole="button"
           onPress={()=>{setBtcNet('ONCHAIN');setCopied(false);}}
           style={[os.btcNetCard,btcNet==='ONCHAIN'&&os.btcNetCardActive]}
          >
           <Image source={CARD_IMAGES.btcOnchain} style={os.btcNetIcon} resizeMode="cover"/>
           <View style={{flex:1}}>
            <Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>SegWit</Text>
            <Text style={{fontSize:10,color:C.muted,marginTop:2}}>bc1q · On-Chain</Text>
           </View>
           <Icon name={btcNet==='ONCHAIN'?'checkmark-circle':'ellipse-outline'} size={18} color={btcNet==='ONCHAIN'?C.ink:C.muted}/>
          </Pressable>
         </View>

         <Field label="Məbləğ · AZN" value={amount} onChange={setAmount} numeric/>

         <View style={os.btcConvertCard}>
          <View style={{flex:1}}>
           <Text style={{fontSize:11,color:C.muted,fontWeight:'500'}}>Balansa oturacaq</Text>
           <Text style={{fontSize:22,fontWeight:'800',color:C.ink,marginTop:4}}>{parsedAzn.toFixed(2)} ₼</Text>
          </View>
          <View style={os.btcSwapCircle}>
           <Icon name="swap-horizontal" size={18} color={C.ink}/>
          </View>
          <View style={{flex:1,alignItems:'flex-end'}}>
           <Text style={{fontSize:11,color:C.muted,fontWeight:'500'}}>Ödəniləcək BTC</Text>
           <Text style={{fontSize:18,fontWeight:'800',color:C.ink,marginTop:4}}>{btcVal.toFixed(6)} ₿</Text>
           <Text style={{fontSize:10,color:C.muted,marginTop:2}}>≈ {satsVal.toLocaleString('az-AZ')} satoshi</Text>
          </View>
         </View>

         <View style={os.btcAddrCard}>
          <View style={os.btcMiniQr}>
           <Icon name="qr-code-outline" size={34} color={C.ink}/>
          </View>
          <View style={{flex:1}}>
           <Text style={{fontSize:11,fontWeight:'600',color:C.muted}}>
            {btcNet==='LIGHTNING'?'Lightning invoys ünvanı':'SegWit depozit ünvanı'}
           </Text>
           <Text numberOfLines={1} style={{fontSize:12,fontWeight:'700',color:C.ink,marginTop:3}}>
            {btcAddress}
           </Text>
          </View>
          <Pressable
           accessibilityRole="button"
           accessibilityLabel="Ünvanı kopyala"
           onPress={()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}}
           style={os.btcCopyIconBtn}
          >
           <Icon name={copied?'checkmark':'copy-outline'} size={18} color={C.ink}/>
          </Pressable>
         </View>

         <Button
          title="USDT pilotuna keç"
          disabled={a.busy||parsedAzn<=0}
          icon="logo-bitcoin"
          onPress={()=>a.open('crypto-hub')}
         />
        </>
       )}

       {source==='OPEN_BANKING'&&(
        <>
         <View style={os.flowHeroWhite}>
          <View style={{flex:1,paddingRight:12}}>
           <Text style={os.flowHeroTitleDark}>Bank hesabından köçürmə</Text>
           <Text style={os.flowHeroSubDark}>Açıq Bankçılıq ilə bağlı cari hesabınızdan birbaşa mədaxil edin.</Text>
          </View>
          <Image source={CARD_IMAGES.topupBank} style={os.flowHeroSideImg} resizeMode="cover"/>
         </View>

         <Text style={S.label}>Bank hesabını seçin</Text>
         <View style={{gap:10,marginBottom:18}}>
          {[
           ['KAPITAL','Kapital Bank','AZ21 NABZ 0000 •••• 4410 · Cari hesab'],
           ['ABB','ABB (Azərbaycan Beynəlxalq Bankı)','AZ74 IBAZ 0000 •••• 8821 · Cari hesab'],
           ['PASA','PAŞA Bank','AZ59 PASB 0000 •••• 1904 · Cari hesab']
          ].map(([id,name,sub])=>(
           <Pressable
            key={id}
            accessibilityRole="button"
            onPress={()=>setSelBank(id)}
            style={[os.selectRowCard,selBank===id&&os.selectRowCardActive]}
           >
            <View style={os.selectRowIcon}>
             <Icon name="business-outline" size={20} color={C.ink}/>
            </View>
            <View style={{flex:1}}>
             <Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>{name}</Text>
             <Text style={{fontSize:11,color:C.muted,marginTop:2}}>{sub}</Text>
            </View>
            <Icon name={selBank===id?'checkmark-circle':'ellipse-outline'} size={20} color={selBank===id?C.ink:C.muted}/>
           </Pressable>
          ))}
         </View>

         <Field label="Məbləğ · AZN" value={amount} onChange={setAmount} numeric/>
         <Box style={{backgroundColor:'#ede9f8',borderColor:'#c1b6e2'}}>
          <View style={[S.between,{marginBottom:4}]}>
           <Text style={S.muted}>Açıq Bankçılıq komissiyası</Text>
           <Text style={S.h3}>0.00 ₼</Text>
          </View>
          <View style={S.between}>
           <Text style={S.muted}>Yekun mədaxil</Text>
           <Text style={S.h3}>{parsedAzn.toFixed(2)} ₼</Text>
          </View>
         </Box>
         <Button
          title={`Bank hesabından +${parsedAzn.toFixed(2)} ₼ artır`}
          disabled={a.busy||parsedAzn<=0}
          icon="arrow-forward"
          onPress={()=>run(async()=>{await a.act('topups',{amountMinor:minor(amount),source:'OPEN_BANKING'});close();})}
         />
        </>
       )}

       {source==='TERMINAL'&&(
        <>
         <View style={os.flowHeroWhite}>
          <View style={{flex:1,paddingRight:12}}>
           <Text style={os.flowHeroTitleDark}>Ödəniş terminalı ilə artım</Text>
           <Text style={os.flowHeroSubDark}>MilliÖN və eManat terminallarında 8 rəqəmli birdəfəlik kodla nağd mədaxil.</Text>
          </View>
          <Image source={CARD_IMAGES.topupTerminal} style={os.flowHeroSideImg} resizeMode="cover"/>
         </View>

         {!termCode?(
          <>
           <View style={os.terminalStepsBox}>
            {[
             ['1','Məbləği daxil edib 8 rəqəmli ödəniş kodu yaradın'],
             ['2','MilliÖN və ya eManat ekranda Kampus seçib kodu yığın'],
             ['3','Nağd əsginası daxil edin — balans dərhal yenilənir']
            ].map(([num,txt])=>(
             <View key={num} style={os.terminalStepRow}>
              <View style={os.terminalStepNum}><Text style={{fontSize:11,fontWeight:'800',color:C.ink}}>{num}</Text></View>
              <Text style={{fontSize:12,color:C.ink,flex:1,lineHeight:18}}>{txt}</Text>
             </View>
            ))}
           </View>

           <Field label="Məbləğ · AZN" value={amount} onChange={setAmount} numeric/>
           <Button
            title="8 rəqəmli terminal kodu yarat"
            disabled={a.busy||parsedAzn<=0}
            icon="keypad-outline"
            onPress={()=>run(async()=>{setTermCode(await a.act('topups/terminal-code',{amountMinor:minor(amount)}));})}
           />
          </>
         ):(
          <>
           <View style={os.terminalCodeCard}>
            <Text style={{fontSize:12,color:C.muted,fontWeight:'600'}}>TERMİNAL ÖDƏNİŞ KODU</Text>
            <Text style={os.terminalCodeDigits}>
             {String(termCode.code).slice(0,4)} {String(termCode.code).slice(4)}
            </Text>
            <Text style={{fontSize:14,fontWeight:'700',color:C.ink,marginTop:6}}>
             Məbləğ: {parsedAzn.toFixed(2)} ₼
            </Text>
            <Text style={{fontSize:11,color:C.muted,marginTop:6,textAlign:'center'}}>
             MilliÖN / eManat terminalında bu kodu daxil edin. Kod 15 dəqiqə ərzində aktivdir.
            </Text>
           </View>

           <Button
            title="Terminalda ödənişi tamamla"
            disabled={a.busy}
            icon="checkmark"
            onPress={()=>run(async()=>{await a.act('topups/terminal-redeem',{code:termCode.code});close();})}
           />
          </>
         )}
        </>
       )}
      </>
     )}
    </Animated.View>
   )}

   {(kind==='send'||kind==='request')&&(
    <>
     {transfer?(
      <>
       <Box style={{alignItems:'center',paddingVertical:24}}>
        <View style={[S.tile,{width:68,height:68,borderRadius:24,backgroundColor:C.lime,marginBottom:16}]}>
         <Icon name={transfer.status==='UNDER_REVIEW'?'shield-outline':count>0&&transfer.status==='SCHEDULED'?'time-outline':'checkmark'} size={34}/>
        </View>
        <Badge text={statusLabel[transfer.status]||transfer.status} tone={statusTone(transfer.status)}/>
        <Text style={[S.amount,{marginTop:12}]}>{money(transfer.amountMinor)}</Text>
        <Text style={[S.h3,{marginTop:10}]}>{transfer.recipientName}</Text>
        <Text style={[S.muted,{textAlign:'center',marginTop:10}]}>
         {transfer.status==='UNDER_REVIEW'
          ?'Əməliyyat admin yoxlamasındadır. Vəsait rezerv edilib.'
          :count>0&&transfer.status==='SCHEDULED'
           ?'Köçürmə '+count+' saniyəyə icra ediləcək.'
           :'Nəticəni ödənişlər bölməsində izləyə bilərsən.'}
        </Text>
       </Box>
       {count>0&&transfer.status==='SCHEDULED'&&(
        <Button
         title={`Köçürməni ləğv et (${count}s)`}
         danger
         onPress={()=>run(async()=>{await a.act('transfers/'+transfer.id+'/cancel',{});close();})}
        />
       )}
       <Button title="Bağla" secondary onPress={close}/>
      </>
     ):(
      <>
       <Field label="Telefon nömrəsi" value={phone} onChange={v=>{setPhone(v);setRecipient(null);}} placeholder="+994501000002"/>
       <Field label="Məbləğ · AZN" value={amount} onChange={setAmount} numeric/>
       <Field label="Qeyd" value={note} onChange={setNote} placeholder="Məsələn, pizza 🍕"/>
       {recipient&&(
        <Box style={{backgroundColor:'#ede9f8',borderColor:'#c1b6e2'}}>
         <View style={S.between}>
          <View style={{flex:1}}>
           <Text style={S.label}>ALAN ŞƏXS</Text>
           <Text style={[S.h3,{marginTop:2}]}>{recipient.maskedName}</Text>
           <Text style={S.muted}>
            {recipient.channel==='INTERNAL'?'Kampus · komissiyasız':'AniPay · '+recipient.bankName}
           </Text>
          </View>
          <Pressable
           accessibilityRole="button"
           onPress={()=>run(async()=>{await a.act('trusted-beneficiaries',{phone,nickname:recipient.maskedName});})}
           style={[S.tab,{backgroundColor:'white'}]}
          >
           <Text style={{fontSize:11,fontWeight:'700',color:C.ink}}>+ Etibarlı alıcı</Text>
          </Pressable>
         </View>
         <View style={S.line}/>
         <View style={[S.between,{marginBottom:4}]}>
          <Text style={S.muted}>Komissiya</Text>
          <Text style={S.h3}>0.00 ₼</Text>
         </View>
         <View style={S.between}>
          <Text style={S.muted}>Yekun ödəniş</Text>
          <Text style={[S.amount,{fontSize:24}]}>{(()=>{try{return money(minor(amount));}catch{return '—';}})()}</Text>
         </View>
        </Box>
       )}
       {/uduş|depozit|kredit|bonus|investisiya/i.test(note)&&(
        <View style={S.error}>
         <Text style={S.errorText}>
          Fırıldaqçılar uduş və depozit vəd edərək pul istəyə bilər. Bu şəxsi tanıdığına əmin ol.
         </Text>
        </View>
       )}
       <Button
        title={kind==='request'?'Sorğu göndər':recipient?'Təsdiqlə və göndər':'Alıcını yoxla'}
        icon="arrow-forward"
        disabled={a.busy}
        onPress={()=>run(async()=>{
         const amountMinor=minor(amount);
         if(kind==='request'){
          await a.act('payment-requests',{phone,amountMinor,note});
          close();
         }else if(!recipient){
          setRecipient(await a.call('transfers/resolve?phone='+encodeURIComponent(phone)));
         }else{
          setTransfer(await a.act('transfers',{phone,amountMinor,note}));
         }
        })}
       />
       <Text style={[S.muted,{fontSize:11,marginBottom:8,textAlign:'center'}]}>
        Göndərdikdən sonra 5 saniyə ərzində köçürməni ləğv edə bilərsən.
       </Text>
      </>
     )}
    </>
   )}

   {kind==='split'&&(
    <>
     <Field label="Ümumi hesab · AZN" value={amount} onChange={setAmount} numeric/>
     <Field label="Qeyd" value={note} onChange={setNote} placeholder="Pizza 🍕"/>
     <View style={{flexDirection:'row',gap:8,marginBottom:18}}>
      {[['EQUAL','Bərabər böl'],['CUSTOM','Xüsusi məbləğ']].map(([id,label])=>(
       <Pressable
        key={id}
        accessibilityRole="button"
        onPress={()=>setSplitMode(id as 'EQUAL'|'CUSTOM')}
        style={[S.tab,splitMode===id&&{backgroundColor:C.lime,borderColor:C.ink},{flex:1,alignItems:'center'}]}
       >
        <Text style={S.h3}>{label}</Text>
       </Pressable>
      ))}
     </View>
     <Text style={[S.label,{marginBottom:12}]}>Öz payın avtomatik daxil edilir. Dostları seç:</Text>
     {[['Murad Əliyev','+994501000002'],['Leyla Həsənova','+994501000003'],['Kamran Quliyev','+994501000004'],['Aytən Məmmədova','+994501000001']].filter(x=>x[1]!==a.data.user?.phone).map(([name,p])=>(
      <View key={p}>
       <Check value={selected.includes(p)} text={name} onChange={v=>setSelected(v?[...selected,p]:selected.filter(x=>x!==p))}/>
       {splitMode==='CUSTOM'&&selected.includes(p)&&(
        <Field label={name+' payı · AZN'} value={customShares[p]||'5'} numeric onChange={v=>setCustomShares(old=>({...old,[p]:v}))}/>
       )}
      </View>
     ))}
     <Box>
      <Text style={S.muted}>
       {splitMode==='EQUAL'
        ?'Hesab '+(selected.length+1)+' nəfər arasında bərabər bölünür. Qalıq qəpik sənin payına düşür.'
        :'Seçilmiş dostların xüsusi payları cəmi ümumi hesabdan çıxılır, qalanı sənin payındır.'}
      </Text>
     </Box>
     <Button
      title="Böl və sorğuları göndər"
      disabled={a.busy||!selected.length}
      onPress={()=>run(async()=>{
       const r=await a.act('splits',{
        totalMinor:minor(amount),
        mode:splitMode,
        participants:selected.map(p=>splitMode==='CUSTOM'?{phone:p,amountMinor:minor(customShares[p]||'0')}:{phone:p}),
        note
       });
       a.open('split-view:'+r.id);
      })}
     />
    </>
   )}

   {kind==='split-view'&&(
    <>
     {detail?(
      <>
       <Box style={{alignItems:'center',paddingVertical:20}}>
        <Badge text="ORTAQ HESAB" tone="success"/>
        <Text style={[S.amount,{marginVertical:10}]}>{money(detail.totalMinor)}</Text>
        <Text style={S.h3}>{detail.note||'Ortaq hesab'}</Text>
        <Text style={[S.muted,{marginTop:6}]}>
         {detail.paidCount}/{detail.participantCount} ödəyib · {money(detail.paidMinor)} / {money(detail.totalMinor)}
        </Text>
       </Box>
       <Box>
        <View style={S.between}>
         <Text style={S.muted}>Sənin payın (Təşkilatçı)</Text>
         <Text style={S.h3}>{money(detail.organizerShareMinor)}</Text>
        </View>
       </Box>
       {detail.requests?.map((r:Row)=>(
        <Box key={r.id}>
         <View style={S.between}>
          <View>
           <Text style={S.h3}>{r.recipientName||r.phone||'İştirakçı'}</Text>
           <Text style={S.muted}>{money(r.amountMinor)}</Text>
          </View>
          <Badge text={statusLabel[r.status]||r.status} tone={statusTone(r.status)}/>
         </View>
        </Box>
       ))}
       <Button title="Yenilə" secondary icon="refresh-outline" onPress={()=>a.call('splits/'+paramId).then(setDetail).catch(()=>{})}/>
      </>
     ):<ActivityIndicator color={C.ink}/>}
    </>
   )}

   {kind==='schedule'&&(
    <>
     {detail?.map((inst:Row)=>(
      <Box key={inst.id}>
       <View style={[S.between,{marginBottom:12}]}>
        <View>
         <Text style={S.h3}>{inst.number}-ci ödəniş</Text>
         <Text style={S.muted}>{fmtDate(inst.dueDate)||new Date(inst.dueDate).toLocaleDateString('az-AZ')}</Text>
        </View>
        <Text style={S.h3}>{money(inst.amountMinor)}</Text>
       </View>
       {inst.status==='PAID'?(
        <Badge text="ÖDƏNİLİB" tone="success"/>
       ):(
        <Button
         title="İndi ödə"
         disabled={a.busy}
         secondary
         onPress={()=>a.act('partner-loans/'+paramId+'/installments/'+inst.id+'/pay',{amountMinor:inst.amountMinor}).catch(()=>{})}
        />
       )}
      </Box>
     ))}
     {!detail&&<ActivityIndicator color={C.ink}/>}
    </>
   )}

   {kind==='new-card'&&(
    <>
     <Text style={S.label}>Kart növü</Text>
     <View style={{gap:8,marginBottom:20}}>
      {[
       ['STANDARD','Əsas kart','Bütün demo satıcılarında keçərlidir'],
       ['MERCHANT_LOCKED','Satıcıya kilidli','Yalnız seçdiyin satıcıda işləyir'],
       ['SINGLE_USE','Birdəfəlik','Bir ödənişdən sonra avtomatik bağlanır']
      ].map(([id,label,sub])=>(
       <Pressable
        key={id}
        accessibilityRole="button"
        onPress={()=>setCardType(id)}
        style={[S.box,{marginBottom:0,padding:15,borderColor:cardType===id?C.ink:C.line,backgroundColor:cardType===id?'#eae6f7':'white'}]}
       >
        <View style={S.between}>
         <View style={{flex:1}}>
          <Text style={{fontWeight:'700',fontSize:13,color:C.ink}}>{label}</Text>
          <Text style={[S.muted,{fontSize:11,marginTop:2}]}>{sub}</Text>
         </View>
         <Icon name={cardType===id?'radio-button-on':'radio-button-off'} size={20} color={cardType===id?C.ink:'#b0aac2'}/>
        </View>
       </Pressable>
      ))}
     </View>
     <Field label="Kart adı" value={cardName} onChange={setCardName} placeholder="Məsələn, abunəliklər"/>
     {cardType==='MERCHANT_LOCKED'&&<Field label="Satıcı adı" value={merchant} onChange={setMerchant} placeholder="Cursor"/>}
     <Field label="Aylıq limit · AZN" value={limit} onChange={setLimit} numeric/>
     <Button
      title="Demo kartı yarat"
      disabled={a.busy}
      onPress={()=>run(async()=>{
       await a.act('cards',{type:cardType,name:cardName,merchantName:merchant,monthlyLimitMinor:minor(limit)});
       close();
      })}
     />
    </>
   )}

   {kind==='notifications'&&(
    <>
     {a.data.notifications?.map((n:Row)=>(
      <Pressable key={n.id} accessibilityRole="button" onPress={()=>a.act('notifications/'+n.id+'/read',{}).catch(()=>{})}>
       <Box style={!n.read?{borderColor:'#b5a6e0',backgroundColor:'#ece8f7'}:undefined}>
        <View style={[S.row,{alignItems:'flex-start'}]}>
         <View style={[S.tile,{width:38,height:38,borderRadius:12,backgroundColor:!n.read?C.lime:'#ebe8f5'}]}>
          <Icon name="notifications-outline" color={C.ink} size={19}/>
         </View>
         <View style={{flex:1}}>
          <Text style={{fontWeight:'700',fontSize:13,color:C.ink}}>{n.title}</Text>
          <Text style={[S.muted,{marginTop:4}]}>{n.body}</Text>
          <Text style={[S.muted,{fontSize:10,marginTop:6}]}>{fmtDateTime(n.createdAt)}</Text>
         </View>
         {!n.read&&<View style={os.dotInline}/>}
        </View>
       </Box>
      </Pressable>
     ))}
     {!a.data.notifications?.length&&<Empty text="Bildiriş yoxdur." icon="notifications-off-outline"/>}
    </>
   )}

   {kind==='history'&&(
    <>
     <Text style={[S.muted,{marginBottom:12}]}>Detallara baxmaq və ya kateqoriyanı dəyişmək üçün əməliyyata toxun.</Text>
     {a.data.transactions?.map((t:Row)=>(
      <Tx key={t.id} t={t} onPress={()=>a.open('tx-detail:'+t.id)}/>
     ))}
     {!a.data.transactions?.length&&<Empty text="Əməliyyat tarixçəsi boşdur."/>}
    </>
   )}
  </Sheet>
 );
}

const os=StyleSheet.create({
 myQrFrame:{width:154,height:154,borderRadius:24,backgroundColor:'#ebe8f5',alignItems:'center',justifyContent:'center',marginBottom:16,borderWidth:1,borderColor:C.line},
 dotInline:{width:8,height:8,borderRadius:4,backgroundColor:'#6147ad',marginTop:4},
 bentoGrid:{gap:12},
 bentoRow:{flexDirection:'row',gap:12},
 topupMethodCard:{flex:1,height:152,backgroundColor:'#FFFFFF',borderRadius:22,padding:16,overflow:'hidden',justifyContent:'space-between',position:'relative',borderWidth:1,borderColor:C.line},
 topupMethodTitle:{fontSize:16,fontWeight:'800',color:C.ink,letterSpacing:-0.3},
 topupMethodSub:{fontSize:11,fontWeight:'500',color:C.muted,marginTop:4},
 topupMethodImg:{position:'absolute',right:-6,bottom:-6,width:92,height:92,borderRadius:18},
 flowBackRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:14,minHeight:48,paddingVertical:6,alignSelf:'flex-start'},
 flowBackText:{fontSize:13,fontWeight:'700',color:C.ink},
 flowHeroWhite:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFFFFF',borderRadius:22,padding:16,marginBottom:18,borderWidth:1,borderColor:C.line,overflow:'hidden'},
 flowHeroTitleDark:{fontSize:16,fontWeight:'800',color:C.ink,letterSpacing:-0.3},
 flowHeroSubDark:{fontSize:11,color:C.muted,lineHeight:17,marginTop:5},
 flowHeroSideImg:{width:76,height:76,borderRadius:16},
 selectRowCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#FFFFFF',borderRadius:18,padding:14,minHeight:64,borderWidth:1.5,borderColor:C.line},
 selectRowCardActive:{borderColor:C.ink,backgroundColor:'#ede9f8'},
 selectRowIcon:{width:40,height:40,borderRadius:13,backgroundColor:'#ebe8f5',alignItems:'center',justifyContent:'center'},
 btcHeroCard:{backgroundColor:'#2a0a8a',borderRadius:22,overflow:'hidden',marginBottom:18,borderWidth:1,borderColor:'#2e234e'},
 btcHeroImg:{width:'100%',height:122},
 btcHeroBody:{padding:16,paddingTop:14},
 btcHeroTitle:{fontSize:16,fontWeight:'800',color:'#FFFFFF',letterSpacing:-0.3},
 btcHeroSub:{fontSize:11,color:'#bcb5d2',lineHeight:16,marginTop:4},
 btcNetCard:{flex:1,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#FFFFFF',borderRadius:18,padding:11,minHeight:60,borderWidth:1.5,borderColor:C.line},
 btcNetCardActive:{borderColor:C.ink,backgroundColor:'#ede9f8'},
 btcNetIcon:{width:42,height:42,borderRadius:12},
 btcConvertCard:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#FFFFFF',borderRadius:18,padding:16,marginBottom:14,borderWidth:1,borderColor:C.line},
 btcSwapCircle:{width:36,height:36,borderRadius:18,backgroundColor:C.lime,alignItems:'center',justifyContent:'center',marginHorizontal:8},
 btcAddrCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#ebe8f5',borderRadius:18,padding:14,marginBottom:18,borderWidth:1,borderColor:C.line},
 btcMiniQr:{width:50,height:50,borderRadius:14,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line},
 btcCopyIconBtn:{width:48,height:48,borderRadius:14,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line},
 terminalStepsBox:{backgroundColor:'#FFFFFF',borderRadius:18,padding:16,gap:12,marginBottom:18,borderWidth:1,borderColor:C.line},
 terminalStepRow:{flexDirection:'row',alignItems:'center',gap:12},
 terminalStepNum:{width:26,height:26,borderRadius:9,backgroundColor:C.lime,alignItems:'center',justifyContent:'center'},
 terminalCodeCard:{backgroundColor:'#FFFFFF',borderRadius:22,padding:22,alignItems:'center',marginBottom:18,borderWidth:1,borderColor:C.line},
 terminalCodeDigits:{fontSize:34,fontWeight:'800',color:C.ink,letterSpacing:4,marginTop:10}
});
