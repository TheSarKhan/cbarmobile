import React,{useState} from 'react';
import {View,Pressable,StyleSheet,Share} from 'react-native';
import {Text} from './text';
import {C,S,useApp,linkedCards,Icon,Button,Field,Badge,Box} from './ui';
import {minor,money,Row} from './api';
import {luhn,groupCard,MiniCard,BigAmount} from './CardUi';
import {QrCode} from './QrCode';

const formatExpiry=(raw:string)=>{const d=raw.replace(/\D/g,'').slice(0,4);return d.length>2?d.slice(0,2)+'/'+d.slice(2):d;};

/** Balance top-up: one screen with a QR request on top and the cards below; a typed card is a separate form. */
export function TopUpFlow({close}:{close:()=>void}){
 const a=useApp();
 const [view,setView]=useState<'home'|'new'|'qr'|'amount'>('home'),
  [amount,setAmount]=useState(''),
  [picked,setPicked]=useState(''),
  [number,setNumber]=useState(''),
  [expiry,setExpiry]=useState(''),
  [cvv,setCvv]=useState(''),
  [qr,setQr]=useState<Row|null>(null);
 const parsed=Math.max(0,Number(amount.replace(',','.'))||0);

 async function run(fn:()=>Promise<any>){
  a.setError('');
  try{await fn();}catch(e){a.setError((e as Error).message);}
 }

 const cards=[
  ...(a.data.savedCards||[]).map((c:Row)=>({key:'S:'+c.id,id:c.id,saved:true,brand:c.brand,title:c.brand+' kartı',sub:'•••• '+c.last4+' · '+c.expiry})),
  ...linkedCards(a.data).map((c:Row)=>({key:'B:'+c.id,id:c.id,saved:false,brand:/master/i.test(c.name)?'Mastercard':'Visa',title:c.bankName,sub:c.masked+' · '+money(c.balanceMinor)}))
 ];
 const current=cards.find((c:Row)=>c.key===picked)||cards[0];

 const digits=number.replace(/\D/g,'');
 const month=Number(expiry.slice(0,2)),year=2000+Number(expiry.slice(3,5)),now=new Date();
 const numberError=digits.length===16&&!luhn(digits)?'Kart nömrəsi yanlışdır.':'';
 const expiryError=expiry.length===5&&(month<1||month>12||year<now.getFullYear()||(year===now.getFullYear()&&month<now.getMonth()+1))?'Kartın müddəti yanlışdır.':'';
 const cardReady=digits.length===16&&!numberError&&expiry.length===5&&!expiryError&&cvv.length===3;

 const back=(
  <Pressable accessibilityRole="button" onPress={()=>{setView('home');setQr(null);}} style={st.backRow}>
   <Icon name="arrow-back" size={18} color={C.ink}/>
   <Text style={st.backText}>Geri</Text>
  </Pressable>
 );

 if(view==='qr'){
  const live=qr?(a.data.topupQrs||[]).find((x:Row)=>x.id===qr.id)||qr:null;
  const payments:Row[]=live?.payments||[];
  return (
   <>
    {back}
    {!qr?(
     <>
      <Text style={[S.muted,{marginBottom:16}]}>Bir QR kod yaradılır və istənilən qədər adam eyni anda istifadə edə bilər. Skan edən Kampus istifadəçisi öz ekranında məbləği yazıb ödəyir, pul birbaşa balansına düşür.</Text>
      <Button
       title="QR yarat"
       icon="qr-code-outline"
       disabled={a.busy}
       onPress={()=>run(async()=>{setQr(await a.act('topups/qr',{}));})}
      />
     </>
    ):(
     <>
      <Box style={{alignItems:'center',paddingVertical:22}}>
       <QrCode value={qr.qrPayload}/>
       <Text style={[S.h3,{marginTop:16}]}>{a.data.user?.name}</Text>
       <Text style={[S.muted,{marginTop:4,textAlign:'center'}]}>Skan edən məbləği özü yazır</Text>
       <View style={{marginTop:12}}>
        <Badge text={live.paidCount?`${live.paidCount} ÖDƏNİŞ · ${money(live.totalMinor)}`:'ÖDƏNİŞ GÖZLƏYİR'} tone={live.paidCount?'success':'neutral'}/>
       </View>
      </Box>
      <Button
       title="QR paylaş"
       icon="share-social-outline"
       onPress={()=>run(async()=>{
        // closing the share sheet without sharing is the user's choice, not an error
        await Share.share({message:`${a.data.user?.name} Kampus balansını artırmaq üçün sənə QR göndərdi. Kampus tətbiqində QR skan et və ya bu kodu daxil et: ${qr.qrPayload}`}).catch(()=>{});
       })}
      />
      {payments.length>0&&(
       <>
        <Text style={[S.label,{marginTop:8}]}>Son ödənişlər</Text>
        <View style={{gap:8,marginBottom:16}}>
         {payments.slice(0,5).map((x:Row,i:number)=>(
          <View key={i} style={[S.between,st.payRow]}>
           <Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>{x.payerName}</Text>
           <Text style={{fontSize:13,fontWeight:'800',color:C.green}}>+{money(x.amountMinor)}</Text>
          </View>
         ))}
        </View>
       </>
      )}
      <Button title="Bağla" secondary onPress={close}/>
     </>
    )}
   </>
  );
 }

 if(view==='new'){
  return (
   <>
    {back}
    <Field label="Kart nömrəsi" value={number} onChange={t=>setNumber(groupCard(t))} placeholder="0000 0000 0000 0000" digits maxLength={19} error={numberError} eager/>
    <View style={{flexDirection:'row',gap:12}}>
     <View style={{flex:1}}><Field label="Bitmə tarixi" value={expiry} onChange={t=>setExpiry(formatExpiry(t))} placeholder="AA/İİ" digits maxLength={5} error={expiryError} eager/></View>
     <View style={{flex:1}}><Field label="CVV" value={cvv} onChange={t=>setCvv(t.replace(/\D/g,'').slice(0,3))} placeholder="•••" secure digits maxLength={3}/></View>
    </View>
    <Text style={[S.muted,{marginBottom:16,fontSize:12,lineHeight:18}]}>Kart yadda saxlanılır: nömrə və CVV saxlanmır, yalnız token və son 4 rəqəm. Növbəti artımlarda CVV tələb olunmur. İstədiyin vaxt silə bilərsən.</Text>
    <Button
     title="Kartı əlavə et"
     icon="add"
     disabled={a.busy||!cardReady}
     onPress={()=>run(async()=>{
      const added=await a.act('saved-cards',{card:{number:digits,expiry,cvv}});
      setNumber('');setExpiry('');setCvv('');setPicked('S:'+added.id);setAmount('');setView('amount');
     })}
    />
   </>
  );
 }

 if(view==='amount'&&current){
  return (
   <>
    {back}
    <BigAmount value={amount} onChange={setAmount} hint="Komissiyasız"/>
    <Pressable accessibilityRole="button" accessibilityLabel="Kartı dəyiş" onPress={()=>setView('home')} style={st.pickedRow}>
     <MiniCard brand={current.brand}/>
     <View style={{flex:1}}>
      <Text style={{fontSize:15,fontWeight:'700',color:C.ink}}>{current.title}</Text>
      <Text style={{fontSize:12,color:C.muted,marginTop:2}}>{current.sub}</Text>
     </View>
     <Icon name="chevron-forward" size={18} color={C.muted}/>
    </Pressable>
    <Button
     title="Balansı artır"
     icon="arrow-forward"
     disabled={a.busy||parsed<=0}
     onPress={()=>run(async()=>{
      await a.act('topups',current.saved
       ?{amountMinor:minor(amount),source:'SAVED_CARD',cardId:current.id}
       :{amountMinor:minor(amount),source:'BANK_CARD',accountId:current.id});
      close();
     })}
    />
   </>
  );
 }

 return (
  <>
   <Pressable accessibilityRole="button" onPress={()=>setView('qr')} style={st.qrTile}>
    <View style={st.qrIcon}><Icon name="qr-code-outline" size={26} color="white"/></View>
    <View style={{flex:1}}>
     <Text style={st.qrTitle}>QR yarat</Text>
     <Text style={st.qrSub}>QR kodu paylaş. Skan edən məbləği özü yazıb ödəyir.</Text>
    </View>
    <Icon name="chevron-forward" size={20} color={C.muted}/>
   </Pressable>

   <Text style={st.section}>Kart vasitəsilə</Text>
   <View style={{gap:10}}>
    <Pressable accessibilityRole="button" onPress={()=>setView('new')} style={st.cardRow}>
     <View style={st.newCardIcon}><Icon name="card-outline" size={24} color={C.muted}/></View>
     <Text style={{flex:1,fontSize:15,fontWeight:'600',color:C.ink}}>Yeni kartdan</Text>
     <Icon name="add" size={20} color={C.muted}/>
    </Pressable>
    {cards.map((c:Row)=>(
     <Pressable key={c.key} accessibilityRole="button" accessibilityLabel={c.title+' '+c.sub} onPress={()=>{setPicked(c.key);setAmount('');setView('amount');}} style={st.cardRow}>
      <MiniCard brand={c.brand}/>
      <View style={{flex:1}}>
       <Text style={{fontSize:15,fontWeight:'700',color:C.ink}}>{c.title}</Text>
       <Text style={{fontSize:12,color:C.muted,marginTop:2}}>{c.sub}</Text>
      </View>
      {c.saved?(
       <Pressable accessibilityRole="button" accessibilityLabel="Saxlanmış kartı sil" hitSlop={8} onPress={()=>run(async()=>{await a.act('saved-cards/'+c.id+'/delete',{});})} style={st.dots}>
        <Icon name="trash-outline" size={16} color={C.muted}/>
       </Pressable>
      ):<Icon name="chevron-forward" size={18} color={C.muted}/>}
     </Pressable>
    ))}
   </View>
   {!cards.length&&<Text style={[S.muted,{marginTop:14,fontSize:12}]}>Hələ kartın yoxdur. Yeni kart əlavə et və ya açıq bankçılıqla bank kartını bağla.</Text>}
  </>
 );
}

