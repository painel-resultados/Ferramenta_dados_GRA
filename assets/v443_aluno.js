/* Ferramenta GRA v443 — extensão isolada: nunca bloqueia o carregamento original. */
(()=>{'use strict';
 const $=id=>document.getElementById(id), S={school:null,student:'',cls:'',disc:'LP',adr:3,records:null,activeLevel:'',drawerSchool:'',cre:'',list:[],loading:false};
 
 // Corrige a escape de '<' de forma independente de funções existentes.
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
 const pct=(a,b)=>b>0?Math.round(1000*a/b)/10:null;
 const num=v=>v==null||v===''?null:Number(v);
 const dateAdr=a=>`ADR ${a}`;
 const fmt=v=>Number.isFinite(v)?v.toLocaleString('pt-BR',{maximumFractionDigits:1}):'—';
 const catalogue=Array.isArray(window.GRA_V443_SCHOOLS)?window.GRA_V443_SCHOOLS:[];
 const schoolId=v=>String(v??'').replace(/[^0-9]/g,'');
 const cached=new Map();
 let requestGeneration=0; // Respostas antigas não podem substituir a escola atual.

 const skillName=(code,grade,disc,adr)=>{
   // Correspondência estrita: cada edição possui sua própria matriz.
   const ed='ADR '+String(adr),sub=String(disc).toUpperCase(),k=[ed,String(grade),sub,String(code).toUpperCase().trim()].join('|');
   return {name:window.GRA_V443_SKILL_MAP?.[k]||'',key:k};
 };
 function status(s,warning){const el=$('v443Status');if(el){el.textContent=s;el.style.color=warning?'#a55127':'';}}
 function currentCre(){let x=$('regionalScopeSelect')?.value||'';return String(x).replace(/[^0-9]/g,'');}
 function initCre(){let select=$('v443Cre');if(!select)return;select.innerHTML='<option value="">Todas as CREs</option>'+[...new Set(catalogue.map(x=>String(x.cre)))].sort((a,b)=>Number(a)-Number(b)).map(x=>`<option value="${esc(x)}">${esc(x)}ª CRE</option>`).join(''); if(currentCre()){select.value=currentCre()}S.cre=select.value;updateSchools();}
 function updateSchools(){const cre=$('v443Cre')?.value||'',select=$('v443School');S.school=null;S.records=null;S.student='';if(!select)return;const selected=catalogue.filter(x=>!cre||String(Number(x.cre))===String(Number(cre)));selected.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));S.list=selected;select.innerHTML='<option value="">Selecione a escola</option>'+selected.map(x=>`<option value="${esc(x.code)}">${esc(x.name)}</option>`).join('');fillClasses();status('Selecione uma escola para consultar os microdados individuais.');}
 function records(p){return (p?.rows||[]).map(r=>({stu:p.students[r[0]],cls:p.classes[r[1]],grade:r[2],disc:p.disciplines[r[3]],adr:r[4],prof:r[5],level:r[6],category:r[7],valid:r[8],hits:r[9],total:r[10],nota:r[11],skills:(r[12]||[]).map(x=>[p.skills[x[0]],x[1],x[2]])}));}
 async function loadSchool(code){
   code=schoolId(code);if(!code)return;
   const seq=++requestGeneration,found=catalogue.find(x=>String(x.code)===code);
   if(!found){status('Escola ausente do catálogo v443.',true);return;}
   if(cached.has(code)){
     S.school=found;S.records=cached.get(code);fillClasses();render();
     if($('v443Drawer')?.classList.contains('open'))renderRoster();return;
   }
   status('Consultando apenas os microdados desta escola...');S.loading=true;
   const base=String(window.GRA_V443_API_BASE||window.location.origin||'').replace(/\/$/,'');
   const url=`${base}/api/adr-aluno/school?code=${encodeURIComponent(code)}`;
   try{
     const response=await fetch(url,{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}});
     if(seq!==requestGeneration)return;
     if(!response.ok)throw new Error(response.status===401||response.status===403?'Acesso individual não autorizado pelo servidor':response.status===404?'Escola ainda não configurada no armazenamento privado':`HTTP ${response.status}: base privada indisponível`);
     if(!(response.headers.get('content-type')||'').includes('application/json'))throw new Error('Servidor não retornou JSON: confirme o acesso institucional à API');
     const data=await response.json();if(seq!==requestGeneration)return;
     acceptSchool(data,code);
     if($('v443Drawer')?.classList.contains('open'))renderRoster();
   }catch(err){
     if(seq!==requestGeneration)return;
     status(err.message+' — alternativamente importe o arquivo privado da escola pelo seletor abaixo.',true);
     S.school=found;S.records=null;fillClasses();render();
   }finally{if(seq===requestGeneration)S.loading=false;}
 }
 function acceptSchool(data,expected){if(data?.v!==443||!Array.isArray(data.rows)||!Array.isArray(data.students)||!Array.isArray(data.skills)||String(data.code)!==String(expected))throw new Error('Arquivo privado inválido ou incompatível com a escola selecionada.');const res=records(data);cached.clear();cached.set(expected,res);S.school=catalogue.find(x=>String(x.code)===String(expected))||{code:expected,name:data.name,cre:data.cre};S.records=res;fillClasses();status(`${res.length.toLocaleString('pt-BR')} resultados da escola carregados. Selecionar aluno, turma, edição e disciplina.`);render();}
 async function localImport(file){if(!file)return;try{const buf=await file.arrayBuffer();let decoded;const isGz=file.name.endsWith('.gz')||(new Uint8Array(buf))[0]===31;if(isGz){if(typeof DecompressionStream==='undefined')throw Error('Seu navegador não suporta descompactação GZIP local.');const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));decoded=await new Response(stream).text();}else decoded=new TextDecoder('utf-8').decode(buf);const data=JSON.parse(decoded),code=schoolId($('v443School').value);if(!code){status('Selecione a escola antes de importar o arquivo privado.',true);return;}acceptSchool(data,code);}catch(e){status('Não foi possível ler o arquivo privado: '+e.message,true);}}
 function fillClasses(){const data=S.records||[];const classes=[...new Map(data.map(x=>[x.cls?.[0],x.cls?.[1]]).filter(x=>x[0])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR',{numeric:true}));const sel=$('v443Class');if(sel){sel.innerHTML='<option value="">Todas as turmas</option>'+classes.map(x=>`<option value="${esc(x[0])}">${esc(x[1])}</option>`).join('');if(S.cls&&classes.some(x=>x[0]===S.cls))sel.value=S.cls;else S.cls='';}fillStudents();}
 function fillStudents(){const data=(S.records||[]).filter(x=>!S.cls||x.cls?.[0]===S.cls);const people=[...new Map(data.map(x=>[x.stu?.[0],x.stu?.[1]]).filter(x=>x[0])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));const sel=$('v443Student');if(sel){sel.innerHTML='<option value="">Selecione o aluno ou visualize a turma</option>'+people.map(x=>`<option value="${esc(x[0])}">${esc(x[1])}</option>`).join('');if(S.student&&people.some(x=>x[0]===S.student))sel.value=S.student;else S.student='';}}
 function getFiltered(){return (S.records||[]).filter(x=>(S.student?x.stu?.[0]===S.student:(!S.cls||x.cls?.[0]===S.cls))&&x.disc===S.disc);}
 function selected(){const a=Number($('v443Adr')?.value||S.adr);S.adr=a;S.disc=$('v443Disc')?.value||S.disc;return getFiltered().filter(x=>x.adr===a);}
 function chart(data,field,title){let series=[1,2,3].map(adr=>{const rows=data.filter(x=>x.adr===adr&&x.valid&&Number.isFinite(num(x[field]))),v=rows.length?rows.reduce((acc,x)=>acc+Number(x[field]),0)/rows.length:null;return{adr,v,n:rows.length};});const valid=series.filter(x=>x.v!==null);if(!valid.length)return '<p class="v443-empty">Sem resultados válidos da proficiência nesta disciplina para o recorte selecionado.</p>';
  const min=Math.min(...valid.map(x=>x.v)),max=Math.max(...valid.map(x=>x.v)),lo=Math.floor((min-10)/10)*10,hi=Math.ceil((max+10)/10)*10,x=a=>50+(a-1)*160,y=v=>160-(v-lo)/Math.max(hi-lo,1)*120;
  const lines=series.map((p,i)=>p.v!==null?`<circle cx="${x(p.adr)}" cy="${y(p.v)}" r="5" fill="#167fb6"><title>ADR ${p.adr}: ${fmt(p.v)} (${p.n} registro(s))</title></circle><text x="${x(p.adr)}" y="${y(p.v)-10}" text-anchor="middle" font-size="11" fill="#12385d">${fmt(p.v)}</text>`:'').join('');
  const segments=[];for(let i=1;i<3;i++)if(series[i-1].v!==null&&series[i].v!==null)segments.push(`<path d="M${x(i)} ${y(series[i-1].v)} L${x(i+1)} ${y(series[i].v)}" fill="none" stroke="#167fb6" stroke-width="3"/>`);
  return `<div class="v443-chart"><svg viewBox="0 0 430 202" role="img" aria-label="${esc(title)} — evolução da proficiência"><line x1="45" x2="393" y1="164" y2="164" stroke="#cbdfe9"/><line x1="45" x2="45" y1="25" y2="164" stroke="#cbdfe9"/><text x="43" y="27" text-anchor="end" font-size="11" fill="#6e8191">${fmt(hi)}</text><text x="43" y="160" text-anchor="end" font-size="11" fill="#6e8191">${fmt(lo)}</text>${segments.join('')}${lines}${series.map(p=>`<text x="${x(p.adr)}" y="188" text-anchor="middle" font-size="12" fill="#45647b">ADR ${p.adr}</text>`).join('')}</svg></div><p class="v443-privacy">Pontos ausentes não são interpretados como nota zero. Para turma, valores representam a média dos participantes disponíveis em cada edição.</p>`;
 }
 function skillBars(rows){
  const bySkill=new Map();
  for(const row of rows){
   if(!row.valid)continue;
   for(const [code,correct,total] of row.skills||[]){
    const c=Number(correct),t=Number(total);if(!code||!Number.isFinite(c)||!Number.isFinite(t)||t<=0)continue;
    const k=String(row.grade)+'|'+String(code);const old=bySkill.get(k)||{code,grade:row.grade,correct:0,total:0};
    old.correct+=c;old.total+=t;bySkill.set(k,old);
   }
  }
  const sorted=[...bySkill.values()].map(x=>({...x,value:pct(x.correct,x.total)})).filter(x=>x.value!==null).sort((a,b)=>b.value-a.value||a.code.localeCompare(b.code,'pt-BR'));
  if(!sorted.length)return '<p class="v443-empty">Não há resultados de habilidades válidos para esta seleção.</p>';
  return sorted.map(x=>{const info=skillName(x.code,x.grade,S.disc,S.adr);const descr=info.name||`Descrição oficial não localizada nesta edição`;
   return `<div class="v443-skill"><div class="v443-skill-name"><span>${esc(descr)} <small style="display:block;color:#75899a">${esc(x.code)} · ${esc(String(x.grade))}º ano · ${fmt(x.correct)}/${fmt(x.total)} itens${!info.name?' · pendente de matriz específica':''}</small></span><strong>${fmt(x.value)}%</strong></div><div class="v443-track"><span class="v443-bar" style="width:${Math.max(0,Math.min(100,x.value))}%"></span></div></div>`;
  }).join('');
 }
 function render(){const p=$('v443Profile'),e=$('v443Evolution'),h=$('v443Skills'),rec=S.records||[];if(!p||!e||!h)return;const item=S.student?rec.find(x=>x.stu?.[0]===S.student):null;const cls=S.cls?rec.find(x=>x.cls?.[0]===S.cls):null;const title=item?item.stu[1]:(cls?'Turma '+cls.cls[1]:'Escola inteira');p.innerHTML=`<div class="v443-summary"><span class="v443-pill"><b>Escola:</b> ${esc(S.school?.name||'Não selecionada')}</span><span class="v443-pill"><b>Seleção:</b> ${esc(title)}</span><span class="v443-pill"><b>Registros:</b> ${rec.length.toLocaleString('pt-BR')}</span></div>`;
 if(!rec.length){e.innerHTML='<p class="v443-empty">Para visualizar alunos e habilidades, selecione uma escola com dados privados disponíveis ou importe seu arquivo escolar local.</p>';h.innerHTML='';return;}
 const data=getFiltered();e.innerHTML=(S.disc==='LP'||S.disc==='MT')?chart(data,'prof','Evolução da proficiência'):chart(data.map(x=>({...x,resultado:x.valid&&x.total>0?100*x.hits/x.total:null})),'resultado','Evolução do percentual de acertos');h.innerHTML=skillBars(selected());}
 function openDrawer(school,level){
  S.activeLevel=level||'';S.drawerSchool=school||'';
  $('v443Overlay').classList.add('open');$('v443Drawer').classList.add('open');$('v443Drawer').setAttribute('aria-hidden','false');
  const found=catalogue.find(x=>norm(x.name)===norm(school));
  if(found && (!S.records||S.school?.code!==found.code)){
    $('v443DrawerContent').innerHTML='<p class="v443-status">Carregando apenas os alunos desta escola...</p>';
    loadSchool(found.code);
  }else renderRoster();
 }
 function closeDrawer(){$('v443Overlay')?.classList.remove('open');$('v443Drawer')?.classList.remove('open');$('v443Drawer')?.setAttribute('aria-hidden','true');}
 function renderRoster(){const target=$('v443DrawerContent');if(!target)return;target.innerHTML=`<p class="v443-status">${esc(S.drawerSchool)} — ${esc(S.activeLevel||'Todos os estratos')}.</p>`;
 const key=norm(S.drawerSchool||'');const found=catalogue.find(x=>norm(x.name)===key);
 if(!found){target.innerHTML+='<p class="v443-empty">Selecione uma escola específica para abrir os alunos.</p>';return;}
 const r=S.records&&S.school?.code===found.code?S.records:null;
 if(!r){target.innerHTML+=`<p class="v443-empty">Os dados privados desta escola ainda não estão carregados. Clique em “Abrir na aba Aluno” e utilize a conexão protegida ou importe o arquivo da escola.</p><button class="v443-btn" data-v443-go="${esc(found.code)}">Abrir na aba Aluno</button>`;return;}
 const adr=Number($('adrSelect')?.value?.match(/\d+/)?.[0]||S.adr||3),comp=$('adrComp')?.value||S.disc;
 const subject=norm(comp).includes('MAT')||norm(comp)==='MT'?'MT':'LP';
 const grade=Number(String($('adrAno')?.value||'').match(/\d+/)?.[0]||0);const matches=r.filter(x=>x.adr===adr&&x.disc===subject&&x.valid&&(!grade||x.grade===grade)&&(!S.activeLevel||norm(x.level)===norm(S.activeLevel)));
 const grouped=new Map();for(const row of matches){const [cid,cname]=row.cls||[];if(!grouped.has(cid))grouped.set(cid,{name:cname,items:new Map()});grouped.get(cid).items.set(row.stu?.[0],row.stu)}
 target.innerHTML+=`<p class="v443-note">${matches.length.toLocaleString('pt-BR')} registros · ADR ${adr} · ${subject}. Clique na turma ou no aluno para consultar a evolução.</p>`;
 if(!matches.length){target.innerHTML+='<p class="v443-empty">Nenhum aluno com resultado válido neste estrato e edição para esta escola.</p>';return;}
 target.innerHTML+=[...grouped].sort((a,b)=>String(a[1].name).localeCompare(String(b[1].name),'pt-BR',{numeric:true})).map(([cid,v])=>`<button class="v443-disclosure" data-v443-class="${esc(cid)}">Turma ${esc(v.name)} <span>${v.items.size} alunos ↗</span></button><div class="v443-names">${[...v.items].sort((a,b)=>String(a[1]?.[1]).localeCompare(String(b[1]?.[1]),'pt-BR')).map(([id,person])=>`<button class="v443-name-btn" data-v443-person="${esc(id)}" data-v443-classid="${esc(cid)}">${esc(person?.[1])}</button>`).join('')}</div>`).join('');
 }
 function navigate(code,student,cls){closeDrawer();const nav=document.querySelector('#nav [data-section="aluno"]');nav?.click();$('v443Cre').value=String(catalogue.find(x=>String(x.code)===String(code))?.cre||'');updateSchools();$('v443School').value=code;S.cls=cls||'';S.student=student||'';loadSchool(code).then(()=>{if(S.cls)$('v443Class').value=S.cls;fillStudents();if(S.student)$('v443Student').value=S.student;render();});}
 function addButtonsToLegacy(){const t=$('adrLevelList');if(!t)return;t.querySelectorAll('.adr-level-school').forEach(el=>{if(el.querySelector('.v443-level-shortcut'))return;const school=el.querySelector('.adr-level-school-main strong')?.textContent?.trim();if(!school)return;const b=document.createElement('button');b.type='button';b.className='v443-level-shortcut';b.textContent='Alunos deste estrato';b.dataset.v443School=school;el.appendChild(b);});}
 function fixVersion(){
   const badge=$('dashboardVersionBadge');if(badge && badge.textContent!=='v443')badge.textContent='v443';
   document.querySelectorAll('.gra-access-version,.gra-start-version').forEach(x=>{if(x.textContent!=='v443')x.textContent='v443';});
 }
 function install(){if(!$('v443Cre')||window.__GRA_V443_INSTALLED)return;window.__GRA_V443_INSTALLED=true;fixVersion();initCre();$('v443Cre').addEventListener('change',updateSchools);$('v443School').addEventListener('change',()=>loadSchool($('v443School').value));$('v443Class').addEventListener('change',()=>{S.cls=$('v443Class').value;S.student='';fillStudents();render()});$('v443Student').addEventListener('change',()=>{S.student=$('v443Student').value;render()});$('v443Disc').addEventListener('change',()=>{S.disc=$('v443Disc').value;render()});$('v443Adr').addEventListener('change',()=>{S.adr=Number($('v443Adr').value);render()});$('v443PrivateFile').addEventListener('change',e=>localImport(e.target.files?.[0]));$('regionalScopeSelect')?.addEventListener('change',()=>{const c=currentCre();if(c)$('v443Cre').value=c;updateSchools()});$('v443Close').addEventListener('click',closeDrawer);$('v443Overlay').addEventListener('click',closeDrawer);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});$('v443DrawerContent').addEventListener('click',e=>{const go=e.target.closest('[data-v443-go]');if(go)return navigate(go.dataset.v443Go,'','');const person=e.target.closest('[data-v443-person]'),cls=e.target.closest('[data-v443-class]');if(person||cls)return navigate(S.school?.code||'',person?.dataset.v443Person||'',person?.dataset.v443Classid||cls?.dataset.v443Class||'');});document.addEventListener('click',e=>{const b=e.target.closest('[data-v443-school]');if(b){e.preventDefault();e.stopPropagation();const title=$('adrLevelDrawerTitle')?.textContent||'';const level=title.split('—')[0].trim();window.adrCloseLevelDrawer?.();openDrawer(b.dataset.v443School,level)}},true);const old=$('adrLevelList');if(old){const ob=new MutationObserver(()=>addButtonsToLegacy());ob.observe(old,{childList:true,subtree:false});addButtonsToLegacy();}window.GRA_V443={openDrawer,loadSchool,acceptSchool,test:()=>({ready:!!$('aluno'),schools:catalogue.length,dictionary:Object.keys(window.GRA_V443_SKILL_MAP||{}).length,editionIsolated:!!window.GRA_V443_SKILL_MAP?.['ADR 1|2|LP|R1PLPLE04']&&!window.GRA_V443_SKILL_MAP?.['ADR 3|2|LP|R1PLPLE04']})};}
 if($('v443Cre'))install();else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 setTimeout(install,250);
})();
