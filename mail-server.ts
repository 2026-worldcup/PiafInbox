import { ImapFlow } from 'npm:imapflow@2.9.1';
import { simpleParser } from 'npm:mailparser@3.12.4';
import nodemailer from 'npm:nodemailer@10.2.1';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const env=(k:string)=>Deno.env.get(k)||'';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const out=(value:unknown,status=200)=>Response.json(value,{status,headers:cors});
function account(name:string|null){
 if(!['yahoo','versailles'].includes(name||''))throw Error('Invalid account'); const p=name!.toUpperCase();
 const user=env(p+'_USER'),pass=env(p+'_PASSWORD'),address=env(p+'_ADDRESS');if(!user||!pass||!address)throw Error('Missing credentials');
 const port=Number(env(p+'_SMTP_PORT')||465);if(![465,587].includes(port))throw Error('Invalid port');
 return {user,pass,address,imap:name==='yahoo'?'imap.mail.yahoo.com':'messagerie.ac-versailles.fr',smtp:name==='yahoo'?'smtp.mail.yahoo.com':'messagerie.ac-versailles.fr',port};
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 try{
  const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1], owner=env('OWNER_USER_ID');
  if(!owner)return out({error:'Configuration privée incomplète.'},503);
  if(!token)return out({error:'Connexion requise.'},401);
  const auth=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await auth.auth.getUser(token);if(error||data.user?.id!==owner)return out({error:'Accès refusé.'},403);
  const u=new URL(req.url), a=account(u.searchParams.get('account'));
  const client=new ImapFlow({host:a.imap,port:993,secure:true,auth:{user:a.user,pass:a.pass},logger:false,connectionTimeout:10000,socketTimeout:20000});
  await client.connect();
  try{
   const folders=await client.list();
   if(u.searchParams.get('action')==='folders'&&req.method==='GET')return out({folders:folders.filter(f=>!f.flags?.has('\\Noselect')).map(f=>({path:f.path,name:f.name,specialUse:f.specialUse||''}))});
   if(req.method==='POST'){
    if(Number(req.headers.get('content-length')||0)>6500000)return out({error:'Pièces jointes trop volumineuses.'},413);
    const b=await req.json();if(typeof b.to!=='string'||typeof b.subject!=='string'||typeof b.text!=='string'||!b.to||b.to.length>1000||b.subject.length>500||b.text.length>100000||/[\r\n]/.test(b.to+b.subject)||!Array.isArray(b.attachments)||b.attachments.length>10)return out({error:'Message invalide.'},400);
    const attachments=[];let bytes=0;for(const f of b.attachments){if(typeof f.name!=='string'||f.name.length>200||typeof f.base64!=='string'||f.base64.length>5500000)return out({error:'Pièce jointe invalide.'},400);const content=Buffer.from(f.base64,'base64');bytes+=content.length;if(bytes>4000000)return out({error:'Les pièces jointes dépassent 4 Mo.'},413);attachments.push({filename:f.name,content});}
    const message={from:a.address,to:b.to,subject:b.subject,text:b.text,attachments,...(typeof b.inReplyTo==='string'&&b.inReplyTo.length<1000&&!/[\r\n]/.test(b.inReplyTo)?{inReplyTo:b.inReplyTo,references:b.inReplyTo}:{})};
    const maker=nodemailer.createTransport({streamTransport:true,buffer:true,newline:'windows'});const prepared=await maker.sendMail(message);
    const smtp=nodemailer.createTransport({host:a.smtp,port:a.port,secure:a.port===465,requireTLS:a.port===587,auth:{user:a.user,pass:a.pass},connectionTimeout:10000,socketTimeout:20000});
    await smtp.sendMail({envelope:prepared.envelope,raw:prepared.message});
    let saved=false;const sent=folders.find(f=>f.specialUse==='\\Sent');if(sent){try{await client.append(sent.path,prepared.message,['\\Seen']);saved=true}catch{}}
    return out({ok:true,saved});
   }
   if(req.method!=='GET')return out({error:'Méthode non autorisée.'},405);
   const folder=u.searchParams.get('folder')||'INBOX';if(!folders.some(f=>f.path===folder&&!f.flags?.has('\\Noselect')))return out({error:'Dossier introuvable.'},404);
   const lock=await client.getMailboxLock(folder);
   try{
    const uid=u.searchParams.get('uid');
    if(uid){if(!/^\d+$/.test(uid))return out({error:'Message invalide.'},400);const msg=await client.fetchOne(uid,{source:true},{uid:true});if(!msg)return out({error:'Message introuvable.'},404);if(msg.source.length>12000000)return out({error:'Message trop volumineux.'},413);const parsed=await simpleParser(msg.source);const idx=u.searchParams.get('attachment');if(idx!==null){if(!/^\d+$/.test(idx)||!parsed.attachments[+idx])return out({error:'Pièce jointe introuvable.'},404);const f=parsed.attachments[+idx];if(f.content.length>8000000)return out({error:'Pièce jointe trop volumineuse.'},413);return new Response(f.content,{headers:{...cors,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="piece-jointe"`}})}
     return out({subject:parsed.subject||'(Sans objet)',from:parsed.from?.text||'',replyTo:parsed.replyTo?.value?.[0]?.address||parsed.from?.value?.[0]?.address||'',date:parsed.date,text:parsed.text||'Ce message ne contient pas de texte brut.',messageId:parsed.messageId||'',attachments:parsed.attachments.map((x,i)=>({name:x.filename||'Pièce jointe',index:i,size:x.size}))});}
    const total=client.mailbox?.exists||0;if(!total)return out({messages:[]});const messages=[];for await(const m of client.fetch(`${Math.max(1,total-49)}:${total}`,{uid:true,envelope:true,flags:true}))messages.push({uid:m.uid,subject:m.envelope?.subject||'(Sans objet)',from:m.envelope?.from?.map(x=>x.name||x.address).join(', ')||'',date:m.envelope?.date,unread:!m.flags?.has('\\Seen')});return out({messages:messages.reverse()});
   }finally{lock.release()}
  }finally{await client.logout().catch(()=>client.close())}
 }catch(e){console.error('Mail operation failed',e instanceof Error?e.name:'error');return out({error:'Opération impossible. Vérifiez les réglages du compte ou réessayez.'},502)}
});
