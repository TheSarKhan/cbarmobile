import React,{useState} from 'react';
import {View,Pressable,StyleSheet,TextInput} from 'react-native';
import {Text} from './text';
import {Row,minor,money} from './api';
import {S,C,Button,Check,Box,Badge,Icon,statusTone,linkedCards,cardLabel} from './ui';
import {BigAmount,MiniCard,groupCard,luhn} from './CardUi';

type Props={
 base:string;
 data:Row;
 busy:boolean;
 call:(p:string,b?:Row)=>Promise<any>;
 act:(p:string,b:Row)=>Promise<any>;
 setError:(s:string)=>void;
};

/**
 * Card transfer: a card number or a saved card on the first screen, then the big amount screen with the fee quote.
 * The number is tokenised by the card network simulator; the wallet keeps only the token, the bank and the last four digits.
 */
export function useCardTransferState(){
 const [view,setView]=useState<'list'|'amount'>('list'),
  [number,setNumber]=useState(''),
  [card,setCard]=useState<Row|null>(null),
  [save,setSave]=useState(true),
  [quote,setQuote]=useState<Row|null>(null),
  [transfer,setTransfer]=useState<Row|null>(null),
  [amount,setAmount]=useState(''),
  [checking,setChecking]=useState(false),
  [funding,setFunding]=useState('WALLET'),
  [pickerOpen,setPickerOpen]=useState(false);
 return {funding,setFunding,pickerOpen,setPickerOpen,view,setView,number,setNumber,card,setCard,save,setSave,quote,setQuote,transfer,setTransfer,amount,setAmount,checking,setChecking};
}

