import React,{useEffect,useMemo,useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {Avatar,BackBar,Button,C,ErrorPopup,Icon,ResultArt,S,cardLabel,linkedCards,useApp,useModalHost} from './ui';
import {minor,money,Row} from './api';

type Contact={name:string;phone:string};
const FRIENDS:Contact[]=[
 {name:'Murad Əliyev',phone:'+994501000002'},
 {name:'Leyla Həsənova',phone:'+994501000003'},
 {name:'Kamran Quliyev',phone:'+994501000004'}
];

const KEYS=[['1','2','3'],['4','5','6'],['7','8','9'],['.','0','del']];

/** Amount keypad: digits, one decimal point with at most two decimals, and a delete key. */
function typeAmount(current:string,key:string){
 if(key==='del')return current.slice(0,-1);
 if(key==='.')return current.includes('.')?current:(current||'0')+'.';
 const next=current==='0'?key:current+key;
 const [whole,frac]=next.split('.');
 if(whole.length>6||(frac!==undefined&&frac.length>2))return current;
 return next;
}

/**
 * Full-screen transfer flow in the design's style: pick a contact, type the amount on the keypad,
 * confirm with the yellow button, then see a success / failed / in-review result.
 */
export function TransferFlow({initialPhone,hidden,close}:{initialPhone:string;hidden:boolean;close:()=>void}){
 const a=useApp();
 useModalHost(!hidden);
 // it slides in once; coming back from the PIN sheet it simply reappears (a second slide-in leaves the web layout collapsed)
 const [opened,setOpened]=useState(false);
 if(!hidden&&!opened)setOpened(true);
 const self=a.data.user?.phone;
 const [step,setStep]=useState<'pick'|'amount'|'confirm'|'result'>(initialPhone?'amount':'pick');
 const [target,setTarget]=useState<Contact|null>(initialPhone?{name:initialPhone,phone:initialPhone}:null);
 const [manual,setManual]=useState(false),
  [phone,setPhone]=useState('+994'),
  [search,setSearch]=useState(''),
  [amount,setAmount]=useState(''),
  [note,setNote]=useState(''),
  [local,setLocal]=useState(''),
  [busy,setBusy]=useState(false),
  [result,setResult]=useState<Row|null>(null),
  [failure,setFailure]=useState(''),
  [source,setSource]=useState('WALLET'),
  [count,setCount]=useState(5);

 const contacts=useMemo(()=>{
  const seen=new Set<string>();
  const out:Contact[]=[];
  const add=(name:string,p:string)=>{if(!p||p===self||seen.has(p))return;seen.add(p);out.push({name,phone:p});};
  (a.data.trustedBeneficiaries||[]).forEach((t:Row)=>add(t.nickname||t.maskedName||t.phone,t.phone));
  FRIENDS.forEach(f=>add(f.name,f.phone));
  return out;
 },[a.data.trustedBeneficiaries,self]);
 const cards=linkedCards(a.data);
 const frequent=contacts.slice(0,3);
 const needle=search.trim().toLowerCase();
 const shown=needle?contacts.filter(c=>c.name.toLowerCase().includes(needle)||c.phone.includes(needle)):contacts;

 // the 5-second cancel window of a scheduled transfer
 useEffect(()=>{
  if(!result||result.status!=='SCHEDULED')return;
  const tick=()=>setCount(Math.max(0,Math.ceil((result.executeAt-Date.now())/1000)));
  tick();
  const id=setInterval(tick,200);
  return()=>clearInterval(id);
 },[result]);

 const parsed=(()=>{try{return amount?minor(amount):0;}catch{return 0;}})();
 const shownAmount=amount?amount:'0.00';

 async function resolveAndContinue(){
  if(!target||parsed<=0)return;
  setBusy(true);setLocal('');
  try{
   const r=await a.call('transfers/resolve?phone='+encodeURIComponent(target.phone));
   setTarget({name:r.maskedName||target.name,phone:target.phone});
   setStep('confirm');
  }catch(e){setLocal((e as Error).message);}
  finally{setBusy(false);}
 }

 async function pay(){
  if(!target)return;
  setBusy(true);setLocal('');
  try{
   const t=await a.act('transfers',{phone:target.phone,amountMinor:parsed,note,...(source!=='WALLET'?{fundingAccountId:source}:{})});
   setResult(t);setFailure('');setStep('result');
  }catch(e){
   const message=(e as Error).message;
   // a cancelled PIN or face check leaves the person on the confirm screen
   if(message==='Ləğv edildi')setLocal('');
   else{setFailure(message);setResult(null);setStep('result');a.setError('');}
  }finally{setBusy(false);}
 }

 const tone:'success'|'failed'|'review'=failure?'failed':result?.status==='UNDER_REVIEW'?'review':'success';

 return (
  <Modal visible={!hidden} animationType={opened?'none':'slide'} onRequestClose={close}>
   {/* a Modal is its own native window: without its own provider the top inset is 0 on the first screen and the back button sits under the status bar */}
   <SafeAreaProvider style={{flex:1}}>
   <SafeAreaView style={t.screen}>
    {step==='pick'&&(
     <ScrollView contentContainerStyle={t.body} keyboardShouldPersistTaps="handled">
      <BackBar onBack={close}/>
      <Text style={t.title}>Kimə köçürürsən</Text>
      <Pressable accessibilityRole="button" style={t.newRow} onPress={()=>setManual(m=>!m)}>
       <View style={t.plus}><Icon name="add" size={24} color={C.primary}/></View>
       <Text style={t.newText}>Yeni nömrə</Text>
      </Pressable>
      {manual&&(
       <View style={{marginTop:10}}>
        <TextInput
         accessibilityLabel="Telefon nömrəsi"
         value={phone}
         onChangeText={setPhone}
         keyboardType="phone-pad"
         placeholder="+994 50 000 00 00"
         placeholderTextColor="#aaa6bd"
         style={S.input}
        />
        <View style={{height:10}}/>
        <Button title="Davam et" disabled={phone.replace(/\D/g,'').length<12} onPress={()=>{setTarget({name:phone,phone:phone.replace(/\s/g,'')});setStep('amount');}}/>
       </View>
      )}
      <View style={t.or}><View style={t.orLine}/><Text style={t.orText}>və ya</Text><View style={t.orLine}/></View>
      <View style={t.search}>
       <Icon name="search-outline" size={20} color="#6e6a85"/>
       <TextInput accessibilityLabel="Kontakt axtar" value={search} onChangeText={setSearch} placeholder="Kontakt axtar" placeholderTextColor="#aaa6bd" style={t.searchInput}/>
      </View>
      {!needle&&frequent.length>0&&<Text style={t.group}>Tez-tez köçürülənlər</Text>}
      {!needle&&frequent.map(c=><ContactRow key={'f'+c.phone} c={c} onPress={()=>{setTarget(c);setStep('amount');}}/>)}
      <Text style={t.group}>{needle?'Nəticələr':'Bütün kontaktlar'}</Text>
      {shown.map(c=><ContactRow key={c.phone} c={c} onPress={()=>{setTarget(c);setStep('amount');}}/>)}
      {!shown.length&&<Text style={[S.muted,{marginTop:12}]}>Kontakt tapılmadı. “Yeni nömrə” ilə əlavə edə bilərsən.</Text>}
     </ScrollView>
    )}

    {step==='amount'&&target&&(
     <View style={{flex:1}}>
      <View style={t.bodyTight}><BackBar onBack={()=>initialPhone?close():setStep('pick')}/></View>
      <View style={t.center}>
       <Text style={t.titleCenter}>Köçürmə məbləği</Text>
       <View style={t.person}>
        <Avatar name={target.name} size={64}/>
        <View>
         <Text style={t.personName}>{target.name}</Text>
         <Text style={t.personPhone}>{target.phone}</Text>
        </View>
       </View>
       <Text style={t.hint}>Məbləği daxil et</Text>
       <View style={t.amountWrap}>
        <Text style={[t.amountText,!amount&&{color:'#c9c6d6'}]}>{shownAmount} ₼</Text>
       </View>
      </View>
      <View style={t.padWrap}>
       {KEYS.map(row=>(
        <View key={row.join('')} style={t.padRow}>
         {row.map(k=>(
          <Pressable
           key={k}
           accessibilityRole="button"
           accessibilityLabel={k==='del'?'Sil':k}
           onPress={()=>setAmount(v=>typeAmount(v,k))}
           style={({pressed})=>[t.key,pressed&&{backgroundColor:'#f1eefb'}]}
          >
           {k==='del'?<Icon name="backspace-outline" size={26} color={C.ink}/>:<Text style={t.keyText}>{k}</Text>}
          </Pressable>
         ))}
        </View>
       ))}
       <View style={{paddingHorizontal:20,paddingTop:6}}>
        <Button title="Davam et" disabled={busy||parsed<=0} onPress={()=>{void resolveAndContinue();}}/>
       </View>
      </View>
     </View>
    )}

    {step==='confirm'&&target&&(
     <View style={{flex:1}}>
      <View style={t.bodyTight}><BackBar onBack={()=>setStep('amount')}/></View>
      <ScrollView contentContainerStyle={[t.body,{alignItems:'center'}]} keyboardShouldPersistTaps="handled">
       <Text style={t.titleCenter}>Köçürməni təsdiqlə</Text>
       <View style={t.person}>
        <Avatar name={target.name} size={64}/>
        <View>
         <Text style={t.personName}>{target.name}</Text>
         <Text style={t.personPhone}>{target.phone}</Text>
        </View>
       </View>
       <Text style={t.hint}>Məbləğ</Text>
       <View style={t.amountWrap}><Text style={t.amountText}>{money(parsed)}</Text></View>
       <View style={{alignSelf:'stretch',marginTop:26}}>
        {cards.length>0&&(
         <View style={{marginBottom:16}}>
          <Text style={[S.label,{marginBottom:8}]}>Haradan köçürülsün</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
           {[{id:'WALLET',label:'Kampus balansı'},...cards.map(x=>({id:String(x.id),label:cardLabel(x)}))].map(o=>(
            <Pressable key={o.id} accessibilityRole="button" accessibilityState={{selected:source===o.id}} onPress={()=>setSource(o.id)} style={[t.sourceChip,source===o.id&&{backgroundColor:C.primary,borderColor:C.primary}]}>
             <Text style={[t.sourceText,source===o.id&&{color:'#fff'}]}>{o.label}</Text>
            </Pressable>
           ))}
          </View>
         </View>
        )}
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
       <Button title="Təhlükəsiz ödə" icon="shield-checkmark-outline" yellow disabled={busy} onPress={()=>{void pay();}}/>
      </View>
     </View>
    )}

    {step==='result'&&(
     <View style={{flex:1,backgroundColor:tone==='failed'?'#fff6f4':'#ffffff'}}>
      <ScrollView contentContainerStyle={[t.body,{alignItems:'center',paddingTop:40}]}>
       <ResultArt tone={tone}/>
       <Text style={[t.resultTitle]}>
        {tone==='failed'?'Köçürmə alınmadı':tone==='review'?'Yoxlamaya göndərildi':'Köçürmə göndərildi'}
       </Text>
       <Text style={t.resultText}>
        {tone==='failed'?failure:tone==='review'?'Əməliyyat admin yoxlamasındadır. Vəsait rezerv edilib.':result?.status==='SCHEDULED'&&count>0?'Köçürmə '+count+' saniyəyə icra ediləcək.':'Nəticəni tarixçədə izləyə bilərsən.'}
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
  </Modal>
 );
}

function ContactRow({c,onPress}:{c:Contact;onPress:()=>void}){
 return (
  <Pressable accessibilityRole="button" onPress={onPress} style={t.contact}>
   <Avatar name={c.name} size={48}/>
   <View style={{flex:1}}>
    <Text style={t.contactName}>{c.name}</Text>
    <Text style={t.contactPhone}>{c.phone}</Text>
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
 or:{flexDirection:'row',alignItems:'center',gap:12,marginVertical:14},
 orLine:{flex:1,height:1,backgroundColor:'#ebe8f4'},
 orText:{fontSize:12,color:'#76738a'},
 search:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'#dedaeb',borderRadius:10,paddingHorizontal:12,minHeight:50},
 searchInput:{flex:1,fontSize:15,color:C.ink,minHeight:48},
 group:{fontSize:12,color:'#76738a',marginTop:18,marginBottom:4},
 contact:{flexDirection:'row',alignItems:'center',gap:12,minHeight:68,borderBottomWidth:1,borderBottomColor:'#f0eef6'},
 contactName:{fontSize:14,fontWeight:'700',color:C.ink},
 contactPhone:{fontSize:12,color:'#76738a',marginTop:2},
 center:{flex:1,paddingHorizontal:20,alignItems:'center',paddingTop:6},
 person:{flexDirection:'row',alignItems:'center',gap:14,marginTop:22},
 personName:{fontSize:17,fontWeight:'700',color:C.ink},
 personPhone:{fontSize:13,color:'#76738a',marginTop:3},
 hint:{fontSize:12,color:'#76738a',marginTop:30},
 amountWrap:{minWidth:200,borderBottomWidth:2,borderBottomColor:C.primary,paddingHorizontal:14,paddingVertical:6,marginTop:8,alignItems:'center'},
 amountText:{fontSize:38,fontWeight:'500',color:C.ink,letterSpacing:-0.5},
 error:{color:C.red,fontSize:12,lineHeight:18,textAlign:'center',marginTop:14},
 padWrap:{paddingBottom:12,backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#f3f1f8'},
 padRow:{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20},
 key:{flex:1,height:62,alignItems:'center',justifyContent:'center',borderRadius:12},
 keyText:{fontSize:26,fontWeight:'500',color:C.ink},
 footer:{paddingHorizontal:20,paddingBottom:16,paddingTop:8,width:'100%',maxWidth:430,alignSelf:'center'},
 resultTitle:{fontSize:20,fontWeight:'800',color:C.ink,marginTop:14,textAlign:'center'},
 resultText:{fontSize:13,lineHeight:20,color:'#76738a',textAlign:'center',marginTop:8,marginBottom:22,maxWidth:300},
 details:{alignSelf:'stretch',gap:8,marginBottom:14},
 detail:{borderWidth:1,borderColor:'#ebe8f4',borderRadius:10,paddingHorizontal:14,paddingVertical:10},
 detailLabel:{fontSize:11,color:'#76738a'},
 sourceChip:{minHeight:42,paddingHorizontal:14,borderRadius:12,borderWidth:1.5,borderColor:'#dedaeb',alignItems:'center',justifyContent:'center'},
 sourceText:{fontSize:13,fontWeight:'700',color:C.ink},
 detailValue:{fontSize:14,fontWeight:'700',color:C.ink,marginTop:3}
});
