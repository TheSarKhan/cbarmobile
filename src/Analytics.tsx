import React,{useCallback,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Text} from './text';
import {money} from './api';
import type {Row} from './api';
import {Badge,Box,Button,C,Empty,Icon,S,fmtDate,useApp} from './ui';

const TONES:Record<string,{bg:string;fg:string}>={
 info:{bg:'#ece6ff',fg:'#5632c0'},
 warn:{bg:'#fff1c9',fg:'#a06d00'},
 good:{bg:'#dcf3e4',fg:'#2f9e63'}
};
const WEEKDAYS=['B.e.','Ç.a.','Çər','C.a.','Cümə','Şən','Baz'];
const MONTHS=['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];

/** The analytics screen: forecast, friendly cards, unusual payments, categories, recurring payments and budgets. */
export function AnalyticsView(){
 const a=useApp();
 const [data,setData]=useState<Row|null>(null);
 const [busy,setBusy]=useState(false);

 const load=useCallback(async()=>{
  try{setData(await a.call('analytics/insights'));}catch(e){a.setError((e as Error).message);}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[a.call]);
 useFocusEffect(useCallback(()=>{void load();},[load]));

 async function post(path:string,body:Row){
  setBusy(true);
  try{await a.call(path,body);await load();await a.refresh();}
  catch(e){a.setError((e as Error).message);}
  finally{setBusy(false);}
 }

 if(!data)return <View style={{paddingVertical:60}}><ActivityIndicator color={C.primary}/></View>;

 if(!data.enabled){
  return (
   <>
    <Text style={s.title}>Analitika</Text>
    <Box style={{alignItems:'center',paddingVertical:26}}>
     <View style={s.bigIcon}><Icon name="pie-chart-outline" size={30} color={C.primary}/></View>
     <Text style={[S.h3,{marginTop:12}]}>Xərc təhlili söndürülüb</Text>
     <Text style={[S.muted,{textAlign:'center',marginTop:6,marginBottom:16}]}>Aktiv edəndə xərc proqnozu, abunəliklər, qeyri-adi ödənişlər və büdcə təklifləri görünəcək. İstədiyin vaxt söndürə bilərsən.</Text>
     <Button title="Xərc təhlilini aktiv et" icon="sparkles-outline" disabled={busy} onPress={()=>{void post('analytics/consent',{enabled:true});}}/>
    </Box>
   </>
  );
 }

 const f:Row=data.forecast||{},b:Row=data.breakdown||{};
 const cards:Row[]=(data.cards||[]).filter((c:Row)=>c.kind!=='FORECAST'&&c.kind!=='ANOMALY');
 const categories:Row[]=b.categories||[];
 const months:Row[]=b.months||[];
 const maxMonth=Math.max(1,...months.map(x=>x.amountMinor));
 const maxCategory=Math.max(1,...categories.map(x=>x.amountMinor));
 const weekdays:number[]=b.weekdayAverageMinor||[];
 const maxDay=Math.max(1,...weekdays);
 const progress=f.projectedMinor>0?Math.min(1,f.monthSpentMinor/f.projectedMinor):0;

 return (
  <>
   <Text style={s.title}>Analitika</Text>

   <View style={s.hero}>
    <Text style={s.heroLabel}>Ay sonuna proqnoz</Text>
    <Text style={s.heroValue}>~{money(f.projectedMinor||0)}</Text>
    <Text style={s.heroRange}>Aralıq {money(f.lowMinor||0)} – {money(f.highMinor||0)}</Text>
    <View style={s.track}><View style={[s.fill,{width:`${Math.round(progress*100)}%`}]}/></View>
    <View style={S.between}>
     <Text style={s.heroSmall}>İndiyədək {money(f.monthSpentMinor||0)}</Text>
     <Text style={s.heroSmall}>{f.daysLeft} gün qalıb</Text>
    </View>
    <View style={s.chips}>
     {f.lastMonthMinor>0&&<View style={s.chip}><Text style={s.chipText}>Keçən ay {money(f.lastMonthMinor)}{f.vsLastMonthPct!=null?` · ${f.vsLastMonthPct>0?'+':''}${f.vsLastMonthPct}%`:''}</Text></View>}
     <View style={s.chip}><Text style={s.chipText}>Gündəlik tempo {money(f.dailyPaceMinor||0)}</Text></View>
     {f.runwayDays!=null&&<View style={s.chip}><Text style={s.chipText}>Balans ~{f.runwayDays} gün</Text></View>}
    </View>
   </View>

   {cards.map(c=>{
    const tone=TONES[c.tone]||TONES.info;
    return (
     <View key={c.id} style={s.card}>
      <View style={[s.cardIcon,{backgroundColor:tone.bg}]}><Icon name={c.icon} size={20} color={tone.fg}/></View>
      <View style={{flex:1}}>
       <Text style={s.cardTitle}>{c.title}</Text>
       <Text style={s.cardBody}>{c.body}</Text>
      </View>
     </View>
    );
   })}

   {(data.anomalies||[]).length>0&&(
    <>
     <Text style={s.section}>Qeyri-adi ödənişlər</Text>
     {data.anomalies.map((x:Row)=>(
      <Box key={x.id} style={{borderColor:'#f2d7b6',backgroundColor:'#fffaf0'}}>
       <View style={S.between}>
        <Text style={[S.h3,{flex:1}]}>{x.merchant}</Text>
        <Text style={s.amountOut}>−{money(x.amountMinor)}</Text>
       </View>
       <Text style={[S.muted,{marginTop:6}]}>{x.explanation}</Text>
      </Box>
     ))}
    </>
   )}

   <Text style={s.section}>Kateqoriyalar · bu ay</Text>
   <Box>
    {!categories.length&&<Empty text="Bu ay hələ xərc yoxdur." icon="receipt-outline"/>}
    {categories.map((c,i)=>(
     <View key={c.category} style={[s.catRow,i===categories.length-1&&{marginBottom:0}]}>
      <View style={S.between}>
       <Text style={s.catName}>{c.category}</Text>
       <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        {c.deltaPct!=null&&<Text style={[s.delta,{color:c.deltaPct>0?'#d04b4b':'#2f9e63'}]}>{c.deltaPct>0?'+':''}{c.deltaPct}%</Text>}
        <Text style={s.catAmount}>{money(c.amountMinor)}</Text>
       </View>
      </View>
      <View style={s.barTrack}><View style={[s.barFill,{width:`${Math.max(3,Math.round(c.amountMinor/maxCategory*100))}%`}]}/></View>
     </View>
    ))}
    <Text style={[S.muted,{marginTop:10,fontSize:11}]}>Faiz dəyişikliyi keçən ayın eyni dövrü ilə müqayisədir.</Text>
   </Box>

   <Text style={s.section}>Son 6 ay</Text>
   <Box>
    <View style={s.columns}>
     {months.map((m,i)=>{
      const current=i===months.length-1;
      return (
       <View key={m.month} style={s.column}>
        <Text style={s.columnValue}>{m.amountMinor>0?Math.round(m.amountMinor/100):''}</Text>
        <View style={s.columnTrack}><View style={[s.columnFill,current&&{backgroundColor:C.yellow},{height:`${Math.max(4,Math.round(m.amountMinor/maxMonth*100))}%`}]}/></View>
        <Text style={s.columnLabel}>{MONTHS[Number(String(m.month).slice(5,7))-1]}</Text>
       </View>
      );
     })}
    </View>
   </Box>

   {(data.recurring||[]).length>0&&(
    <>
     <Text style={s.section}>Təkrarlanan ödənişlər</Text>
     <Box style={{paddingVertical:4}}>
      {data.recurring.map((r:Row,i:number)=>(
       <View key={r.key} style={[s.recRow,i===data.recurring.length-1&&{borderBottomWidth:0}]}>
        <View style={[s.cardIcon,{backgroundColor:TONES.info.bg}]}><Icon name="repeat-outline" size={18} color={C.primary}/></View>
        <View style={{flex:1}}>
         <Text style={s.catName}>{r.label}</Text>
         <Text style={s.cardBody}>Növbəti: {fmtDate(r.nextOn)} · {r.period==='MONTHLY'?'hər ay':r.period==='WEEKLY'?'hər həftə':'iki həftədən bir'}</Text>
        </View>
        <Text style={s.catAmount}>{money(r.typicalMinor)}</Text>
       </View>
      ))}
     </Box>
    </>
   )}

   {((data.budgetRisks||[]).length>0||(data.budgetSuggestions||[]).length>0)&&<Text style={s.section}>Büdcə</Text>}
   {(data.budgetRisks||[]).map((r:Row)=>(
    <Box key={r.category}>
     <View style={S.between}>
      <Text style={S.h3}>{r.category}</Text>
      <Badge text={r.risk==='HIGH'?'RİSK YÜKSƏK':r.risk==='MEDIUM'?'DİQQƏT':'NORMAL'} tone={r.risk==='HIGH'?'danger':r.risk==='MEDIUM'?'warn':'success'}/>
     </View>
     <View style={[s.barTrack,{marginTop:10}]}><View style={[s.barFill,{width:`${Math.min(100,r.usedPct)}%`,backgroundColor:r.risk==='HIGH'?C.red:C.primary}]}/></View>
     <Text style={[S.muted,{marginTop:8}]}>{money(r.spentMinor)} / {money(r.limitMinor)} · ay sonu ~{money(r.projectedMinor)} · aşma ehtimalı {Math.round(r.exceedProbability*100)}%</Text>
    </Box>
   ))}
   {(data.budgetSuggestions||[]).length>0&&(
    <Box>
     <Text style={S.h3}>Sənə uyğun limitlər</Text>
     {data.budgetSuggestions.map((x:Row)=>(
      <View key={x.category} style={s.suggestRow}>
       <View style={{flex:1}}>
        <Text style={s.catName}>{x.category}: {money(x.suggestedMinor)}</Text>
        <Text style={s.cardBody}>{x.basis}{x.currentMinor>0?` · hazırda ${money(x.currentMinor)}`:''}</Text>
       </View>
       <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void post('analytics/budgets/apply',{categories:[x.category]});}} style={s.apply}>
        <Text style={s.applyText}>Tətbiq et</Text>
       </Pressable>
      </View>
     ))}
     <View style={{marginTop:12}}><Button title="Hamısını tətbiq et" icon="checkmark-done-outline" disabled={busy} onPress={()=>{void post('analytics/budgets/apply',{categories:[]});}}/></View>
    </Box>
   )}

   {(b.topMerchants||[]).length>0&&(
    <>
     <Text style={s.section}>Ən çox xərclədiyin yerlər</Text>
     <Box style={{paddingVertical:4}}>
      {b.topMerchants.map((m:Row,i:number)=>(
       <View key={m.merchant} style={[s.recRow,i===b.topMerchants.length-1&&{borderBottomWidth:0}]}>
        <View style={{flex:1}}><Text style={s.catName}>{m.merchant}</Text><Text style={s.cardBody}>{m.count} ödəniş</Text></View>
        <Text style={s.catAmount}>{money(m.amountMinor)}</Text>
       </View>
      ))}
     </Box>
    </>
   )}

   <Text style={s.section}>Həftənin günləri (orta xərc)</Text>
   <Box>
    <View style={s.columns}>
     {weekdays.map((v,i)=>(
      <View key={WEEKDAYS[i]} style={s.column}>
       <Text style={s.columnValue}>{v>0?Math.round(v/100):''}</Text>
       <View style={s.columnTrack}><View style={[s.columnFill,{height:`${Math.max(4,Math.round(v/maxDay*100))}%`}]}/></View>
       <Text style={s.columnLabel}>{WEEKDAYS[i]}</Text>
      </View>
     ))}
    </View>
   </Box>

   <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void post('analytics/consent',{enabled:false});}} style={{alignItems:'center',paddingVertical:18}}>
    <Text style={[S.link,{color:C.muted}]}>Xərc təhlilini söndür</Text>
   </Pressable>
  </>
 );
}

