import React,{useState} from 'react';
import {View,Pressable,StyleSheet} from 'react-native';
import {Text} from './text';
import {C,S,Avatar,Button,Icon,useApp} from './ui';
import type {Row} from './api';

/** Kampus friends: made by scanning each other's static QR, they show up in transfers. */
export function FriendsSection({close}:{close:()=>void}){
 const a=useApp();
 const [open,setOpen]=useState('');
 const friends:Row[]=a.data.friends||[];

 async function remove(f:Row){
  a.setError('');
  try{await a.act('friends/'+f.id+'/remove',{});setOpen('');}catch(e){a.setError((e as Error).message);}
 }

 return (
  <>
   <View style={{flexDirection:'row',gap:10,marginBottom:18}}>
    <Pressable accessibilityRole="button" onPress={()=>a.open('my-qr')} style={st.tile}>
     <View style={st.tileIcon}><Icon name="qr-code-outline" size={22} color="white"/></View>
     <Text style={st.tileTitle}>Mənim QR</Text>
     <Text style={st.tileSub}>Dostun oxutsun</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={()=>{close();a.goTo('QR');}} style={st.tile}>
     <View style={st.tileIcon}><Icon name="scan-outline" size={22} color="white"/></View>
     <Text style={st.tileTitle}>Dost əlavə et</Text>
     <Text style={st.tileSub}>Dostun QR-ını oxut</Text>
    </Pressable>
   </View>

   <Text style={st.section}>DOSTLAR · {friends.length}</Text>
   {!friends.length&&<Text style={[S.muted,{lineHeight:20}]}>Hələ dostun yoxdur. Dostun “Mənim QR” ekranını açsın, sən “Dost əlavə et” ilə oxut. İkiniz də bir-birinin siyahısında görünürsünüz.</Text>}
   {friends.map(f=>(
    <View key={f.id} style={st.card}>
     <Pressable accessibilityRole="button" accessibilityLabel={f.name} onPress={()=>setOpen(open===f.id?'':f.id)} style={st.row}>
      <Avatar name={f.name} avatar={f.avatar} size={48}/>
      <View style={{flex:1}}>
       <Text style={st.name}>{f.name}</Text>
       <Text style={st.phone}>{f.phone}</Text>
      </View>
      <View style={st.badge}><Text style={st.badgeText}>DOST</Text></View>
     </Pressable>
     {open===f.id&&(
      <View style={{paddingTop:10}}>
       <Button title="Pul göndər" icon="arrow-up" onPress={()=>a.open('send:'+f.phone)}/>
       <Button title="Dostluqdan çıxar" danger onPress={()=>{void remove(f);}}/>
      </View>
     )}
    </View>
   ))}
  </>
 );
}

const st=StyleSheet.create({
 tile:{flex:1,backgroundColor:'#f4f3f7',borderRadius:20,padding:16,gap:4},
 tileIcon:{width:44,height:44,borderRadius:14,backgroundColor:C.primary,alignItems:'center',justifyContent:'center',marginBottom:6},
 tileTitle:{fontSize:15,fontWeight:'800',color:C.ink},
 tileSub:{fontSize:12,color:C.muted},
 section:{fontSize:12,fontWeight:'700',color:C.muted,letterSpacing:0.4,marginBottom:10},
 card:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:18,padding:12,marginBottom:10},
 row:{flexDirection:'row',alignItems:'center',gap:12},
 name:{fontSize:15,fontWeight:'700',color:C.ink},
 phone:{fontSize:12,color:C.muted,marginTop:2},
 badge:{backgroundColor:'#ede9f8',borderRadius:8,paddingHorizontal:8,paddingVertical:4},
 badgeText:{fontSize:10,fontWeight:'800',color:C.primary}
});
