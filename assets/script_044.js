
(function(){
'use strict';
const V='v366';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const txt=v=>String(v??'').trim();
const norm=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\bESCOLA MUNICIPAL\b/g,'EM').replace(/\bE\s*M\b/g,'EM').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const esc=v=>txt(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=(v,d=1)=>Number.isFinite(Number(v))?fmt(v,d)+'%':'—';
let lastFocus=null;

function currentRows(){try{return typeof window.somFilteredRows==='function'?(window.somFilteredRows()||[]):typeof somFilteredRows==='function'?(somFilteredRows()||[]):[]}catch(_){return []}}
function year(){return $('#somAnoEscolar')?.value||''}
function comp(){return $('#somComponente')?.value||'LP'}
function compLabel(){return comp()==='LP'?'Língua Portuguesa':'Matemática'}
function creNumber(v){const m=String(v||'').match(/\d{1,2}/);return m?Number(m[0]):0}
function creLabel(v){const n=creNumber(v);return n?`${n}ª CRE`:txt(v)}
function metric(r){
  const y=year(),c=comp();
  if(y==='2º ano')return {value:fmt(r?.proficiencia,0),label:c==='LP'?`Alfa ${pct(r?.alfabetizacaoPct,1)}`:`ADQ+AVA ${pct(r?.adqAv,1)}`};
  return {value:fmt(r?.notaPadronizadaComponente,1),label:`NP ${c} · geral ${fmt(r?.notaMedia,1)}`};
}
function schoolsAtLevel(level){
  const y=year(),c=comp(),map=new Map();
  currentRows().forEach(r=>{
    if(!r||r._afCreAggregate||r.anoEscolar!==y)return;
    if(c&&r.componente!==c&&r.componente!=='LP+MT')return;
    if(Number(r.nivelDesempenho)!==Number(level))return;
    const school=txt(r.escola||r.escolaFonte),cre=txt(r.cre||r.regional);if(!school)return;
    const key=norm(cre+'|'+school);if(!map.has(key))map.set(key,r);
  });
  return [...map.values()].sort((a,b)=>txt(a.escola).localeCompare(txt(b.escola),'pt-BR',{sensitivity:'base'}));
}
function ensureDrawer(){
  if($('#sim311LevelDrawer'))return;
  document.body.insertAdjacentHTML('beforeend',`<div class="sim307-backdrop sim311-level-backdrop" id="sim311LevelBackdrop" aria-hidden="true"></div><aside class="sim307-drawer sim311-level-drawer" id="sim311LevelDrawer" aria-hidden="true" aria-labelledby="sim311LevelTitle"><header class="sim307-head"><button type="button" class="v307-back" id="sim311LevelBack" aria-label="Voltar à distribuição por níveis" title="Voltar à distribuição">←</button><small>Simulado 2026 · escolas por nível</small><h3 id="sim311LevelTitle">Escolas do nível</h3><p id="sim311LevelMeta"></p><button type="button" class="sim307-head-close" id="sim311LevelClose" aria-label="Fechar lista" title="Fechar">×</button></header><div class="sim307-body" id="sim311LevelBody"></div></aside>`);
  $('#sim311LevelBack')?.addEventListener('click',closeDrawer);$('#sim311LevelClose')?.addEventListener('click',closeDrawer);$('#sim311LevelBackdrop')?.addEventListener('click',closeDrawer);
  $('#sim311LevelBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-sim311-school]');if(!b)return;selectSchool(b.dataset.sim311Cre||'',b.dataset.sim311School||'',b);});
}
function closeDrawer(){
  const d=$('#sim311LevelDrawer'),b=$('#sim311LevelBackdrop');d?.classList.remove('open');d?.setAttribute('aria-hidden','true');b?.classList.remove('open');
  if(!$('.sim307-drawer.open'))document.body.classList.remove('sim307-drawer-open');
  const f=lastFocus;lastFocus=null;setTimeout(()=>f?.focus?.({preventScroll:true}),60);
}
function openLevel(level,focus){
  const rows=schoolsAtLevel(level);if(!rows.length)return;ensureDrawer();lastFocus=focus||document.activeElement;
  const scope=$('#regionalScopeSelect')?.selectedOptions?.[0]?.textContent?.trim()||'Toda a SME';
  $('#sim311LevelTitle').textContent=`Nível N${level}`;
  $('#sim311LevelMeta').textContent=`${rows.length} escola${rows.length===1?'':'s'} · ${scope} · ${year()} · ${compLabel()}`;
  const items=rows.map(r=>{const m=metric(r),school=txt(r.escola||r.escolaFonte),cre=txt(r.cre||r.regional);return `<button type="button" class="sim311-school-item" data-sim311-school="${esc(school)}" data-sim311-cre="${esc(cre)}"><span class="sim311-school-main"><strong>${esc(school)}</strong><span>${esc(creLabel(cre))} · participação ${pct(r.participacaoPct,1)}</span></span><span class="sim311-school-metric"><b>${esc(m.value)}</b><span>${esc(m.label)}</span></span></button>`}).join('');
  $('#sim311LevelBody').innerHTML=`<div class="sim311-level-summary">Clique em uma escola para aplicá-la como seleção do Simulado. A lista será fechada e a página voltará automaticamente ao identificador da escola selecionada.</div><div class="sim311-school-list">${items}</div>`;
  $('#sim311LevelBackdrop').classList.add('open');$('#sim311LevelDrawer').classList.add('open');$('#sim311LevelDrawer').setAttribute('aria-hidden','false');document.body.classList.add('sim307-drawer-open');setTimeout(()=>$('#sim311LevelBack')?.focus({preventScroll:true}),60);
}
function uniqueSchoolCount(rows){const set=new Set();(rows||[]).forEach(r=>{const n=txt(r?.escola);if(n)set.add(norm((r?.cre||'')+'|'+n))});return set.size}
function scrollToSelected(){
  const filters=$('#somFiltersCard');
  if(filters){filters.scrollIntoView({behavior:'smooth',block:'start'});return true}
  return false;
}
function applySearch(value){const input=$('#somSearch');if(!input)return false;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));return true}
function selectSchool(cre,school){
  closeDrawer();if(!school)return;
  applySearch(school);
  setTimeout(()=>{
    const rows=currentRows();
    if(uniqueSchoolCount(rows)!==1&&cre)applySearch(`${cre} ${school}`);
    if(window.__GRA_V304_SCHOOL_CONTEXT__?.update)try{window.__GRA_V304_SCHOOL_CONTEXT__.update()}catch(_){ }
    requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(scrollToSelected,50)));
  },20);
}
function clickLevel(e){const b=e.target.closest?.('[data-sim311-school-level]');if(!b||!b.closest('.sim310-school-levels'))return;const level=Number(b.dataset.sim311SchoolLevel);if(!Number.isFinite(level))return;e.preventDefault();openLevel(level,b)}
function stamp(){const b=$('#dashboardVersionBadge');if(b)b.textContent=V;$$('.gra-start-version,.exp-badge').forEach(el=>{if(/^v?\d+/i.test(el.textContent||''))el.textContent=V});document.documentElement.dataset.graVersion=V}
function cleanupStrayText(){[...document.body.childNodes].forEach(n=>{if(n.nodeType!==Node.TEXT_NODE)return;const v=String(n.nodeValue||'');if(v.includes('\\n')&&v.replace(/\\n/g,'').trim()==='')n.remove()})}
function boot(){cleanupStrayText();ensureDrawer();document.addEventListener('click',clickLevel,true);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#sim311LevelDrawer')?.classList.contains('open'))closeDrawer()});stamp();setTimeout(()=>{cleanupStrayText();stamp()},900);setTimeout(()=>{cleanupStrayText();stamp()},2100);window.__GRA_V311__={version:V,openLevel,selectSchool,schoolsAtLevel}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
