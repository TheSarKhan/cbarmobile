import React,{useState,useEffect} from 'react';
import {View,Pressable,StyleSheet,Image} from 'react-native';
import {Text} from './text';
import {LinearGradient} from 'expo-linear-gradient';
import {Row,minor,money} from './api';
import {C,S,CARD_IMAGES,useApp,Icon,Button,Field,Check,Badge,Box,Empty,statusLabel,statusTone} from './ui';

export function CreditSection(){
 const a=useApp(),d=a.data;
 const [amount,setAmount]=useState('800'),
  [term,setTerm]=useState('12'),
  [purpose,setPurpose]=useState('Noutbuk'),
  [consent,setConsent]=useState(false);

 const bnplAvail=d.bnplAvailableMinor||0;
 const bnplPct=Math.min(100,Math.round((bnplAvail/5000)*100));

 return (
  <>
   <LinearGradient colors={['#2a0a8a','#2e234e']} style={[hs.bnplCard,{marginBottom:16}]}>
    <View style={S.between}>
     <View style={{flex:1,paddingRight:10}}>
      <Badge text="SONRA ÖDƏ · 0% FAİZ" dark/>
      <Text style={[hs.bnplAmount,{marginTop:12}]}>
       {money(bnplAvail)}
       <Text style={{fontSize:14,fontWeight:'500',color:'#b6afcd'}}> / 50.00 ₼</Text>
      </Text>
      <Text style={{color:'#c5bed9',fontSize:11,lineHeight:17,marginTop:6}}>
       Kassa QR ödənişində &quot;Sonra ödə&quot; seçərək 30 gün faizsiz istifadə edin. Ödəniş tarixində borc balansdan avtomatik tutulur.
      </Text>
     </View>
     <Image source={CARD_IMAGES.credit} style={{width:78,height:78,borderRadius:16}} resizeMode="cover"/>
    </View>
    <View style={[hs.progressTrack,{backgroundColor:'rgba(255,255,255,0.16)',marginTop:14}]}>
     <View style={[hs.progressFill,{width:bnplPct+'%',backgroundColor:C.lime}]}/>
    </View>
   </LinearGradient>

   {d.bnplEligibility?.eligible===false&&<Box><Text style={S.muted}>Sonra ödə üçün hesab 14 günlük olmalı, son 30 gündə ən azı iki daxilolma olmalı və gecikmiş borc olmamalıdır.</Text></Box>}
   {d.bnplLoans?.filter((l:Row)=>['ACTIVE','OVERDUE','BAD'].includes(l.status)).map((l:Row)=>(
    <Box key={l.id} style={{backgroundColor:'#eeebf8',borderColor:'#c1b6e2'}}>
     <View style={[S.between,{marginBottom:12}]}>
      <View>
       <Text style={S.label}>AKTİV SONRA ÖDƏ BORCU</Text>
       <Text style={S.h2}>{money(l.outstandingMinor)}</Text>
       <Text style={S.muted}>Son ödəniş tarixi: {new Date(l.dueAt).toLocaleDateString('az-AZ')}</Text>
      </View>
      <Badge text={l.status==='ACTIVE'?'AKTİV':'GECİKMİŞ'} tone="warn"/>
     </View>
     <Button
      title="Balansdan indi qaytar"
      disabled={a.busy}
      icon="checkmark-circle-outline"
      onPress={()=>a.act('bnpl/loans/'+l.id+'/repay',{amountMinor:l.outstandingMinor}).catch(()=>{})}
     />
    </Box>
   ))}

   <Box>
    <Text style={[S.h3,{marginBottom:4}]}>Partnyor kredit müraciəti</Text>
    <Text style={[S.muted,{marginBottom:14}]}>
     Mock BOKT A və Mock Bank B-dən eyni anda fərdi kredit təklifləri alın və şərtləri müqayisə edin.
    </Text>
    <Field label="Məbləğ · AZN" value={amount} onChange={setAmount} numeric/>
    <Field label="Müddət · ay (3–24)" value={term} onChange={setTerm} numeric/>
    <Field label="Məqsəd" value={purpose} onChange={setPurpose}/>
    <Check
     value={consent}
     onChange={setConsent}
     text="Hesabın aktivlik və daxilolma göstəricilərinin Mock BOKT A və Mock Bank B ilə paylaşılmasına razıyam."
    />
    <Button
     title="Təklifləri müqayisə et"
     disabled={a.busy||!consent}
     icon="arrow-forward"
     onPress={()=>a.act('loan-applications',{amountMinor:minor(amount),termMonths:Number(term),purpose,consent}).catch(()=>{})}
    />
   </Box>

   {d.offers?.length>0&&(
    <View style={S.section}>
     <Text style={S.h3}>Partnyor təkliflərinin müqayisəsi</Text>
    </View>
   )}

   {d.offers?.map((o:Row)=>{
    const totalRepay=(o.monthlyPaymentMinor||0)*(o.termMonths||0);
    return (
     <Box key={o.id} style={!o.approved?{opacity:0.75,backgroundColor:'#f8f6f2'}:undefined}>
      <View style={[S.between,{marginBottom:10}]}>
       <View style={S.row}>
        <View style={S.tile}><Icon name="business-outline" size={19}/></View>
        <View>
         <Text style={S.h3}>{o.partner}</Text>
         <Text style={[S.muted,{fontSize:11}]}>{o.approved?'Fərdi kredit təklifi':'Kredit siyasəti cavabı'}</Text>
        </View>
       </View>
       <Badge text={statusLabel[o.status]||o.status} tone={statusTone(o.status)}/>
      </View>

      {o.approved?(
       <>
        <Text style={S.amount}>{money(o.amountMinor)}</Text>
        <View style={hs.offerGrid}>
         <View style={hs.offerCell}>
          <Text style={hs.offerCellLabel}>Aylıq ödəniş</Text>
          <Text style={hs.offerCellVal}>{money(o.monthlyPaymentMinor)}</Text>
         </View>
         <View style={hs.offerCell}>
          <Text style={hs.offerCellLabel}>FİFD (İllik)</Text>
          <Text style={hs.offerCellVal}>{o.aprPercent}%</Text>
         </View>
         <View style={hs.offerCell}>
          <Text style={hs.offerCellLabel}>Müddət</Text>
          <Text style={hs.offerCellVal}>{o.termMonths} ay</Text>
         </View>
         <View style={hs.offerCell}>
          <Text style={hs.offerCellLabel}>Yekun ödəniş</Text>
          <Text style={hs.offerCellVal}>{money(totalRepay)}</Text>
         </View>
        </View>
        {o.status==='AVAILABLE'&&(
         <Button
          title="Demo müqaviləni PIN ilə qəbul et"
          disabled={a.busy}
          icon="document-text-outline"
          onPress={()=>a.act('loan-offers/'+o.id+'/accept',{amountMinor:o.amountMinor,recipientName:o.partner}).catch(()=>{})}
         />
        )}
       </>
      ):(
       <Text style={[S.muted,{marginTop:4}]}>{o.reason}</Text>
      )}
     </Box>
    );
   })}

   {d.partnerLoans?.map((l:Row)=>(
    <Box key={l.id}>
     <View style={[S.between,{marginBottom:12}]}>
      <View>
       <Badge text="AKTİV PARTNYOR KREDİTİ" tone="success"/>
       <Text style={[S.h3,{marginTop:8}]}>{l.partner} · {money(l.amountMinor)}</Text>
      </View>
      <Icon name="calendar-outline" size={22} color={C.ink}/>
     </View>
     <Button title="Aylıq ödəniş qrafikinə bax" secondary icon="list-outline" onPress={()=>a.open('schedule:'+l.id)}/>
    </Box>
   ))}
  </>
 );
}

