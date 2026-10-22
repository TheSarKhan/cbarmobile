import React,{useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {Text} from './text';
import {Button,C,Icon,S,Sheet} from './ui';

const MONTHS=['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
const ITEM=44;
const VISIBLE=5;

type Parts={year:number;month:number;day:number};

const pad=(n:number)=>String(n).padStart(2,'0');
const daysIn=(year:number,month:number)=>new Date(year,month,0).getDate();

/** `YYYY-MM-DD` (what the API stores) → parts, or null when empty or invalid. */
function parse(iso:string):Parts|null{
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
 if(!m)return null;
 const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]);
 return month>=1&&month<=12&&day>=1&&day<=daysIn(year,month)?{year,month,day}:null;
}

/** Shown to people as dd.mm.yyyy. */
export const displayDate=(iso:string)=>{const p=parse(iso);return p?`${pad(p.day)}.${pad(p.month)}.${p.year}`:'';};

export function isAdult(iso:string){
 const p=parse(iso);
 if(!p)return false;
 const now=new Date();
 const cutoff=new Date(now.getFullYear()-18,now.getMonth(),now.getDate());
 return new Date(p.year,p.month-1,p.day)<=cutoff;
}

function Wheel({items,selected,onSelect,label}:{items:{value:number;text:string}[];selected:number;onSelect:(v:number)=>void;label:string}){
 const scroll=useRef<{scrollTo:(o:{y:number;animated:boolean})=>void}|null>(null);
 const place=()=>{
  const index=Math.max(0,items.findIndex(i=>i.value===selected));
  scroll.current?.scrollTo({y:Math.max(0,index-Math.floor(VISIBLE/2))*ITEM,animated:false});
 };
 return (
  <View style={{flex:1}}>
   <Text style={s.wheelLabel}>{label}</Text>
   <ScrollView ref={node=>{scroll.current=node as unknown as {scrollTo:(o:{y:number;animated:boolean})=>void}|null;}} nestedScrollEnabled showsVerticalScrollIndicator={false} onLayout={place} style={s.wheel} accessibilityLabel={label}>
    {items.map(item=>{
     const active=item.value===selected;
     return (
      <Pressable key={item.value} accessibilityRole="button" onPress={()=>onSelect(item.value)} style={[s.item,active&&s.itemActive]}>
       <Text style={[s.itemText,active&&s.itemTextActive]}>{item.text}</Text>
      </Pressable>
     );
    })}
   </ScrollView>
  </View>
 );
}

export default function DatePickerField({label,value,onChange,placeholder='GG.AA.İİİİ'}:{label:string;value:string;onChange:(iso:string)=>void;placeholder?:string}){
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState<Parts>({year:0,month:1,day:1});

 const show=()=>{
  const now=new Date();
  setDraft(parse(value)||{year:now.getFullYear()-18,month:now.getMonth()+1,day:now.getDate()});
  setOpen(true);
 };
 const set=(patch:Partial<Parts>)=>setDraft(prev=>{
  const next={...prev,...patch};
  return {...next,day:Math.min(next.day,daysIn(next.year,next.month))};
 });

 const thisYear=new Date().getFullYear();
 const years=Array.from({length:101},(_,i)=>({value:thisYear-i,text:String(thisYear-i)}));
 const months=MONTHS.map((text,i)=>({value:i+1,text}));
 const days=Array.from({length:daysIn(draft.year||thisYear,draft.month)},(_,i)=>({value:i+1,text:pad(i+1)}));
 const shown=displayDate(value);

 return (
  <View style={{marginBottom:16}}>
   <Text style={S.label}>{label}</Text>
   <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={show} style={[S.input,s.field]}>
    <Text style={{fontSize:15,color:shown?C.ink:'#9a95a7'}}>{shown||placeholder}</Text>
    <Icon name="calendar-outline" size={20} color={C.muted}/>
   </Pressable>
   <Sheet title={label} visible={open} onClose={()=>setOpen(false)}>
    <View style={s.wheels}>
     <Wheel label="Gün" items={days} selected={draft.day} onSelect={day=>set({day})}/>
     <Wheel label="Ay" items={months} selected={draft.month} onSelect={month=>set({month})}/>
     <Wheel label="İl" items={years} selected={draft.year} onSelect={year=>set({year})}/>
    </View>
    <Text style={s.preview}>{pad(draft.day)}.{pad(draft.month)}.{draft.year}</Text>
    <Button title="Seç" icon="checkmark" onPress={()=>{onChange(`${draft.year}-${pad(draft.month)}-${pad(draft.day)}`);setOpen(false);}}/>
   </Sheet>
  </View>
 );
}

const s=StyleSheet.create({
 field:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 wheels:{flexDirection:'row',gap:10,marginTop:4},
 wheelLabel:{fontSize:11,fontWeight:'700',color:C.muted,textAlign:'center',marginBottom:6},
 wheel:{height:ITEM*VISIBLE,backgroundColor:'#ffffff',borderRadius:14},
 item:{height:ITEM,alignItems:'center',justifyContent:'center',borderRadius:12,marginHorizontal:4},
 itemActive:{backgroundColor:C.lime},
 itemText:{fontSize:16,color:C.muted},
 itemTextActive:{color:C.ink,fontWeight:'800'},
 preview:{textAlign:'center',fontSize:22,fontWeight:'800',color:C.ink,marginVertical:14,letterSpacing:1}
});
