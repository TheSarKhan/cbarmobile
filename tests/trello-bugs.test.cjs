const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLivenessTracker}=require('../src/livenessTracker.ts');
const {recentRecipients,ID_PREFIXES,ID_SERIES,seriesPrefix,transferAmountError}=require('../src/bugRules.ts');
const neutral={ratio:.5,blink:.1,smile:.1};
function baseline(t,start=0){for(let n=start;n<=start+250;n+=50)t.sample(neutral,n);}
test('a fresh wallet has no made-up recent transfers',()=>{
 assert.deepEqual(recentRecipients({user:{phone:'+1'},trustedBeneficiaries:[{phone:'+2',nickname:'Friend'}]}),[]);
});
test('history is newest first, deduplicated, and excludes cancelled attempts',()=>{
 const rows=[{phone:'+2',recipientName:'A',createdAt:'2026-10-01',status:'COMPLETED'},{phone:'+3',recipientName:'B',createdAt:'2026-10-02',status:'CANCELLED'},{phone:'+2',recipientName:'A new',createdAt:'2026-10-03',status:'COMPLETED'}];
 assert.deepEqual(recentRecipients({transfers:rows}).map(x=>x.name),['A new']);
});
test('all supported identity prefixes are selectable and validated consistently',()=>{
 for(const prefix of ID_PREFIXES){const value=prefix+(prefix==='AZE'?'12345678':'1234567');assert.ok(ID_SERIES.test(value));assert.equal(seriesPrefix(value),prefix);}
 assert.ok(!ID_SERIES.test('AA123'));
});
test('overspending and transfer caps are identified before any API call',()=>{
 assert.ok(transferAmountError(501,500));assert.equal(transferAmountError(500,500),'');assert.ok(transferAmountError(100001,200000));
});
test('no challenge, unsupported actions, and a static turned face never produce a photo',()=>{
 assert.throws(()=>createLivenessTracker([]));assert.throws(()=>createLivenessTracker(['OTHER']));
 const t=createLivenessTracker(['TURN_LEFT']);for(let n=0;n<15000;n+=50){const r=t.sample({ratio:.8,blink:.1,smile:.1},n);assert.equal(r.index,0);assert.equal(r.ready,false);}
});
test('a natural one-frame closed blink counts only after reopening',()=>{
 const t=createLivenessTracker(['BLINK']);baseline(t);
 assert.equal(t.sample({...neutral,blink:.6},300).index,0);
 assert.equal(t.sample(neutral,350).index,1);
 assert.equal(t.sample(neutral,400).ready,false);
 assert.equal(t.sample(neutral,950).ready,true);
});
test('closed eyes at startup, a wink-length spike, and missing faces do not pass',()=>{
 const t=createLivenessTracker(['BLINK']);for(let n=0;n<500;n+=50)assert.equal(t.sample({...neutral,blink:.9},n).index,0);
 baseline(t,500);t.sample({...neutral,blink:.8},800);assert.equal(t.sample(neutral,810).index,0);
 assert.equal(t.sample(neutral,860).index,0);t.sample(null,900);assert.equal(t.sample(neutral,1000).index,0);
});
test('head turn must start neutral, be sustained, then return before capture',()=>{
 const t=createLivenessTracker(['TURN_LEFT']);baseline(t);
 for(let n=300;n<=550;n+=50)assert.equal(t.sample({...neutral,ratio:.8},n).ready,false);
 for(let n=600;n<=850;n+=50)t.sample(neutral,n);
 assert.equal(t.sample(neutral,900).index,1);assert.equal(t.sample(neutral,1450).ready,true);
});
test('the native factory is generated at build time, is current, and runs without Hermes function source',()=>{
 const {LIVENESS_FACTORY_SOURCE}=require('../src/livenessTrackerSource.ts');
 assert.equal(LIVENESS_FACTORY_SOURCE,require('../scripts/build-liveness.js').buildSource());
 const make=require('node:vm').runInNewContext('('+LIVENESS_FACTORY_SOURCE+')');const t=make(['BLINK']);baseline(t);t.sample({...neutral,blink:.8},300);assert.equal(t.sample(neutral,350).index,1);
});

test('names accept Azerbaijani Latin letters and reject Cyrillic and other scripts',()=>{
 const {BAD_NAME_CHARS}=require('../src/bugRules.ts');
 for(const name of ['Əli','Çiçək','İlqar','Şəms','Ömər','O’Neil'.replace('’',"'"),'Anne-Marie','José'])assert.equal(BAD_NAME_CHARS.test(name),false);
 for(const name of ['Иван','Aли','محمد','李'])assert.equal(BAD_NAME_CHARS.test(name),true);
});
test('the native WebView contains valid standalone JS even without runtime function source',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
 const {LIVENESS_FACTORY_SOURCE}=require('../src/livenessTrackerSource.ts');
 const output=ts.transpileModule(fs.readFileSync(require.resolve('../src/livenessHtml.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
 const exported={};vm.runInNewContext(output,{exports:exported,require:()=>({LIVENESS_FACTORY_SOURCE})});
 const html=exported.livenessHtml('https://example.test',['TURN_LEFT','BLINK','SMILE']);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
 assert.doesNotThrow(()=>new vm.Script(script));assert.ok(script.includes(LIVENESS_FACTORY_SOURCE));
 assert.throws(()=>exported.livenessHtml('https://example.test',[]));
});
