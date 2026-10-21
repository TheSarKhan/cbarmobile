import React,{useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {money} from './api';
import type {Row} from './api';
import {Badge,Box,Button,C,Empty,Icon,S,Tx,fmtDate,fmtDateTime,useApp} from './ui';

const STATUS:Record<string,{text:string;tone:'success'|'warn'|'danger'|'neutral'}>={
 AUTHORIZED:{text:'AKTİV',tone:'success'},
 AWAITING_AUTHORIZATION:{text:'TƏSDİQ GÖZLƏNİLİR',tone:'warn'},
 EXPIRED:{text:'İCAZƏNİN VAXTI BİTİB',tone:'danger'}
};

export function BankMark({bank,size=44}:{bank:Row;size?:number}){
 return (
  <View style={{width:size,height:size,borderRadius:size*0.32,backgroundColor:bank.color||bank.bankColor||C.ink,alignItems:'center',justifyContent:'center'}}>
   <Text style={{color:'#fff',fontWeight:'800',fontSize:size*0.32}}>{bank.initials||bank.bankInitials||'B'}</Text>
  </View>
 );
}

/** The banks linked to Kampus: their shared cards, terms of the consent, refresh and revoke. Linking a bank is the LinkBankFlow. */
export function BanksSection(){
 const a=useApp(),d=a.data;
 const overview:Row=d.openBanking||{consents:[],accounts:[],totalBalanceMinor:0};
 const [notice,setNotice]=useState('');
 const [syncing,setSyncing]=useState('');
 const [confirmRevoke,setConfirmRevoke]=useState('');
 const [expanded,setExpanded]=useState('');

 const consents:Row[]=(overview.consents||[]).filter((c:Row)=>c.status==='AUTHORIZED'||c.status==='AWAITING_AUTHORIZATION'||(c.status==='EXPIRED'&&(overview.accounts||[]).some((x:Row)=>x.consentId===c.id)));

 async function syncConsent(id:string){
  setSyncing(id);
  try{
   const r=await a.call('open-banking/consents/'+id+'/sync',{});
   await a.refresh();
   setNotice(r.synced?(r.added>0?`${r.added} yeni əməliyyat əlavə olundu.`:'Yeni əməliyyat yoxdur.'):'İcazə artıq aktiv deyil.');
  }catch(e){setNotice((e as Error).message);}
  finally{setSyncing('');}
 }

 async function revoke(id:string){
  try{await a.call('open-banking/consents/'+id+'/revoke',{});setConfirmRevoke('');setNotice('İcazə ləğv edildi, bu bankdan gətirilən məlumat silindi.');await a.refresh();}
  catch(e){setNotice((e as Error).message);}
 }

 return (
  <>
   {!!notice&&(
    <Pressable onPress={()=>setNotice('')} style={bs.notice}>
     <Icon name="information-circle-outline" size={18} color={C.ink}/>
     <Text style={[S.muted,{flex:1,color:C.ink}]}>{notice}</Text>
    </Pressable>
   )}

   {consents.some((c:Row)=>c.status!=='AWAITING_AUTHORIZATION')&&(
    <Box style={{backgroundColor:C.forest}}>
     <Text style={{fontSize:11,fontWeight:'700',color:'rgba(255,255,255,0.7)',letterSpacing:1}}>BAĞLI BANKLARDA CƏMİ</Text>
     <Text style={{fontSize:30,fontWeight:'800',color:'#fff',marginTop:6}}>{money(overview.totalBalanceMinor||0)}</Text>
     <Text style={{fontSize:12,color:'rgba(255,255,255,0.75)',marginTop:6}}>
      {d.analytics?.externalMinor>0?`Bu ay bu banklarda xərc: ${money(d.analytics.externalMinor)}`:'Bu məbləğ bank kartlarındadır, Kampus balansına əlavə olunmur.'}
     </Text>
    </Box>
   )}

   {consents.map((c:Row)=>{
    const accounts=(overview.accounts||[]).filter((x:Row)=>x.consentId===c.id);
    const status=STATUS[c.status]||{text:c.status,tone:'neutral' as const};
    const txs:Row[]=(a.external||[]).filter((t:Row)=>t.consentId===c.id).slice(0,6);
    const busyHere=syncing===c.id;
    return (
     <View key={c.id} style={bs.bankCard}>
      <View style={[bs.bankHeader,{backgroundColor:c.bankColor||C.ink}]}>
       <BankMark bank={{...c,color:'rgba(255,255,255,0.22)'}} size={38}/>
       <Text style={bs.bankName}>{c.bankName}</Text>
       <Badge text={status.text} tone={status.tone}/>
      </View>
      <View style={{padding:16}}>
       {c.status==='AWAITING_AUTHORIZATION'?(
        <>
         <Text style={S.muted}>İcazə sorğusu yarımçıq qalıb. Bankın bildirişindən davam etmək üçün yenidən bank əlavə et və ya sorğunu ləğv et.</Text>
         <View style={{marginTop:12,gap:8}}>
          <Button title="Sorğunu ləğv et" danger onPress={()=>revoke(c.id)}/>
         </View>
        </>
       ):(
        <>
         {accounts.map((x:Row)=>(
          <View key={x.id} style={bs.accountRow}>
           <View style={S.tile}><Icon name={x.type==='CARD'?'card-outline':'wallet-outline'} size={19}/></View>
           <View style={{flex:1,minWidth:0}}>
            <Text numberOfLines={1} style={S.h3}>{x.name}</Text>
            <Text style={[S.muted,{fontSize:11}]}>{x.masked}</Text>
           </View>
           <Text style={{fontWeight:'800',fontSize:14,color:c.status==='AUTHORIZED'?C.ink:C.muted}}>{money(x.balanceMinor)}</Text>
          </View>
         ))}
         <Text style={[S.muted,{fontSize:11,marginTop:10}]}>
          {c.lastSyncAt?`Son yenilənmə: ${fmtDateTime(c.lastSyncAt)}`:'Hələ yenilənməyib'} · İcazə {fmtDate(c.expiresAt)} tarixinədək{c.monthlyLimitMinor?` · Aylıq limit ${money(c.monthlyLimitMinor)}`:''}
         </Text>
         {c.status==='EXPIRED'?(
          <View style={{marginTop:12}}>
           <Text style={[S.muted,{color:C.red,marginBottom:8}]}>İcazənin vaxtı bitib, məlumatlar köhnəlib. Yenidən bağla.</Text>
           <Button title="İcazəni yenilə" icon="refresh" onPress={()=>{void revoke(c.id).then(()=>a.open('link-bank'));}}/>
          </View>
         ):(
          <View style={{marginTop:12,gap:8}}>
           <Button title={busyHere?'Yenilənir…':'Yenilə'} icon="refresh" secondary disabled={busyHere} onPress={()=>syncConsent(c.id)}/>
           <Button title={expanded===c.id?'Əməliyyatları gizlət':'Son əməliyyatlar'} secondary onPress={()=>setExpanded(expanded===c.id?'':c.id)}/>
          </View>
         )}
         {expanded===c.id&&(
          <View style={{marginTop:10}}>
           {txs.map((t:Row)=><Tx key={t.id} t={t} onPress={()=>a.open('tx-detail:'+t.id)}/>)}
           {!txs.length&&<Empty text="Əməliyyat tapılmadı."/>}
          </View>
         )}
        </>
       )}
       {c.status!=='AWAITING_AUTHORIZATION'&&(
        confirmRevoke===c.id?(
         <View style={bs.confirm}>
          <Text style={[S.muted,{color:C.ink}]}>İcazə ləğv ediləcək, kartlardan ödəniş dayanacaq və bu bankdan gətirilən bütün hesab və əməliyyatlar silinəcək.</Text>
          <View style={{flexDirection:'row',gap:8,marginTop:10}}>
           <View style={{flex:1}}><Button title="Saxla" secondary onPress={()=>setConfirmRevoke('')}/></View>
           <View style={{flex:1}}><Button title="Ləğv et" danger onPress={()=>revoke(c.id)}/></View>
          </View>
         </View>
        ):(
         <Pressable accessibilityRole="button" onPress={()=>setConfirmRevoke(c.id)} style={{alignItems:'center',paddingTop:12}}>
          <Text style={[S.link,{color:C.red}]}>İcazəni ləğv et</Text>
         </Pressable>
        )
       )}
      </View>
     </View>
    );
   })}

   {!consents.length&&(
    <Box>
     <View style={[S.tile,{width:52,height:52,borderRadius:18,marginBottom:12}]}><Icon name="business-outline" size={26} color={C.primary}/></View>
     <Text style={S.h2}>Bütün banklar bir yerdə</Text>
     <Text style={[S.muted,{marginTop:6,lineHeight:19}]}>Digər bankların kartlarını bağla, balans və xərclərini Kampus-da izlə, kartlarından ödəniş et.</Text>
     {['Bankın tətbiqində kartları, müddəti və aylıq limiti özün seçirsən','Sənəd SİMA ilə imzalanır','İstədiyin vaxt ləğv edə bilərsən'].map(line=>(
      <View key={line} style={{flexDirection:'row',gap:8,alignItems:'center',marginTop:10}}>
       <Icon name="checkmark-circle" size={18} color={C.green}/>
       <Text style={[S.muted,{flex:1,color:C.ink}]}>{line}</Text>
      </View>
     ))}
    </Box>
   )}

   <Button title="Bank əlavə et" icon="add" onPress={()=>a.open('link-bank')}/>
  </>
 );
}

const bs=StyleSheet.create({
 bankCard:{backgroundColor:'#fff',borderRadius:20,borderWidth:1,borderColor:C.line,overflow:'hidden',marginBottom:14},
 bankHeader:{flexDirection:'row',alignItems:'center',gap:10,padding:14},
 bankName:{flex:1,color:'#fff',fontSize:16,fontWeight:'800'},
 accountRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:8},
 notice:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#e4def7',borderRadius:14,padding:12,marginBottom:12},
 confirm:{marginTop:14,backgroundColor:'#fbe8e2',borderRadius:14,padding:12}
});
