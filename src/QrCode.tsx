import React from 'react';
import {View,StyleSheet} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {toQR} from 'toqr';
import {Text} from './text';
import {C,Icon} from './ui';

const QR_INK='#2a0a8a';

/**
 * Branded QR: deep-purple rounded modules, brand-coloured finder eyes and the Kampus cap in the middle.
 * The centre is left empty and the error correction is the highest level, so the logo never hurts scanning.
 */
export function QrCode({value,size=208,caption='Kampus · Balans artımı'}:{value:string;size?:number;caption?:string}){
 const modules=toQR(value,2);
 const n=Math.round(Math.sqrt(modules.length));
 const cell=size/n;
 const logo=Math.round(n*0.22)|1,from=Math.floor((n-logo)/2);
 const inFinder=(x:number,y:number)=>(x<7&&y<7)||(x>=n-7&&y<7)||(x<7&&y>=n-7);
 const inLogo=(x:number,y:number)=>x>=from-1&&x<=from+logo&&y>=from-1&&y<=from+logo;
 const dots:React.ReactNode[]=[];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  if(!modules[y*n+x]||inFinder(x,y)||inLogo(x,y))continue;
  dots.push(<View key={y*n+x} style={{position:'absolute',left:x*cell,top:y*cell,width:cell+0.4,height:cell+0.4,borderRadius:cell*0.38,backgroundColor:QR_INK}}/>);
 }
 const eye=(x:number,y:number)=>(
  <View key={x+'-'+y} style={{position:'absolute',left:x*cell,top:y*cell,width:cell*7,height:cell*7}}>
   <View style={{position:'absolute',width:cell*7,height:cell*7,borderRadius:cell*2.2,borderWidth:cell,borderColor:C.primary}}/>
   <View style={{position:'absolute',left:cell*2,top:cell*2,width:cell*3,height:cell*3,borderRadius:cell*1.1,backgroundColor:QR_INK}}/>
  </View>
 );
 const badge=logo*cell;
 return (
  <View accessibilityLabel={caption+' QR kodu'} style={st.qrOuter}>
   <LinearGradient colors={['#120a33','#2a0a8a']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}/>
   <View style={st.qrPanel}>
    <View style={{width:size,height:size}}>
     {dots}
     {eye(0,0)}{eye(n-7,0)}{eye(0,n-7)}
     <View style={{position:'absolute',left:(size-badge)/2,top:(size-badge)/2,width:badge,height:badge,borderRadius:badge*0.28,backgroundColor:C.lime,borderWidth:Math.max(2,badge*0.07),borderColor:'white',alignItems:'center',justifyContent:'center'}}>
      <Icon name="school" size={badge*0.58} color={QR_INK}/>
     </View>
    </View>
   </View>
   <Text style={st.qrCaption}>{caption}</Text>
  </View>
 );
}

const st=StyleSheet.create({
 qrOuter:{alignItems:'center',padding:14,paddingBottom:12,borderRadius:28,overflow:'hidden'},
 qrPanel:{backgroundColor:'white',borderRadius:20,padding:14},
 qrCaption:{color:'white',fontSize:12,fontWeight:'700',letterSpacing:0.4,marginTop:12}
});
