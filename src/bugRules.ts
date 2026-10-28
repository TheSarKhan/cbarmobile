/** User-owned history only: seeded contacts and trusted recipients are not recent transfers. */
export function recentRecipients(data:any):{name:string;phone:string;avatar?:number|null;fin?:string}[]{
 const seen=new Set<string>();const out:{name:string;phone:string;avatar?:number|null;fin?:string}[]=[];
 const transfers=[...(data.transfers||[])].filter((t:any)=>!['CANCELLED','REJECTED','FAILED'].includes(t.status)).sort((a:any,b:any)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
 for(const t of transfers){
  if(!t.phone||t.phone===data.user?.phone||seen.has(t.phone))continue;
  const saved=(data.trustedBeneficiaries||[]).find((x:any)=>x.phone===t.phone);
  seen.add(t.phone);out.push({phone:t.phone,name:t.recipientName||saved?.nickname||saved?.maskedName||t.phone,avatar:t.avatar??saved?.avatar,...(t.fin?{fin:t.fin}:{})});
 }
 return out.slice(0,8);
}
export const ID_PREFIXES=['AA','AZE','AB','MY','DY','MYI','DYI'] as const;
export const ID_SERIES=/^(AZE[0-9]{8}|(AA|AB|MY|DY|MYI|DYI)[0-9]{7})$/;
export const MAX_NAME_LENGTH=50;
export const seriesPrefix=(value:string)=>ID_PREFIXES.filter(p=>value.startsWith(p)).sort((a,b)=>b.length-a.length)[0]||'';
export function transferAmountError(amount:number,available:number){
 return amount>available?'Məbləğ mövcud balansdan artıqdır.':amount>100000?'Bir köçürmədə maksimum 1 000 ₼ göndərə bilərsən.':'';
}

export const BAD_NAME_CHARS=/[^\p{Script=Latin} '-]/u;

/** Keep the known name/avatar visible while recipient lookup is in flight. */
export function initialRecipient(data:any,phone:string):{name:string;phone:string;avatar?:number|null}{
 const recent=recentRecipients(data).find(person=>person.phone===phone);
 if(recent)return recent;
 const saved=(data.trustedBeneficiaries||[]).find((person:any)=>person.phone===phone);
 return saved?{name:saved.nickname||saved.maskedName||'Alıcı',phone,avatar:saved.avatar}:{name:'Alıcı',phone,avatar:-1};
}
