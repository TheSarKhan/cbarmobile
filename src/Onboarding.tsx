import React,{useState} from 'react';
import {Animated,Easing,Image,Platform,Pressable,StyleSheet,View,useWindowDimensions} from 'react-native';
import {Text} from './text';
import {SafeAreaView} from 'react-native-safe-area-context';
import {C} from './ui';

const SLIDES=[
 {
  key:'wallet',
  image:require('../assets/illustrations/onboarding-1.png'),
  title:'Tələbələr üçün\nrəqəmsal cüzdan',
  desc:'Dostlarına anında pul göndər, QR ilə ödə.'
 },
 {
  key:'banks',
  image:require('../assets/illustrations/onboarding-2.png'),
  title:'Bütün bankların\nkartları bir yerdə',
  desc:'Kartlarını bankın tətbiqində icazə verərək bağla, xərclərini izlə və onlardan ödə.'
 },
 {
  key:'safe',
  image:require('../assets/illustrations/onboarding-3.png'),
  title:'Təhlükəsiz\nvə sadə',
  desc:'PIN, üz yoxlaması və tokenlərlə qorunur. Kiçik ödənişlər tez, böyüklər daha etibarlı.'
 },
 {
  key:'budget',
  image:require('../assets/illustrations/onboarding-4.png'),
  title:'Xərcləri izlə,\nhesabı böl',
  desc:'Büdcəni izlə, hesabı dostlarla böl, 0% faizlə sonra ödə.'
 }
];

/** Light, illustrated introduction: tap through the slides or the dots, skip at any time. */
export default function Onboarding({onFinish}:{onFinish:()=>void}){
 const {width}=useWindowDimensions();
 const [index,setIndex]=useState(0);
 const [fade]=useState(()=>new Animated.Value(1));
 const slide=SLIDES[index];
 const last=index===SLIDES.length-1;
 const heroSize=Math.min(width-32,360);

 function go(next:number){
  if(next<0||next>=SLIDES.length||next===index)return;
  Animated.timing(fade,{toValue:0,duration:110,easing:Easing.out(Easing.quad),useNativeDriver:Platform.OS!=='web'}).start(()=>{
   setIndex(next);
   Animated.timing(fade,{toValue:1,duration:200,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'}).start();
  });
 }

 return (
  <View style={s.screen}>
   <Image source={require('../assets/illustrations/onboarding-bg.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover"/>
   <SafeAreaView edges={['top']} style={s.topBar}>
    <Text style={s.wordmark}>Kampus<Text style={{color:C.yellow}}>.</Text></Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Tanışlığı ötür" onPress={onFinish} style={s.skip}>
     <Text style={s.skipText}>Ötür</Text>
    </Pressable>
   </SafeAreaView>

   <Animated.View style={[s.heroWrap,{opacity:fade,transform:[{scale:fade.interpolate({inputRange:[0,1],outputRange:[0.94,1]})}]}]}>
    <Image accessibilityRole="image" source={slide.image} style={{width:heroSize,height:heroSize}} resizeMode="contain"/>
   </Animated.View>

   <View style={s.bottom}>
    <Animated.View style={{opacity:fade}}>
     <Text style={s.title}>{slide.title}</Text>
     <Text style={s.desc}>{slide.desc}</Text>
    </Animated.View>
    <View style={s.dots}>
     {SLIDES.map((item,i)=>(
      <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Slayd ${i+1}`} onPress={()=>go(i)} hitSlop={8} style={[s.dot,index===i&&s.dotActive]}/>
     ))}
    </View>
    <Pressable accessibilityRole="button" onPress={()=>last?onFinish():go(index+1)} style={({pressed})=>[s.primary,pressed&&{opacity:0.85}]}>
     <Text style={s.primaryText}>{last?'Başla':'Davam et'}</Text>
    </Pressable>
   </View>
  </View>
 );
}

const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#f6f3ff',justifyContent:'space-between',overflow:'hidden'},
 topBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:24,paddingTop:Platform.OS==='web'?20:12,zIndex:10},
 wordmark:{fontSize:26,fontWeight:'800',color:C.primary,letterSpacing:-0.8},
 skip:{backgroundColor:'rgba(86,50,192,0.10)',paddingHorizontal:18,paddingVertical:8,borderRadius:999},
 skipText:{fontSize:13,fontWeight:'700',color:C.primary},
 heroWrap:{flex:1,justifyContent:'center',alignItems:'center',paddingHorizontal:16},
 bottom:{paddingHorizontal:24,paddingBottom:Platform.OS==='web'?28:38},
 title:{fontSize:28,fontWeight:'800',color:C.ink,letterSpacing:-0.6,lineHeight:35,marginBottom:10},
 desc:{fontSize:15,color:'#5d5a73',lineHeight:22,marginBottom:22,minHeight:44},
 dots:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:22},
 dot:{width:8,height:8,borderRadius:4,backgroundColor:'rgba(86,50,192,0.22)'},
 dotActive:{width:30,borderRadius:4,backgroundColor:C.primary},
 primary:{minHeight:54,backgroundColor:C.yellow,borderRadius:14,alignItems:'center',justifyContent:'center'},
 primaryText:{color:C.yellowInk,fontSize:16,fontWeight:'800'}
});
