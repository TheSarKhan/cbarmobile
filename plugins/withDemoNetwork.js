const {withAndroidManifest}=require('expo/config-plugins');
module.exports=function withDemoNetwork(config){
 return withAndroidManifest(config, c=>{
  const app=c.modResults.manifest.application[0];
  app.$['android:usesCleartextTraffic']=process.env.KAMPUS_HTTPS_ONLY==='true'?'false':'true';
  app.$['android:allowBackup']='false';
  const remove=new Set(['android.permission.SYSTEM_ALERT_WINDOW','android.permission.READ_EXTERNAL_STORAGE','android.permission.WRITE_EXTERNAL_STORAGE']);
  c.modResults.manifest['uses-permission']=(c.modResults.manifest['uses-permission']||[]).filter(p=>!remove.has(p.$['android:name']));
  return c;
 });
};
