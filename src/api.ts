import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
export type Row = Record<string, any>;
export const DEFAULT_API = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' && typeof window !== 'undefined' && (!['localhost','127.0.0.1'].includes(window.location.hostname)||window.location.port!=='8082') ? window.location.origin+'/api/v1' : Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1');
export const storage = {
 async get(key:string) {return Platform.OS==='web' ? sessionStorage.getItem(key) : SecureStore.getItemAsync(key);},
 async set(key:string,value:string) {if(Platform.OS==='web')sessionStorage.setItem(key,value);else await SecureStore.setItemAsync(key,value);},
 async remove(key:string) {if(Platform.OS==='web')sessionStorage.removeItem(key);else await SecureStore.deleteItemAsync(key);}
};
/** Public address of the partner simulator's hosted pages: the gateway origin, or port 8081 when the API runs on 8080 locally. */
export function simPublicUrl(base:string){
 if(process.env.EXPO_PUBLIC_SIM_URL)return process.env.EXPO_PUBLIC_SIM_URL;
 const api=new URL(base);
 return api.port==='8080'?api.protocol+'//'+api.hostname+':8081':api.origin;
}
export const CONNECTION_ERROR_MESSAGE="Serverlə bağlantı qurulmadı. API ünvanını və Wi-Fi bağlantısını yoxlayın.";
export class ApiError extends Error {constructor(public code:string,message:string,public status:number){super(message);}}
export function request(base:string,token:string,device:string,path:string,body?:Row,proof?:string,key?:string){
 return (async()=>{const control=new AbortController();const timer=setTimeout(()=>control.abort(),15000);try{
 const res=await fetch(base.replace(/\/$/,'')+'/'+path,{method:body?'POST':'GET',signal:control.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Device-Id':device,'Idempotency-Key':key||Date.now()+'-'+Math.random().toString(36).slice(2),...(proof?{'X-SCA-Proof':proof}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await res.json();if(!res.ok)throw new ApiError(data.code||'ERROR',data.detail||'Əməliyyat alınmadı.',res.status);return data;
 }catch(e){if(e instanceof ApiError)throw e;throw new ApiError('CONNECTION_ERROR',CONNECTION_ERROR_MESSAGE,0);}finally{clearTimeout(timer);}})();
}
export function minor(value:string):number {if(!/^\d+(?:[.,]\d{1,2})?$/.test(value))throw new Error('Məbləği düzgün daxil edin. Məsələn: 15.50');const a=Math.round(Number(value.replace(',','.'))*100);if(!Number.isSafeInteger(a)||a<=0)throw new Error('Məbləğ sıfırdan böyük olmalıdır.');return a;}
export const money=(v=0)=>new Intl.NumberFormat('az-AZ',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v/100)+' ₼';

export async function hashPhones(phones:string[]):Promise<string[]> {return Promise.all(phones.map(phone=>Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,phone.trim())));}
