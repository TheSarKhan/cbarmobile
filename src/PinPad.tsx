import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {C,Icon} from './ui';

/** PIN dots above an on-screen number pad; the caller decides what happens when the last digit lands. */
export default function PinPad({value,length,onDigit,onDelete}:{value:string;length:number;onDigit:(d:string)=>void;onDelete:()=>void}){
 const rows=[['1','2','3'],['4','5','6'],['7','8','9']];
 return (
  <View>
   <View style={s.dots} accessibilityLabel={`PIN: ${value.length} / ${length}`}>
    {Array.from({length},(_,i)=><View key={i} style={[s.dot,i<value.length&&s.dotFilled]}/>)}
   </View>
   <View style={s.pad}>
    {rows.map(row=>(
     <View key={row.join('')} style={s.row}>
      {row.map(d=>(
       <Pressable key={d} accessibilityRole="button" accessibilityLabel={d} onPress={()=>onDigit(d)} style={({pressed})=>[s.key,pressed&&s.keyPressed]}>
        <Text style={s.keyText}>{d}</Text>
       </Pressable>
      ))}
     </View>
    ))}
    <View style={s.row}>
     <View style={s.spacer}/>
     <Pressable accessibilityRole="button" accessibilityLabel="0" onPress={()=>onDigit('0')} style={({pressed})=>[s.key,pressed&&s.keyPressed]}>
      <Text style={s.keyText}>0</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel="Sil" onPress={onDelete} style={s.spacer}>
      <Icon name="backspace" size={30} color="#8a8a8e"/>
     </Pressable>
    </View>
   </View>
  </View>
 );
}

const s=StyleSheet.create({
 dots:{flexDirection:'row',justifyContent:'center',gap:18,marginTop:26,marginBottom:34},
 dot:{width:22,height:22,borderRadius:11,borderWidth:1.5,borderColor:C.forest},
 dotFilled:{backgroundColor:C.forest},
 pad:{alignItems:'center',gap:14,paddingBottom:16},
 row:{flexDirection:'row',gap:22},
 key:{width:76,height:76,borderRadius:38,backgroundColor:'#ffffff',alignItems:'center',justifyContent:'center'},
 keyPressed:{backgroundColor:'#e9ecdf'},
 spacer:{width:76,height:76,alignItems:'center',justifyContent:'center'},
 keyText:{fontSize:34,fontWeight:'400',color:'#141414'}
});
