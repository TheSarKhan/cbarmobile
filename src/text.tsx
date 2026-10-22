import React from 'react';
import {StyleSheet,Text as RNText,TextInput as RNTextInput} from 'react-native';
import type {TextInputProps,TextProps,TextStyle} from 'react-native';

/** One Plus Jakarta Sans file per weight: custom fonts do not follow fontWeight on every platform. */
export const FONT_FILES={
 400:'PlusJakartaSans_400Regular',
 500:'PlusJakartaSans_500Medium',
 600:'PlusJakartaSans_600SemiBold',
 700:'PlusJakartaSans_700Bold',
 800:'PlusJakartaSans_800ExtraBold'
} as const;

function face(style:TextProps['style']):TextStyle{
 const flat=StyleSheet.flatten(style)||{};
 const raw=String(flat.fontWeight||'400');
 const weight=raw==='bold'?700:raw==='normal'?400:Number(raw)||400;
 const key=weight>=800?800:weight>=700?700:weight>=600?600:weight>=500?500:400;
 return {fontFamily:FONT_FILES[key],fontWeight:'normal'};
}

export function Text({style,...rest}:TextProps){
 return <RNText {...rest} style={[style,face(style)]}/>;
}

type InputHandle=React.ComponentRef<typeof RNTextInput>;
export const TextInput=React.forwardRef<InputHandle,TextInputProps>(function TextInput({style,...rest},ref){
 return <RNTextInput ref={ref} {...rest} style={[style,face(style)]}/>;
});
