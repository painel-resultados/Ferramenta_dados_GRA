/* Ferramenta GRA v441 · HF12 — coexistência dos selos GET e Priorizada no segmento.
 * Adição estritamente visual; não modifica cadastros, classificações, filtros nem dados.
 */
(function(){
'use strict';
const GET_CLASS='gra-get-badge', PRIORITY_CLASS='v364-priority-badge';
const PRIORITY_LABEL='Priorizada no segmento';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const creNum=v=>{const m=String(v??'').match(/\d{1,2}/);return m?Number(m[0]):0};
const classes='.'+GET_CLASS+',.'+PRIORITY_CLASS+',.v363-priority-badge,.dossier-get-badge';
function cleanName(el){
  if(!(el instanceof Element))return '';
  const direct=el.dataset?.graSchoolName||el.dataset?.somSchool||el.dataset?.school||'';
  if(direct)return String(direct).trim();
  const clone=el.cloneNode(true);
  clone.querySelectorAll(classes).forEach(n=>n.remove());
  return String(clone.textContent||'').replace(/^Escola selecionada:\s*/i,'').trim();
}
function isSchool(s){return /^(?:escola municipal|e\.?\s*m\.?\s+|em\s+|ciep\s+|get\s+|gin[aá]sio\s+|prim[aá]rio\s+)/i.test(s)}
function scope(year,evaluation){
  if(typeof priorityScopeFromContext==='function'){
    try{const s=priorityScopeFromContext(year,evaluation);if(s)return s}catch(_){}
  }
  const y=norm(year),e=norm(evaluation);
  if(e.includes('avalia rj')||/\b[12]\s*[oº°]?\s*ano\b/.test(y))return 'ALFA';
  if(y==='ai'||y.includes('anos iniciais')||/\b[345]\s*[oº°]?\s*ano\b/.test(y))return 'AI';
  if(y==='af'||y.includes('anos finais')||/\b[789]\s*[oº°]?\s*ano\b/.test(y))return 'AF';
  return '';
}
function current(section){
  const isSom=section==='resultados';
  return {
    year:document.getElementById(isSom?'somAnoEscolar':'adrAno')?.value||'',
    eval:isSom?document.getElementById('somModalidade')?.value||'':'ADR',
    cre:document.getElementById(isSom?'somCre':'adrCre')?.value||document.getElementById('regionalScopeSelect')?.value||''
  };
}
function priority(name,section,creHint){
  const c=current(section),cre=creHint||c.cre;
  if(!scope(c.year,c.eval))return false;
  try{if(typeof priorityMatchesContext==='function'&&priorityMatchesContext(name,c.year,c.eval,cre))return true}catch(_){}
  // Compatibilidade com registros históricos que trazem apenas "Prioritária".
  try{
    const meta=typeof priorityMetaForSchool==='function'?priorityMetaForSchool(name):null;
    if(!meta)return false;
    const expected=creNum(cre),actual=creNum(meta.record?.cre);
    if(expected&&actual&&expected!==actual)return false;
    const kind=norm(meta.type||'');
    if(kind.includes('alfabet')||kind.includes('iniciais')||kind.includes('finais')){
      const target=scope(c.year,c.eval);
      return (target==='ALFA'&&kind.includes('alfabet'))||(target==='AI'&&kind.includes('iniciais'))||(target==='AF'&&kind.includes('finais'));
    }
    if(kind==='prioritaria'||(!meta.scope&&kind)){
      const plan=norm(meta.record?.planoAcao||''),target=scope(c.year,c.eval);
      return target==='AI'?(/\bef\s+ai\b/.test(plan)||plan.includes('ai & af')):target==='AF'?(/\bef\s+af\b/.test(plan)||plan.includes('ai & af')):false;
    }
  }catch(_){}
  return false;
}
function isGet(name,cre){try{return !!window.GRA_GETS?.isGet?.(name,cre)}catch(_){return false}}
function rowCre(el,section){
  const row=el.closest('.bar-row,tr,[data-cre]');
  const direct=row?.dataset?.cre||el.dataset?.cre||'';
  if(creNum(direct))return direct;
  if(row?.tagName==='TR'){
    const heads=[...(row.closest('table')?.querySelectorAll('thead th')||[])].map(h=>norm(h.textContent));
    const index=heads.findIndex(h=>h==='cre'||h==='regional');
    if(index>=0)return row.cells?.[index]?.textContent?.trim()||'';
  }
  const m=String(row?.textContent||'').match(/\b(?:CRE\s*)?(\d{1,2})\s*[ªaº]?\s*CRE\b/i);
  return m?m[1]:current(section).cre;
}
function newBadge(type){
  const b=document.createElement('span');b.className=type==='GET'?GET_CLASS:PRIORITY_CLASS;
  b.textContent=type==='GET'?'GET':PRIORITY_LABEL;
  b.setAttribute('aria-label',type==='GET'?'Ginásio Educacional Tecnológico':PRIORITY_LABEL);
  b.dataset.graDualBadge='1';return b;
}
function sync(anchor,name,section,mode){
  if(!name||!isSchool(name)||!(anchor instanceof Element))return;
  const cre=rowCre(anchor,section),yesGet=isGet(name,cre),yesPriority=priority(name,section,cre);
  // Primeiro remove selos internos que mascaram o nome usado pelas demais rotinas.
  const nested=[...anchor.querySelectorAll(':scope > .'+GET_CLASS+', :scope > .'+PRIORITY_CLASS)];
  let host=anchor.parentElement;
  if(!host)return;
  let badges=[];
  const bannerPriority=anchor.classList.contains('school-focus-name')?host.querySelector(':scope > .v363-priority-badge'):null;
  if(mode==='cell'){
    host=anchor;
    badges=[...host.children].filter(e=>e.classList?.contains(GET_CLASS)||e.classList?.contains(PRIORITY_CLASS));
  }else{
    badges=[...host.children].filter(e=>e.classList?.contains(GET_CLASS)||e.classList?.contains(PRIORITY_CLASS));
  }
  const all=[...new Set([...nested,...badges,...(bannerPriority?[bannerPriority]:[])])];
  let g=all.find(e=>e.classList.contains(GET_CLASS))||null;
  let p=bannerPriority||all.find(e=>e.classList.contains(PRIORITY_CLASS))||null;
  for(const b of all){if(b!==g&&b!==p)b.remove()}
  if(!yesGet&&g){g.remove();g=null}
  if(!yesPriority&&p){p.remove();p=null}
  if(yesGet&&!g)g=newBadge('GET');
  if(yesPriority&&!p)p=newBadge('PRIORITY');
  if(p)p.hidden=false;
  // Ordem estável: nome da escola → GET → Priorizada no segmento.
  if(mode==='cell'){
    for(const b of [g,p])if(b&&b.parentElement!==anchor)anchor.appendChild(b);
  }else{
    let after=anchor;
    for(const b of [g,p])if(b){
      if(after.nextElementSibling!==b)after.insertAdjacentElement('afterend',b);
      after=b;
    }
  }
}
function update(section){
  const root=document.getElementById(section);if(!root)return;
  const target=[
    '.bar-name strong',
    '.adr-school-context strong',
    '.v213-school-label',
    '.v210-rank-school strong',
    '.adr-rank-row strong',
    '.adr-level-school-main strong',
    '.sim311-school-main strong',
    '.school-focus-name',
    '.gra-school-universe-banner b',
    '.adr-progress-legend span',
    '[data-gra-school-name]:not(td):not(tr)'
  ].join(',');
  const done=new Set();
  root.querySelectorAll(target).forEach(el=>{
    if(el.closest('.'+GET_CLASS+',.'+PRIORITY_CLASS)||done.has(el))return;
    done.add(el);sync(el,cleanName(el),section,'sibling');
  });
  root.querySelectorAll('table').forEach(table=>{
    const heads=[...table.querySelectorAll('thead th')].map(h=>norm(h.textContent));
    const schoolIdx=heads.findIndex(h=>h==='escola'||h==='unidade');if(schoolIdx<0)return;
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const cell=tr.cells?.[schoolIdx];if(!cell)return;
      const el=cell.querySelector('strong,[data-gra-school-name]');
      if(el){if(!done.has(el)){done.add(el);sync(el,cleanName(el),section,'sibling')}}
      else sync(cell,cell.dataset.v364SchoolName||cleanName(cell),section,'cell');
    });
  });
}
let frame=0,scanning=false;
function scan(){if(scanning)return;scanning=true;try{update('resultados');update('adrs')}finally{scanning=false}}
function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;scan()})}
function boot(){
  scan();
  const watch=[document.getElementById('resultados'),document.getElementById('adrs')].filter(Boolean);
  if(watch.length){
    const observer=new MutationObserver(changes=>{
      if(changes.some(change=>[...change.addedNodes,...change.removedNodes].some(node=>{
        if(node.nodeType===3)return false;
        return node.nodeType===1&&!node.matches?.('.'+GET_CLASS+',.'+PRIORITY_CLASS);
      })))schedule();
    });
    watch.forEach(root=>observer.observe(root,{childList:true,subtree:true}));
  }
  document.addEventListener('change',e=>{if(/^(adr|som)/.test(e.target?.id||'')||e.target?.id==='regionalScopeSelect')schedule()},true);
  document.addEventListener('input',e=>{if(['somSearch','adrSearch'].includes(e.target?.id))schedule()},true);
  document.addEventListener('click',e=>{if(e.target?.closest('.nav button[data-section],#partnersEducationBtn'))schedule()},true);
  [150,600,1400].forEach(ms=>setTimeout(schedule,ms));
}
window.__GRA_DUAL_BADGES__={version:'v441-HF12',scan,priority,isGet,cleanName};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
