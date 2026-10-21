import React,{useState,useEffect} from 'react';
import {View,Text,Platform,Pressable,Image,StyleSheet} from 'react-native';
import * as Linking from 'expo-linking';
import {Row,minor,money,storage} from './api';
import {S,C,CARD_IMAGES,Button,Field,Box,Badge,Icon,statusTone} from './ui';

type Props={
 base:string;
 data:Row;
 busy:boolean;
 call:(p:string,b?:Row)=>Promise<any>;
 act:(p:string,b:Row)=>Promise<any>;
 setError:(s:string)=>void;
};

export function CardTransferForm(a:Props){
 const [session,setSession]=useState<Row|null>(null),
  [card,setCard]=useState<Row|null>(null),
  [savedCard,setSavedCard]=useState<Row|null>(null),
  [purpose,setPurpose]=useState<'SEND'|'WITHDRAW_OWN'>('SEND'),
  [saveAs,setSaveAs]=useState(''),
  [quote,setQuote]=useState<Row|null>(null),
  [transfer,setTransfer]=useState<Row|null>(null),
  [amount,setAmount]=useState('20'),
  [opening,setOpening]=useState(false);

 useEffect(()=>{
  storage.get('card-session-'+a.data.user.id).then(raw=>{
   if(raw)setSession(JSON.parse(raw));
  }).catch(()=>{});
 },[a.data.user.id]);

 async function run(fn:()=>Promise<void>){
  a.setError('');
  try{await fn();}catch(e){a.setError((e as Error).message);}
 }

 function formUrl(s:Row){
  const api=new URL(a.base);
  const publicSim=process.env.EXPO_PUBLIC_SIM_URL||(api.protocol==='https:'||!['localhost','127.0.0.1','10.0.2.2'].includes(api.hostname)&&api.port!=='8080'?api.origin:api.protocol+'//'+api.hostname+':8081');
  return publicSim+s.formPath;
 }

 async function openForm(){
  setOpening(true);
  try{
   let s=session;
   if(!s){
    s=await a.act('card-transfers/card-session',{});
    setSession(s);
    await storage.set('card-session-'+a.data.user.id,JSON.stringify(s));
    if(Platform.OS==='web')return;
   }
   if(Platform.OS==='web')window.open(formUrl(s!),'_blank','noopener,noreferrer');
   else await Linking.openURL(formUrl(s!));
  }finally{
   setOpening(false);
  }
 }

 const current=transfer?(a.data.cardTransfers?.find((x:Row)=>x.id===transfer.id)||transfer):null;
 const savedList:Row[]=a.data.recipientCards||[];
 const activeCard=savedCard||card;
 const disabled=a.busy||opening;

 if(current){
  const done=current.status==='COMPLETED',
   failed=current.status==='FAILED',
   review=current.status==='UNDER_REVIEW';
  return (
   <>
    <Box style={{alignItems:'center',paddingVertical:24,gap:12}}>
     <View style={[S.tile,{width:68,height:68,borderRadius:24,backgroundColor:failed?'#fbe8e2':review?'#fcf1df':C.lime}]}>
      <Icon
       name={done?'checkmark':failed?'close':review?'shield-outline':'time-outline'}
       size={30}
       color={failed?C.red:C.ink}
      />
     </View>
     <Badge
      text={done?'TAMAMLANDI':failed?'UĞURSUZ · REZERV AÇILDI':review?'ADMİN YOXLAMASINDA':'GÖNDƏRİLİR'}
      tone={statusTone(current.status)}
     />
     <Text style={S.h2}>
      {done?'Karta çatdı':failed?'Köçürmə alınmadı':review?'Əlavə yoxlamadadır':'Şəbəkəyə göndərilir…'}
     </Text>
     <Text style={S.amount}>{money(current.amountMinor)}</Text>
     <Text style={[S.h3,{color:C.muted}]}>{current.bankName} · {current.brand} •••• {current.last4}</Text>
     <Text style={[S.muted,{textAlign:'center',marginTop:4}]}>
      {failed
       ?'Rezerv açıldı. Məbləğ və komissiya balansınızda qaldı.'
       :done
       ?'Məbləğ və komissiya ikili qeydiyyat jurnalında (ledger) rəsmiləşdirildi.'
       :review
       ?'Şəbəkədən yekun cavab gözlənilir. Məbləğ rezervdədir; nəticə admin paneldə də izlənir.'
       :'Məbləğ və komissiya rezerv edilib. Şəbəkə cavabı gələndə nəticə avtomatik yenilənəcək.'}
     </Text>
    </Box>
    <Button
     title="Yeni köçürmə"
     secondary
     disabled={!done&&!failed}
     onPress={()=>{
      storage.remove('card-session-'+a.data.user.id);
      setSession(null);
      setCard(null);
      setSavedCard(null);
      setQuote(null);
      setTransfer(null);
      setSaveAs('');
     }}
    />
   </>
  );
 }

 return (
  <>
   <View style={cs.heroCard}>
    <View style={{flex:1,paddingRight:12}}>
     <Text style={S.h3}>Karta köçürmə və çıxarış</Text>
     <Text style={[S.muted,{marginTop:4,fontSize:11}]}>
      Visa Direct / Mastercard Send. Tam kart nömrəsi Kampus bazasında saxlanılmır, yalnız tokenləşdirilir.
     </Text>
    </View>
    <Image source={CARD_IMAGES.topupCard} style={cs.heroImg} resizeMode="cover"/>
   </View>

   <Text style={S.label}>Əməliyyat növü</Text>
   <View style={{flexDirection:'row',gap:10,marginBottom:16}}>
    <Pressable
     accessibilityRole="button"
     onPress={()=>{setPurpose('SEND');setQuote(null);}}
     style={[cs.modeCard,purpose==='SEND'&&cs.modeCardActive]}
    >
     <Icon name="paper-plane-outline" size={18} color={C.ink}/>
     <Text style={S.h3}>Başqa karta</Text>
     <Text style={[S.muted,{fontSize:11}]}>Komissiya 0.5% (min 0.30 ₼)</Text>
    </Pressable>

    <Pressable
     accessibilityRole="button"
     onPress={()=>{setPurpose('WITHDRAW_OWN');setQuote(null);}}
     style={[cs.modeCard,purpose==='WITHDRAW_OWN'&&cs.modeCardActive]}
    >
     <Icon name="wallet-outline" size={18} color={C.ink}/>
     <Text style={S.h3}>Öz kartıma çıxarış</Text>
     <Text style={[S.muted,{fontSize:11}]}>Ayda 500 ₼-dək 0%</Text>
    </Pressable>
   </View>

   {!activeCard?(
    <>
     {savedList.length>0&&(
      <View style={{marginBottom:14}}>
       <Text style={S.label}>Yadda saxlanmış kartlar</Text>
       {savedList.map((rc:Row)=>(
        <Box key={rc.id} style={{paddingVertical:12}}>
         <View style={S.between}>
          <Pressable
           accessibilityRole="button"
           style={[S.row,{flex:1,minHeight:48}]}
           onPress={()=>{setSavedCard(rc);setQuote(null);}}
          >
           <View style={S.tile}><Icon name="card-outline"/></View>
           <View style={{flex:1}}>
            <Text numberOfLines={1} style={S.h3}>{rc.nickname||rc.bankName}</Text>
            <Text style={S.muted}>{rc.bankName} · {rc.brand} •••• {rc.last4}</Text>
           </View>
          </Pressable>
          <Pressable
           accessibilityRole="button"
           accessibilityLabel="Kartı sil"
           onPress={()=>run(async()=>{await a.act('recipient-cards/'+rc.id+'/delete',{});})}
           style={cs.delBtn}
          >
           <Icon name="trash-outline" size={18} color={C.red}/>
          </Pressable>
         </View>
        </Box>
       ))}
      </View>
     )}

     <Button
      title={opening?'Forma açılır…':session?'Kart formasını aç':Platform.OS==='web'?'Yeni kart formasını hazırla':'Yeni kart əlavə et'}
      icon="open-outline"
      disabled={disabled}
      onPress={()=>run(openForm)}
     />

     {session&&(
      <Box style={{backgroundColor:'#ede9f8'}}>
       <Badge text="HOSTED PCI FORMASI"/>
       <Text style={[S.muted,{marginTop:8,marginBottom:12}]}>
        Mock PCI formasında 16 rəqəmli kart nömrəsini daxil edib bu ekrana qayıdın, sonra aşağıdakı düyməni sıxın.
       </Text>
       <Button
        title="Kartı yoxla"
        secondary
        disabled={disabled}
        onPress={()=>run(async()=>{
         const c=await a.call('card-sessions/'+session.id);
         if(c.status!=='COMPLETED')throw new Error('Kart forması hələ tamamlanmayıb.');
         setCard(c);
        })}
       />
      </Box>
     )}
    </>
   ):(
    <>
     <Box>
      <View style={S.between}>
       <View style={[S.row,{flex:1}]}>
        <View style={S.tile}><Icon name="card-outline"/></View>
        <View style={{flex:1}}>
         <Text numberOfLines={1} style={S.h3}>{activeCard.nickname||activeCard.bankName}</Text>
         <Text style={S.muted}>{activeCard.bankName} · {activeCard.brand} •••• {activeCard.last4}</Text>
        </View>
       </View>
       <Badge text={purpose==='WITHDRAW_OWN'?'ÖZ KARTIM':'KÖÇÜRMƏ'}/>
      </View>
     </Box>

     <Field label="Göndərilən məbləğ · AZN" value={amount} numeric onChange={v=>{setAmount(v);setQuote(null);}}/>
     {!savedCard&&<Field label="Kartı yadda saxla (istəyə bağlı ad, məs: Kapital Maaş)" value={saveAs} onChange={setSaveAs}/>}

     {quote&&(
      <Box style={{backgroundColor:'#eeebf8',borderColor:'#c7bce6'}}>
       <Text style={[S.label,{marginBottom:10}]}>ÖDƏNİŞ XÜLASƏSİ</Text>
       <View style={[S.between,{marginBottom:8}]}>
        <Text style={S.muted}>Alıcı karta çatacaq</Text>
        <Text style={S.h3}>{money(quote.amountMinor)}</Text>
       </View>
       <View style={[S.between,{marginBottom:8}]}>
        <Text style={S.muted}>{purpose==='WITHDRAW_OWN'?'Komissiya (ayda 500 ₼-dək 0%)':'Komissiya (0.5%, min. 0.30 ₼)'}</Text>
        <Text style={{color:C.ink,fontWeight:'600'}}>{money(quote.feeMinor)}</Text>
       </View>
       {purpose==='WITHDRAW_OWN'&&quote.freeRemainingMinor!==undefined&&(
        <View style={[S.between,{marginBottom:8}]}>
         <Text style={S.muted}>Qalan pulsuz aylıq limit</Text>
         <Text style={S.muted}>{money(quote.freeRemainingMinor)}</Text>
        </View>
       )}
       <View style={S.line}/>
       <View style={S.between}>
        <Text style={S.h3}>Balansdan cəmi çıxılacaq</Text>
        <Text style={S.h2}>{money(quote.totalMinor)}</Text>
       </View>
      </Box>
     )}

     <Button
      title={quote?'PIN ilə təsdiqlə və göndər':'Komissiyanı hesabla'}
      icon={quote?'shield-checkmark-outline':'calculator-outline'}
      disabled={disabled}
      onPress={()=>run(async()=>{
       if(!quote){
        setQuote(await a.act('card-transfers/fee-quote',savedCard?{cardId:savedCard.id,amountMinor:minor(amount),purpose}:{sessionId:session!.id,amountMinor:minor(amount),purpose}));
        return;
       }
       const body:Row={
        quoteId:quote.id,
        amountMinor:quote.amountMinor,
        totalMinor:quote.totalMinor,
        recipientName:quote.bankName+' · •••• '+quote.last4
       };
       if(saveAs.trim())body.saveAs=saveAs.trim();
       setTransfer(await a.act('card-transfers',body));
      })}
     />

     <Button
      title="Başqa kart seç"
      secondary
      disabled={disabled}
      onPress={()=>{
       storage.remove('card-session-'+a.data.user.id);
       setSession(null);
       setCard(null);
       setSavedCard(null);
       setQuote(null);
       setSaveAs('');
      }}
     />
    </>
   )}

   <Box style={{marginTop:8,backgroundColor:'#eeecf5'}}>
    <Text style={[S.label,{marginBottom:6}]}>DEMO TEST KART NÖMRƏLƏRİ (BIN)</Text>
    <Text style={[S.muted,{fontSize:11,lineHeight:17}]}>
     • Kapital: 4169738855551234{'\n'}
     • ABB: 4098584412345678 · PAŞA: 5222081122334452{'\n'}
     • Şəbəkə rəddi: 4000000000000002 · Gecikmə: 4000000000009995
    </Text>
   </Box>
  </>
 );
}

const cs=StyleSheet.create({
 heroCard:{flexDirection:'row',alignItems:'center',backgroundColor:'white',borderRadius:20,padding:15,marginBottom:16,borderWidth:1,borderColor:C.line},
 heroImg:{width:68,height:68,borderRadius:14},
 modeCard:{flex:1,minHeight:76,backgroundColor:'white',borderRadius:16,padding:13,borderWidth:1.5,borderColor:C.line,justifyContent:'space-between',gap:4},
 modeCardActive:{borderColor:C.ink,backgroundColor:'#ebe6f8'},
 delBtn:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:12}
});
