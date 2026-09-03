
(function(){
'use strict';
const LABEL='Priorizada no segmento';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const creNum=v=>{const m=String(v??'').match(/\d{1,2}/);return m?Number(m[0]):0};
function scopeFrom(year='',evaluation=''){
  try{if(typeof priorityScopeFromContext==='function')return priorityScopeFromContext(year,evaluation)||''}catch(_){ }
  const y=norm(year),e=norm(evaluation);
  if(e==='avalia rj')return 'ALFA';
  if(y==='ai'||y.includes('anos iniciais'))return 'AI';
  if(y==='af'||y.includes('anos finais'))return 'AF';
  if(/(^|\D)(1|2)\s*[oº]?\s*ano/.test(y))return 'ALFA';
  if(/(^|\D)(3|4|5)\s*[oº]?\s*ano/.test(y))return 'AI';
  if(/(^|\D)(7|8|9)\s*[oº]?\s*ano/.test(y))return 'AF';
  return '';
}
function context(section){
  if(section==='resultados')return {
    year:document.getElementById('somAnoEscolar')?.value||'',
    evaluation:document.getElementById('somModalidade')?.value||'',
    cre:document.getElementById('somCre')?.value||document.getElementById('regionalScopeSelect')?.value||''
  };
  return {
    year:document.getElementById('adrAno')?.value||'',
    evaluation:'ADR',
    cre:document.getElementById('adrCre')?.value||document.getElementById('regionalScopeSelect')?.value||''
  };
}
function metaForSchool(name){
  try{return typeof priorityMetaForSchool==='function'?priorityMetaForSchool(name):null}catch(_){return null}
}
function isPriority(name,section,creHint=''){
  if(!name)return false;
  const ctx=context(section),cre=creHint||ctx.cre||'';
  try{
    if(typeof priorityMatchesContext==='function'&&priorityMatchesContext(name,ctx.year,ctx.evaluation,cre))return true;
  }catch(_){ }
  /* Algumas bases estruturais (notadamente parte da 5ª CRE) registram apenas
     "Prioritária", sem recorte textual. Nesses casos, o segmento EF da própria
     unidade é usado somente para decidir a exibição do selo, sem alterar os dados. */
  const meta=metaForSchool(name);if(!meta)return false;
  const requested=creNum(cre),actual=Number(meta.record?.cre||0);if(requested&&actual&&requested!==actual)return false;
  const type=norm(meta.type||''),scope=scopeFrom(ctx.year,ctx.evaluation);
  if(type.includes('alfabet')||type.includes('alfa'))return scope==='ALFA';
  if(type.includes('iniciais'))return scope==='AI';
  if(type.includes('finais'))return scope==='AF';
  if(type==='prioritaria'||(!meta.scope&&type)){
    const plan=norm(meta.record?.planoAcao||'');
    if(!scope)return true;
    if(scope==='AI')return /(^|\s)ef\s+ai(\s|$|\s*&)/.test(plan)||plan.includes('ai & af');
    if(scope==='AF')return /(^|\s)ef\s+af(\s|$)/.test(plan)||plan.includes('ai & af');
    return false;
  }
  return false;
}
function makeBadge(){const b=document.createElement('span');b.className='v364-priority-badge';b.textContent=LABEL;b.setAttribute('aria-label',LABEL);return b}
function setBadge(anchor,name,section,creHint=''){
  if(!anchor||!name)return;
  let badge=anchor.nextElementSibling?.classList?.contains('v364-priority-badge')?anchor.nextElementSibling:null;
  const yes=isPriority(name,section,creHint);
  if(yes&&!badge){badge=makeBadge();anchor.insertAdjacentElement('afterend',badge)}
  if(badge)badge.hidden=!yes;
}
function creFromText(text){const n=creNum(text);return n?`${n}ª CRE`:''}
function decorateBanner(section,id){
  const banner=document.getElementById(id);if(!banner)return;
  const nameEl=banner.querySelector('.school-focus-name'),badge=banner.querySelector('.v363-priority-badge');if(!nameEl||!badge)return;
  const name=nameEl.textContent.trim();const cre=creFromText(banner.querySelector('.school-focus-meta')?.textContent||'');
  if(badge.textContent!==LABEL)badge.textContent=LABEL;const hide=!name||!isPriority(name,section,cre);if(badge.hidden!==hide)badge.hidden=hide;
}
function decorateTable(section,table){
  if(!table?.tHead||!table.tBodies?.length)return;
  const heads=[...table.tHead.querySelectorAll('th')].map(th=>norm(th.textContent));
  const schoolIdx=heads.findIndex(h=>h==='escola'||h==='unidade');if(schoolIdx<0)return;
  const creIdx=heads.findIndex(h=>h==='cre'||h==='regional');
  [...table.tBodies[0].rows].forEach(row=>{
    const cell=row.cells?.[schoolIdx];if(!cell)return;
    let name=cell.dataset.v364SchoolName||'';
    if(!name){
      const direct=cell.querySelector('[data-gra-school-name]')?.dataset?.graSchoolName;
      name=String(direct||cell.textContent||'').replace(LABEL,'').trim();
      cell.dataset.v364SchoolName=name;
    }
    const cre=creIdx>=0?String(row.cells?.[creIdx]?.textContent||'').trim():'';
    let badge=cell.querySelector(':scope > .v364-priority-badge');
    const yes=isPriority(name,section,cre);
    if(yes&&!badge){badge=makeBadge();cell.appendChild(badge)}
    if(badge)badge.hidden=!yes;
    if(yes)cell.classList.add('v364-school-cell');
  });
}
function decorateNamed(section,root){
  if(!root)return;
  const selectors=[
    '[data-gra-school-name]',
    '#somMainChart .bar-name strong',
    '#adrSchoolBars .bar-name strong',
    '#adrProgressChart .adr-progress-legend span',
    '.v213-school-label','.v210-rank-school strong','.adr-rank-row strong',
    '.adr-level-school-main strong','.sim311-school-main strong'
  ].join(',');
  const nodes=[...root.querySelectorAll(selectors)];
  nodes.forEach(el=>{
    if(el.classList.contains('v364-priority-badge'))return;
    const name=String(el.dataset?.graSchoolName||el.closest('[data-gra-school-name]')?.dataset?.graSchoolName||el.textContent||'').trim();
    if(!name||name===LABEL)return;
    const sub=el.closest('.bar-name')?.querySelector('span')?.textContent||el.closest('.adr-progress-legend')?.title||'';
    setBadge(el,name,section,creFromText(sub));
  });
}
function decorateUniverse(section,root){
  root?.querySelectorAll('.gra-school-universe-banner').forEach(b=>{
    const bold=b.querySelector('b');if(!bold)return;
    const m=(bold.textContent||'').match(/Escola selecionada:\s*(.+)$/i);if(!m)return;
    setBadge(bold,m[1].trim(),section,'');
  });
}
function cleanGeo(){document.querySelectorAll('#georreferenciamento .priority-badge').forEach(el=>el.style.setProperty('display','none','important'))}
function scan(){
  const som=document.getElementById('resultados'),adr=document.getElementById('adrs');
  if(som){decorateBanner('resultados','somSelectedSchoolBanner');decorateNamed('resultados',som);decorateUniverse('resultados',som);['somTable','somProgressTable'].forEach(id=>decorateTable('resultados',document.getElementById(id)))}
  if(adr){decorateBanner('adrs','adrSelectedSchoolBanner');decorateNamed('adrs',adr);decorateUniverse('adrs',adr);['adrTable','adrProgressTable'].forEach(id=>decorateTable('adrs',document.getElementById(id)))}
  cleanGeo();
}
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan()})}
function stamp(){
  document.documentElement.dataset.graVersion='v364';
  const badge=document.getElementById('dashboardVersionBadge');if(badge&&badge.textContent!=='v364')badge.textContent='v364';
  document.querySelectorAll('.gra-start-version,.exp-badge').forEach(el=>{if(/^v?\d+/i.test(el.textContent||'')&&el.textContent!=='v364')el.textContent='v364'});
}
function boot(){
  stamp();scan();
  const observer=new MutationObserver(schedule);['resultados','adrs','georreferenciamento'].forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,subtree:true,characterData:true})});
  document.addEventListener('change',e=>{const id=e.target?.id||'';if(id.startsWith('som')||id.startsWith('adr')||id==='regionalScopeSelect')setTimeout(scan,0)},true);
  document.addEventListener('input',e=>{if(['somSearch','adrSearch'].includes(e.target?.id))setTimeout(scan,0)},true);
  [0,250,800,1800].forEach(ms=>setTimeout(()=>{stamp();scan()},ms));
  window.__GRA_V364__={version:'v364',feature:'Selo Priorizada no segmento ao lado de escolas nas visualizações de Somativas e ADRs, para todas as CREs; sem selo no georreferenciamento.',scan};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
