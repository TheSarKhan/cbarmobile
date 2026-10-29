import React,{useState,useEffect} from 'react';
import {View,Pressable,StyleSheet,ActivityIndicator,Share} from 'react-native';
import {Text} from './text';
import {C,S,useApp,fmtDateTime,statusLabel,statusTone,Icon,Button,Field,Badge,Box,Empty,Sheet,Tx} from './ui';
import {CardTransferForm,useCardTransferState} from './CardTransferSheet';
import {TopUpFlow} from './TopUpFlow';
import {BanksSection} from './BanksSection';
import {TransferFlow} from './TransferFlow';
import {LinkBankFlow} from './LinkBankFlow';
import {AniPayBankFlow} from './AniPayBankFlow';
import {FriendsSection} from './FriendsSection';
import {QrCode} from './QrCode';
import {minor,money,Row} from './api';
import appConfig from '../app.json';


const TX_TYPES:Record<string,string>={TOPUP:'Balans artırma',P2P:'Köçürmə',QR:'QR ödəniş',CARD_TRANSFER:'Karta köçürmə'};

export function Operations({sheet,close,hidden=false}:{sheet:string;close:()=>void;hidden?:boolean}){
 const a=useApp();
 const cardState=useCardTransferState();
 const [amount,setAmount]=useState(''),
  [phone,setPhone]=useState(sheet.startsWith('send:')?sheet.split(':')[1]:''),
  [note,setNote]=useState(''),
  [recipient,setRecipient]=useState<Row|null>(null),
  [transfer,setTransfer]=useState<Row|null>(null),
  [count,setCount]=useState(5);
 const [myQr,setMyQr]=useState<Row|null>(null);
 const kind=sheet.split(':')[0];
 const paramId=sheet.split(':')[1]||'';

 const title:Record<string,string>={
  add:'Balans artımı',
  send:'Pul göndər',
  'send-menu':'Köçür',
  'my-qr':'Mənim QR kodum',
  friends:'Dostlar',
  notifications:'Bildirişlər',
  history:'Əməliyyat tarixçəsi',
  'tx-detail':'Əməliyyat detalları',
  'banks-hub':'Digər banklar',
  'card-transfer':'Karta köçürmə',
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
  if(kind==='my-qr')a.call('friends/qr',{}).then(setMyQr).catch(e=>a.setError(e.message));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[kind]);

 const txItem=kind==='tx-detail'?[...(a.data.transactions||[]),...(a.external||[])].find((x:Row)=>String(x.id)===paramId):null;

 if(kind==='link-bank')return <LinkBankFlow hidden={hidden} close={close}/>;
 if(kind==='anipay-bank')return <AniPayBankFlow hidden={hidden} close={close}/>;
 if(kind==='send'||kind==='send-kampus'||kind==='send-anipay')return <TransferFlow mode={kind==='send-kampus'?'KAMPUS':kind==='send-anipay'?'ANIPAY':'AUTO'} initialPhone={sheet.startsWith('send:')?sheet.split(':')[1]:''} hidden={hidden} close={close}/>;

 return (
  <Sheet title={title[kind]||'Kampus'} visible={!!sheet&&!hidden} onClose={close}>
   {kind==='send-menu'&&(
    <View style={{gap:6,paddingBottom:8}}>
     {[
      ['Kampus hesabına','Telefon nömrəsi ilə, komissiyasız','person-outline','send-kampus'],
      ['Bank kartına','Visa və Mastercard, istənilən bank','card-outline','card-transfer'],
      ['AniPay ilə','Telefon və ya FİN kodla başqa banka','flash-outline','send-anipay']
     ].map(([label,sub,icon,target])=>(
      <Pressable key={target} accessibilityRole="button" accessibilityLabel={label} onPress={()=>a.open(target)} style={os.menuRow}>
       <View style={os.menuIcon}><Icon name={icon as any} size={22} color="white"/></View>
       <View style={{flex:1}}>
        <Text style={{fontSize:16,fontWeight:'700',color:C.ink}}>{label}</Text>
        <Text style={{fontSize:12,color:C.muted,marginTop:2}}>{sub}</Text>
       </View>
       <Icon name="chevron-forward" size={18} color={C.muted}/>
      </Pressable>
     ))}
    </View>
   )}
   {kind==='card-transfer'&&<CardTransferForm state={cardState} {...a}/>}
   {kind==='banks-hub'&&<BanksSection/>}

   {kind==='help'&&(
    <>
     {[
      ['PIN-i unutdum','Telefon nömrənlə daxil ol, PIN səhifəsində “Başqa nömrə ilə daxil ol” seçib yenidən qeydiyyatdan keç. Hesabın bloklanıbsa, bir neçə dəqiqə sonra yenidən yoxla.'],
      ['Köçürmə niyə gecikir?','Köçürmələr 5 saniyəlik ləğv pəncərəsindən sonra icra olunur. Böyük məbləğlər və yeni cihaz yoxlamaya düşə bilər, bu halda vəsait rezerv edilir.'],
      ['Böyük məbləğ üçün üz yoxlaması','500 ₼ və yuxarı köçürmələr PIN-dən sonra qısa üz yoxlaması istəyir.'],
      ['Digər bankların kartları','“Kartlar” tabında “Kart əlavə et” ilə bank seçib kartlarını bağlaya, xərclərini izləyə və onlardan ödəniş edə bilərsən. Müddəti və aylıq limiti özün seçirsən.']
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
     <Text style={S.muted}>Versiya {appConfig.expo.version}</Text>
     <Text style={[S.muted,{marginTop:8}]}>Kampus tələbələr üçün rəqəmsal cüzdandır: pul köçürmələri, QR ödənişləri, hesabı bölmək və digər bankların kartlarını bir yerdə izləmək. Kampus bank deyil, kart buraxmır.</Text>
     <Text style={[S.muted,{marginTop:8}]}>Bu proqram nümayiş mühitində işləyir. Bank və ödəniş şəbəkəsi qoşulmaları simulyasiyadır.</Text>
    </Box>
   )}

   {kind==='friends'&&<FriendsSection close={close}/>}

   {kind==='my-qr'&&(
    <>
     <Box style={{alignItems:'center',paddingVertical:22}}>
      {myQr?<QrCode value={myQr.qrPayload} caption="Kampus dostu"/>:<ActivityIndicator color={C.primary} style={{marginVertical:80}}/>}
      <Text style={[S.h2,{marginTop:16}]}>{a.data.user?.name}</Text>
      <Text style={[S.muted,{marginTop:4,textAlign:'center'}]}>Dostun bu QR-ı Kampus-da oxutsun, ikiniz də bir-birinin dostu olursunuz.</Text>
     </Box>
     <Button
      title="QR-ı paylaş"
      icon="share-social-outline"
      disabled={!myQr}
      onPress={()=>run(async()=>{
       // closing the share sheet without sharing is the user's choice, not an error
       await Share.share({message:`${a.data.user?.name} səni Kampus dostu olmağa çağırır. Kampus tətbiqində QR skan et və ya bu kodu daxil et: ${myQr?.qrPayload}`}).catch(()=>{});
      })}
     />
     <Button title="Dostlarım" secondary icon="people-outline" onPress={()=>a.open('friends')}/>
    </>
   )}

   {kind==='tx-detail'&&(
    txItem?(
     <>
      <Box style={{alignItems:'center',paddingVertical:22}}>
       <View style={[S.tile,{width:56,height:56,borderRadius:20,backgroundColor:txItem.direction==='IN'?'#ded6f5':'#e9e5f3',marginBottom:12}]}>
        <Icon
         name={txItem.source==='OPEN_BANKING'?'business-outline':txItem.type==='QR'?'cafe-outline':txItem.direction==='IN'?'arrow-down-outline':'arrow-up-outline'}
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
        <Text style={S.h3}>{txItem.source==='OPEN_BANKING'?'DİGƏR BANK':TX_TYPES[txItem.type]||txItem.type||'ÖDƏNİŞ'}</Text>
       </View>
       {txItem.source==='OPEN_BANKING'&&(
        <View style={[S.between,{marginBottom:8}]}>
         <Text style={S.muted}>Bank</Text>
         <Text style={S.h3}>{txItem.bankName}</Text>
        </View>
       )}
       {txItem.direction==='OUT'&&(
        <View style={[S.between,{marginBottom:8}]}>
         <Text style={S.muted}>Kateqoriya</Text>
         <Text style={S.h3}>{txItem.category||'Digər'}</Text>
        </View>
       )}
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

      <Button title="Bağla" secondary onPress={close}/>
     </>
    ):(
     <Empty text="Əməliyyat tapılmadı." icon="receipt-outline"/>
    )
   )}

   {kind==='add'&&<TopUpFlow close={close}/>}

   {kind==='send'&&(
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
       <Field label="Telefon nömrəsi" value={phone} onChange={v=>{setPhone(v);setRecipient(null);}} placeholder="+994 50 000 00 00"/>
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
        title={recipient?'Təsdiqlə və göndər':'Alıcını yoxla'}
        icon="arrow-forward"
        disabled={a.busy}
        onPress={()=>run(async()=>{
         const amountMinor=minor(amount);
         if(!recipient){
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
     <Text style={[S.muted,{marginBottom:12}]}>Detallara baxmaq üçün əməliyyata toxun.</Text>
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
 menuRow:{flexDirection:'row',alignItems:'center',gap:14,minHeight:72,paddingVertical:8},
 menuIcon:{width:52,height:52,borderRadius:18,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'},
 myQrFrame:{width:154,height:154,borderRadius:24,backgroundColor:'#ebe8f5',alignItems:'center',justifyContent:'center',marginBottom:16,borderWidth:1,borderColor:C.line},
 dotInline:{width:8,height:8,borderRadius:4,backgroundColor:'#6147ad',marginTop:4},
});
