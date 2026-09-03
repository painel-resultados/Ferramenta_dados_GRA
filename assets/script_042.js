
(function(){
'use strict';
const V='v366';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const txt=v=>String(v??'').trim();
const norm=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\bESCOLA MUNICIPAL\b/g,'EM').replace(/\bE\s*M\b/g,'EM').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const fmt=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=(v,d=1)=>Number.isFinite(Number(v))?fmt(v,d)+'%':'—';
const integer=v=>Number.isFinite(Number(v))?Math.round(Number(v)).toLocaleString('pt-BR'):'—';
const turmaCode=(year,ord)=>{const y=parseInt(String(year),10),base=({2:12,4:14,8:18})[y],n=Number(ord);return base&&Number.isFinite(n)?base*100+n:n};
const esc=v=>txt(v).replace(/[&<>\"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));
let drillState={school:null,year:'',comp:'',category:'',schoolFromList:false,lastSchoolFocus:null,lastTurmaFocus:null};

function clickExisting(selector){const b=$(selector);if(b){b.click();return true}return false}
function insertBack(drawer,header,action,label){
  if(!drawer||!header||header.querySelector(':scope > .v307-back'))return;
  header.classList.add('v307-has-back');
  const b=document.createElement('button');b.type='button';b.className='v307-back';b.textContent='←';b.setAttribute('aria-label',label||'Voltar à camada anterior');b.title=label||'Voltar';b.addEventListener('click',action);header.prepend(b);
}
function enhanceNavigation(){
  const detail=$('#detailDrawer');insertBack(detail,detail?.querySelector('.drawer-head'),()=>{try{window.closeDetailDrawer?.()}catch(_){clickExisting('#detailDrawer .drawer-close')}},'Voltar à visualização anterior');
  const adr=$('#adrLevelDrawer');insertBack(adr,adr?.querySelector('.adr-level-drawer-head'),()=>clickExisting('#adrLevelClose'),'Voltar à rosca da ADR');
  const extra=$('#v249ExtraDrawer');insertBack(extra,extra?.querySelector('.adr-level-drawer-head'),()=>clickExisting('#v249ExtraClose'),'Voltar à rosca da ADR');
  const strata=$('#v172IdebStrataDrawer');insertBack(strata,strata?.querySelector('.v172-strata-head'),()=>clickExisting('#v172IdebStrataDrawer .v172-strata-close'),'Voltar ao IDEB');
  const ideb=$('#v181IdebSchoolDrawer');insertBack(ideb,ideb?.querySelector('.v181-school-head'),()=>clickExisting('#v181IdebSchoolDrawer .v181-school-close'),'Voltar ao IDEB');
  const geo=$('#geoDetail');insertBack(geo,geo?.querySelector('.geo-detail-head'),()=>{try{window.geoCloseDetail?.()}catch(_){clickExisting('#geoDetail .geo-detail-close')}},'Voltar ao mapa');
  const cls=$('#expClassDrawer');insertBack(cls,cls?.querySelector('header'),()=>clickExisting('#expClassDrawer [data-exp-close="all"]'),'Voltar à ADR');
  const stu=$('#expStudentDrawer');if(stu){
    const h=stu.querySelector('header'),old=stu.querySelector('[data-exp-close="student"]');
    if(old&&!old.classList.contains('v307-back')){h?.classList.add('v307-has-back');old.classList.add('v307-back');old.textContent='←';old.title='Voltar às turmas';old.setAttribute('aria-label','Voltar às turmas');}
    if(h&&!h.querySelector('.v307-close-all')){const x=document.createElement('button');x.type='button';x.className='v307-close-all';x.textContent='×';x.title='Fechar detalhamento';x.setAttribute('aria-label','Fechar detalhamento');x.addEventListener('click',()=>clickExisting('#expClassDrawer [data-exp-close="all"]'));h.appendChild(x);}
  }
}

function ensureSimDrawers(){
  if($('#sim307SchoolDrawer'))return;
  document.body.insertAdjacentHTML('beforeend',`<div class="sim307-backdrop" id="sim307SchoolBackdrop" aria-hidden="true"></div><aside class="sim307-drawer" id="sim307SchoolDrawer" aria-hidden="true" aria-labelledby="sim307SchoolTitle"><header class="sim307-head"><button type="button" class="v307-back" id="sim307SchoolBack" aria-label="Voltar às escolas" title="Voltar às escolas">←</button><small id="sim307SchoolKicker">Simulado 2026 · escola</small><h3 id="sim307SchoolTitle">Escola</h3><p id="sim307SchoolMeta"></p><button type="button" class="sim307-head-close" id="sim307SchoolClose" aria-label="Fechar detalhamento" title="Fechar">×</button></header><div class="sim307-body" id="sim307SchoolBody"></div></aside><div class="sim307-backdrop turma" id="sim307TurmaBackdrop" aria-hidden="true"></div><aside class="sim307-drawer turma" id="sim307TurmaDrawer" aria-hidden="true" aria-labelledby="sim307TurmaTitle"><header class="sim307-head"><button type="button" class="v307-back" id="sim307TurmaBack" aria-label="Voltar à escola" title="Voltar à escola">←</button><small>Simulado 2026 · turma</small><h3 id="sim307TurmaTitle">Turma</h3><p id="sim307TurmaMeta"></p><button type="button" class="sim307-head-close" id="sim307TurmaClose" aria-label="Fechar detalhamento" title="Fechar">×</button></header><div class="sim307-body" id="sim307TurmaBody"></div></aside>`);
  $('#sim307SchoolBack')?.addEventListener('click',closeSchoolOnly);$('#sim307SchoolBackdrop')?.addEventListener('click',closeSchoolOnly);
  $('#sim307TurmaBack')?.addEventListener('click',closeTurmaOnly);$('#sim307TurmaBackdrop')?.addEventListener('click',closeTurmaOnly);
  $('#sim307SchoolClose')?.addEventListener('click',closeSimAll);$('#sim307TurmaClose')?.addEventListener('click',closeSimAll);
  $('#sim307SchoolBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-sim307-turma]');if(b)openTurma(Number(b.dataset.sim307Turma),b);const l=e.target.closest('[data-sim307-level]');if(l)selectLevel(l,$('#sim307SchoolBody'));});
  $('#sim307TurmaBody')?.addEventListener('click',e=>{const l=e.target.closest('[data-sim307-level]');if(l)selectLevel(l,$('#sim307TurmaBody'));});
}
function currentYearComp(){return {year:$('#somAnoEscolar')?.value||'',comp:$('#somComponente')?.value||'LP'}}
function findSchool(cre,school,year,comp){
  const all=Array.isArray(window.SIMULADO2026_SCHOOL_ROWS)?window.SIMULADO2026_SCHOOL_ROWS:(typeof SIMULADO2026_SCHOOL_ROWS!=='undefined'&&Array.isArray(SIMULADO2026_SCHOOL_ROWS)?SIMULADO2026_SCHOOL_ROWS:[]);
  const key=norm(cre+'|'+school);return all.find(r=>r?.anoEscolar===year&&r?.componente===comp&&norm((r?.cre||'')+'|'+(r?.escolaFonte||r?.escola||''))===key)||all.find(r=>r?.anoEscolar===year&&r?.componente===comp&&norm(r?.escolaFonte||r?.escola||'')===norm(school))||null;
}
function uniqueCurrentSchool(){
  let rows=[];try{rows=typeof window.somFilteredRows==='function'?(window.somFilteredRows()||[]):typeof somFilteredRows==='function'?(somFilteredRows()||[]):[]}catch(_){rows=[]}
  const map=new Map();rows.forEach(r=>{if(!r?.escola)return;const k=norm((r.cre||'')+'|'+r.escola);if(!map.has(k))map.set(k,r)});if(map.size!==1)return null;const r=[...map.values()][0],yc=currentYearComp();return findSchool(r.cre||'',r.escolaFonte||r.escola||'',yc.year,yc.comp);
}
function levelsHtml(levels,note){
  const a=(levels||[]).map(n=>({label:txt(n?.[0]),count:Number(n?.[1])||0})).filter(x=>x.label&&x.count>0),total=a.reduce((s,x)=>s+x.count,0);if(!total)return '<div class="sim307-note">A base não possui distribuição por níveis para este recorte.</div>';
  const bar=a.map((x,i)=>{const p=x.count/total*100;return `<button type="button" data-sim307-level="${i}" style="width:${Math.max(0,p)}%" aria-label="${esc(x.label)}: ${integer(x.count)} estudantes, ${pct(p,1)}" title="${esc(x.label)} · ${integer(x.count)} estudantes · ${pct(p,1)}"></button>`}).join('');
  const grid=a.map(x=>{const p=x.count/total*100;return `<div><b>${esc(x.label)}</b><span>${integer(x.count)} estudantes · ${pct(p,1)}</span></div>`}).join('');
  return `<div class="sim307-levelbar">${bar}</div><div class="sim307-levelgrid">${grid}</div><div class="sim307-note" data-sim307-level-note>${esc(note||'Clique em um nível para destacá-lo.')}</div>`;
}
function selectLevel(btn,root){root?.querySelectorAll('[data-sim307-level]').forEach(x=>x.classList.toggle('selected',x===btn));const n=root?.querySelector('[data-sim307-level-note]');if(n)n.textContent=(btn.getAttribute('aria-label')||'Nível selecionado')+'. A base agregada não contém os nomes dos estudantes deste nível.'}
function schoolMetricCards(r,year,comp){
  const part=Number(r?.participacaoPct),prof=Number(r?.proficiencia),np=Number(r?.notaPadronizadaComponente),geral=Number(r?.notaMedia),alf=Number(r?.alfabetizacaoPct),adq=Number(r?.adqAv);let metric='—',ml='Resultado';
  if(year==='2º ano'){metric=fmt(prof,0);ml='Proficiência';}else{metric=fmt(np,1);ml=comp==='LP'?'NP Língua Portuguesa':'NP Matemática';}
  const secondary=year==='2º ano'?(comp==='LP'?pct(alf,1):pct(adq,1)):fmt(geral,1),sl=year==='2º ano'?(comp==='LP'?'Alfabetização':'Adequado + Avançado'):'Nota média LP + MT';
  return `<div class="sim307-kpis"><div class="sim307-kpi"><b>${metric}</b><span>${ml}</span></div><div class="sim307-kpi"><b>${secondary}</b><span>${sl}</span></div><div class="sim307-kpi"><b>${integer(r?.avaliados)}</b><span>Efetivos</span></div><div class="sim307-kpi"><b>${pct(part,1)}</b><span>Participação</span></div></div>`;
}
function turmaRows(r,year,comp){
  const ts=r?.turmas||[];if(!ts.length)return '<div class="sim307-note">Não há linhas de turma disponíveis para esta escola neste componente.</div>';
  const other=(year==='4º ano'||year==='8º ano')?findSchool(r.cre||'',r.escolaFonte||r.escola||'',year,comp==='LP'?'MT':'LP'):null,om=new Map((other?.turmas||[]).map(t=>[Number(t.ord),t]));
  return `<div class="sim307-turmas">${ts.map(t=>{const o=om.get(Number(t.ord)),lp=comp==='LP'?t:o,mt=comp==='MT'?t:o;let primary='',secondary='';if(year==='2º ano'){primary=`Prof. ${fmt(t.proficiencia,0)}`;secondary=comp==='LP'?`Alfa ${pct(t.alfabetizacaoPct,1)}`:`ADQ+AVA ${pct(t.adqAv,1)}`;}else{primary=`LP ${fmt(lp?.notaPadronizadaComponente,1)} · MT ${fmt(mt?.notaPadronizadaComponente,1)}`;secondary=`Geral ${fmt(Number.isFinite(Number(lp?.notaMedia))?lp?.notaMedia:mt?.notaMedia,1)}`;}return `<button type="button" class="sim307-turma-row" data-sim307-turma="${Number(t.ord)}"><strong>Turma ${turmaCode(year,t.ord)}</strong><span>${integer(t.avaliados)} efetivos</span><b>${pct(t.participacaoPct,1)}</b><b class="sim307-hide-mobile">${esc(primary)} · ${esc(secondary)}</b></button>`}).join('')}</div><div class="sim307-note">Identificação das turmas pela ordem oficial das linhas na planilha: 2º ano = 1201, 1202…; 4º ano = 1401, 1402…; 8º ano = 1801, 1802…. Se houver uma única turma, ela é sempre a turma 01.</div>`;
}
function moreSchool(r){
  const nivel=Number.isFinite(Number(r?.nivelDesempenho))?'Nível '+Number(r.nivelDesempenho):'—';return `<details class="sim307-more"><summary>Mais indicadores</summary><div class="sim307-more-body"><div><b>${integer(r?.presentes)}</b><span>Presentes · ${pct(r?.presencaPct,1)}</span></div><div><b>${pct(r?.acertoPct,1)}</b><span>Acerto médio no teste</span></div><div><b>${nivel}</b><span>Nível de desempenho</span></div><div><b>${esc(r?.padraoDesempenho||'—')}</b><span>Padrão · desvio padrão ${fmt(r?.desvioPadrao,1)}</span></div></div></details>`;
}
function openSchool(cre,school,category,focus){
  ensureSimDrawers();const {year,comp}=currentYearComp(),r=findSchool(cre,school,year,comp);if(!r)return;drillState={...drillState,school:r,year,comp,category:category||'',schoolFromList:$('#detailDrawer')?.classList.contains('open'),lastSchoolFocus:focus||document.activeElement};
  $('#sim307SchoolKicker').textContent=`Simulado 2026 · ${category||'escola'}`;$('#sim307SchoolTitle').textContent=r.escola||school;$('#sim307SchoolMeta').textContent=`${r.cre||cre} · ${year} · ${comp==='LP'?'Língua Portuguesa':'Matemática'} · volte pela seta sem perder o recorte`;
  $('#sim307SchoolBody').innerHTML=schoolMetricCards(r,year,comp)+`<section class="sim307-section"><h4>Distribuição por níveis</h4><p>Somente níveis efetivamente ocupados neste ano/componente.</p>${levelsHtml(r.niveis,'Clique em um nível para destacar a distribuição da escola.')}</section><section class="sim307-section"><h4>Desempenho por turma</h4><p>Abra uma turma para aprofundar a leitura e use a seta para retornar à escola.</p>${turmaRows(r,year,comp)}</section>`+moreSchool(r);
  $('#sim307SchoolBackdrop').classList.add('open');$('#sim307SchoolDrawer').classList.add('open');$('#sim307SchoolDrawer').setAttribute('aria-hidden','false');document.body.classList.add('sim307-drawer-open');setTimeout(()=>$('#sim307SchoolBack')?.focus({preventScroll:true}),70);
}
function openTurma(ord,focus){
  ensureSimDrawers();const r=drillState.school||uniqueCurrentSchool();if(!r)return;const {year,comp}=drillState.year?drillState:currentYearComp(),t=(r.turmas||[]).find(x=>Number(x.ord)===Number(ord));if(!t)return;drillState.school=r;drillState.year=year;drillState.comp=comp;drillState.lastTurmaFocus=focus||document.activeElement;
  const other=(year==='4º ano'||year==='8º ano')?findSchool(r.cre||'',r.escolaFonte||r.escola||'',year,comp==='LP'?'MT':'LP'):null,o=(other?.turmas||[]).find(x=>Number(x.ord)===Number(ord)),lp=comp==='LP'?t:o,mt=comp==='MT'?t:o;let result='';
  if(year==='2º ano')result=`<div class="sim307-kpis"><div class="sim307-kpi"><b>${fmt(t.proficiencia,0)}</b><span>Proficiência</span></div><div class="sim307-kpi"><b>${comp==='LP'?pct(t.alfabetizacaoPct,1):pct(t.adqAv,1)}</b><span>${comp==='LP'?'Alfabetização':'Adequado + Avançado'}</span></div><div class="sim307-kpi"><b>${integer(t.avaliados)}</b><span>Efetivos</span></div><div class="sim307-kpi"><b>${pct(t.participacaoPct,1)}</b><span>Participação</span></div></div>`;
  else result=`<div class="sim307-kpis"><div class="sim307-kpi"><b>${fmt(lp?.notaPadronizadaComponente,1)}</b><span>NP Língua Portuguesa</span></div><div class="sim307-kpi"><b>${fmt(mt?.notaPadronizadaComponente,1)}</b><span>NP Matemática</span></div><div class="sim307-kpi"><b>${fmt(Number.isFinite(Number(lp?.notaMedia))?lp?.notaMedia:mt?.notaMedia,1)}</b><span>Nota média</span></div><div class="sim307-kpi"><b>${pct(t.participacaoPct,1)}</b><span>Participação</span></div></div>`;
  $('#sim307TurmaTitle').textContent=`Turma ${turmaCode(year,ord)}`;$('#sim307TurmaMeta').textContent=`${r.escola} · ${year} · ${comp==='LP'?'Língua Portuguesa':'Matemática'}`;$('#sim307TurmaBody').innerHTML=result+`<section class="sim307-section"><h4>Distribuição por níveis</h4><p>Distribuição agregada da turma na planilha da CGRA.</p>${levelsHtml(t.niveis,'A base recebida não identifica nominalmente os alunos desta turma.')}</section><div class="sim307-note"><strong>Próxima camada: alunos.</strong> O Excel da CGRA não contém nomes nem códigos individuais. A seta retorna à escola sem fechar o restante do aprofundamento; a camada de alunos será conectada quando a base nominal estiver disponível.</div>`;
  $('#sim307TurmaBackdrop').classList.add('open');$('#sim307TurmaDrawer').classList.add('open');$('#sim307TurmaDrawer').setAttribute('aria-hidden','false');document.body.classList.add('sim307-drawer-open');setTimeout(()=>$('#sim307TurmaBack')?.focus({preventScroll:true}),70);
}
function closeTurmaOnly(){const d=$('#sim307TurmaDrawer'),b=$('#sim307TurmaBackdrop');d?.classList.remove('open');d?.setAttribute('aria-hidden','true');b?.classList.remove('open');if(!$('#sim307SchoolDrawer')?.classList.contains('open'))document.body.classList.remove('sim307-drawer-open');setTimeout(()=>drillState.lastTurmaFocus?.focus?.({preventScroll:true}),70)}
function closeSchoolOnly(){closeTurmaOnly();const d=$('#sim307SchoolDrawer'),b=$('#sim307SchoolBackdrop');d?.classList.remove('open');d?.setAttribute('aria-hidden','true');b?.classList.remove('open');document.body.classList.remove('sim307-drawer-open');setTimeout(()=>drillState.lastSchoolFocus?.focus?.({preventScroll:true}),70)}
function closeSimAll(){closeTurmaOnly();closeSchoolOnly();const detail=$('#detailDrawer');if(detail?.classList.contains('open')&&detail.classList.contains('sim307-drill-list')){try{window.closeDetailDrawer?.()}catch(_){clickExisting('#detailDrawer .drawer-close')}}}

function decorateSimList(){
  const d=$('#detailDrawer'),title=$('#drawerTitle')?.textContent||'',active=$('#somModalidade')?.value==='Simulado 2026'&&/escolas com mais alunos/i.test(title);d?.classList.toggle('sim307-drill-list',!!active);if(!active)return;
  const sub=$('#drawerSubtitle');if(sub&&!/Clique em uma escola/i.test(sub.textContent))sub.textContent+=' Clique em uma escola para abrir suas turmas e use a seta para voltar.';
  $$('#drawerTable tbody tr').forEach(tr=>{tr.tabIndex=0;tr.setAttribute('role','button');tr.setAttribute('aria-label','Abrir detalhamento da escola '+(tr.cells?.[2]?.textContent||''));});
}
function listDrill(e){
  const tr=e.target.closest?.('#detailDrawer.sim307-drill-list #drawerTable tbody tr');if(!tr)return;if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;if(e.type==='keydown')e.preventDefault();const cre=txt(tr.cells?.[1]?.textContent),school=txt(tr.cells?.[2]?.textContent),category=txt($('#drawerTitle')?.textContent).split('—')[0].trim();if(school)openSchool(cre,school,category,tr);
}
function inlineTurmaDrill(e){const tr=e.target.closest?.('#sim306DetailCard tr[data-sim306-turma]');if(!tr)return;e.preventDefault();e.stopImmediatePropagation();const r=uniqueCurrentSchool();if(!r)return;const yc=currentYearComp();drillState={...drillState,school:r,year:yc.year,comp:yc.comp,category:'',schoolFromList:false,lastTurmaFocus:tr};openTurma(Number(tr.dataset.sim306Turma),tr)}
function observer(){const mo=new MutationObserver(()=>{enhanceNavigation();decorateSimList()});mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});}
function stamp(){const b=$('#dashboardVersionBadge');if(b)b.textContent=V;$$('.gra-start-version,.exp-badge').forEach(el=>{if(/^v?\d+/i.test(el.textContent||''))el.textContent=V});document.title=document.title.replace(/\bv30[2-9]\b/ig,V);document.documentElement.dataset.graVersion=V}
function boot(){ensureSimDrawers();enhanceNavigation();decorateSimList();observer();document.addEventListener('click',listDrill,true);document.addEventListener('keydown',listDrill,true);document.addEventListener('click',inlineTurmaDrill,true);document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('#sim307TurmaDrawer')?.classList.contains('open'))closeTurmaOnly();else if($('#sim307SchoolDrawer')?.classList.contains('open'))closeSchoolOnly()});['somModalidade','somAnoEscolar','somComponente','regionalScopeSelect','somAgente'].forEach(id=>$('#'+id)?.addEventListener('change',()=>{if($('#sim307SchoolDrawer')?.classList.contains('open')||$('#sim307TurmaDrawer')?.classList.contains('open'))closeSimAll()}));stamp();setTimeout(()=>{stamp();enhanceNavigation();decorateSimList()},800);window.__GRA_V308_NAV__={version:V,openSchool,openTurma,closeSimAll};window.__GRA_V307_NAV__=window.__GRA_V308_NAV__}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
