import React from 'react';
import {View,StyleSheet,TextInput} from 'react-native';
import {Text} from './text';
import {C} from './ui';

export const luhn=(n:string)=>{
 let sum=0,dbl=false;
 for(let i=n.length-1;i>=0;i--){let d=Number(n[i]);if(dbl){d*=2;if(d>9)d-=9;}sum+=d;dbl=!dbl;}
 return sum%10===0;
};
export const groupCard=(raw:string)=>raw.replace(/\D/g,'').slice(0,16).replace(/(\d{4})(?=\d)/g,'$1 ');

/** Keeps what can be a money amount: digits, one separator (shown as a dot) and two decimals. */
export const cleanAmount=(raw:string)=>{
 const v=raw.replace(',','.').replace(/[^\d.]/g,'');
 const [whole,...rest]=v.split('.');
 return rest.length?whole.slice(0,5)+'.'+rest.join('').slice(0,2):whole.slice(0,5);
};

/** Small card mark for the lists: brand colour with the network name. */
export function MiniCard({brand}:{brand?:string}){
 const mc=/master/i.test(brand||'');
 return (
  <View style={[st.mini,{backgroundColor:mc?'#e03a3e':'#2a0a8a'}]}>
   <Text style={{color:'white',fontSize:10,fontWeight:'800',fontStyle:'italic'}}>{mc?'MC':'VISA'}</Text>
  </View>
 );
}

/** The big centred amount of the top-up and card-transfer screens, typed on the system number pad. */
export function BigAmount({value,onChange,hint}:{value:string;onChange:(v:string)=>void;hint:string}){
 return (
  <View style={st.wrap}>
   <View style={st.line}>
    <TextInput
     accessibilityLabel="Məbləğ"
     value={value}
     onChangeText={t=>onChange(cleanAmount(t))}
     placeholder="0"
     placeholderTextColor="#c9c4dc"
     keyboardType="decimal-pad"
     autoFocus
     style={[st.input,{width:Math.max(1,value.length||1)*34+8}]}
    />
    <Text style={st.unit}>₼</Text>
   </View>
   <Text style={st.hint}>{hint}</Text>
  </View>
 );
}

const st=StyleSheet.create({
 mini:{width:64,height:44,borderRadius:9,alignItems:'center',justifyContent:'center'},
 wrap:{alignItems:'center',paddingTop:36,paddingBottom:44},
 line:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
 input:{fontSize:56,fontWeight:'800',color:C.ink,textAlign:'center',padding:0,minWidth:40,outlineStyle:'none' as any},
 unit:{fontSize:40,fontWeight:'800',color:C.muted},
 hint:{fontSize:13,color:C.muted,marginTop:8,textAlign:'center'}
});
