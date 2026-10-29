import React,{useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {Text,TextInput} from './text';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {Avatar,BackBar,Button,C,ErrorPopup,FullScreen,Icon,ResultArt,S,cardLabel,linkedCards,useApp,useModalHost} from './ui';
import {errorCode,minor,money,Row} from './api';
import {recentRecipients,initialRecipient,transferAmountError} from './bugRules';
import {BigAmount,SourcePicker} from './CardUi';

type Contact={name:string;phone:string;avatar?:number|null;fin?:string};

const FIN=/^[A-Z0-9]{7}$/;
/** A recipient is either a phone number or an AniPay FIN code; both travel in the contact's phone field. */
const identifier=(v:string)=>FIN.test(v)?'FİN '+v:v;

/**
 * Full-screen transfer flow in the design's style: pick a contact, type the amount on the keypad,
 * confirm with the yellow button, then see a success / failed / in-review result.
 */
export function TransferFlow({mode='AUTO',initialPhone,hidden,close}:{mode?:'AUTO'|'KAMPUS'|'ANIPAY';initialPhone:string;hidden:boolean;close:()=>void}){
 const a=useApp();
 useModalHost(!hidden);
 // it slides in once; coming back from the PIN sheet it simply reappears (a second slide-in leaves the web layout collapsed)
 const [opened,setOpened]=useState(false);
 if(!hidden&&!opened)setOpened(true);
 const self=a.data.user?.phone;
 const [step,setStep]=useState<'pick'|'amount'|'confirm'|'result'>(initialPhone?'amount':'pick');
 const [target,setTarget]=useState<Contact|null>(initialPhone?initialRecipient(a.data,initialPhone):null);
 const [aniLocal,setAniLocal]=useState(''),
  [byFin,setByFin]=useState(false),
  [fin,setFin]=useState(''),
  [search,setSearch]=useState(''),
  [amount,setAmount]=useState(''),
  [note,setNote]=useState(''),
  [local,setLocal]=useState(''),
  [busy,setBusy]=useState(false),
  [result,setResult]=useState<Row|null>(null),
  [failure,setFailure]=useState(''),
  [source,setSource]=useState('WALLET'),
  [pickerOpen,setPickerOpen]=useState(false),
  [recipientToken,setRecipientToken]=useState(''),
  [count,setCount]=useState(5);

 const external=(p:string)=>FIN.test(p)||/^\+99455/.test(p);
 const contacts=useMemo(()=>{
  const seen=new Set<string>();
  const out:Contact[]=[];
  const add=(name:string,p:string,avatar?:number|null)=>{if(!p||p===self||seen.has(p))return;seen.add(p);out.push({name,phone:p,avatar});};
  (a.data.trustedBeneficiaries||[]).forEach((t:Row)=>add(t.nickname||t.maskedName||t.phone,t.phone,t.avatar));
  (a.data.friends||[]).forEach((x:Row)=>add(x.name,x.phone,x.avatar));
  return mode==='KAMPUS'?out.filter(c=>!external(c.phone)):out;
 },[a.data.trustedBeneficiaries,a.data.friends,self,mode]);
 const cards=linkedCards(a.data);
 const frequent=recentRecipients(a.data).filter(c=>mode==='ANIPAY'?external(c.phone):mode==='KAMPUS'?!external(c.phone):true).slice(0,3);
 // one field takes a number or a name, as in the design
 const typedNumber=/^[\d\s+()-]+$/.test(search.trim());
 const typedDigits=search.replace(/\D/g,'');
 const typedLocal=typedDigits.replace(/^(994|0)/,'').slice(0,9);
 const typedPretty='+994 '+[typedLocal.slice(0,2),typedLocal.slice(2,5),typedLocal.slice(5,7),typedLocal.slice(7,9)].filter(Boolean).join(' ');
 const needle=typedNumber?typedLocal:search.trim().toLowerCase();
 const shown=needle?contacts.filter(c=>typedNumber?c.phone.replace(/\D/g,'').includes(needle):c.name.toLowerCase().includes(needle)):contacts.filter(c=>!frequent.some(x=>x.phone===c.phone));
 const friendPhones=new Set<string>((a.data.friends||[]).map((x:Row)=>x.phone));
 const shownFriends=shown.filter(c=>friendPhones.has(c.phone)),shownOthers=shown.filter(c=>!friendPhones.has(c.phone));

 const recipientPhone=target?.phone;
 const resolveRecipient=a.call;
 /** Each entry point accepts one kind of recipient: a Kampus customer or an AniPay one. */
 const wrongChannel=(r:Row)=>mode==='KAMPUS'&&r.channel!=='INTERNAL'
  ?'Bu nömrə Kampus-da qeydiyyatdan keçməyib. Başqa banka göndərmək üçün “AniPay ilə” seçimini istifadə et.'
  :mode==='ANIPAY'&&r.channel==='INTERNAL'
   ?'Bu şəxs Kampus istifadəçisidir. Komissiyasız göndərmək üçün “Kampus hesabına” seçimini istifadə et.'
   :'';
 useEffect(()=>{
  if(!recipientPhone)return;
  let cancelled=false;
  resolveRecipient('transfers/resolve?phone='+encodeURIComponent(recipientPhone)).then(r=>{
   const wrong=wrongChannel(r);
   if(wrong&&!cancelled){setLocal(wrong);setTarget(null);setStep('pick');return;}
   if(!cancelled)setTarget(current=>current?.phone===recipientPhone?{...current,name:r.maskedName||current.name,avatar:r.avatar??current.avatar}:current);
  }).catch(e=>{
   // an AniPay recipient who has not set AniPay up cannot be paid: say so now, not after the amount
   if(!cancelled&&mode==='ANIPAY'){setLocal((e as Error).message);setTarget(null);setStep('pick');}
  });
  return()=>{cancelled=true;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[resolveRecipient,recipientPhone]);

 // the 5-second cancel window of a scheduled transfer
 useEffect(()=>{
  if(!result||result.status!=='SCHEDULED')return;
  const tick=()=>setCount(Math.max(0,Math.ceil((result.executeAt-Date.now())/1000)));
  tick();
  const id=setInterval(tick,200);
  return()=>clearInterval(id);
 },[result]);

 const parsed=(()=>{try{return amount?minor(amount):0;}catch{return 0;}})();
 const available=Number(source==='WALLET'?a.data.wallet?.availableBalanceMinor||0:cards.find(x=>String(x.id)===source)?.balanceMinor||0);
 const amountError=transferAmountError(parsed,available);
 const sources=[
  {id:'WALLET',label:'Balans',sub:'Kampus hesabı',balance:Number(a.data.wallet?.availableBalanceMinor||0)},
  ...cards.map((x:Row)=>({id:String(x.id),label:cardLabel(x),sub:'Açıq bankçılıq kartı',balance:Number(x.balanceMinor||0)}))
 ];

 async function resolveAndContinue(){
  if(!target||parsed<=0||amountError)return;
  setBusy(true);setLocal('');
  try{
   const r=await a.call('transfers/resolve?phone='+encodeURIComponent(target.phone));
   const wrong=wrongChannel(r);
   if(wrong){setLocal(wrong);setTarget(null);setStep('pick');return;}
   setTarget({name:r.maskedName||target.name,phone:target.phone,avatar:r.channel==='ANIPAY'?-1:(r.avatar??target.avatar)});
   setRecipientToken(r.recipientToken||'');
   setStep('confirm');
  }catch(e){setLocal((e as Error).message);}
  finally{setBusy(false);}
 }

 async function pay(){
  if(!target)return;
  setBusy(true);setLocal('');
  try{
   const t=await a.act('transfers',{phone:target.phone,amountMinor:parsed,note,recipientToken,...(source!=='WALLET'?{fundingAccountId:source}:{})});
   setResult(t);setFailure('');setStep('result');
  }catch(e){
   const message=(e as Error).message;
   // a cancelled PIN or face check leaves the person on the confirm screen
   if(message==='Ləğv edildi')setLocal('');
   else if(errorCode(message).startsWith('TOKEN_'))setStep('amount'); // the recipient session ran out: look the recipient up again
   else{setFailure(message);setResult(null);setStep('result');a.setError('');}
  }finally{setBusy(false);}
 }

 const live=result?((a.data.transfers||[]).find((x:Row)=>x.id===result.id)||result):null;
 const tone:'success'|'failed'|'review'=failure?'failed':live?.status==='UNDER_REVIEW'?'review':'success';

 return (
  <FullScreen visible={!hidden} animationType={opened?'none':'slide'} onRequestClose={close}>
   {/* a Modal is its own native window: without its own provider the top inset is 0 on the first screen and the back button sits under the status bar */}
   <SafeAreaProvider style={{flex:1}}>
   <SafeAreaView style={t.screen}>
    {step==='pick'&&(
     <ScrollView contentContainerStyle={t.body} keyboardShouldPersistTaps="handled">
      <BackBar onBack={close}/>
      <Text style={t.title}>{mode==='ANIPAY'?'AniPay ilə köçür':mode==='KAMPUS'?'Kampus hesabına':'Kimə köçürürsən'}</Text>
      {mode==='ANIPAY'?(
       <>
        <View style={t.modes}>
         {[{id:false,label:'Telefon nömrəsi'},{id:true,label:'FİN kod'}].map(o=>(
          <Pressable key={o.label} accessibilityRole="button" accessibilityState={{selected:byFin===o.id}} onPress={()=>setByFin(o.id)} style={[t.mode,byFin===o.id&&{backgroundColor:C.primary,borderColor:C.primary}]}>
           <Text style={[t.modeText,byFin===o.id&&{color:'#fff'}]}>{o.label}</Text>
          </Pressable>
         ))}
        </View>
        {byFin?(
         <TextInput
          accessibilityLabel="FİN kod"
          value={fin}
          onChangeText={v=>setFin(v.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,7))}
          autoCapitalize="characters"
          placeholder="7 simvol, məsələn 5ABC123"
          placeholderTextColor="#aaa6bd"
          style={S.input}
         />
        ):(
         <View style={t.phoneBar}>
          <Text style={t.prefix}>+994</Text>
          <TextInput
           accessibilityLabel="Telefon nömrəsi"
           value={aniLocal}
           onChangeText={v=>setAniLocal(v.replace(/\D/g,'').replace(/^(994|0)/,'').slice(0,9))}
           keyboardType="phone-pad"
           placeholder="55 000 00 00"
           placeholderTextColor="#aaa6bd"
           style={t.phoneInput}
          />
         </View>
        )}
        <Text style={[S.muted,{fontSize:11,marginTop:8,marginBottom:14}]}>Alıcı AniPay-i öz bank proqramında qurmalıdır: pul onun seçdiyi kart və ya hesaba dərhal düşür. İki üsuldan birini seçmək kifayətdir.</Text>
        <Button
         title="Davam et"
         disabled={byFin?!FIN.test(fin):aniLocal.length!==9}
         onPress={()=>{setTarget(initialRecipient(a.data,byFin?fin:'+994'+aniLocal));setStep('amount');}}
        />
        {frequent.length>0&&<Text style={t.group}>Tez-tez köçürülənlər</Text>}
        {frequent.map(c=><ContactRow key={'f'+c.phone} c={c} onPress={()=>{setTarget(c);setStep('amount');}}/>)}
       </>
      ):(
       <>
        <View style={t.phoneBar}>
         <Text style={t.prefix}>+994</Text>
         <TextInput
          accessibilityLabel="Telefon nömrəsi və ya ad"
          value={search}
          onChangeText={setSearch}
          placeholder="Telefon nömrəsi və ya ad"
          placeholderTextColor="#aaa6bd"
          style={t.phoneInput}
         />
         {!!search&&(
          <Pressable accessibilityRole="button" accessibilityLabel="Təmizlə" hitSlop={10} onPress={()=>setSearch('')}>
           <Icon name="close" size={20} color="#6e6a85"/>
          </Pressable>
         )}
        </View>
        {typedNumber&&typedLocal.length===9&&(
         <Pressable accessibilityRole="button" accessibilityLabel={typedPretty} style={t.contact} onPress={()=>{setTarget(initialRecipient(a.data,'+994'+typedLocal));setStep('amount');}}>
          <View style={t.numIcon}><Icon name="person-outline" size={22} color={C.ink}/></View>
          <Text style={[t.contactName,{flex:1,fontWeight:'500',fontSize:17}]}>{typedPretty}</Text>
          <Icon name="chevron-forward" size={18} color="#8d89a3"/>
         </Pressable>
        )}
        {!needle&&frequent.length>0&&<Text style={t.group}>TEZ-TEZ KÖÇÜRÜLƏNLƏR</Text>}
        {!needle&&frequent.map(c=><ContactRow key={'f'+c.phone} c={c} onPress={()=>{setTarget(c);setStep('amount');}}/>)}
        {shownFriends.length>0&&<Text style={t.group}>DOSTLAR</Text>}
        {shownFriends.map(c=><ContactRow key={c.phone} c={c} onPress={()=>{setTarget(c);setStep('amount');}}/>)}
        {shownOthers.length>0&&<Text style={t.group}>{needle?'NƏTİCƏLƏR':'KONTAKTLAR'}</Text>}
        {shownOthers.map(c=><ContactRow key={c.phone} c={c} onPress={()=>{setTarget(c);setStep('amount');}}/>)}
        {!shown.length&&(needle||!frequent.length)&&!(typedNumber&&typedLocal.length===9)&&<Text style={[S.muted,{marginTop:16}]}>Kontakt tapılmadı. Tam telefon nömrəsini yaz və ya Dostlar bölməsindən dost əlavə et.</Text>}
       </>
      )}
     </ScrollView>
    )}

    {step==='amount'&&target&&(
     <View style={{flex:1}}>
      <View style={t.bodyTight}><BackBar onBack={()=>initialPhone?close():setStep('pick')}/></View>
      <ScrollView style={{flex:1}} contentContainerStyle={t.body} keyboardShouldPersistTaps="handled">
       <Text style={t.titleCenter}>Köçürmə məbləği</Text>
       <View style={[t.person,{alignSelf:'center'}]}>
        <Avatar name={target.name} avatar={target.avatar} size={64}/>
        <View>
         <Text style={t.personName}>{target.name}</Text>
         <Text style={t.personPhone}>{identifier(target.phone)}</Text>
        </View>
       </View>
       <BigAmount value={amount} onChange={setAmount} hint="Komissiyasız"/>
       <SourcePicker sources={sources} value={source} onChange={setSource} open={pickerOpen} setOpen={setPickerOpen}/>
       {!!amountError&&<Text accessibilityRole="alert" style={[t.error,{marginBottom:12}]}>{amountError}</Text>}
       <Button title="Davam et" icon="arrow-forward" disabled={busy||parsed<=0||!!amountError} onPress={()=>{void resolveAndContinue();}}/>
      </ScrollView>
     </View>
    )}

    {step==='confirm'&&target&&(
     <View style={{flex:1}}>
      <View style={t.bodyTight}><BackBar onBack={()=>setStep('amount')}/></View>
      <ScrollView contentContainerStyle={[t.body,{alignItems:'center'}]} keyboardShouldPersistTaps="handled">
       <Text style={t.titleCenter}>Köçürməni təsdiqlə</Text>
       <View style={t.person}>
        <Avatar name={target.name} avatar={target.avatar} size={64}/>
        <View>
         <Text style={t.personName}>{target.name}</Text>
         <Text style={t.personPhone}>{identifier(target.phone)}</Text>
        </View>
       </View>
       <Text style={t.hint}>Məbləğ</Text>
       <View style={t.amountWrap}><Text style={t.amountText}>{money(parsed)}</Text></View>
       <View style={{alignSelf:'stretch',marginTop:26}}>
        {!!amountError&&<Text accessibilityRole="alert" style={t.error}>{amountError}</Text>}
        <TextInput
         accessibilityLabel="Qeyd"
         value={note}
         onChangeText={setNote}
         placeholder="Qeyd əlavə et (məcburi deyil)"
         placeholderTextColor="#aaa6bd"
         style={S.input}
        />
        <View style={[S.between,{marginTop:16}]}>
         <Text style={S.muted}>Komissiya</Text>
         <Text style={S.h3}>0.00 ₼</Text>
        </View>
        {/uduş|depozit|kredit|bonus|investisiya/i.test(note)&&(
         <View style={[S.error,{marginTop:14}]}>
          <Text style={S.errorText}>Fırıldaqçılar uduş və depozit vəd edərək pul istəyə bilər. Bu şəxsi tanıdığına əmin ol.</Text>
         </View>
        )}
        <Text style={[S.muted,{textAlign:'center',marginTop:14}]}>Göndərdikdən sonra 5 saniyə ərzində köçürməni ləğv edə bilərsən.</Text>
       </View>
      </ScrollView>
      <View style={t.footer}>
       <Button title="Təhlükəsiz ödə" icon="shield-checkmark-outline" yellow disabled={busy||!!amountError} onPress={()=>{void pay();}}/>
      </View>
     </View>
    )}

    {step==='result'&&(
     <View style={{flex:1,backgroundColor:tone==='failed'?'#fff6f4':'#ffffff'}}>
      <ScrollView contentContainerStyle={[t.body,{alignItems:'center',paddingTop:40}]}>
       <ResultArt tone={tone}/>
       <Text style={[t.resultTitle]}>
        {failure?'Köçürmə alınmadı':tone==='review'?'Yoxlamaya göndərildi':'Köçürmə göndərildi'}
       </Text>
       <Text style={t.resultText}>
        {failure?failure:tone==='review'?'Əməliyyat admin yoxlamasındadır. Vəsait rezerv edilib.':live?.status==='SCHEDULED'&&count>0?'Köçürmə '+count+' saniyəyə icra ediləcək.':live?.status==='COMPLETED'&&live.channel==='ANIPAY'?'Pul AniPay ilə alıcının hesabına çatdı: '+String(live.receivedTo||''):'Nəticəni tarixçədə izləyə bilərsən.'}
       </Text>
       {tone!=='failed'&&result&&(
        <View style={t.details}>
         <Detail label="Alan" value={String(result.recipientName||target?.name||'')}/>
         <Detail label="Məbləğ" value={money(result.amountMinor)}/>
         <Detail label="Əməliyyat no." value={String(result.id||'').slice(0,18)}/>
        </View>
       )}
       {result?.status==='SCHEDULED'&&count>0&&(
        <View style={{alignSelf:'stretch',marginTop:6}}>
         <Button title={`Köçürməni ləğv et (${count}s)`} danger onPress={()=>{a.act('transfers/'+result.id+'/cancel',{}).then(close).catch(()=>{});}}/>
        </View>
       )}
      </ScrollView>
      <View style={t.footer}>
       <Button title="Pul kisəsinə qayıt" onPress={close}/>
      </View>
     </View>
    )}
   </SafeAreaView>
   {!!(local||a.error)&&<ErrorPopup message={local||a.error} onClose={()=>{setLocal('');a.setError('');}}/>}
   </SafeAreaProvider>
  </FullScreen>
 );
}

function ContactRow({c,onPress}:{c:Contact;onPress:()=>void}){
 return (
  <Pressable accessibilityRole="button" onPress={onPress} style={t.contact}>
   <Avatar name={c.name} avatar={c.avatar} size={48}/>
   <View style={{flex:1}}>
    <Text style={t.contactName}>{c.name}</Text>
    <Text style={t.contactPhone}>{identifier(c.phone)}</Text>
   </View>
   <Icon name="chevron-forward" size={18} color="#8d89a3"/>
  </Pressable>
 );
}

function Detail({label,value}:{label:string;value:string}){
 return (
  <View style={t.detail}>
   <Text style={t.detailLabel}>{label}</Text>
   <Text style={t.detailValue}>{value}</Text>
  </View>
 );
}

const t=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#fff'},
 body:{paddingHorizontal:20,paddingBottom:24,width:'100%',maxWidth:430,alignSelf:'center'},
 bodyTight:{paddingHorizontal:20,width:'100%',maxWidth:430,alignSelf:'center'},
 title:{fontSize:26,fontWeight:'700',color:C.ink,marginTop:14,marginBottom:18},
 titleCenter:{fontSize:22,fontWeight:'600',color:C.ink,textAlign:'center'},
 newRow:{flexDirection:'row',alignItems:'center',gap:12,minHeight:56},
 plus:{width:48,height:48,borderRadius:24,backgroundColor:C.lav,alignItems:'center',justifyContent:'center'},
 newText:{fontSize:14,color:C.ink,fontWeight:'600'},
 modes:{flexDirection:'row',gap:8,marginBottom:12},
 mode:{flex:1,minHeight:44,borderRadius:10,borderWidth:1,borderColor:'#dedaeb',alignItems:'center',justifyContent:'center'},
 modeText:{fontSize:13,fontWeight:'700',color:C.ink},
 or:{flexDirection:'row',alignItems:'center',gap:12,marginVertical:14},
 orLine:{flex:1,height:1,backgroundColor:'#ebe8f4'},
 orText:{fontSize:12,color:'#76738a'},
 fieldLabel:{fontSize:12,fontWeight:'700',color:'#76738a',marginBottom:6},
 phoneBar:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#ebeaf0',borderRadius:18,paddingHorizontal:16,minHeight:60},
 prefix:{fontSize:17,color:'#8d89a3'},
 phoneInput:{flex:1,fontSize:17,color:C.ink,minHeight:56,outlineStyle:'none' as any},
 numIcon:{width:48,height:48,borderRadius:16,backgroundColor:'#ebeaf0',alignItems:'center',justifyContent:'center'},
 search:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'#dedaeb',borderRadius:10,paddingHorizontal:12,minHeight:50},
 searchInput:{flex:1,fontSize:15,color:C.ink,minHeight:48},
 group:{fontSize:12,color:'#76738a',marginTop:18,marginBottom:4},
 contact:{flexDirection:'row',alignItems:'center',gap:12,minHeight:68,borderBottomWidth:1,borderBottomColor:'#f0eef6'},
 contactName:{fontSize:14,fontWeight:'700',color:C.ink},
 contactPhone:{fontSize:12,color:'#76738a',marginTop:2},
 person:{flexDirection:'row',alignItems:'center',gap:14,marginTop:22},
 personName:{fontSize:17,fontWeight:'700',color:C.ink},
 personPhone:{fontSize:13,color:'#76738a',marginTop:3},
 hint:{fontSize:12,color:'#76738a',marginTop:30},
 amountWrap:{minWidth:200,borderBottomWidth:2,borderBottomColor:C.primary,paddingHorizontal:14,paddingVertical:6,marginTop:8,alignItems:'center'},
 amountText:{fontSize:38,fontWeight:'500',color:C.ink,letterSpacing:-0.5},
 error:{color:C.red,fontSize:12,lineHeight:18,textAlign:'center',marginTop:14},
 footer:{paddingHorizontal:20,paddingBottom:16,paddingTop:8,width:'100%',maxWidth:430,alignSelf:'center'},
 resultTitle:{fontSize:20,fontWeight:'800',color:C.ink,marginTop:14,textAlign:'center'},
 resultText:{fontSize:13,lineHeight:20,color:'#76738a',textAlign:'center',marginTop:8,marginBottom:22,maxWidth:300},
 details:{alignSelf:'stretch',gap:8,marginBottom:14},
 detail:{borderWidth:1,borderColor:'#ebe8f4',borderRadius:10,paddingHorizontal:14,paddingVertical:10},
 detailLabel:{fontSize:11,color:'#76738a'},
 detailValue:{fontSize:14,fontWeight:'700',color:C.ink,marginTop:3}
});
