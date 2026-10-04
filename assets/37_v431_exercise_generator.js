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
function ensureModal(){
  if(qs('#graExGenBackdrop'))return;
  document.body.insertAdjacentHTML('beforeend',`<div class="gra-exgen-backdrop" id="graExGenBackdrop" data-gra-no-school-nav="1" aria-hidden="true"><section class="gra-exgen-modal" role="dialog" aria-modal="true" aria-labelledby="graExGenTitle"><header class="gra-exgen-head"><div><small>Simulado 2026 · atividades por habilidades</small><h3 id="graExGenTitle">Gerar exercícios</h3><p id="graExGenMeta"></p></div><button class="gra-exgen-close" id="graExGenClose" type="button" aria-label="Fechar">×</button></header><div class="gra-exgen-body" id="graExGenBody"></div></section></div>`);
  qs('#graExGenClose').addEventListener('click',closeModal);qs('#graExGenBackdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()});
}
function closeModal(){const b=qs('#graExGenBackdrop');if(!b)return;b.classList.remove('open');b.setAttribute('aria-hidden','true');setTimeout(()=>lastFocus?.focus?.({preventScroll:true}),30)}
function dedupeSkillRows(items){
  const m=new Map();items.forEach(it=>(it.skills||[]).forEach(s=>{const cur=m.get(s);if(!cur||cur==='Parcial'&&it.compatibility==='Alta')m.set(s,it.compatibility)}));
  return [...m.entries()].map(([skill,compatibility])=>({skill,compatibility}));
}
function openModal(level){
  ensureModal();lastFocus=document.activeElement;const items=itemsFor(level);const y=yearKey(),c=compKey();active={level,y,c,items};
  qs('#graExGenTitle').textContent=`Gerar exercícios - ${levelLabel(level)}`;qs('#graExGenMeta').textContent=`${y}º ano · ${compLabel(c)}`;
  const hi=items.filter(x=>x.compatibility==='Alta').length,pa=items.filter(x=>x.compatibility==='Parcial').length,total=items.length;
  const body=qs('#graExGenBody');
  if(!total){body.innerHTML=`<div class="gra-exgen-empty"><b>Nenhum exercício disponível.</b><br>Não há item cadastrado com compatibilidade Alta ou Parcial para este nível nos materiais já analisados.</div><div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Fechar</button></div>`;}
  else{
    const skills=dedupeSkillRows(items).map(x=>`<div class="gra-exgen-skill"><span class="gra-exgen-badge ${x.compatibility==='Alta'?'high':'partial'}">${esc(x.compatibility)}</span><span>${esc(x.skill)}</span></div>`).join('');
    const half=Math.max(1,Math.ceil(total/2)),opts=[];
    opts.push({n:total,label:`Gerar ${total} exercício${total===1?'':'s'}`});
    if(half!==total&&half!==1)opts.push({n:half,label:`Gerar ${half} exercícios`});
    if(total>1)opts.push({n:1,label:'Gerar 1 exercício'});
    body.innerHTML=`<div class="gra-exgen-stats"><div class="gra-exgen-stat high"><b>${hi}</b><span>Compatibilidade alta</span></div><div class="gra-exgen-stat partial"><b>${pa}</b><span>Compatibilidade parcial</span></div><div class="gra-exgen-stat"><b>${total}</b><span>Total disponível</span></div></div><div class="gra-exgen-section-title">Habilidades contempladas pelos exercícios disponíveis</div><div class="gra-exgen-skills">${skills}</div><div class="gra-exgen-section-title">Quantidade a gerar</div><div class="gra-exgen-options">${opts.map((o,i)=>`<label class="gra-exgen-option"><input type="radio" name="graExGenQty" value="${o.n}" ${i===0?'checked':''}><span>${esc(o.label)}</span></label>`).join('')}</div><p class="gra-exgen-note">Os exercícios de compatibilidade Alta são priorizados quando o usuário escolhe uma quantidade menor que o total disponível. A compatibilidade e a fonte aparecem no canto superior direito de cada página do PDF.</p><div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Cancelar</button><button class="gra-exgen-ok" type="button" data-exgen-ok>Ok</button></div>`;
  }
  body.querySelectorAll('[data-exgen-cancel]').forEach(b=>b.addEventListener('click',closeModal));body.querySelector('[data-exgen-ok]')?.addEventListener('click',generateFromModal);
  const bd=qs('#graExGenBackdrop');bd.classList.add('open');bd.setAttribute('aria-hidden','false');setTimeout(()=>qs('#graExGenClose')?.focus(),30);
}
function decorateDrawer(){
  const drawer=qs('#saebScaleDrawer');if(!drawer)return;
  drawer.querySelectorAll('.saeb-level-card[data-saeb-card]').forEach(card=>{
    const sum=card.querySelector('summary');if(!sum||sum.querySelector('.gra-exgen-trigger'))return;
    const level=card.dataset.saebCard||'';const b=document.createElement('button');b.type='button';b.className='gra-exgen-trigger';b.dataset.exgenLevel=level;b.dataset.graNoSchoolNav='1';b.textContent='Gerar exercícios deste nível';
    const n=itemsFor(level).length;if(!n){b.disabled=true;b.title='Nenhum exercício Alta ou Parcial disponível neste nível.'}else b.title=`${n} exercício${n===1?'':'s'} disponível${n===1?'':'is'}`;
    const em=sum.querySelector('em');em?sum.insertBefore(b,em):sum.appendChild(b);
  });
}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Falha ao carregar imagem do exercício: '+src));im.src=src})}
function wrapText(ctx,text,maxWidth){const words=String(text||'').split(/\s+/);const lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxWidth&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);return lines}
function drawPage(img,item,pageNo,total,y,c,level){
  const W=1240,H=1754,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);
  x.fillStyle='#123f61';x.font='700 24px Arial';x.fillText('SIMULADO 2026 · ATIVIDADES POR HABILIDADES',58,56);x.font='700 38px Arial';x.fillText(`Escala SAEB - ${y}º ano - ${compLabel(c)} · ${levelLabel(level)}`,58,105);
  x.strokeStyle='#b9cad5';x.lineWidth=2;x.beginPath();x.moveTo(58,154);x.lineTo(790,154);x.stroke();x.beginPath();x.moveTo(58,194);x.lineTo(490,194);x.stroke();x.beginPath();x.moveTo(520,194);x.lineTo(790,194);x.stroke();x.fillStyle='#536e80';x.font='18px Arial';x.fillText('Nome:',58,148);x.fillText('Turma:',58,188);x.fillText('Data:',520,188);
  const high=item.compatibility==='Alta';x.fillStyle=high?'#e9f7ee':'#fff4d8';roundRect(x,830,38,350,158,18);x.fill();x.strokeStyle=high?'#a8d8b9':'#e7cf8d';x.stroke();x.fillStyle=high?'#227446':'#826000';x.font='700 22px Arial';x.fillText(`Compatibilidade: ${item.compatibility}`,854,72);x.fillStyle='#4f6879';x.font='16px Arial';const src=`Fonte: ${item.material}`;wrapText(x,src,305).slice(0,3).forEach((l,i)=>x.fillText(l,854,103+i*21));x.fillText(`Página: ${item.source_page}${item.question?` · Questão: ${item.question}`:''}`,854,172);
  const top=226,bottom=38,left=54,right=54,maxW=W-left-right,maxH=H-top-bottom;const sc=Math.min(maxW/img.width,maxH/img.height),dw=img.width*sc,dh=img.height*sc,dx=(W-dw)/2,dy=top+(maxH-dh)/2;x.drawImage(img,dx,dy,dw,dh);
  x.fillStyle='#6b808f';x.font='14px Arial';x.fillText(`${pageNo}/${total}`,W-92,H-18);return cv;
}
function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function dataUrlBytes(url){const b64=url.split(',')[1],bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
function textBytes(s){return new TextEncoder().encode(s)}
function concat(parts){let n=0;parts.forEach(p=>n+=p.length);const out=new Uint8Array(n);let o=0;parts.forEach(p=>{out.set(p,o);o+=p.length});return out}
function buildPdf(jpegs,w=1240,h=1754){
  const parts=[],offsets=[0];let pos=0;const push=p=>{parts.push(p);pos+=p.length},pushTxt=s=>push(textBytes(s));pushTxt('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const pageCount=jpegs.length, objCount=2+pageCount*3;const obj=(num,fn)=>{offsets[num]=pos;pushTxt(`${num} 0 obj\n`);fn();pushTxt('\nendobj\n')};
  obj(1,()=>pushTxt('<< /Type /Catalog /Pages 2 0 R >>'));
  const pageObjs=[];for(let i=0;i<pageCount;i++)pageObjs.push(3+i*3);
  obj(2,()=>pushTxt(`<< /Type /Pages /Count ${pageCount} /Kids [${pageObjs.map(n=>n+' 0 R').join(' ')}] >>`));
  for(let i=0;i<pageCount;i++){
    const p=3+i*3,c=p+1,im=p+2;obj(p,()=>pushTxt(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${i+1} ${im} 0 R >> >> /Contents ${c} 0 R >>`));
    const cs=textBytes(`q\n595 0 0 842 0 0 cm\n/Im${i+1} Do\nQ\n`);obj(c,()=>{pushTxt(`<< /Length ${cs.length} >>\nstream\n`);push(cs);pushTxt('endstream')});
    const jb=jpegs[i];obj(im,()=>{pushTxt(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jb.length} >>\nstream\n`);push(jb);pushTxt('\nendstream')});
  }
  const xref=pos;pushTxt(`xref\n0 ${objCount+1}\n0000000000 65535 f \n`);for(let i=1;i<=objCount;i++)pushTxt(String(offsets[i]||0).padStart(10,'0')+' 00000 n \n');pushTxt(`trailer\n<< /Size ${objCount+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(parts,{type:'application/pdf'});
}
async function generatePdf(items,y,c,level){
  const jpg=[];for(let i=0;i<items.length;i++){const im=await loadImage(items[i].image);const cv=drawPage(im,items[i],i+1,items.length,y,c,level);jpg.push(dataUrlBytes(cv.toDataURL('image/jpeg',0.86)))}return buildPdf(jpg);
}
function filename(y,c,level,count){return `Atividades_SAEB_${y}ano_${c}_Nivel_${level}_${count}ex.pdf`}
async function generateFromModal(){
  const n=Number(qs('input[name="graExGenQty"]:checked')?.value||0);if(!n||!active.items?.length)return;const body=qs('#graExGenBody');body.innerHTML='<div class="gra-exgen-loading"><span class="gra-exgen-spinner"></span><span>Gerando o PDF com os exercícios selecionados...</span></div>';
  try{
    const ordered=active.items.slice().sort((a,b)=>(a.compatibility==='Alta'?0:1)-(b.compatibility==='Alta'?0:1));const chosen=ordered.slice(0,Math.min(n,ordered.length));const blob=await generatePdf(chosen,active.y,active.c,active.level);if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(blob);const name=filename(active.y,active.c,active.level,chosen.length);
    body.innerHTML=`<div class="gra-exgen-ready"><b>PDF gerado com sucesso.</b>${chosen.length} exercício${chosen.length===1?'':'s'} · ${chosen.filter(x=>x.compatibility==='Alta').length} Alta · ${chosen.filter(x=>x.compatibility==='Parcial').length} Parcial.</div><div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Fechar</button><a class="gra-exgen-open" href="${blobUrl}" target="_blank" rel="noopener">Abrir PDF</a><a class="gra-exgen-download" href="${blobUrl}" download="${esc(name)}" data-exgen-download>Baixar PDF</a></div>`;
    body.querySelector('[data-exgen-cancel]')?.addEventListener('click',closeModal);body.querySelector('[data-exgen-download]')?.addEventListener('click',function(){setTimeout(()=>{try{if(navigator.msSaveOrOpenBlob)navigator.msSaveOrOpenBlob(blob,name)}catch(_){}},0)});
    active.lastBlob=blob;active.lastName=name;
  }catch(err){console.error('Gerador de exercícios:',err);body.innerHTML=`<div class="gra-exgen-empty"><b>Não foi possível gerar o PDF.</b><br>${esc(err?.message||err)}</div><div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Fechar</button></div>`;body.querySelector('[data-exgen-cancel]')?.addEventListener('click',closeModal)}
}
function observe(){decorateDrawer();const mo=new MutationObserver(()=>decorateDrawer());mo.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',e=>{const b=e.target.closest?.('.gra-exgen-trigger');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();if(!b.disabled)openModal(b.dataset.exgenLevel||'')},true);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&qs('#graExGenBackdrop')?.classList.contains('open'))closeModal()});['somAnoEscolar','somComponente','somModalidade'].forEach(id=>qs('#'+id)?.addEventListener('change',()=>setTimeout(decorateDrawer,80)))}
async function testPdf(y='2',c='LP',level='4',n=1){const items=(BANK[`${y}|${c}|${level}`]||[]).slice().sort((a,b)=>(a.compatibility==='Alta'?0:1)-(b.compatibility==='Alta'?0:1)).slice(0,n);return generatePdf(items,y,c,level)}
function boot(){observe();window.__GRA_V431_EXERCISES__={version:'v431',bank:BANK,decorateDrawer,openModal,testPdf,buildPdf,generatePdf}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
