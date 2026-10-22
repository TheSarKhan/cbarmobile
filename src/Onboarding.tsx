import React,{useState} from 'react';
import {Image,Platform,Pressable,StyleSheet,View} from 'react-native';
import {Text} from './text';
import {SafeAreaView} from 'react-native-safe-area-context';
import {C} from './ui';

const SLIDES=[
 {
  key:'wallet',
  image:require('../assets/cards/onboarding-wallet-qr.png'),
  title:'Tələbələr üçün\nrəqəmsal cüzdan',
  desc:'0% komissiya ilə dərhal P2P köçürmələr və təmassız QR ödənişləri.'
 },
 {
  key:'cards',
  image:require('../assets/cards/onboarding-virtual-shield.png'),
  title:'Bütün bankların\nkartları bir yerdə',
  desc:'Digər bankların kartlarını bankın tətbiqində icazə verərək bağla, xərclərini izlə və kartlarından ödəniş et.'
 },
 {
  key:'split',
  image:require('../assets/cards/onboarding-split-bnpl.png'),
  title:'Hesabı böl və\nSonra ödə',
  desc:'Hesabı dostlarla dərhal bölüşdür və faizsiz Sonra ödə imkanından faydalan.'
 }
];

export default function Onboarding({onFinish}:{onFinish:()=>void}){
 const [index,setIndex]=useState(0);
 const slide=SLIDES[index];
 const last=index===SLIDES.length-1;
 return (
  <View style={s.screen}>
   <SafeAreaView edges={['top']} style={s.topBar}>
    <Text style={s.wordmark}>kampus<Text style={{color:C.lime}}>.</Text></Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Tanışlığı ötür" onPress={onFinish} style={s.skip}>
     <Text style={s.skipText}>Ötür</Text>
    </Pressable>
   </SafeAreaView>

   <View style={s.heroWrap}>
    <Image source={slide.image} style={s.hero} resizeMode="contain"/>
   </View>

   <View style={s.bottom}>
    <Text style={s.title}>{slide.title}</Text>
    <Text style={s.desc}>{slide.desc}</Text>
    <View style={s.dots}>
     {SLIDES.map((item,i)=>(
      <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Slayd ${i+1}`} onPress={()=>setIndex(i)} style={[s.dot,index===i&&s.dotActive]}/>
     ))}
    </View>
    <Pressable accessibilityRole="button" onPress={()=>last?onFinish():setIndex(index+1)} style={s.primary}>
     <Text style={s.primaryText}>{last?'Başla':'İrəli'}</Text>
    </Pressable>
   </View>
  </View>
 );
}

const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#120a33',justifyContent:'space-between',overflow:'hidden'},
 topBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:24,paddingTop:Platform.OS==='web'?20:12,zIndex:10},
 wordmark:{fontSize:26,fontWeight:'800',color:'#FFFFFF',letterSpacing:-0.8},
 skip:{backgroundColor:'rgba(255,255,255,0.14)',paddingHorizontal:18,paddingVertical:8,borderRadius:999,borderWidth:1,borderColor:'rgba(255,255,255,0.22)'},
 skipText:{fontSize:13,fontWeight:'700',color:'#FFFFFF'},
 heroWrap:{flex:1,justifyContent:'center',alignItems:'center',paddingHorizontal:16},
 hero:{width:330,height:330,maxWidth:'100%',maxHeight:'90%'},
 bottom:{paddingHorizontal:24,paddingBottom:Platform.OS==='web'?28:38},
 title:{fontSize:28,fontWeight:'900',color:'#FFFFFF',letterSpacing:-0.8,lineHeight:34,marginBottom:8},
 desc:{fontSize:14,color:'rgba(255,255,255,0.8)',lineHeight:20,marginBottom:20},
 dots:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:22},
 dot:{width:8,height:8,borderRadius:4,backgroundColor:'rgba(255,255,255,0.3)'},
 dotActive:{width:30,borderRadius:4,backgroundColor:C.lime},
 primary:{minHeight:52,backgroundColor:C.lime,borderRadius:16,alignItems:'center',justifyContent:'center'},
 primaryText:{color:'#120a33',fontSize:15,fontWeight:'800'}
});
