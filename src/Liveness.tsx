import React,{useState} from 'react';
import {ActivityIndicator,Linking,Text,View} from 'react-native';
import {useCameraPermissions} from 'expo-camera';
import {WebView} from 'react-native-webview';
import type {WebViewMessageEvent} from 'react-native-webview';
import {livenessOrigin} from './api';
import {Button,C,Icon,S} from './ui';
import {livenessHtml} from './livenessHtml';
import type {LivenessProps} from './livenessTypes';

/**
 * Native builds run the same MediaPipe check as the web build inside a WebView.
 * The page is given an https base URL (a secure context, so the camera is allowed) and loads the model from
 * that origin's /mediapipe folder; the selfie comes back through postMessage.
 */
export default function Liveness({actions,onDone,onCancel}:LivenessProps){
 const [permission,askPermission]=useCameraPermissions();
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 const origin=livenessOrigin();

 function onMessage(event:WebViewMessageEvent){
  if(!event.nativeEvent.url.startsWith(origin))return;
  let message:any;
  try{message=JSON.parse(event.nativeEvent.data);}catch{return;}
  if(message.type==='cancel'){onCancel();return;}
  if(message.type==='error'){setError(String(message.message||'Kamera başladıla bilmədi.'));return;}
  if(message.type==='done'&&typeof message.selfie==='string'&&message.selfie.startsWith('data:image/jpeg;base64,')&&Array.isArray(message.actions)){
   onDone({selfie:message.selfie,actions:message.actions.map(String),mode:'MEDIAPIPE_WEB',facesCount:1});
  }
 }

 if(!permission)return <View style={{paddingVertical:40}}><ActivityIndicator color={C.ink}/></View>;

 if(!permission.granted){
  return (
   <View style={{alignItems:'center',paddingVertical:12}}>
    <Icon name="camera-outline" size={34} color={C.muted}/>
    <Text style={[S.h3,{marginTop:10,textAlign:'center'}]}>Kameraya icazə lazımdır</Text>
    <Text style={[S.muted,{marginTop:6,textAlign:'center'}]}>Üzünü təsdiqləmək üçün Kampus kameradan istifadə etməlidir. Şəkil yalnız hesabını yoxlamaq üçün şifrələnmiş saxlanılır.</Text>
    <View style={{alignSelf:'stretch',marginTop:14,gap:8}}>
     {permission.canAskAgain
      ?<Button title="Kameraya icazə ver" icon="camera-outline" onPress={()=>{void askPermission();}}/>
      :<Button title="Ayarları aç" icon="settings-outline" onPress={()=>{void Linking.openSettings();}}/>}
     <Button title="Geri qayıt" secondary onPress={onCancel}/>
    </View>
   </View>
  );
 }

 return (
  <View>
   <View style={{height:580,borderRadius:22,overflow:'hidden',backgroundColor:'#091d1b'}}>
    <WebView
     key={attempt}
     source={{html:livenessHtml(origin,actions),baseUrl:origin}}
     originWhitelist={['https://*','about:*']}
     javaScriptEnabled
     allowsInlineMediaPlayback
     mediaPlaybackRequiresUserAction={false}
     mediaCapturePermissionGrantType="grant"
     onMessage={onMessage}
     onError={()=>setError('Yoxlama səhifəsi yüklənmədi. İnternet bağlantısını yoxlayın.')}
     style={{backgroundColor:'#091d1b'}}
    />
   </View>
   {!!error&&(
    <View style={{marginTop:12}}>
     <View style={S.error}><Text style={S.errorText}>{error}</Text></View>
     <Button title="Yenidən cəhd et" onPress={()=>{setError('');setAttempt(a=>a+1);}}/>
    </View>
   )}
  </View>
 );
}
