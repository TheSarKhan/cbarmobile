import React,{useRef,useState} from 'react';
import {Image,Platform,Pressable,ScrollView,StyleSheet,View,useWindowDimensions} from 'react-native';
import {Text} from './text';
import {SafeAreaView,useSafeAreaInsets} from 'react-native-safe-area-context';
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

/** Light, illustrated introduction: swipe between slides (or tap the dots / the button), skip at any time. */
export default function Onboarding({onFinish}:{onFinish:()=>void}){
 const {width}=useWindowDimensions();
 const insets=useSafeAreaInsets();
 const pager=useRef<React.ComponentRef<typeof ScrollView>>(null);
 const [index,setIndex]=useState(0);
 const [box,setBox]=useState({w:0,h:0});
 const last=index===SLIDES.length-1;
 const heroSize=Math.min((box.w||width)-32,360,Math.max(180,box.h-190));

 function go(next:number){
  if(next<0||next>=SLIDES.length)return;
  setIndex(next);
  pager.current?.scrollTo({x:next*box.w,animated:true});
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

   <View style={{flex:1}} onLayout={e=>setBox({w:e.nativeEvent.layout.width,h:e.nativeEvent.layout.height})}>
    {box.w>0&&(
     <ScrollView
      ref={pager}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      bounces={false}
      scrollEventThrottle={16}
      onScroll={e=>setIndex(Math.max(0,Math.min(SLIDES.length-1,Math.round(e.nativeEvent.contentOffset.x/box.w))))}
     >
      {SLIDES.map(slide=>(
       <View key={slide.key} style={{width:box.w,height:box.h}}>
        <View style={s.heroWrap}>
         <Image accessibilityRole="image" source={slide.image} style={{width:heroSize,height:heroSize}} resizeMode="contain"/>
        </View>
        <View style={s.text}>
         <Text style={s.title}>{slide.title}</Text>
         <Text style={s.desc}>{slide.desc}</Text>
        </View>
       </View>
      ))}
     </ScrollView>
    )}
   </View>

   <View style={[s.bottom,{paddingBottom:Math.max(insets.bottom,16)+12}]}>
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
 text:{paddingHorizontal:24},
 bottom:{paddingHorizontal:24},
 title:{fontSize:28,fontWeight:'800',color:C.ink,letterSpacing:-0.6,lineHeight:35,marginBottom:10},
 desc:{fontSize:15,color:'#5d5a73',lineHeight:22,marginBottom:18,minHeight:44},
 dots:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:22},
 dot:{width:8,height:8,borderRadius:4,backgroundColor:'rgba(86,50,192,0.22)'},
 dotActive:{width:30,borderRadius:4,backgroundColor:C.primary},
 primary:{minHeight:54,backgroundColor:C.yellow,borderRadius:14,alignItems:'center',justifyContent:'center'},
 primaryText:{color:C.yellowInk,fontSize:16,fontWeight:'800'}
});
