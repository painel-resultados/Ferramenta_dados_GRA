
(function(){
'use strict';
const V='v366';
const $=id=>document.getElementById(id);
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const schoolKey=v=>norm(v).replace(/^\d{5,}\s*/,'').replace(/^get\s+/,'').replace(/^e\s*m\s+/,'escola municipal ').replace(/^em\s+/,'escola municipal ').replace(/^c\s*m\s+/,'creche municipal ').replace(/\s+/g,' ').trim();
const rowSchool=r=>String(r?.escola??r?.unidade??r?.escolaFonte??r?.school??r?.name??'').trim();
let internal=false,wrapped=new WeakSet(),catalog=null;
function buildCatalog(force=false){
 if(catalog&&!force)return catalog;const m=new Map();
 const add=n=>{n=String(n||'').trim();if(n)m.set(schoolKey(n),n)};
 // Catálogo leve: somente estrutura e georreferenciamento. ADR/Somativas ficam totalmente lazy.
 try{for(const r of (typeof DATA!=='undefined'&&DATA?.records)||[])add(r.unidade||r.escola)}catch(_){}
 try{for(const r of (typeof DATA!=='undefined'&&DATA?.exclusivas)||[])add(r.unidade||r.escola)}catch(_){}
 try{for(const r of (typeof DATA!=='undefined'&&DATA?.efpd)||[])add(r.unidade||r.escola)}catch(_){}
 try{for(const p of (typeof GEO_POINTS!=='undefined'&&GEO_POINTS)||[])add(p.name||p.escola)}catch(_){}
 catalog=m;return m;
}
function canonical(name){const raw=String(name||'').replace(/\s+/g,' ').trim();if(!raw)return '';return buildCatalog().get(schoolKey(raw))||raw}
function record(name){const k=schoolKey(name);try{return ((typeof DATA!=='undefined'&&DATA?.records)||[]).find(r=>schoolKey(r.unidade||r.escola)===k)||null}catch(_){return null}}
function selected(){return String(window.__GRA_SELECTED_SCHOOL__||'').trim()}
function rowMatchesSelected(r){const s=selected();if(!s)return true;return schoolKey(rowSchool(r))===schoolKey(s)}
function accessAllows(name){
 if(window.__GRA_ACCESS__?.role!=='agent'||window.__GRA_MASTER_SCOPE__!=='mine')return true;
 const fn=window.__GRA_V320_MASTER__?.allowsSchool||window.graMasterAllowsSchool;
 try{return typeof fn==='function'?!!fn(name):true}catch(_){return false}
}
function dispatch(el,type='change'){if(!el)return;try{el.dispatchEvent(new Event(type,{bubbles:true}))}catch(_){}}
function defaultOpt(sel){return [...(sel?.options||[])].find(o=>o.value==='')||[...(sel?.options||[])].find(o=>/todas|todos/i.test(o.textContent||''))||sel?.options?.[0]||null}
function clearSelect(id){const el=$(id);if(!el||el.disabled)return;const o=defaultOpt(el);if(o&&el.value!==o.value){el.value=o.value;dispatch(el)}}
function setMasterCre(name){
 if(window.__GRA_ACCESS__?.role==='agent')return;
 const r=record(name);let cre=0;if(r){const mm=String(r.cre||r.regional||r.creLabel||'').match(/\d+/);cre=mm?Number(mm[0]):0}
 if(!cre)try{cre=Number((typeof ACCESS_INDEX!=='undefined'&&ACCESS_INDEX?.schools?.[norm(name)])||0)}catch(_){}
 const sel=$('regionalScopeSelect');if(cre&&sel){const o=[...sel.options].find(o=>Number(o.value)===cre);if(o&&sel.value!==o.value){sel.value=o.value;dispatch(sel)}}
}
function setSearch(id,name,fire=false){const el=$(id);if(!el)return;internal=true;el.value=name;if(fire){dispatch(el,'input');dispatch(el,'change')}internal=false}
function propagate(name,active){
 const ids=['somSearch','adrSearch','geoSearch','bankSearch','exclusiveSearch','efpdSearch','creDetailSearch','territorySearch','globalSearch'];
 for(const id of ids)setSearch(id,name,false);
 if(active==='resultados')setSearch('somSearch',name,true);
 else if(active==='adrs'){
   let adrName=name;
   try{
     const k=schoolKey(name);
     const hit=(typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS))
       ? ADR_ROWS.find(r=>schoolKey(r?.escola||'')===k)
       : null;
     if(hit?.escola)adrName=hit.escola;
   }catch(_){}
   setSearch('adrSearch',adrName,true);
 }
 else if(active==='georreferenciamento')setSearch('geoSearch',name,true);
 else if(active==='banco')setSearch('bankSearch',name,true);
 else if(active==='exclusivas')setSearch('exclusiveSearch',name,true);
 else if(active==='efpd')setSearch('efpdSearch',name,true);
 else if(active==='agentes')setSearch('territorySearch',name,true);
 else setSearch('globalSearch',name,true);
}
function ensureBanner(name){
 const sec=document.querySelector('.section.active');if(!sec)return null;
 const active=sec.id;
 const filter=active==='resultados'?$('somFiltersCard'):active==='adrs'?$('adrFiltersCard'):active==='banco'?$('v222BankFilterPanel'):null;
 let b=(filter||sec).querySelector('.gra-school-universe-banner');
 if(!b){
   b=document.createElement('div');b.className='gra-school-universe-banner';
   if(filter){
     const title=filter.querySelector('.panel-title,.v222-bank-filter-head');
     title?.insertAdjacentElement('afterend',b) || filter.prepend(b);
   }else{
     const anchor=sec.querySelector('.filters-card,.toolbar,.card');
     if(anchor)anchor.insertAdjacentElement('afterend',b);else sec.prepend(b);
   }
 }
 const safe=String(name).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 b.innerHTML=`<b>Escola selecionada: ${safe}</b><span>Apague a busca ou use “Limpar escola” para voltar ao recorte anterior.</span><button type="button" class="gra-school-clear" data-gra-no-school-nav="1">Limpar escola</button>`;
 b.hidden=false;return b;
}
function scrollResult(active){
 setTimeout(()=>{
   let target=null;
   if(active==='resultados')target=$('somFiltersCard');
   else if(active==='adrs')target=$('adrFiltersCard');
   else if(active==='banco')target=$('v222BankFilterPanel')||$('bankSearch')?.closest?.('.card,.toolbar');
   else if(active==='georreferenciamento')target=$('geoSearch')?.closest?.('.card,.geo-controls,.toolbar')||$('geoSearch');
   target=target||document.querySelector('.section.active .gra-school-universe-banner');
   try{target?.scrollIntoView?.({behavior:'smooth',block:'start'})}catch(_){}
 },180);
}
function rerender(active){
 try{
  if(active==='resultados'){
    // v363: clicar na escola NÃO altera modalidade, prioridade, agente, CRE ou qualquer outro filtro.
    window.renderResultados?.();window.__GRA_V304_SCHOOL_CONTEXT__?.update?.();window.__GRA_V306_SIM_DETAIL__?.render?.();
  }else if(active==='adrs'){
    // v363: a busca da escola é apenas um refinamento sobre o universo já filtrado.
    window.renderADRs?.();window.__GRA_V304_SCHOOL_CONTEXT__?.update?.();
  }else if(active==='georreferenciamento'){
    const p=typeof window.geoFindPointForSchool==='function'?window.geoFindPointForSchool(selected(),''):null;
    if(p&&typeof window.geoOpenDetail==='function'){try{if(typeof GEO_STATE!=='undefined')GEO_STATE.focusedSchool=p.name}catch(_){}window.geoOpenDetail(p)}
    else if(typeof window.geoScheduleFilters==='function')window.geoScheduleFilters(0);else window.renderGeo?.();
  }else if(active==='banco')window.renderBanco?.();
  else if(active==='exclusivas')window.renderExclusivas?.();
  else if(active==='efpd')window.renderEfpd?.();
  else if(active==='cre')window.renderCREDetailed?.();
  else if(active==='agentes')window.initAgents?.();
 }catch(e){console.warn('v323 escola',e)}
}
function openSchool(name){
 const n=canonical(name);if(!n||!accessAllows(n))return false;
 window.__GRA_SELECTED_SCHOOL__=n;document.documentElement.dataset.graSchoolUniverse=schoolKey(n);
 const active=document.querySelector('.section.active')?.id||'resultados';
 propagate(n,active);ensureBanner(n);
 setTimeout(()=>{rerender(active);ensureBanner(n);scrollResult(active)},70);
 setTimeout(()=>{rerender(active);ensureBanner(n);scrollResult(active)},260);
 return true;
}
function clearSchool(){
 const old=String(window.__GRA_SELECTED_SCHOOL__||'').trim();
 window.__GRA_SELECTED_SCHOOL__='';delete document.documentElement.dataset.graSchoolUniverse;
 document.querySelectorAll('.gra-school-universe-banner').forEach(b=>b.remove());
 if(old){
   internal=true;
   for(const id of ['somSearch','adrSearch','geoSearch','bankSearch','exclusiveSearch','efpdSearch','territorySearch','globalSearch']){
     const el=$(id);if(!el)continue;
     if(schoolKey(el.value)===schoolKey(old)){el.value='';dispatch(el,'input');dispatch(el,'change')}
   }
   internal=false;
 }
}
window.GRAFocusSchool=openSchool;window.__GRA_V323_SCHOOL_UNIVERSE__={version:V,open:openSchool,clear:clearSchool,matches:rowMatchesSelected};
function wrap(name){
 const old=window[name];if(typeof old!=='function'||old.__gra323)return;
 const f=function(){const out=old.apply(this,arguments);return Array.isArray(out)&&selected()?out.filter(rowMatchesSelected):out};
 f.__gra323=true;f.__gra323Old=old;window[name]=f;try{globalThis[name]=f}catch(_){}
}
function installWrappers(){['somFilteredRows','adrFilteredRows','geoVisiblePoints','getResultRows'].forEach(wrap)}
function resolveFromTarget(target){
 const el=target?.closest?.('[data-gra-school-name],.gra-school-clickable');if(el){const d=el.dataset?.graSchoolName;if(d)return canonical(d)}
 let node=target;for(let i=0;node&&i<6;i++,node=node.parentElement){if(node.matches?.('input,select,textarea'))return '';const raw=String(node.textContent||'').replace(/\s+/g,' ').trim();if(!raw||raw.length>220)continue;const key=schoolKey(raw),cat=buildCatalog();if(cat.has(key))return cat.get(key);let best='',bk='';for(const [k,v] of cat){if(k.length>=8&&key.includes(k)&&k.length>bk.length){best=v;bk=k}}if(best)return best;if(node.classList?.contains('section'))break}
 return '';
}
function clickCapture(e){
 if(e.target?.closest?.('.geo-detail-close,[data-gra-no-school-nav]'))return;
 const name=resolveFromTarget(e.target);if(!name)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openSchool(name);
}
function keyCapture(e){if(e.target?.closest?.('.geo-detail-close,[data-gra-no-school-nav]'))return;if(!['Enter',' '].includes(e.key))return;const name=resolveFromTarget(e.target);if(!name)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openSchool(name)}
function decorate(){
 const root=document.querySelector('.section.active');if(!root)return;const cat=buildCatalog();let count=0;
 const nodes=root.querySelectorAll('[data-gra-school-name],.gra-school-clickable,.bar-name strong,.v210-rank-school strong,.adr-rank-row strong,.v213-school-label,.sim311-school-main strong,td strong,td:first-child,h3,h4');
 for(const el of nodes){if(++count>1800)break;if(el.dataset?.gra323Checked==='1')continue;el.dataset.gra323Checked='1';let name=el.dataset?.graSchoolName||'';if(!name){const raw=String(el.textContent||'').replace(/\s+/g,' ').trim();const key=schoolKey(raw);name=cat.get(key)||'';if(!name&&raw.length<180){let bk='';for(const [k,v] of cat){if(k.length>=8&&key.includes(k)&&k.length>bk.length){name=v;bk=k}}}}
  if(name){el.dataset.graSchoolName=canonical(name);el.classList.add('gra-school-clickable');el.title='Clique para abrir o universo desta escola';if(!el.hasAttribute('tabindex')&&!/^(TD|TH)$/.test(el.tagName))el.tabIndex=0}
 }
}
function stamp(){const b=$('dashboardVersionBadge');if(b&&b.textContent!==V)b.textContent=V;document.querySelectorAll('.gra-start-version,.gra-access-version,.exp-badge').forEach(el=>{if((el.textContent||'').trim()!==V)el.textContent=V});document.documentElement.dataset.graVersion=V}
function boot(){
 document.body.classList.remove('v222-filter-open');
 installWrappers();stamp();window.addEventListener('click',clickCapture,{capture:true,passive:false});window.addEventListener('keydown',keyCapture,true);
 document.addEventListener('click',e=>{
   if(e.target?.closest?.('.gra-school-clear')){
     e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
     const active=document.querySelector('.section.active')?.id||'';
     clearSchool();rerender(active);
     setTimeout(()=>scrollResult(active),40);
     return;
   }
   const id=e.target?.id||'';if(/^clear.*Filters$/i.test(id)||e.target?.closest?.('[id^="clear"][id$="Filters"]'))clearSchool()
 },true);
 document.addEventListener('input',e=>{if(internal||!e.isTrusted||!selected())return;if(['somSearch','adrSearch','geoSearch','bankSearch','exclusiveSearch','efpdSearch','territorySearch','globalSearch'].includes(e.target?.id)&&schoolKey(e.target.value)!==schoolKey(selected()))clearSchool()},true);
 $('regionalScopeSelect')?.addEventListener('change',()=>{if(!internal)clearSchool()});
 document.querySelectorAll('.nav button[data-section]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>{installWrappers();const n=selected();if(n){const active=document.querySelector('.section.active')?.id||'';propagate(n,active);ensureBanner(n);rerender(active);scrollResult(active)}stamp()},140)));
 // Somente reaplica wrappers; catálogo/DOM são resolvidos quando houver clique real.
 [900,2800].forEach(ms=>setTimeout(()=>{installWrappers();stamp()},ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
