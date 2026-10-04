(function(){
'use strict';
const BANK=window.GRA_EXERCISE_BANK||{};
const qs=s=>document.querySelector(s), qsa=s=>[...document.querySelectorAll(s)];
let blobUrl='', lastFocus=null, active={};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function yearKey(){const v=qs('#somAnoEscolar')?.value||'';return v.startsWith('2')?'2':v.startsWith('4')?'4':v.startsWith('8')?'8':''}
function compKey(){return qs('#somComponente')?.value==='MT'?'MT':'LP'}
function compLabel(c){return c==='MT'?'Matemática':'Língua Portuguesa'}
function levelLabel(k){return k==='0'?'Nível Abaixo de 1':'Nível '+k}
function itemsFor(level){return (BANK[`${yearKey()}|${compKey()}|${level}`]||[]).slice()}
function relatedSkills(item){return (Array.isArray(item?.saeb_skills)&&item.saeb_skills.length?item.saeb_skills:item?.skills||[]).filter(Boolean)}
function ensureModal(){
  if(qs('#graExGenBackdrop'))return;
  document.body.insertAdjacentHTML('beforeend',`<div class="gra-exgen-backdrop" id="graExGenBackdrop" data-gra-no-school-nav="1" aria-hidden="true"><section class="gra-exgen-modal" role="dialog" aria-modal="true" aria-labelledby="graExGenTitle"><header class="gra-exgen-head"><div><small>Simulado 2026 · atividades por habilidades</small><h3 id="graExGenTitle">Gerar exercícios</h3><p id="graExGenMeta"></p></div><button class="gra-exgen-close" id="graExGenClose" type="button" aria-label="Fechar">×</button></header><div class="gra-exgen-body" id="graExGenBody"></div></section></div>`);
  qs('#graExGenClose').addEventListener('click',closeModal);
  qs('#graExGenBackdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()});
}
function closeModal(){
  const b=qs('#graExGenBackdrop');if(!b)return;
  b.classList.remove('open');b.setAttribute('aria-hidden','true');document.body.classList.remove('gra-exgen-open');
  setTimeout(()=>lastFocus?.focus?.({preventScroll:true}),30);
}
function dedupeSkillRows(items){
  const m=new Map();items.forEach(it=>relatedSkills(it).forEach(s=>{const cur=m.get(s);if(!cur||cur==='Parcial'&&it.compatibility==='Alta')m.set(s,it.compatibility)}));
  return [...m.entries()].map(([skill,compatibility])=>({skill,compatibility}));
}
function openModal(level){
  ensureModal();lastFocus=document.activeElement;const items=itemsFor(level);const y=yearKey(),c=compKey();active={level,y,c,items};
  qs('#graExGenTitle').textContent=`Gerar exercícios - ${levelLabel(level)}`;qs('#graExGenMeta').textContent=`${y}º ano · ${compLabel(c)}`;
  const hi=items.filter(x=>x.compatibility==='Alta').length,pa=items.filter(x=>x.compatibility==='Parcial').length,total=items.length;
  const body=qs('#graExGenBody');
  if(!total){
    body.innerHTML=`<div class="gra-exgen-empty"><b>Nenhum exercício disponível.</b><br>Não há item cadastrado com compatibilidade Alta ou Parcial para este nível nos materiais já analisados.</div><div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Fechar</button></div>`;
  }else{
    const skills=dedupeSkillRows(items).map(x=>`<div class="gra-exgen-skill"><span class="gra-exgen-badge ${x.compatibility==='Alta'?'high':'partial'}">${esc(x.compatibility)}</span><span>${esc(x.skill)}</span></div>`).join('');
    const half=Math.max(1,Math.ceil(total/2)),opts=[];
    opts.push({n:total,label:`Gerar ${total} exercício${total===1?'':'s'}`});
    if(half!==total&&half!==1)opts.push({n:half,label:`Gerar ${half} exercícios`});
    if(total>1)opts.push({n:1,label:'Gerar 1 exercício'});
    body.innerHTML=`<div class="gra-exgen-stats"><div class="gra-exgen-stat high"><b>${hi}</b><span>Compatibilidade alta</span></div><div class="gra-exgen-stat partial"><b>${pa}</b><span>Compatibilidade parcial</span></div><div class="gra-exgen-stat"><b>${total}</b><span>Total disponível</span></div></div><div class="gra-exgen-section-title">Habilidades SAEB relacionadas aos exercícios disponíveis</div><div class="gra-exgen-skills">${skills}</div><div class="gra-exgen-section-title">Quantidade a gerar</div><div class="gra-exgen-options">${opts.map((o,i)=>`<label class="gra-exgen-option"><input type="radio" name="graExGenQty" value="${o.n}" ${i===0?'checked':''}><span>${esc(o.label)}</span></label>`).join('')}</div><p class="gra-exgen-note">Quando uma quantidade menor é escolhida, os itens de compatibilidade Alta são priorizados. No PDF, cada exercício informa a fonte, a compatibilidade e a habilidade SAEB exata à qual foi relacionado.</p><div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Cancelar</button><button class="gra-exgen-ok" type="button" data-exgen-ok>Ok</button></div>`;
  }
  body.querySelectorAll('[data-exgen-cancel]').forEach(b=>b.addEventListener('click',closeModal));
  body.querySelector('[data-exgen-ok]')?.addEventListener('click',generateFromModal);
  const bd=qs('#graExGenBackdrop');bd.classList.add('open');bd.setAttribute('aria-hidden','false');document.body.classList.add('gra-exgen-open');setTimeout(()=>qs('#graExGenClose')?.focus(),30);
}
function decorateDrawer(){
  const drawer=qs('#saebScaleDrawer');if(!drawer)return;
  drawer.querySelectorAll('.saeb-level-card[data-saeb-card]').forEach(card=>{
    const sum=card.querySelector('summary');if(!sum)return;
    const level=card.dataset.saebCard||'';let b=sum.querySelector('.gra-exgen-trigger');
    if(!b){b=document.createElement('button');b.type='button';b.className='gra-exgen-trigger';b.dataset.exgenLevel=level;b.dataset.graNoSchoolNav='1';b.textContent='Gerar exercícios deste nível';const em=sum.querySelector('em');em?sum.insertBefore(b,em):sum.appendChild(b)}
    const n=itemsFor(level).length;b.disabled=!n;b.title=n?`${n} exercício${n===1?'':'s'} ${n===1?'disponível':'disponíveis'}`:'Nenhum exercício Alta ou Parcial disponível neste nível.';
  });
}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Falha ao carregar imagem do exercício: '+src));im.src=src})}
function wrapText(ctx,text,maxWidth){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean),lines=[];let cur='';
  for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxWidth&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);return lines;
}
function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function drawSourceBox(x,item){
  const bx=830,by=36,bw=350,pad=24;const high=item.compatibility==='Alta';
  x.font='16px Arial';const srcLines=wrapText(x,`Fonte: ${item.material}`,bw-pad*2);const bh=96+Math.max(1,srcLines.length)*22;
  x.fillStyle=high?'#eaf7ef':'#fff4d8';roundRect(x,bx,by,bw,bh,18);x.fill();x.strokeStyle=high?'#a7d8b9':'#e4ca7d';x.lineWidth=2;x.stroke();
  x.fillStyle=high?'#1f7042':'#7d5c00';x.font='700 22px Arial';x.fillText(`Compatibilidade: ${item.compatibility}`,bx+pad,by+34);
  x.fillStyle='#506a7b';x.font='16px Arial';srcLines.forEach((l,i)=>x.fillText(l,bx+pad,by+66+i*22));
  x.font='15px Arial';x.fillText(`Página: ${item.source_page}${item.question?` · Questão: ${item.question}`:''}`,bx+pad,by+bh-20);
  return {bottom:by+bh,left:bx};
}
function drawSkillBox(x,item,sourceBottom,H){
  const skills=relatedSkills(item);if(!skills.length)return {mode:'none',top:H,bottom:H};
  x.font='15px Arial';
  const shortWidth=302;const shortLines=[];skills.forEach((s,idx)=>{const prefix=skills.length>1?'• ':'';wrapText(x,prefix+s,shortWidth).forEach(l=>shortLines.push(l))});
  const shortEnough=skills.length===1&&shortLines.length<=4;
  if(shortEnough){
    const bx=830,by=sourceBottom+12,bw=350,pad=24,bh=50+shortLines.length*20;
    x.fillStyle='#eef6fb';roundRect(x,bx,by,bw,bh,16);x.fill();x.strokeStyle='#b9d6e8';x.lineWidth=2;x.stroke();
    x.fillStyle='#123f61';x.font='700 15px Arial';x.fillText('Habilidade SAEB relacionada',bx+pad,by+26);
    x.fillStyle='#425f73';x.font='14px Arial';shortLines.forEach((l,i)=>x.fillText(l,bx+pad,by+50+i*20));
    return {mode:'top',top:by,bottom:by+bh};
  }
  const bx=54,bw=1132,pad=24; x.font='15px Arial';const lines=[];
  skills.forEach((s,idx)=>{const wrapped=wrapText(x,(skills.length>1?'• ':'')+s,bw-pad*2);wrapped.forEach(l=>lines.push(l));if(idx<skills.length-1)lines.push('')});
  const bh=Math.min(260,58+lines.length*21),by=H-bh-34;
  x.fillStyle='#eef6fb';roundRect(x,bx,by,bw,bh,16);x.fill();x.strokeStyle='#b9d6e8';x.lineWidth=2;x.stroke();
  x.fillStyle='#123f61';x.font='700 16px Arial';x.fillText(skills.length>1?'Habilidades SAEB relacionadas':'Habilidade SAEB relacionada',bx+pad,by+28);
  x.fillStyle='#425f73';x.font='14px Arial';let yy=by+55;for(const l of lines){if(l){x.fillText(l,bx+pad,yy)}yy+=21;if(yy>by+bh-16)break}
  return {mode:'footer',top:by,bottom:by+bh};
}
function drawPage(img,item,pageNo,total,y,c,level){
  const W=1240,H=1754,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);
  const src=drawSourceBox(x,item);
  x.fillStyle='#123f61';x.font='700 22px Arial';x.fillText('SIMULADO 2026 · ATIVIDADES POR HABILIDADES',58,54);
  x.font=pageNo===1?'700 31px Arial':'700 27px Arial';const title=`Escala SAEB - ${y}º ano - ${compLabel(c)} · ${levelLabel(level)}`;const titleLines=wrapText(x,title,720);titleLines.slice(0,2).forEach((l,i)=>x.fillText(l,58,96+i*38));
  let leftBottom=pageNo===1?216:138;
  if(pageNo===1){
    const lineY1=168+(titleLines.length-1)*38,lineY2=lineY1+43;
    x.strokeStyle='#b9cad5';x.lineWidth=2;x.beginPath();x.moveTo(58,lineY1);x.lineTo(790,lineY1);x.stroke();x.beginPath();x.moveTo(58,lineY2);x.lineTo(490,lineY2);x.stroke();x.beginPath();x.moveTo(520,lineY2);x.lineTo(790,lineY2);x.stroke();x.fillStyle='#536e80';x.font='18px Arial';x.fillText('Nome:',58,lineY1-7);x.fillText('Turma:',58,lineY2-7);x.fillText('Data:',520,lineY2-7);leftBottom=lineY2+20;
  }else{
    x.fillStyle='#708493';x.font='14px Arial';x.fillText(`Página ${pageNo} de ${total}`,58,126);leftBottom=145;
  }
  const skill=drawSkillBox(x,item,src.bottom,H);
  let contentTop=Math.max(leftBottom,src.bottom+18,skill.mode==='top'?skill.bottom+18:0);
  let contentBottom=skill.mode==='footer'?skill.top-20:H-42;
  if(contentBottom-contentTop<540){contentTop=Math.min(contentTop,260)}
  const left=54,right=54,maxW=W-left-right,maxH=Math.max(360,contentBottom-contentTop);const sc=Math.min(maxW/img.width,maxH/img.height),dw=img.width*sc,dh=img.height*sc,dx=(W-dw)/2,dy=contentTop+(maxH-dh)/2;x.drawImage(img,dx,dy,dw,dh);
  x.fillStyle='#6b808f';x.font='14px Arial';x.fillText(`${pageNo}/${total}`,W-92,H-14);return cv;
}
function dataUrlBytes(url){const b64=url.split(',')[1],bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
function textBytes(s){return new TextEncoder().encode(s)}
function buildPdf(jpegs,w=1240,h=1754){
  const parts=[],offsets=[0];let pos=0;const push=p=>{parts.push(p);pos+=p.length},pushTxt=s=>push(textBytes(s));pushTxt('%PDF-1.4\n%âãÏÓ\n');
  const pageCount=jpegs.length,objCount=2+pageCount*3;const obj=(num,fn)=>{offsets[num]=pos;pushTxt(`${num} 0 obj\n`);fn();pushTxt('\nendobj\n')};
  obj(1,()=>pushTxt('<< /Type /Catalog /Pages 2 0 R >>'));const pageObjs=[];for(let i=0;i<pageCount;i++)pageObjs.push(3+i*3);obj(2,()=>pushTxt(`<< /Type /Pages /Count ${pageCount} /Kids [${pageObjs.map(n=>n+' 0 R').join(' ')}] >>`));
  for(let i=0;i<pageCount;i++){const p=3+i*3,c=p+1,im=p+2;obj(p,()=>pushTxt(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${i+1} ${im} 0 R >> >> /Contents ${c} 0 R >>`));const cs=textBytes(`q\n595 0 0 842 0 0 cm\n/Im${i+1} Do\nQ\n`);obj(c,()=>{pushTxt(`<< /Length ${cs.length} >>\nstream\n`);push(cs);pushTxt('endstream')});const jb=jpegs[i];obj(im,()=>{pushTxt(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jb.length} >>\nstream\n`);push(jb);pushTxt('\nendstream')})}
  const xref=pos;pushTxt(`xref\n0 ${objCount+1}\n0000000000 65535 f \n`);for(let i=1;i<=objCount;i++)pushTxt(String(offsets[i]||0).padStart(10,'0')+' 00000 n \n');pushTxt(`trailer\n<< /Size ${objCount+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(parts,{type:'application/pdf'});
}
async function generatePdf(items,y,c,level,onProgress){const jpg=[];for(let i=0;i<items.length;i++){const im=await loadImage(items[i].image);const cv=drawPage(im,items[i],i+1,items.length,y,c,level);jpg.push(dataUrlBytes(cv.toDataURL('image/jpeg',0.87)));onProgress?.(i+1,items.length);if((i+1)%4===0)await new Promise(r=>requestAnimationFrame(()=>r()))}return buildPdf(jpg)}
function filename(y,c,level,count){return `Atividades_SAEB_${y}ano_${c}_Nivel_${level}_${count}ex.pdf`}
function forceDownload(blob,name){
  try{if(navigator.msSaveOrOpenBlob){navigator.msSaveOrOpenBlob(blob,name);return true}}catch(_){}
  try{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2500);return true}catch(_){return false}
}
async function generateFromModal(){
  const n=Number(qs('input[name="graExGenQty"]:checked')?.value||0);if(!n||!active.items?.length)return;const body=qs('#graExGenBody');body.innerHTML='<div class="gra-exgen-loading"><span class="gra-exgen-spinner"></span><span>Gerando o PDF com os exercícios selecionados...</span></div>';
  try{
    const ordered=active.items.slice().sort((a,b)=>(a.compatibility==='Alta'?0:1)-(b.compatibility==='Alta'?0:1));const chosen=ordered.slice(0,Math.min(n,ordered.length));const blob=await generatePdf(chosen,active.y,active.c,active.level,(done,total)=>{const t=body.querySelector('.gra-exgen-loading span:last-child');if(t)t.textContent=`Gerando PDF... ${done}/${total}`});if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(blob);const name=filename(active.y,active.c,active.level,chosen.length);
    body.innerHTML=`<div class="gra-exgen-ready"><b>PDF gerado com sucesso.</b>${chosen.length} exercício${chosen.length===1?'':'s'} · ${chosen.filter(x=>x.compatibility==='Alta').length} Alta · ${chosen.filter(x=>x.compatibility==='Parcial').length} Parcial.</div><div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Fechar</button><a class="gra-exgen-open" href="${blobUrl}" target="_blank" rel="noopener">Abrir PDF</a><button class="gra-exgen-download" type="button" data-exgen-download>Baixar PDF</button></div>`;
    body.querySelector('[data-exgen-cancel]')?.addEventListener('click',closeModal);body.querySelector('[data-exgen-download]')?.addEventListener('click',()=>forceDownload(blob,name));active.lastBlob=blob;active.lastName=name;
  }catch(err){console.error('Gerador de exercícios:',err);body.innerHTML=`<div class="gra-exgen-empty"><b>Não foi possível gerar o PDF.</b><br>${esc(err?.message||err)}</div><div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Fechar</button></div>`;body.querySelector('[data-exgen-cancel]')?.addEventListener('click',closeModal)}
}
function observe(){
  decorateDrawer();const mo=new MutationObserver(()=>decorateDrawer());mo.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{const b=e.target.closest?.('.gra-exgen-trigger');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();if(!b.disabled)openModal(b.dataset.exgenLevel||'')},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&qs('#graExGenBackdrop')?.classList.contains('open')){e.preventDefault();e.stopPropagation();closeModal()}},true);
  ['somAnoEscolar','somComponente','somModalidade'].forEach(id=>qs('#'+id)?.addEventListener('change',()=>setTimeout(decorateDrawer,80)));
}
async function testPdf(y='2',c='LP',level='4',n=1){const items=(BANK[`${y}|${c}|${level}`]||[]).slice().sort((a,b)=>(a.compatibility==='Alta'?0:1)-(b.compatibility==='Alta'?0:1)).slice(0,n);return generatePdf(items,y,c,level)}
function boot(){observe();window.__GRA_V435_EXERCISES__={version:'v435',bank:BANK,decorateDrawer,openModal,testPdf,buildPdf,generatePdf,relatedSkills,forceDownload};window.__GRA_V432_EXERCISES__=window.__GRA_V435_EXERCISES__;window.__GRA_V431_EXERCISES__=window.__GRA_V435_EXERCISES__}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
