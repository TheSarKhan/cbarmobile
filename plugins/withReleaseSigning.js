const {withAppBuildGradle}=require('expo/config-plugins');
module.exports=function withReleaseSigning(config){
 return withAppBuildGradle(config,c=>{
  let source=c.modResults.contents;
  if(!source.includes('// kampus-release-signing')){
   source=source.replace('    buildTypes {',`    // kampus-release-signing
    if (System.getenv('KAMPUS_KEYSTORE_FILE')) {
        signingConfigs {
            release {
                storeFile file(System.getenv('KAMPUS_KEYSTORE_FILE'))
                storePassword System.getenv('KAMPUS_KEYSTORE_PASSWORD')
                keyAlias 'kampus'
                keyPassword System.getenv('KAMPUS_KEYSTORE_PASSWORD')
            }
        }
    }
    buildTypes {`);
  }
  source=source.replaceAll("signingConfig System.getenv('KAMPUS_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug","signingConfig signingConfigs.debug");
  source=source.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs.debug/,"$1signingConfig System.getenv('KAMPUS_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug");
  c.modResults.contents=source;return c;
 });
};
