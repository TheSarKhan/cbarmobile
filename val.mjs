import {scene} from './rec.mjs';
await scene('val',{w:390,h:844,user:false},async a=>{
  const p=a.p,btn=n=>p.getByRole('button',{name:n,exact:true});
  try{
  await p.goto('http://localhost:8084',{waitUntil:'networkidle'});await a.wait(1500);
  await p.getByLabel('Telefon nömrəsi').click();await p.keyboard.type('507771211');await btn('Davam et').click();await a.wait(1800);
  const code=(await p.getByText(/^\d{6}$/).last().textContent()).trim();
  await p.getByLabel('SMS kodu').click();await p.keyboard.type(code);await btn('Davam et').click();await a.wait(1500);
  await p.getByLabel('FİN kod').click();await p.keyboard.type('7K3-M9');await a.wait(400);await a.shot('v-fin.png');
  await p.getByLabel('ŞV seriyası').click();await p.keyboard.type('AZE1234');await p.keyboard.press('Tab');await a.wait(300);await a.shot('v-series.png');
  await p.getByLabel('FİN kod').fill('7K3M9QA');await p.getByLabel('ŞV seriyası').fill('AZE12345678');await btn('Davam et').click();await a.wait(1200);
  await p.getByLabel('Ad',{exact:true}).click();await p.keyboard.type('Nigar2');await a.wait(400);
  await p.getByLabel('Soyad',{exact:true}).click();await p.keyboard.type('H.');await a.wait(400);await a.shot('v-name.png');
  }catch(e){console.log('FAIL',String(e).slice(0,200));await a.shot('v-fail.png');}
});