/** The state lives in the caller: the PIN sheet hides this one for a moment and the form must come back as it was. */
export function CardTransferForm({state,...a}:Props&{state:ReturnType<typeof useCardTransferState>}){
 const {funding,setFunding,pickerOpen,setPickerOpen,view,setView,number,setNumber,card,setCard,save,setSave,quote,setQuote,transfer,setTransfer,amount,setAmount,checking,setChecking}=state;

 async function run(fn:()=>Promise<void>){
  a.setError('');
  try{await fn();}catch(e){a.setError((e as Error).message);}
 }

 const digits=number.replace(/\D/g,'');
 const numberError=digits.length===16&&!luhn(digits)?'Kart nömrəsi yanlışdır.':'';
 async function lookUp(){
  setChecking(true);
  try{
   const c=await a.act('card-transfers/card',{number:digits});
   setCard({...c,saved:false});setQuote(null);setAmount('');setNumber('');setView('amount');
  }catch{/* the popup explains it */}
  finally{setChecking(false);}
 }

 const current=transfer?(a.data.cardTransfers?.find((x:Row)=>x.id===transfer.id)||transfer):null;
 const savedList:Row[]=a.data.recipientCards||[];
 const parsed=Math.max(0,Number(amount.replace(',','.'))||0);
 const disabled=a.busy||checking;
 const balance=a.data.wallet?.availableBalanceMinor||0;
 const sources=[
  {id:'WALLET',label:'Balans',sub:'Kampus hesabı',balance},
  ...linkedCards(a.data).map((x:Row)=>({id:String(x.id),label:cardLabel(x),sub:'Açıq bankçılıq kartı',balance:Number(x.balanceMinor||0)}))
 ];
 const source=sources.find(o=>o.id===funding)||sources[0];

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
      setCard(null);
      setQuote(null);
      setTransfer(null);
      setAmount('');
      setView('list');
     }}
    />
   </>
  );
 }


 if(view==='amount'&&card){
  return (
   <>
    <Pressable accessibilityRole="button" onPress={()=>{setView('list');setQuote(null);}} style={cs.back}>
     <Icon name="arrow-back" size={18} color={C.ink}/>
     <Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>Geri</Text>
    </Pressable>
    <View style={[S.between,{marginBottom:4}]}>
     <View>
      <Text style={{fontSize:17,fontWeight:'800',color:C.ink}}>Karta köçürmə</Text>
      <Text style={{fontSize:13,color:C.muted,marginTop:2}}>{card.bankName} · •••• {card.last4}</Text>
     </View>
     <MiniCard brand={card.brand}/>
    </View>

    <BigAmount value={amount} onChange={v=>{setAmount(v);setQuote(null);}} hint="Bank tərəfindən komissiya tutula bilər"/>

    <View style={{alignItems:'center',marginBottom:pickerOpen?8:20}}>
     <Pressable accessibilityRole="button" accessibilityLabel="Ödəniş mənbəyini seç" accessibilityState={{expanded:pickerOpen}} onPress={()=>setPickerOpen(!pickerOpen)} style={cs.balanceChip}>
      <Icon name={source.id==='WALLET'?'wallet-outline':'card-outline'} size={16} color={C.ink}/>
      <Text style={{fontSize:14,fontWeight:'700',color:C.ink}}>{source.label} {money(source.balance)}</Text>
      <Icon name={pickerOpen?'chevron-up':'chevron-down'} size={16} color={C.ink}/>
     </Pressable>
    </View>
    {pickerOpen&&(
     <View style={cs.menu}>
      {sources.map(o=>(
       <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={o.label} onPress={()=>{setFunding(o.id);setQuote(null);setPickerOpen(false);}} style={cs.menuRow}>
        <Icon name={o.id==='WALLET'?'wallet-outline':'card-outline'} size={20} color={C.ink}/>
        <View style={{flex:1}}>
         <Text style={{fontSize:14,fontWeight:'700',color:C.ink}}>{o.label}</Text>
         <Text style={{fontSize:12,color:C.muted,marginTop:1}}>{o.sub}</Text>
        </View>
        {source.id===o.id&&<Icon name="checkmark-circle" size={20} color={C.primary}/>}
       </Pressable>
      ))}
     </View>
    )}
    {!card.saved&&<Check value={save} onChange={setSave} text="Bu kartı yadda saxla, növbəti dəfə nömrə yazmadan seçim."/>}

    {quote&&(
     <Box style={{backgroundColor:'#eeebf8',borderColor:'#c7bce6'}}>
      <View style={[S.between,{marginBottom:8}]}>
       <Text style={S.muted}>Karta çatacaq</Text>
       <Text style={S.h3}>{money(quote.amountMinor)}</Text>
      </View>
      <View style={[S.between,{marginBottom:8}]}>
       <Text style={S.muted}>{quote.purpose==='WITHDRAW_OWN'?'Komissiya (ayda 500 ₼-dək 0%)':'Komissiya (0.5%, min. 0.30 ₼)'}</Text>
       <Text style={{color:C.ink,fontWeight:'600'}}>{money(quote.feeMinor)}</Text>
      </View>
      <View style={S.line}/>
      <View style={S.between}>
       <Text style={S.h3}>Balansdan çıxılacaq</Text>
       <Text style={S.h2}>{money(quote.totalMinor)}</Text>
      </View>
     </Box>
    )}

    <Button
     title={quote?'PIN ilə təsdiqlə və köçür':'Köçürmək'}
     icon={quote?'shield-checkmark-outline':'arrow-forward'}
     disabled={disabled||parsed<=0}
     onPress={()=>run(async()=>{
      if(!quote){
       setQuote(await a.act('card-transfers/fee-quote',card.saved?{cardId:card.id,amountMinor:minor(amount),purpose:'SEND'}:{sessionId:card.sessionId,amountMinor:minor(amount),purpose:'SEND'}));
       return;
      }
      const body:Row={quoteId:quote.id,amountMinor:quote.amountMinor,totalMinor:quote.totalMinor,recipientName:quote.bankName+' · •••• '+quote.last4};
      if(source.id!=='WALLET')body.fundingAccountId=source.id;
      if(!card.saved&&save)body.saveAs=card.bankName+' •••• '+card.last4;
      setTransfer(await a.act('card-transfers',body));
     })}
    />
   </>
  );
 }

 return (
  <>
   <View style={[cs.numberRow,!!numberError&&{borderColor:C.red,borderWidth:1.5}]}>
    <Icon name="card-outline" size={22} color={C.muted}/>
    <TextInput
     accessibilityLabel="Kartın nömrəsi"
     value={number}
     onChangeText={v=>setNumber(groupCard(v))}
     placeholder="Kartın nömrəsi"
     placeholderTextColor="#9a95a7"
     keyboardType="number-pad"
     maxLength={19}
     style={cs.numberInput}
    />
   </View>
   {!!numberError&&<Text style={{color:C.red,fontSize:13,fontWeight:'600',marginTop:8}}>{numberError}</Text>}
   <View style={{height:12}}/>
   <Button title="Davam et" icon="arrow-forward" disabled={disabled||digits.length!==16||!!numberError} onPress={()=>{void lookUp();}}/>

   {savedList.length>0&&(
    <>
     <Text style={cs.section}>YADDA SAXLANILAN KARTLAR</Text>
     <View style={{gap:10}}>
      {savedList.map((rc:Row)=>(
       <Pressable key={rc.id} accessibilityRole="button" accessibilityLabel={(rc.nickname||rc.bankName)+' •••• '+rc.last4} onPress={()=>{setCard({...rc,saved:true});setQuote(null);setAmount('');setView('amount');}} style={cs.cardRow}>
        <MiniCard brand={rc.brand}/>
        <View style={{flex:1}}>
         <Text numberOfLines={1} style={{fontSize:15,fontWeight:'700',color:C.ink}}>{rc.bankName}</Text>
         <Text style={{fontSize:12,color:C.muted,marginTop:2}}>•••• {rc.last4}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Kartı sil" hitSlop={8} onPress={()=>run(async()=>{await a.act('recipient-cards/'+rc.id+'/delete',{});})} style={cs.dots}>
         <Icon name="trash-outline" size={16} color={C.muted}/>
        </Pressable>
       </Pressable>
      ))}
     </View>
    </>
   )}

  </>
 );
}

const cs=StyleSheet.create({
 back:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:14,minHeight:44,alignSelf:'flex-start'},
 numberRow:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#f4f3f7',borderRadius:20,paddingHorizontal:16,minHeight:64},
 numberInput:{flex:1,fontSize:17,fontWeight:'600',color:C.ink,minHeight:60,outlineStyle:'none' as any},
 section:{fontSize:12,fontWeight:'700',color:C.muted,letterSpacing:0.4,marginTop:24,marginBottom:10},
 cardRow:{flexDirection:'row',alignItems:'center',gap:14,backgroundColor:'#f4f3f7',borderRadius:20,padding:14,minHeight:72},
 dots:{width:34,height:34,borderRadius:17,backgroundColor:'#e6e4ec',alignItems:'center',justifyContent:'center'},
 balanceChip:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1.5,borderColor:C.ink,borderRadius:22,paddingHorizontal:16,minHeight:44},
 menu:{backgroundColor:'#f4f3f7',borderRadius:18,padding:6,marginBottom:20},
 menuRow:{flexDirection:'row',alignItems:'center',gap:12,minHeight:56,paddingHorizontal:12}
});
