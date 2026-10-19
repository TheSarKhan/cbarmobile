import React from 'react';
import {Text,View} from 'react-native';
import {Button,C,Icon,S} from './ui';
import type {LivenessProps} from './livenessTypes';

/** Native build: face detection needs react-native-vision-camera + ML Kit, which is not part of this app yet. */
export default function Liveness({onCancel}:LivenessProps){
 return (
  <View style={{alignItems:'center',paddingVertical:12}}>
   <Icon name="camera-outline" size={34} color={C.muted}/>
   <Text style={[S.h3,{marginTop:10,textAlign:'center'}]}>Bu cihazda kamera yoxlaması hələ yoxdur</Text>
   <Text style={[S.muted,{marginTop:6,textAlign:'center'}]}>
    Üzün və canlılığın avtomatik yoxlanması hələlik yalnız brauzer versiyasında işləyir. Hesabı brauzerdən açın, sonra telefonda daxil olun.
   </Text>
   <View style={{alignSelf:'stretch',marginTop:12}}>
    <Button title="Geri qayıt" secondary onPress={onCancel}/>
   </View>
  </View>
 );
}
