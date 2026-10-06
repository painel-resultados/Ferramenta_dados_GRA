(function(){
'use strict';
const BANK=window.GRA_EXERCISE_BANK||{};
const qs=s=>document.querySelector(s), qsa=s=>[...document.querySelectorAll(s)];
let blobUrl='', lastFocus=null, active={}, session=0, generation=null;
const jobStats={started:0,completed:0,cancelled:0,failed:0};
function releasePreview(){if(blobUrl){URL.revokeObjectURL(blobUrl);blobUrl=''}active.lastBlob=null;active.lastName=''}
function cancelGeneration(){session++;if(generation){generation.abort();generation=null}releasePreview()}
function throwIfAborted(signal){if(signal?.aborted)throw new DOMException('Geração cancelada.','AbortError')}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function yearKey(){const v=qs('#somAnoEscolar')?.value||'';return v.startsWith('2')?'2':v.startsWith('4')?'4':v.startsWith('8')?'8':''}
function compKey(){return qs('#somComponente')?.value==='MT'?'MT':'LP'}
function compLabel(c){return c==='MT'?'Matemática':'Língua Portuguesa'}
function levelLabel(k){return k==='0'?'Nível Abaixo de 1':'Nível '+k}
function mergeItems(items){
  const m=new Map();
  (items||[]).forEach(it=>{
    if(it.review_status!=='checked')return;
    const key=[it.image,it.material,it.source_page,it.question||'',it.compatibility].join('|');
    if(!m.has(key))m.set(key,{...it,saeb_skills:relatedSkills(it).slice(),skills:relatedSkills(it).slice()});
    else{
      const cur=m.get(key),skills=[...new Set([...relatedSkills(cur),...relatedSkills(it)])];cur.saeb_skills=skills;cur.skills=skills;
      if(it.compatibility==='Alta')cur.compatibility='Alta';
    }
  });
  return [...m.values()];
}
function itemsFor(level){return mergeItems(BANK[`${yearKey()}|${compKey()}|${level}`]||[])}
function relatedSkills(item){return (Array.isArray(item?.saeb_skills)&&item.saeb_skills.length?item.saeb_skills:item?.skills||[]).filter(Boolean)}
function applicatorNotes(items){
  const oral=items.map((it,i)=>({it,index:i+1})).filter(x=>x.it.applicator_prompt);
  if(!oral.length)return '';
  return `<details class="gra-exgen-note"><summary>Orientações reservadas ao aplicador (${oral.length})</summary><p>As palavras de ditado não aparecem no PDF do estudante.</p><ul>${oral.map(({it,index})=>`<li>Atividade ${index}: ${esc(it.applicator_prompt)}</li>`).join('')}</ul></details>`;
}
function ensureModal(){
  if(qs('#graExGenBackdrop'))return;
  document.body.insertAdjacentHTML('beforeend',`<div class="gra-exgen-backdrop" id="graExGenBackdrop" data-gra-no-school-nav="1" aria-hidden="true"><section class="gra-exgen-modal" role="dialog" aria-modal="true" aria-labelledby="graExGenTitle"><header class="gra-exgen-head"><div><small>Simulado 2026 · atividades por habilidades</small><h3 id="graExGenTitle">Gerar exercícios</h3><p id="graExGenMeta"></p></div><button class="gra-exgen-close" id="graExGenClose" type="button" aria-label="Fechar">×</button></header><div class="gra-exgen-body" id="graExGenBody"></div></section></div>`);
  qs('#graExGenClose').addEventListener('click',closeModal);
  qs('#graExGenBackdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()});
}
function closeModal(){
  cancelGeneration();const b=qs('#graExGenBackdrop');if(!b)return;
  b.classList.remove('open');b.setAttribute('aria-hidden','true');document.body.classList.remove('gra-exgen-open');
  const focus=lastFocus,ticket=session;setTimeout(()=>{if(ticket===session)focus?.focus?.({preventScroll:true})},30);
}
function skillInventory(items){
  const m=new Map();
  items.forEach(it=>relatedSkills(it).forEach(s=>{
    const cur=m.get(s)||{skill:s,compatibility:'Parcial',count:0};cur.count++;
    if(it.compatibility==='Alta')cur.compatibility='Alta';m.set(s,cur);
  }));
  return [...m.values()];
}
function itemRank(it,covered=new Set(),materialUse=new Map()){
  const fresh=relatedSkills(it).filter(s=>!covered.has(s)).length;
  const high=it.compatibility==='Alta'?1:0;
  const newMat=(materialUse.get(it.material)||0)===0?1:0;
  return fresh*100+high*18+newMat*5-relatedSkills(it).length*.01-(materialUse.get(it.material)||0)*.5;
}
function shuffleItems(items){const out=items.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function compatibilityOrder(a,b){return (a.compatibility==='Alta'?0:1)-(b.compatibility==='Alta'?0:1)}
function selectDiverse(items,n,randomize=false){
  items=randomize?shuffleItems(items):items;
  n=Math.max(1,Math.min(Number(n)||1,items.length));const chosen=[],covered=new Set(),used=new Set(),mat=new Map();
  while(chosen.length<n){
    const candidates=items.filter(it=>!used.has(it.id||it.image));if(!candidates.length)break;
    candidates.sort((a,b)=>compatibilityOrder(a,b)||itemRank(b,covered,mat)-itemRank(a,covered,mat));const pick=candidates[0];chosen.push(pick);used.add(pick.id||pick.image);relatedSkills(pick).forEach(s=>covered.add(s));mat.set(pick.material,(mat.get(pick.material)||0)+1);
  }
  return chosen;
}
function selectOnePerSkill(items,skills,randomize=false){
  items=randomize?shuffleItems(items):items;
  const wanted=[...new Set(skills||[])];const ordered=wanted.slice().sort((a,b)=>items.filter(x=>relatedSkills(x).includes(a)).length-items.filter(x=>relatedSkills(x).includes(b)).length);const chosen=[],used=new Set(),covered=new Set(),mat=new Map();
  for(const skill of ordered){
    const cands=items.filter(it=>relatedSkills(it).includes(skill)).sort((a,b)=>{
      const compatibility=compatibilityOrder(a,b);if(compatibility)return compatibility;
      const au=used.has(a.id||a.image)?1:0,bu=used.has(b.id||b.image)?1:0;if(au!==bu)return au-bu;
      return itemRank(b,covered,mat)-itemRank(a,covered,mat);
    });
    if(!cands.length)continue;const pick=cands[0];if(!used.has(pick.id||pick.image)){chosen.push(pick);used.add(pick.id||pick.image);mat.set(pick.material,(mat.get(pick.material)||0)+1)}relatedSkills(pick).forEach(s=>covered.add(s));
  }
  return chosen.sort(compatibilityOrder);
}
function toggleModePanels(){
  const mode=qs('input[name="graExGenMode"]:checked')?.value||'one';
  qs('#graExSkillChooser')?.classList.toggle('active',mode==='skills');qs('#graExCustomWrap')?.classList.toggle('active',mode==='custom');
}
function resolveSelection(){
  const items=active.items||[],mode=qs('input[name="graExGenMode"]:checked')?.value||'one',inv=skillInventory(items),randomize=!!qs('#graExRandomize')?.checked;
  if(mode==='max')return (randomize?shuffleItems(items):items.slice()).sort(compatibilityOrder);
  if(mode==='one')return selectOnePerSkill(items,inv.map(x=>x.skill),randomize);
  if(mode==='skills'){
    const selected=[...qsa('#graExSkillChooser input[type="checkbox"]:checked')].map(x=>x.value);if(!selected.length)throw new Error('Selecione pelo menos uma habilidade.');return selectOnePerSkill(items,selected,randomize);
  }
  const inp=qs('#graExCustomQty'),raw=Number(inp?.value);if(!Number.isInteger(raw)||raw<1)throw new Error('Digite uma quantidade inteira válida de itens.');if(raw>items.length)throw new Error(`A quantidade máxima disponível neste nível é ${items.length}.`);return selectDiverse(items,raw,randomize);
}
function openModal(level){
  cancelGeneration();ensureModal();lastFocus=document.activeElement;const items=itemsFor(level);const y=yearKey(),c=compKey();active={level,y,c,items};
  qs('#graExGenTitle').textContent=`Gerar exercícios - ${levelLabel(level)}`;qs('#graExGenMeta').textContent=`${y}º ano · ${compLabel(c)}`;
  const hi=items.filter(x=>x.compatibility==='Alta').length,pa=items.filter(x=>x.compatibility==='Parcial').length,total=items.length,inv=skillInventory(items),oneCount=selectOnePerSkill(items,inv.map(x=>x.skill)).length;
  const body=qs('#graExGenBody');
  const coverage=window.GRA_EXERCISE_COVERAGE?.[`${y}|${c}|${level}`];
  const coverageNote=coverage?`<div class="gra-exgen-note"><b>${coverage.covered} de ${coverage.total} habilidades têm correspondência cadastrada.</b> ${coverage.high} com compatibilidade alta; ${coverage.partial} somente parcial. Parcial não significa atendimento integral.${coverage.missing.length?`<details><summary>${coverage.missing.length} habilidades ainda sem exercício</summary><ul>${coverage.missing.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></details>`:''}</div>`:'';
  if(!total){
    body.innerHTML=`<div class="gra-exgen-empty"><b>Nenhum exercício disponível.</b><br>Não há item cadastrado com compatibilidade Alta ou Parcial para este nível nos materiais já analisados.</div><div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Fechar</button></div>`;
  }else{
    const skills=inv.map((x,i)=>`<label class="gra-exgen-skill-choice"><input type="checkbox" value="${esc(x.skill)}"><span class="gra-exgen-badge ${x.compatibility==='Alta'?'high':'partial'}">${esc(x.compatibility==='Alta'?'Alta Compatibilidade':'Compatibilidade Parcial')}</span><span class="gra-exgen-skill-text">${esc(x.skill)}<small>${x.count} item${x.count===1?'':'s'} ${x.count===1?'disponível':'disponíveis'}</small></span></label>`).join('');
    body.innerHTML=`<div class="gra-exgen-stats"><div class="gra-exgen-stat high"><b>${hi}</b><span>Itens com Alta Compatibilidade</span></div><div class="gra-exgen-stat partial"><b>${pa}</b><span>Itens com Compatibilidade Parcial</span></div><div class="gra-exgen-stat"><b>${inv.length}</b><span>Habilidades cobertas</span></div></div>
    <div class="gra-exgen-section-title">Como deseja montar a atividade?</div><div class="gra-exgen-options">
      <label class="gra-exgen-option"><input type="radio" name="graExGenMode" value="skills"><span><b>Escolher habilidades</b><small>Selecione na lista as habilidades específicas deste nível.</small></span></label>
      <label class="gra-exgen-option"><input type="radio" name="graExGenMode" value="one" checked><span><b>Um item por habilidade</b><small>Tenta usar um exercício distinto para cada uma das ${inv.length} habilidades (${oneCount} item${oneCount===1?'':'s'} neste nível); se uma mesma questão for a única opção para mais de uma habilidade, ela não é duplicada.</small></span></label>
      <label class="gra-exgen-option"><input type="radio" name="graExGenMode" value="max"><span><b>Máximo de itens (${total})</b><small>Inclui todos os exercícios físicos únicos disponíveis neste nível.</small></span></label>
      <label class="gra-exgen-option"><input type="radio" name="graExGenMode" value="custom"><span><b>Definir quantidade de itens</b><small>Você informa quantos itens deseja.</small></span></label>
    </div>
    <div class="gra-exgen-skill-chooser" id="graExSkillChooser"><div class="gra-exgen-chooser-head"><b>Habilidades do nível</b><button type="button" data-exgen-all>Marcar todas</button><button type="button" data-exgen-none>Limpar</button></div><div class="gra-exgen-skills">${skills}</div></div>
    <div class="gra-exgen-custom" id="graExCustomWrap"><label>Quantidade de itens <input id="graExCustomQty" type="number" min="1" max="${total}" value="${Math.min(total,Math.max(1,inv.length))}"></label><small>Limite: 1 a ${total}. Prioriza compatibilidade Alta, depois habilidades ainda não representadas e variedade de fontes.</small></div>
    <label class="gra-exgen-option"><input id="graExRandomize" type="checkbox" checked><span><b>Variar as questões equivalentes</b><small>Sorteia os empates entre opções da mesma compatibilidade e prioridade. Desmarque para uma seleção estável.</small></span></label>
    <p class="gra-exgen-note">Por habilidade, a compatibilidade <b>Alta</b> tem preferência; a <b>Parcial</b> é usada quando não há alternativa Alta. Na quantidade personalizada, as questões Alta vêm primeiro. O modo Máximo inclui todo o acervo revisado deste nível, sem repetir o mesmo item.</p><div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Cancelar</button><button class="gra-exgen-ok" type="button" data-exgen-ok>Ok</button></div>`;
  }
  body.insertAdjacentHTML('afterbegin',coverageNote);
  body.querySelectorAll('[data-exgen-cancel]').forEach(b=>b.addEventListener('click',closeModal));body.querySelector('[data-exgen-ok]')?.addEventListener('click',generateFromModal);
  body.querySelectorAll('input[name="graExGenMode"]').forEach(r=>r.addEventListener('change',toggleModePanels));body.querySelector('[data-exgen-all]')?.addEventListener('click',()=>qsa('#graExSkillChooser input[type="checkbox"]').forEach(x=>x.checked=true));body.querySelector('[data-exgen-none]')?.addEventListener('click',()=>qsa('#graExSkillChooser input[type="checkbox"]').forEach(x=>x.checked=false));toggleModePanels();
  const bd=qs('#graExGenBackdrop');bd.classList.add('open');bd.setAttribute('aria-hidden','false');document.body.classList.add('gra-exgen-open');const ticket=session;setTimeout(()=>{if(ticket===session)qs('#graExGenClose')?.focus()},30);
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
function loadImage(src,signal){return new Promise((resolve,reject)=>{
  throwIfAborted(signal);const im=new Image();let settled=false;
  const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);im.onload=im.onerror=null;signal?.removeEventListener('abort',abort);if(error){im.src='';reject(error)}else resolve(im)};
  const abort=()=>finish(new DOMException('Geração cancelada.','AbortError'));
  const timer=setTimeout(()=>finish(new Error('A imagem do exercício demorou a carregar. Tente gerar novamente.')),20000);
  im.onload=()=>finish(im.naturalWidth?null:new Error('Imagem de exercício inválida.'));
  im.onerror=()=>finish(new Error('Falha ao carregar imagem do exercício: '+src));
  signal?.addEventListener('abort',abort,{once:true});im.src=src;
})}
function wrapText(ctx,text,maxWidth){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean),lines=[];let cur='';
  for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxWidth&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);return lines;
}
function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function drawSourceBox(x,item){
  const bx=830,by=36,bw=350,pad=24;const high=item.compatibility==='Alta';
  x.font='16px Arial';const srcLines=wrapText(x,`Fonte: ${item.material}`,bw-pad*2);
  x.font='15px Arial';const detailLines=wrapText(x,`Página: ${item.source_page}${item.question?` · Questão: ${item.question}`:''}`,bw-pad*2);
  const bh=96+Math.max(1,srcLines.length)*22+Math.max(0,detailLines.length-1)*18;
  x.fillStyle=high?'#eaf7ef':'#fff4d8';roundRect(x,bx,by,bw,bh,18);x.fill();x.strokeStyle=high?'#a7d8b9':'#e4ca7d';x.lineWidth=2;x.stroke();
  x.fillStyle=high?'#1f7042':'#7d5c00';x.font='700 22px Arial';x.fillText(`Compatibilidade: ${item.compatibility==='Alta'?'Alta':'Parcial'}`,bx+pad,by+34);
  x.fillStyle='#506a7b';x.font='16px Arial';srcLines.forEach((l,i)=>x.fillText(l,bx+pad,by+66+i*22));
  x.font='15px Arial';detailLines.forEach((line,i)=>x.fillText(line,bx+pad,by+bh-20-(detailLines.length-1-i)*18));
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
async function generatePdf(items,y,c,level,onProgress,signal){
  const jpg=[];throwIfAborted(signal);
  if(!items.length||items.some(it=>it.review_status!=='checked'))throw new Error('Seleção vazia ou exercício bloqueado pela revisão de conteúdo.');
  items=items.slice().sort(compatibilityOrder);
  const pages=items.flatMap((item,index)=>{
    const support=item.pages?.length?item.pages:[{image:item.image,source_page:item.source_page}];
    return support.map((page,part)=>({...item,...page,question:`${item.question||'—'} · Atividade ${index+1}, parte ${part+1}/${support.length}`}));
  });
  for(let i=0;i<pages.length;i++){
    throwIfAborted(signal);const im=await loadImage(pages[i].image,signal);throwIfAborted(signal);
    const cv=drawPage(im,pages[i],i+1,pages.length,y,c,level);
    try{jpg.push(dataUrlBytes(cv.toDataURL('image/jpeg',0.87)))}finally{cv.width=cv.height=1;im.src=''}
    onProgress?.(i+1,pages.length);
    // Timers continue working when animation frames are suspended in a background tab.
    await new Promise(r=>setTimeout(r,0));
  }
  throwIfAborted(signal);return buildPdf(jpg);
}
function filename(y,c,level,count){return `Atividades_SAEB_${y}ano_${c}_Nivel_${level}_${count}ex.pdf`}
function forceDownload(blob,name){
  try{if(navigator.msSaveOrOpenBlob){navigator.msSaveOrOpenBlob(blob,name);return true}}catch(_){}
  try{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2500);return true}catch(_){return false}
}
async function generateFromModal(){
  if(!active.items?.length||generation)return;const body=qs('#graExGenBody');let chosen;
  try{chosen=resolveSelection().sort(compatibilityOrder)}catch(err){const note=body.querySelector('.gra-exgen-note');if(note){note.innerHTML=`<b style="color:#a61f1f">${esc(err.message||err)}</b>`;note.scrollIntoView({block:'nearest'})}return}
  if(!chosen.length)return;
  const snapshot={y:active.y,c:active.c,level:active.level},ticket=session,controller=new AbortController();generation=controller;jobStats.started++;
  const current=()=>ticket===session&&generation===controller&&!controller.signal.aborted;
  body.innerHTML='<div class="gra-exgen-loading"><span class="gra-exgen-spinner"></span><span>Gerando o PDF com os exercícios selecionados...</span></div>';
  try{
    const blob=await generatePdf(chosen,snapshot.y,snapshot.c,snapshot.level,(done,total)=>{if(!current())return;const t=body.querySelector('.gra-exgen-loading span:last-child');if(t)t.textContent=`Gerando PDF... ${done}/${total}`},controller.signal);
    if(!current())return;releasePreview();blobUrl=URL.createObjectURL(blob);const name=filename(snapshot.y,snapshot.c,snapshot.level,chosen.length);
    body.innerHTML=`<div class="gra-exgen-ready"><b>PDF gerado com sucesso.</b>${chosen.length} exercício${chosen.length===1?'':'s'} · ${chosen.filter(x=>x.compatibility==='Alta').length} Alta Compatibilidade · ${chosen.filter(x=>x.compatibility==='Parcial').length} Compatibilidade Parcial.<br>Textos e figuras de apoio acompanham a atividade; um exercício pode ocupar várias páginas.</div>${applicatorNotes(chosen)}<div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Fechar</button><a class="gra-exgen-open" href="${blobUrl}" target="_blank" rel="noopener">Abrir PDF</a><button class="gra-exgen-download" type="button" data-exgen-download>Baixar PDF</button></div>`;
    body.querySelector('[data-exgen-cancel]')?.addEventListener('click',closeModal);body.querySelector('[data-exgen-download]')?.addEventListener('click',()=>forceDownload(blob,name));active.lastBlob=blob;active.lastName=name;jobStats.completed++;
  }catch(err){
    if(err?.name==='AbortError'){jobStats.cancelled++;return}jobStats.failed++;
    if(!current())return;console.error('Gerador de exercícios:',err);
    body.innerHTML=`<div class="gra-exgen-empty"><b>Não foi possível gerar o PDF.</b><br>${esc(err?.message||err)}</div><div class="gra-exgen-actions"><button class="gra-exgen-cancel" type="button" data-exgen-cancel>Fechar</button></div>`;body.querySelector('[data-exgen-cancel]')?.addEventListener('click',closeModal);
  }finally{if(generation===controller)generation=null}
}
function observe(){
  let queued=0,watched=null;const drawerObserver=new MutationObserver(schedule);
  function schedule(){if(queued)return;queued=setTimeout(()=>{queued=0;decorateDrawer()},0)}
  function attach(){const drawer=qs('#saebScaleDrawer');if(drawer===watched)return;drawerObserver.disconnect();watched=drawer;if(drawer){drawerObserver.observe(drawer,{childList:true,subtree:true});schedule()}}
  attach();decorateDrawer();
  // Discover drawer replacement without rescanning it for unrelated changes elsewhere.
  new MutationObserver(records=>{for(const rec of records)for(const node of [...rec.addedNodes,...rec.removedNodes])if(node.nodeType===1&&(node.id==='saebScaleDrawer'||node.contains?.(watched)||node.querySelector?.('#saebScaleDrawer'))){attach();return}}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{const b=e.target.closest?.('.gra-exgen-trigger');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();if(!b.disabled)openModal(b.dataset.exgenLevel||'')},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&qs('#graExGenBackdrop')?.classList.contains('open')){e.preventDefault();e.stopPropagation();closeModal()}},true);
  ['somAnoEscolar','somComponente','somModalidade'].forEach(id=>qs('#'+id)?.addEventListener('change',schedule));
  window.addEventListener('pagehide',cancelGeneration);
}
async function testPdf(y='2',c='LP',level='4',n=1){const items=mergeItems(BANK[`${y}|${c}|${level}`]||[]).sort((a,b)=>(a.compatibility==='Alta'?0:1)-(b.compatibility==='Alta'?0:1)).slice(0,n);return generatePdf(items,y,c,level)}
function boot(){observe();window.__GRA_V436_EXERCISES__={version:'v438-hotfix-20261006',bank:BANK,decorateDrawer,openModal,testPdf,buildPdf,generatePdf,relatedSkills,forceDownload,itemsFor,skillInventory,selectDiverse,selectOnePerSkill,resolveSelection,audit(){return {...jobStats,generating:!!generation,hasPreview:!!blobUrl}}}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