export function CryptoSection(){
 const a=useApp(),d=a.data;
 const [portfolio,setPortfolio]=useState<Row|null>(null),
  [side,setSide]=useState<'BUY'|'SELL'>('BUY'),
  [amount,setAmount]=useState('20'),
  [quote,setQuote]=useState<Row|null>(null),
  [consent,setConsent]=useState(false),
  [seconds,setSeconds]=useState(0),
  [depFrom,setDepFrom]=useState('T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'),
  [depUsdt,setDepUsdt]=useState('10'),
  [wdTo,setWdTo]=useState('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9'),
  [wdName,setWdName]=useState('Murad Əliyev'),
  [wdUsdt,setWdUsdt]=useState('5');

 useEffect(()=>{
  if(d.cryptoEnabled)a.call('crypto/portfolio').then(setPortfolio).catch(()=>{});
 },[a,d.cryptoEnabled,d.transactions?.length]);

 useEffect(()=>{
  if(!quote)return;
  const tick=()=>setSeconds(Math.max(0,Math.ceil((quote.expiresAt-Date.now())/1000)));
  tick();
  const id=setInterval(tick,250);
  return()=>clearInterval(id);
 },[quote]);

 if(!d.cryptoEnabled){
  return (
   <Box>
    <Empty
     text="Kripto pilot (USDT) hazırda söndürülüb. Admin paneldə Sistem ayarları → Kripto pilotu açarı ilə aktivləşdirin."
     icon="flask-outline"
    />
   </Box>
  );
 }

 const usdtBal=portfolio?portfolio.balanceMicro/1e6:0;

 return (
  <>
   <LinearGradient colors={['#2a0a8a','#32284f']} style={hs.cryptoCard}>
    <View style={S.between}>
     <Text style={{color:'white',fontWeight:'700',fontSize:14}}>Tether · USDT (TRC-20)</Text>
     <Badge text="VASP PİLOT" dark/>
    </View>
    <Text style={hs.cryptoBal}>
     {portfolio?new Intl.NumberFormat('az-AZ',{maximumFractionDigits:6}).format(usdtBal):'…'} USDT
    </Text>
    <Text style={{color:'#b6afcd',fontSize:11,marginTop:6}}>
     Təxmini dəyər: ≈ {money(Math.round(usdtBal*170))} · Ünvan: TKampus{String(d.user?.id||'U1').toUpperCase()}Demo994
    </Text>
   </LinearGradient>

   <Box>
    <Text style={[S.h3,{marginBottom:12}]}>USDT Al və ya Sat</Text>
    <View style={hs.segmentWrap}>
     {([['BUY','USDT Al (AZN → USDT)'],['SELL','USDT Sat (USDT → AZN)']] as const).map(([id,label])=>(
      <Pressable
       key={id}
       accessibilityRole="button"
       onPress={()=>{setSide(id);setQuote(null);}}
       style={[hs.segment,side===id&&hs.segmentActive]}
      >
       <Text style={{fontSize:12,fontWeight:'700',color:C.ink}}>{label}</Text>
      </Pressable>
     ))}
    </View>

    <Field label="Məbləğ · AZN" value={amount} onChange={v=>{setAmount(v);setQuote(null);}} numeric/>
    <Check value={consent} onChange={setConsent} text="Demo kripto risk xəbərdarlığını qəbul edirəm."/>

    {quote&&(
     <Box style={{backgroundColor:'#ede9f8',borderColor:'#c1b6e2'}}>
      <View style={[S.between,{marginBottom:8}]}>
       <Text style={S.label}>MƏZƏNNƏ TƏKLİFİ (QUOTE)</Text>
       <Badge text={seconds>0?`${seconds} san aktivdir`:'Müddəti bitdi'} tone={seconds>0?'success':'danger'}/>
      </View>
      <View style={[S.between,{marginBottom:6}]}>
       <Text style={S.muted}>{side==='BUY'?'Alınacaq USDT':'Satılacaq USDT'}</Text>
       <Text style={S.h3}>
        {new Intl.NumberFormat('az-AZ',{maximumFractionDigits:6}).format((quote.cryptoAmountMicro||quote.usdtMicro||0)/1e6)} USDT
       </Text>
      </View>
      <View style={[S.between,{marginBottom:6}]}>
       <Text style={S.muted}>Məbləğ (AZN)</Text>
       <Text style={S.h3}>{money(quote.aznAmountMinor)}</Text>
      </View>
      {quote.feeMinor!==undefined&&(
       <View style={S.between}>
        <Text style={S.muted}>Xidmət haqqı</Text>
        <Text style={S.muted}>{money(quote.feeMinor)}</Text>
       </View>
      )}
     </Box>
    )}

    {!quote?(
     <Button
      title="30 saniyəlik məzənnə al"
      icon="analytics-outline"
      disabled={a.busy||!consent}
      onPress={()=>a.act('crypto/quotes',{amountMinor:minor(amount),asset:'USDT',side}).then(setQuote).catch(()=>{})}
     />
    ):(
     <Button
      title={seconds>0?(side==='BUY'?'Alışı təsdiqlə':'Satışı təsdiqlə'):'Məzənnəni yenilə'}
      icon={seconds>0?'checkmark-circle-outline':'refresh-outline'}
      disabled={a.busy||!consent}
      onPress={()=>{
       if(seconds===0){setQuote(null);return;}
       a.act('crypto/orders',{quoteId:quote.id,riskAccepted:consent,amountMinor:quote.aznAmountMinor}).then(async()=>{
        setQuote(null);
        setPortfolio(await a.call('crypto/portfolio'));
       }).catch(()=>{});
      }}
     />
    )}
   </Box>

   <Box>
    <Text style={[S.h3,{marginBottom:4}]}>TRC-20 Depozit və Çıxarış</Text>
    <Text style={[S.muted,{marginBottom:12}]}>
     Xarici TRC-20 ünvanından mock depozit qəbul edin və ya Travel Rule məlumatları ilə çıxarış edin.
    </Text>
    <Field label="Göndərən TRC-20 ünvanı" value={depFrom} onChange={setDepFrom}/>
    <Field label="Depozit · USDT" value={depUsdt} onChange={setDepUsdt} numeric/>
    <View style={{flexDirection:'row',gap:8}}>
     <View style={{flex:1}}>
      <Button
       title="Depozit et"
       disabled={a.busy}
       onPress={()=>a.act('crypto/deposits',{amountMicro:Math.round(Number(depUsdt)*1e6),fromAddress:depFrom}).then(async()=>{setPortfolio(await a.call('crypto/portfolio'));}).catch(()=>{})}
      />
     </View>
     <View style={{flex:1}}>
      <Button
       title="AML Sanksiya Testi"
       secondary
       disabled={a.busy}
       onPress={()=>a.act('crypto/deposits',{amountMicro:Math.round(Number(depUsdt)*1e6),fromAddress:'TBLACKLIST999SANCTION'}).catch(()=>{})}
      />
     </View>
    </View>

    <View style={S.line}/>

    <Field label="Alıcı TRC-20 ünvanı" value={wdTo} onChange={setWdTo}/>
    <Field label="Alıcının tam adı (Travel Rule)" value={wdName} onChange={setWdName}/>
    <Field label="Çıxarış · USDT" value={wdUsdt} onChange={setWdUsdt} numeric/>
    <Button
     title="PIN ilə USDT çıxar"
     secondary
     icon="arrow-up-outline"
     disabled={a.busy}
     onPress={()=>a.act('crypto/withdrawals',{amountMicro:Math.round(Number(wdUsdt)*1e6),toAddress:wdTo,beneficiaryName:wdName}).then(async()=>{setPortfolio(await a.call('crypto/portfolio'));}).catch(()=>{})}
    />
   </Box>
  </>
 );
}

