
(function(){
'use strict';
const VERSION='v366';
const LABEL='Priorizada no segmento';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function isSchoolName(name){
  const n=norm(name);
  return !!n && (n.includes('escola municipal')||/^em\s/.test(n)||/^get\s/.test(n)||/^ciep\s/.test(n));
}
function context(section){
  if(section==='resultados')return {
    year:document.getElementById('somAnoEscolar')?.value||'',
    evaluation:document.getElementById('somModalidade')?.value||''
  };
  return {year:document.getElementById('adrAno')?.value||'',evaluation:'ADR'};
}
function creHintFrom(container){
  const txt=container?.querySelector?.('.bar-name > span:not(.v364-priority-badge)')?.textContent
    ||container?.textContent||'';
  const m=String(txt).match(/CRE\s*\d+/i);
  return m?m[0]:'';
}
function priority(name,section,cre=''){
  if(!isSchoolName(name))return false;
  const ctx=context(section);
  try{return typeof priorityMatchesContext==='function'&&!!priorityMatchesContext(name,ctx.year,ctx.evaluation,cre)}catch(_){return false}
}
function ensureNextToName(strong,section){
  if(!strong)return;
  const name=String(strong.dataset?.graSchoolName||strong.textContent||'').replace(LABEL,'').trim();
  if(!isSchoolName(name))return;
  const row=strong.closest('.bar-row')||strong.parentElement;
  const yes=priority(name,section,creHintFrom(row));
  const siblings=[...strong.parentElement.querySelectorAll(':scope > .v364-priority-badge')];
  let badge=siblings[0]||null;
  siblings.slice(1).forEach(x=>x.remove());
  if(yes&&!badge){
    badge=document.createElement('span');
    badge.className='v364-priority-badge';
    badge.textContent=LABEL;
    strong.insertAdjacentElement('afterend',badge);
  }
  if(badge){if(badge.textContent!==LABEL)badge.textContent=LABEL;const hide=!yes;if(badge.hidden!==hide)badge.hidden=hide}
}
function decorateBars(section,root){
  if(!root)return;
  root.querySelectorAll('.bar-row .bar-name strong').forEach(strong=>ensureNextToName(strong,section));
}
function decorateTables(section,root){
  if(!root)return;
  root.querySelectorAll('table').forEach(table=>{
    const heads=[...table.querySelectorAll('thead th')].map(th=>norm(th.textContent));
    const idx=heads.findIndex(h=>h==='escola'||h==='unidade');
    if(idx<0)return;
    const creIdx=heads.findIndex(h=>h==='cre'||h==='regional');
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const cell=tr.cells?.[idx];if(!cell)return;
      const anchor=cell.querySelector('[data-gra-school-name]')||cell.querySelector('strong');
      const name=String(anchor?.dataset?.graSchoolName||cell.dataset.v364SchoolName||cell.textContent||'').replace(LABEL,'').trim();
      if(!isSchoolName(name))return;
      const cre=creIdx>=0?String(tr.cells?.[creIdx]?.textContent||''):'';
      const yes=priority(name,section,cre);
      let badge=cell.querySelector(':scope > .v364-priority-badge');
      if(yes&&!badge){badge=document.createElement('span');badge.className='v364-priority-badge';badge.textContent=LABEL;cell.appendChild(badge)}
      if(badge){if(badge.textContent!==LABEL)badge.textContent=LABEL;const hide=!yes;if(badge.hidden!==hide)badge.hidden=hide}
    });
  });
}
function scan(){
  const som=document.getElementById('resultados'),adr=document.getElementById('adrs');
  decorateBars('resultados',som);decorateTables('resultados',som);
  decorateBars('adrs',adr);decorateTables('adrs',adr);
  document.querySelectorAll('#georreferenciamento .priority-badge,#georreferenciamento .v363-priority-badge,#georreferenciamento .v364-priority-badge').forEach(el=>el.style.setProperty('display','none','important'));
}
let queued=false;
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan()})}
function stamp(){
  document.documentElement.dataset.graVersion=VERSION;
  const badge=document.getElementById('dashboardVersionBadge');if(badge&&badge.textContent!==VERSION)badge.textContent=VERSION;
  document.querySelectorAll('.gra-start-version,.exp-badge,.gra-access-version').forEach(el=>{if(/^v?\d+/i.test(el.textContent||'')&&el.textContent!==VERSION)el.textContent=VERSION});
}
function boot(){
  stamp();scan();
  ['resultados','adrs'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(schedule).observe(el,{childList:true,subtree:true,characterData:true})});
  document.addEventListener('change',e=>{const id=e.target?.id||'';if(id.startsWith('som')||id.startsWith('adr')||id==='regionalScopeSelect')setTimeout(scan,0)},true);
  [0,300,900,1900,2900].forEach(ms=>setTimeout(()=>{stamp();scan()},ms));
  window.__GRA_V366__={
    version:VERSION,
    changes:[
      'Selo Priorizada no segmento ao lado das escolas em listas de Somativas e ADRs',
      'Melhores resultados e resultados mais desafiadores lado a lado nas Somativas',
      '8ª CRE: Escola Municipal Ernesto Franciscone transferida de Élina Lopes Cunha para Camila Ferreira De Morais'
    ],
    scan
  };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