const s=StyleSheet.create({
 title:{fontSize:26,fontWeight:'700',color:C.ink,letterSpacing:-0.4,marginBottom:14},
 bigIcon:{width:64,height:64,borderRadius:20,backgroundColor:C.lav,alignItems:'center',justifyContent:'center'},
 hero:{backgroundColor:C.deep,borderRadius:22,padding:18,marginBottom:14},
 heroLabel:{color:'rgba(255,255,255,0.7)',fontSize:12},
 heroValue:{color:'#fff',fontSize:36,fontWeight:'800',letterSpacing:-1,marginTop:4},
 heroRange:{color:'rgba(255,255,255,0.75)',fontSize:12,marginTop:2,marginBottom:14},
 track:{height:8,borderRadius:4,backgroundColor:'rgba(255,255,255,0.18)',overflow:'hidden',marginBottom:8},
 fill:{height:8,borderRadius:4,backgroundColor:C.yellow},
 heroSmall:{color:'rgba(255,255,255,0.8)',fontSize:12},
 chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:14},
 chip:{backgroundColor:'rgba(255,255,255,0.14)',borderRadius:999,paddingHorizontal:12,paddingVertical:6},
 chipText:{color:'#fff',fontSize:11,fontWeight:'600'},
 card:{flexDirection:'row',gap:12,borderWidth:1,borderColor:'#ebe8f4',borderRadius:14,padding:14,marginBottom:10,backgroundColor:'#fff'},
 cardIcon:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
 cardTitle:{fontSize:14,fontWeight:'700',color:C.ink},
 cardBody:{fontSize:12,lineHeight:18,color:'#5d5a73',marginTop:3},
 section:{fontSize:15,fontWeight:'700',color:C.ink,marginTop:18,marginBottom:10},
 amountOut:{fontSize:14,fontWeight:'700',color:'#d04b4b'},
 catRow:{marginBottom:14},
 catName:{fontSize:13,fontWeight:'700',color:C.ink},
 catAmount:{fontSize:13,fontWeight:'700',color:C.ink},
 delta:{fontSize:11,fontWeight:'700'},
 barTrack:{height:8,borderRadius:4,backgroundColor:'#efecf8',overflow:'hidden',marginTop:6},
 barFill:{height:8,borderRadius:4,backgroundColor:C.primary},
 columns:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:6,height:150},
 column:{flex:1,alignItems:'center',height:'100%',justifyContent:'flex-end'},
 columnValue:{fontSize:10,color:'#76738a',marginBottom:4},
 columnTrack:{width:'70%',flex:1,justifyContent:'flex-end'},
 columnFill:{width:'100%',borderTopLeftRadius:6,borderTopRightRadius:6,backgroundColor:C.primary},
 columnLabel:{fontSize:10,color:'#76738a',marginTop:6},
 recRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#f0eef6'},
 suggestRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#f0eef6'},
 apply:{backgroundColor:C.lav,borderRadius:10,paddingHorizontal:12,paddingVertical:8},
 applyText:{color:C.primary,fontSize:12,fontWeight:'700'}
});
