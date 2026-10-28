import React,{useState,useEffect} from 'react';
import {View,Pressable,StyleSheet,ActivityIndicator} from 'react-native';
import {Text} from './text';
import {C,S,useApp,fmtDate,fmtDateTime,statusLabel,statusTone,Icon,Button,Field,Check,Badge,Box,Empty,Sheet,Tx,EXPENSE_CATEGORIES} from './ui';
import {CardTransferForm} from './CardTransferSheet';
import {CreditSection} from './HubSections';
import {TopUpFlow} from './TopUpFlow';
import {BanksSection} from './BanksSection';
import {TransferFlow} from './TransferFlow';
import {LinkBankFlow} from './LinkBankFlow';
import {minor,money,Row} from './api';
import appConfig from '../app.json';


export function Operations({sheet,close,hidden=false}:{sheet:string;close:()=>void;hidden?:boolean}){
 const a=useApp();
 const [amount,setAmount]=useState(''),
  [phone,setPhone]=useState(sheet.startsWith('send:')?sheet.split(':')[1]:'+994501000002'),
  [note,setNote]=useState(''),
  [recipient,setRecipient]=useState<Row|null>(null),
  [transfer,setTransfer]=useState<Row|null>(null),
  [count,setCount]=useState(5);
 const [detail,setDetail]=useState<any>(null),
  [selected,setSelected]=useState<string[]>(['+994501000002','+994501000003','+994501000004'].filter(p=>p!==a.data.user?.phone)),
  [splitMode,setSplitMode]=useState<'EQUAL'|'CUSTOM'>('EQUAL'),
  [customShares,setCustomShares]=useState<Record<string,string>>({'+994501000002':'5','+994501000003':'5','+994501000004':'5'});
 const kind=sheet.split(':')[0];
 const paramId=sheet.split(':')[1]||'';

 const title:Record<string,string>={
  add:'Balans artımı',
  send:'Pul göndər',
  request:'Pul istə',
  'my-qr':'Mənim QR kodum',
  notifications:'Bildirişlər',
  history:'Əməliyyat tarixçəsi',
  'tx-detail':'Əməliyyat detalları',
  'banks-hub':'Digər banklar',
  'card-transfer':'Karta köçürmə',
  split:'Hesabı böl',
  'split-view':'Hesabın irəliləyişi',
  schedule:'Ödəniş qrafiki',
  'credit-hub':'Sonra ödə və Kredit',
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

 const txItem=kind==='tx-detail'?[...(a.data.transactions||[]),...(a.external||[])].find((x:Row)=>String(x.id)===paramId):null;

 if(kind==='link-bank')return <LinkBankFlow hidden={hidden} close={close}/>;
 if(kind==='send')return <TransferFlow initialPhone={sheet.startsWith('send:')?sheet.split(':')[1]:''} hidden={hidden} close={close}/>;

 return (
  <Sheet title={title[kind]||'Kampus'} visible={!!sheet&&(!hidden||kind==='card-transfer')} onClose={close}>
   {kind==='card-transfer'&&<CardTransferForm {...a}/>}
   {kind==='credit-hub'&&<CreditSection/>}
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

   {kind==='add'&&<TopUpFlow close={close}/>}

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
});