const hs=StyleSheet.create({
 heroRow:{flexDirection:'row',alignItems:'center',backgroundColor:'white',borderRadius:20,padding:15,marginBottom:16,borderWidth:1,borderColor:C.line},
 heroThumb:{width:68,height:68,borderRadius:14},
 bankCard:{borderRadius:20,padding:22,height:210,justifyContent:'space-between',zIndex:1},
 cardBrand:{fontWeight:'800',color:'white',fontSize:22,letterSpacing:-1},
 cardNumber:{color:'white',fontSize:18,letterSpacing:1.5,fontWeight:'600'},
 progressTrack:{height:7,backgroundColor:'#e5e1f2',borderRadius:4,overflow:'hidden'},
 progressFill:{height:7,borderRadius:4},
 bnplCard:{borderRadius:22,padding:20},
 bnplAmount:{fontSize:32,fontWeight:'800',color:'white',letterSpacing:-1},
 offerGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:12},
 offerCell:{width:'48%',backgroundColor:'#eeebf7',borderRadius:12,padding:10},
 offerCellLabel:{fontSize:10,color:C.muted,fontWeight:'600'},
 offerCellVal:{fontSize:13,color:C.ink,fontWeight:'700',marginTop:3},
 cryptoCard:{borderRadius:22,padding:20,marginBottom:16},
 cryptoBal:{fontSize:30,fontWeight:'800',color:'white',letterSpacing:-1,marginTop:12},
 segmentWrap:{flexDirection:'row',backgroundColor:'#e7e3f3',padding:4,borderRadius:13,marginBottom:16},
 segment:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:8,borderRadius:10},
 segmentActive:{backgroundColor:'white'}
});
