import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Text} from './text';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {money} from './api';
import type {Row} from './api';
import {BankMark} from './BanksSection';
import {BankButton,BankShell,PhoneScreen} from './LinkBankFlow';
import {BackBar,C,ErrorPopup,FullScreen,Icon,ResultArt,useApp,useModalHost} from './ui';

type Phase='bank'|'home'|'identity'|'sms'|'code'|'accept'|'done';

/**
 * Setting AniPay up in the customer's own bank app (simulated here in the bank's colours, like the open-banking bank app):
 * AniPay, FİN and contact number, the SMS code, then the card or current account that receives the money. From then on a transfer
 * to that FİN or number is booked on the chosen account at once.
 */
export function AniPayBankFlow({hidden,close}:{hidden:boolean;close:()=>void}){
 const a=useApp();
 useModalHost(!hidden);
 const [phase,setPhase]=useState<Phase>('bank'),
  [banks,setBanks]=useState<Row[]>([]),
  [bank,setBank]=useState<Row|null>(null),
  [fin,setFin]=useState(''),
  [local,setLocal]=useState(''),
  [session,setSession]=useState<Row|null>(null),
  [code,setCode]=useState(''),
  [found,setFound]=useState<Row|null>(null),
  [accountId,setAccountId]=useState(''),
  [done,setDone]=useState<Row|null>(null),
  [busy,setBusy]=useState(false);

 useEffect(()=>{
  a.call('open-banking/banks').then(r=>setBanks(r.banks||[])).catch(e=>a.setError((e as Error).message));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 const fail=(e:unknown)=>a.setError((e as Error).message);
 const colors:Row=bank||{color:C.deep,initials:'B',name:'Bank'};
 const finOk=/^[A-Z0-9]{7}$/.test(fin),phoneOk=local.length===9;

 async function start(){
  if(!bank)return;
  setBusy(true);
  try{
   setSession(await a.call('anipay-bank/start',{bankId:bank.id,fin,phone:'+994'+local}));
   setCode('');setPhase('sms');
  }catch(e){fail(e);}
  finally{setBusy(false);}
 }
 async function verify(){
  if(!session)return;
  setBusy(true);
  try{
   const r=await a.call('anipay-bank/verify',{sessionId:session.sessionId,code});
   setFound(r);
   setAccountId(r.accounts?.[0]?.id||'');
   setPhase('accept');
  }catch(e){fail(e);}
  finally{setBusy(false);}
 }
 async function register(){
  if(!session)return;
  setBusy(true);
  try{
   setDone(await a.call('anipay-bank/register',{sessionId:session.sessionId,accountId}));
   setPhase('done');
  }catch(e){fail(e);}
  finally{setBusy(false);}
 }
 function finish(){a.refresh().catch(()=>{});close();}

 const accounts:Row[]=found?.accounts||[];

 return (
  <FullScreen visible={!hidden} onRequestClose={close}>
   <SafeAreaProvider style={{flex:1}}>
    {phase==='bank'&&(
     <SafeAreaView style={s.white}>
      <ScrollView contentContainerStyle={s.body}>
       <BackBar onBack={close}/>
       <Text style={s.title}>Bank proqramı</Text>
       <Text style={s.sub}>AniPay-i öz bankının proqramında qurursan: pulun hansı karta və ya hesaba düşəcəyini seçirsən. Bankı seç.</Text>
       {!banks.length&&<ActivityIndicator color={C.primary} style={{marginVertical:24}}/>}
       {banks.map(b=>(
        <Pressable key={b.id} accessibilityRole="button" accessibilityLabel={b.name} onPress={()=>{setBank(b);setPhase('home');}} style={({pressed})=>[s.bankRow,pressed&&{opacity:0.7}]}>
         <BankMark bank={b}/>
         <Text style={s.bankName}>{b.name}</Text>
         <Icon name="chevron-forward" size={18} color="#8d89a3"/>
        </Pressable>
       ))}
      </ScrollView>
     </SafeAreaView>
    )}

    {phase==='home'&&(
     <BankShell bank={colors} title="Ödənişlər" onBack={()=>setPhase('bank')}>
      <Pressable accessibilityRole="button" accessibilityLabel="AniPay" onPress={()=>setPhase('identity')} style={s.service}>
       <View style={[s.serviceMark,{backgroundColor:colors.color}]}><Text style={s.serviceLetter}>A</Text></View>
       <View style={{flex:1}}>
        <Text style={s.serviceName}>AniPay</Text>
        <Text style={s.serviceSub}>Pul qəbul etmək üçün hesab təyin et</Text>
       </View>
       <Icon name="chevron-forward" size={18} color="#8d89a3"/>
      </Pressable>
      {[['Kommunal ödənişlər','receipt-outline'],['Mobil əlaqə','phone-portrait-outline']].map(([name,icon])=>(
       <View key={name} style={[s.service,{opacity:0.45}]}>
        <View style={[s.serviceMark,{backgroundColor:'#e6e4ec'}]}><Icon name={icon as any} size={20} color="#76738a"/></View>
        <View style={{flex:1}}>
         <Text style={s.serviceName}>{name}</Text>
         <Text style={s.serviceSub}>Bu simulyasiyada əlçatmazdır</Text>
        </View>
       </View>
      ))}
     </BankShell>
    )}

    {phase==='identity'&&(
     <BankShell bank={colors} title="AniPay" onBack={()=>setPhase('home')}
      footer={<BankButton bank={colors} title={busy?'Yoxlanılır…':'İrəli'} disabled={busy||!finOk||!phoneOk} onPress={()=>{void start();}}/>}>
      <Text style={s.lead}>FİN kodunuzu və əlaqə nömrənizi yazın. Bundan sonra AniPay ilə bu FİN və ya nömrəyə göndərilən pul seçdiyiniz hesaba düşəcək.</Text>
      <Text style={s.label}>FİN kod</Text>
      <TextInput
       accessibilityLabel="FİN kod"
       value={fin}
       onChangeText={v=>setFin(v.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,7))}
       autoCapitalize="characters"
       placeholder="5ABC123"
       placeholderTextColor="#aaa6bd"
       style={s.input}
      />
      <Text style={s.label}>Əlaqə nömrəsi</Text>
      <View style={s.phoneBar}>
       <Text style={s.prefix}>+994</Text>
       <TextInput
        accessibilityLabel="Əlaqə nömrəsi"
        value={local}
        onChangeText={v=>setLocal(v.replace(/\D/g,'').replace(/^(994|0)/,'').slice(0,9))}
        keyboardType="phone-pad"
        placeholder="55 000 00 00"
        placeholderTextColor="#aaa6bd"
        style={s.phoneInput}
       />
      </View>
      <Text style={s.hint}>Köçürməni göndərən sizi FİN kodla və ya nömrə ilə tapa bilər, ikisi də eyni hesaba bağlanır.</Text>
     </BankShell>
    )}

    {phase==='sms'&&session&&(
     <PhoneScreen
      consent={{bankColor:colors.color,bankInitials:colors.initials,bankName:colors.name,notification:session.sms}}
      caption="SMS gözlənilir…"
      onOpen={()=>setPhase('code')}
      onCancel={()=>setPhase('identity')}
     />
    )}

    {phase==='code'&&session&&(
     <BankShell bank={colors} title="SMS təsdiqi" onBack={()=>setPhase('identity')}
      footer={<BankButton bank={colors} title={busy?'Yoxlanılır…':'Təsdiqlə'} disabled={busy||code.length!==6} onPress={()=>{void verify();}}/>}>
      <Text style={s.lead}>{session.maskedPhone} nömrəsinə göndərilən 6 rəqəmli kodu daxil edin.</Text>
      <TextInput
       accessibilityLabel="SMS kodu"
       value={code}
       onChangeText={v=>setCode(v.replace(/\D/g,'').slice(0,6))}
       keyboardType="number-pad"
       placeholder="••••••"
       placeholderTextColor="#c9c4dc"
       autoFocus
       style={[s.input,s.codeInput]}
      />
      <Pressable accessibilityRole="button" onPress={()=>setPhase('sms')} style={{alignSelf:'center',padding:10}}>
       <Text style={{color:colors.color,fontWeight:'700'}}>SMS-ə yenidən bax</Text>
      </Pressable>
     </BankShell>
    )}

    {phase==='accept'&&found&&(
     <BankShell bank={colors} title="Qəbul edən hesab" onBack={()=>setPhase('code')}
      footer={<BankButton bank={colors} title={busy?'Yadda saxlanılır…':'Təsdiqlə'} disabled={busy||!accountId} onPress={()=>{void register();}}/>}>
      <Text style={s.lead}>AniPay ilə sizə gələn köçürmələr hansı kart və ya hesaba düşsün?</Text>
      {!!found.current&&<Text style={s.hint}>Hazırda: {found.current}</Text>}
      <View style={{height:10}}/>
      {accounts.map(x=>{
       const on=accountId===x.id;
       return (
        <Pressable key={x.id} accessibilityRole="radio" accessibilityState={{selected:on}} accessibilityLabel={x.name+' '+x.masked} onPress={()=>setAccountId(x.id)} style={[s.pick,on&&{borderColor:colors.color,backgroundColor:'#f6f4ff'}]}>
         <View style={[s.miniCard,{backgroundColor:x.type==='CARD'?colors.color:'#6e6a85'}]}><Icon name={x.type==='CARD'?'card':'wallet'} size={16} color="#fff"/></View>
         <View style={{flex:1}}>
          <Text style={s.serviceName}>{x.name}</Text>
          <Text style={s.serviceSub}>{x.masked}</Text>
         </View>
         <Text style={s.balance}>{money(x.balanceMinor)}</Text>
         <View style={[s.radio,on&&{borderColor:colors.color}]}>{on&&<View style={[s.radioDot,{backgroundColor:colors.color}]}/>}</View>
        </Pressable>
       );
      })}
     </BankShell>
    )}

    {phase==='done'&&done&&(
     <SafeAreaView style={s.white}>
      <ScrollView contentContainerStyle={[s.body,{alignItems:'center',paddingTop:40}]}>
       <ResultArt tone="success"/>
       <Text style={s.doneTitle}>AniPay quruldu</Text>
       <Text style={[s.sub,{textAlign:'center'}]}>Bundan sonra FİN {fin} və +994{local} nömrəsinə AniPay ilə gələn köçürmələr dərhal{'\n'}{done.accountLabel}{'\n'}hesabına düşəcək.</Text>
      </ScrollView>
      <View style={s.footer}><BankButton bank={colors} title="Bağla" onPress={finish}/></View>
     </SafeAreaView>
    )}

    {!!a.error&&<ErrorPopup message={a.error} onClose={()=>a.setError('')}/>}
   </SafeAreaProvider>
  </FullScreen>
 );
}

const s=StyleSheet.create({
 white:{flex:1,backgroundColor:'#fff'},
 body:{padding:20,paddingBottom:24,width:'100%',maxWidth:430,alignSelf:'center'},
 footer:{paddingHorizontal:20,paddingBottom:12,paddingTop:8,width:'100%',maxWidth:430,alignSelf:'center'},
 title:{fontSize:26,fontWeight:'700',color:C.ink,marginTop:10},
 sub:{fontSize:14,lineHeight:21,color:'#5d5a73',marginTop:8,marginBottom:18},
 bankRow:{flexDirection:'row',alignItems:'center',gap:14,borderWidth:1,borderColor:'#ebe8f4',borderRadius:14,padding:14,marginBottom:10},
 bankName:{flex:1,fontSize:15,fontWeight:'700',color:C.ink},
 service:{flexDirection:'row',alignItems:'center',gap:14,borderWidth:1.5,borderColor:'#ebe8f4',borderRadius:16,padding:14,marginBottom:10},
 serviceMark:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center'},
 serviceLetter:{color:'#fff',fontWeight:'800',fontSize:18},
 serviceName:{fontSize:15,fontWeight:'700',color:C.ink},
 serviceSub:{fontSize:12,color:'#76738a',marginTop:2},
 lead:{fontSize:15,lineHeight:22,color:'#3d3a55',marginBottom:14},
 label:{fontSize:12,fontWeight:'700',color:'#76738a',marginBottom:6,marginTop:6},
 input:{borderWidth:1.5,borderColor:'#dedaeb',borderRadius:14,paddingHorizontal:14,minHeight:54,fontSize:17,color:C.ink,marginBottom:10,outlineStyle:'none' as any},
 codeInput:{textAlign:'center',fontSize:28,fontWeight:'800',letterSpacing:8,minHeight:64},
 phoneBar:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1.5,borderColor:'#dedaeb',borderRadius:14,paddingHorizontal:14,minHeight:54},
 prefix:{fontSize:17,color:'#8d89a3'},
 phoneInput:{flex:1,fontSize:17,color:C.ink,minHeight:50,outlineStyle:'none' as any},
 hint:{fontSize:12,lineHeight:18,color:'#76738a',marginTop:12},
 pick:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1.5,borderColor:'#ebe8f4',borderRadius:16,padding:14,marginBottom:10},
 miniCard:{width:44,height:30,borderRadius:7,alignItems:'center',justifyContent:'center'},
 amount:{fontSize:16,fontWeight:'800',color:C.ink},
 balance:{fontSize:13,fontWeight:'700',color:'#5d5a73'},
 radio:{width:22,height:22,borderRadius:11,borderWidth:1.5,borderColor:'#cfc9e2',alignItems:'center',justifyContent:'center'},
 radioDot:{width:12,height:12,borderRadius:6},
 doneTitle:{fontSize:22,fontWeight:'800',color:C.ink,marginTop:14,marginBottom:6}
});