const st=StyleSheet.create({
 backRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:14,minHeight:48,paddingVertical:6,alignSelf:'flex-start'},
 backText:{fontSize:13,fontWeight:'700',color:C.ink},
 qrTile:{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:'#FFFFFF',borderRadius:22,padding:16,marginBottom:20,borderWidth:1.5,borderColor:C.primary},
 qrIcon:{width:52,height:52,borderRadius:16,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'},
 qrTitle:{fontSize:16,fontWeight:'800',color:C.ink,letterSpacing:-0.3},
 qrSub:{fontSize:11,color:C.muted,lineHeight:17,marginTop:3},
 payRow:{backgroundColor:'#FFFFFF',borderRadius:14,padding:12,borderWidth:1,borderColor:C.line},

 section:{fontSize:13,fontWeight:'700',color:C.muted,marginBottom:10},
 cardRow:{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:'#f4f3f7',borderRadius:20,padding:14,minHeight:72},
 newCardIcon:{width:64,height:44,borderRadius:9,backgroundColor:'#e6e4ec',alignItems:'center',justifyContent:'center'},
 dots:{width:34,height:34,borderRadius:17,backgroundColor:'#e6e4ec',alignItems:'center',justifyContent:'center'},
 pickedRow:{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:'#f4f3f7',borderRadius:20,padding:14,minHeight:72,marginBottom:12}
});
