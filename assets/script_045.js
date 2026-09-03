
(function(){
'use strict';
const V='v366';
const MINE='mine',CRE='cre';
const $=id=>document.getElementById(id);
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const schoolKey=v=>norm(v)
 .replace(/^get\s+/,'')
 .replace(/^e\.?\s*m\.?\s+/,'escola municipal ')
 .replace(/^em\s+/,'escola municipal ')
 .replace(/^e\s+m\s+/,'escola municipal ')
 .replace(/^c\.?\s*m\.?\s+/,'creche municipal ')
 .replace(/^ciep\s+/,'ciep ')
 .replace(/\s+/g,' ').trim();
const agentName=()=>String(window.__GRA_ACCESS__?.name||'').trim();
const isAgent=()=>window.__GRA_ACCESS__?.role==='agent';
const master=()=>$('regionalScopeSelect');
function mode(){const o=master()?.selectedOptions?.[0];return isAgent()&&o?.dataset?.graMasterMode===MINE?MINE:CRE}
function rowAgent(r){return String(r?.agente??r?.agent??r?.articulador??'').trim()}
function rowSchool(r){return String(r?.escola??r?.unidade??r?.school??r?.nomeEscola??r?.name??'').trim()}
let schoolAliases=null,mySchools=null,scheduled=0;
function buildSchoolAliases(){
 if(schoolAliases)return schoolAliases;
 const map=new Map(),add=(name,canonical=name)=>{const n=String(name||'').trim(),c=String(canonical||n).trim();if(!n||!c)return;map.set(schoolKey(n),c)};
 try{for(const r of (typeof DATA!=='undefined'&&DATA?.records)||[])add(r.unidade||r.escola,r.unidade||r.escola)}catch(_){}
 try{for(const r of (typeof DATA!=='undefined'&&DATA?.exclusivas)||[])add(r.unidade||r.escola,r.unidade||r.escola)}catch(_){}
 try{for(const p of (typeof GEO_POINTS!=='undefined'&&GEO_POINTS)||[])add(p.name||p.escola,p.name||p.escola)}catch(_){}
 try{for(const k of Object.keys((typeof ACCESS_INDEX!=='undefined'&&ACCESS_INDEX?.schools)||{}))add(k,k)}catch(_){}
 schoolAliases=map;return map;
}
function buildMySchools(force=false){
 if(mySchools&&!force)return mySchools;
 const set=new Set(),ag=norm(agentName()),add=r=>{if(!r||norm(rowAgent(r))!==ag)return;const n=rowSchool(r);if(n)set.add(schoolKey(n))};
 try{if(typeof DATA!=='undefined'&&DATA){['records','exclusivas','efpd','territoryUnits'].forEach(k=>(DATA[k]||[]).forEach(add));}}catch(_){}
 try{if(typeof GEO_POINTS!=='undefined')(GEO_POINTS||[]).forEach(add)}catch(_){}
 // Nao materializa ADR/Somativas apenas para montar o acesso. Se ja estiverem carregadas, aproveita-as.
 try{if(typeof SOM_ROWS!=='undefined'&&SOM_ROWS?.__graLoaded)(SOM_ROWS||[]).forEach(add)}catch(_){}
 try{if(typeof ADR_ROWS!=='undefined'&&ADR_ROWS?.__graLoaded)(ADR_ROWS||[]).forEach(add)}catch(_){}
 mySchools=set;window.__GRA_MY_SCHOOLS__=set;return set;
}
function allowsSchool(name){if(!isAgent()||window.__GRA_MASTER_SCOPE__!==MINE)return true;const key=schoolKey(name);if(!key)return false;return buildMySchools().has(key)}
function allowsRow(r){
 if(!isAgent()||window.__GRA_MASTER_SCOPE__!==MINE)return true;
 const ag=norm(rowAgent(r));if(ag&&ag===norm(agentName()))return true;
 return allowsSchool(rowSchool(r));
}
window.graMasterAllowsRow=allowsRow;window.graMasterAllowsSchool=allowsSchool;
function dispatch(el,type='change'){if(!el)return;try{el.dispatchEvent(new Event(type,{bubbles:true}))}catch(_){}}
function optionForAgent(sel){const ag=norm(agentName());return [...(sel?.options||[])].find(o=>norm(o.textContent)===ag||norm(o.value)===ag)}
function defaultOption(sel){if(!sel)return null;return [...sel.options].find(o=>/todas as escolas/i.test(o.textContent||''))||[...sel.options].find(o=>o.value==='')||sel.options[0]||null}
function cascadeOne(id){const sel=$(id);if(!sel)return;const mine=window.__GRA_MASTER_SCOPE__===MINE;if(mine){const o=optionForAgent(sel);if(o&&sel.value!==o.value){sel.dataset.graMasterForced='1';sel.value=o.value;dispatch(sel)}}else if(sel.dataset.graMasterForced==='1'){const o=defaultOption(sel);delete sel.dataset.graMasterForced;if(o&&sel.value!==o.value){sel.value=o.value;dispatch(sel)}}}
function cascadeAll(){if(!isAgent())return;['somAgente','adrAgente','geoAgent','filterAgente','resultAgente'].forEach(cascadeOne)}
function rerenderLight(){
 try{window.renderResultados?.()}catch(_){}try{window.renderADRs?.()}catch(_){}try{window.renderBanco?.()}catch(_){}try{window.renderExclusivas?.()}catch(_){}try{window.renderEfpd?.()}catch(_){}try{window.renderSimuladoBank?.()}catch(_){}
 try{if(typeof window.geoScheduleFilters==='function')window.geoScheduleFilters(0);else window.renderGeo?.()}catch(_){}
}
function updateMasterState(){
 if(!isAgent())return;
 window.__GRA_MASTER_SCOPE__=mode();buildMySchools(true);cascadeAll();
 const ctl=$('regionalScopeControl'),note=ctl?.querySelector('small'),count=buildMySchools().size;
 if(note)note.textContent=window.__GRA_MASTER_SCOPE__===MINE?`Somente minhas escolas · ${count} unidade${count===1?'':'s'} vinculada${count===1?'':'s'} a ${agentName()}. O recorte é aplicado em todas as visualizações.`:`Todas as escolas da ${window.__GRA_ACCESS__.cre}ª CRE. Selecione “Somente minhas escolas” para aplicar o recorte do agente em todo o sistema.`;
 rerenderLight();scheduleCascade();
}
function ensureMaster(){
 if(!isAgent())return;
 const sel=master();if(!sel)return;
 const cre=Number(window.__GRA_ACCESS__?.cre||0);if(!cre)return;
 const current=window.__GRA_MASTER_SCOPE__===MINE?MINE:CRE;
 const has=[...sel.options].some(o=>o.dataset.graMasterMode===MINE);
 if(!has){const label=[...sel.options].find(o=>Number(o.value)===cre)?.textContent?.trim()||`${cre}ª CRE`;sel.innerHTML=`<option value="${cre}" data-gra-master-mode="cre">${label}</option><option value="${cre}" data-gra-master-mode="mine">Somente minhas escolas</option>`;}
 sel.selectedIndex=current===MINE?1:0;
 if(sel.dataset.gra319!=='1'){sel.dataset.gra319='1';sel.addEventListener('change',()=>{window.__GRA_MASTER_SCOPE__=mode();updateMasterState()})}
}
function scheduleCascade(){clearTimeout(scheduled);scheduled=setTimeout(()=>{ensureMaster();cascadeAll()},140)}
// ---- Navegacao direta por escola ----
function resolveSchoolText(text){
 const raw=String(text||'').replace(/\s+/g,' ').trim();if(!raw||raw.length>230)return '';
 const aliases=buildSchoolAliases(),key=schoolKey(raw);if(aliases.has(key))return aliases.get(key)||raw;
 // Tenta localizar nome dentro de rotulo que contenha posicao/valor.
 if(raw.length<180){let best='';for(const [k,v] of aliases){if(k.length<8)continue;if(key.includes(k)&&k.length>schoolKey(best).length)best=v||raw}if(best)return best;}
 return '';
}
function resolveFromTarget(target){let el=target?.nodeType===3?target.parentElement:target;for(let i=0;el&&i<5;i++,el=el.parentElement){if(el.matches?.('input,select,textarea'))return '';const hit=resolveSchoolText(el.textContent);if(hit)return hit;if(el.classList?.contains('section'))break}return ''}
function setInput(id,value){const el=$(id);if(!el)return false;if(el.value!==value){el.value=value;dispatch(el,'input');dispatch(el,'change')}return true}
function schoolRecord(name){const k=schoolKey(name);try{return ((typeof DATA!=='undefined'&&DATA?.records)||[]).find(r=>schoolKey(r.unidade||r.escola)===k)||null}catch(_){return null}}
function focusCurrentSection(name){
 const active=document.querySelector('.section.active')?.id||'resultados';window.__GRA_SELECTED_SCHOOL__=name;
 if(active==='resultados'){
   const rec=schoolRecord(name),cre=rec?.creLabel||rec?.cre||'';
   try{
     if(window.__GRA_V311__?.selectSchool){
       window.__GRA_V311__.selectSchool(String(cre||''),name);
       setTimeout(()=>$('somFiltersCard')?.scrollIntoView?.({behavior:'smooth',block:'start'}),160);
       return;
     }
   }catch(_){}
   setInput('somSearch',name);try{window.renderResultados?.()}catch(_){}
   setTimeout(()=>$('somFiltersCard')?.scrollIntoView?.({behavior:'smooth',block:'start'}),120);
   return
 }
 if(active==='adrs'){
   setInput('adrSearch',name);try{window.renderADRs?.()}catch(_){}
   setTimeout(()=>$('adrFiltersCard')?.scrollIntoView?.({behavior:'smooth',block:'start'}),120);
   return
 }
 if(active==='georreferenciamento'){
   setInput('geoSearch',name);try{const p=typeof window.geoFindPointForSchool==='function'?window.geoFindPointForSchool(name,''):null;if(p&&typeof window.geoOpenDetail==='function'){if(typeof GEO_STATE!=='undefined')GEO_STATE.focusedSchool=p.name;window.geoOpenDetail(p)}else if(typeof window.geoScheduleFilters==='function')window.geoScheduleFilters(0)}catch(_){}return
 }
 if(active==='banco'){setInput('bankSearch',name);try{window.renderBanco?.()}catch(_){}return}
 if(active==='exclusivas'){setInput('exclusiveSearch',name);try{window.renderExclusivas?.()}catch(_){}return}
 if(active==='efpd'){setInput('efpdSearch',name);try{window.renderEfpd?.()}catch(_){}return}
 if(active==='agentes'){const rec=schoolRecord(name),tsel=$('territorySelect');if(rec&&tsel){const o=[...tsel.options].find(o=>String(o.value)===String(rec.territorio));if(o){tsel.value=o.value;dispatch(tsel)}}setInput('territorySearch',name);return}
 if(active==='cre'){const btn=document.querySelector('.nav button[data-section="banco"]');try{btn?.click()}catch(_){}setTimeout(()=>{setInput('bankSearch',name);try{window.renderBanco?.()}catch(_){ }},40);return}
 // Fallback: usa busca global apenas como filtro, sem menu intermediario.
 setInput('globalSearch',name);
}
function focusSchool(name){
 const rec=schoolRecord(name),canonical=rec?.unidade||name;
 if(isAgent()&&window.__GRA_MASTER_SCOPE__===MINE&&!allowsRow(rec||{escola:canonical})){return}
 // v363: a escola restringe somente a busca; o universo mestre permanece exatamente como estava.
 focusCurrentSection(canonical);
 try{window.scrollTo({top:Math.max(0,(document.querySelector('.section.active')?.offsetTop||0)-12),behavior:'smooth'})}catch(_){}
}
window.GRAFocusSchool=focusSchool;
window.__GRA_SCHOOL_NAV_TEST__=function(name){
 focusSchool(name);
 return new Promise(resolve=>setTimeout(()=>{
   const active=document.querySelector('.section.active')?.id||'';
   const search=active==='resultados'?$('somSearch')?.value:active==='adrs'?$('adrSearch')?.value:'';
   let rows=[];
   try{rows=active==='resultados'?(window.somFilteredRows?.()||[]):active==='adrs'?(window.adrFilteredRows?.()||[]):[]}catch(_){}
   const schools=[...new Set(rows.map(r=>String(r?.escola||'').trim()).filter(Boolean))];
   resolve({active,search,schools,count:schools.length,selected:window.__GRA_SELECTED_SCHOOL__||''});
 },260));
};
function clickHandler(e){
 if(e.target?.closest?.('.geo-detail-close,[data-gra-no-school-nav]'))return;
 if(e.defaultPrevented)return;
 const direct=e.target?.closest?.('[data-gra-school-name]');
 const name=direct?.dataset?.graSchoolName||resolveFromTarget(e.target);
 if(!name)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();focusSchool(name)
}
function keyHandler(e){
 if(e.target?.closest?.('.geo-detail-close,[data-gra-no-school-nav]'))return;
 if(!['Enter',' '].includes(e.key))return;
 const el=e.target?.closest?.('.gra-school-clickable,[data-gra-school-name]');if(!el)return;
 const name=el.dataset?.graSchoolName||resolveFromTarget(el);if(!name)return;
 e.preventDefault();e.stopPropagation();focusSchool(name)
}
function decorate(root=document.querySelector('.section.active')){if(!root)return;const nodes=root.querySelectorAll('.v213-school-label,.v210-rank-school strong,.som-rank-section .bar-name strong,.adr-rank-row strong,.adr-progress-legend span,.adr-level-school-main strong,.sim311-school-main strong,td,th,h3');let seen=0;for(const el of nodes){if(++seen>1600)break;if(el.dataset.graSchoolChecked==='1')continue;el.dataset.graSchoolChecked='1';const name=resolveSchoolText(el.textContent);if(name){el.classList.add('gra-school-clickable');el.dataset.graSchoolName=name;el.title=el.title||'Clique para abrir esta escola';if(!/^(TD|TH)$/.test(el.tagName)){el.setAttribute('role','button');if(!el.hasAttribute('tabindex'))el.tabIndex=0}}}}
function scheduleDecorate(){}
function boot(){
 document.documentElement.dataset.graVersion=V;window.__GRA_MASTER_SCOPE__=CRE;ensureMaster();if(isAgent())buildMySchools(true);updateMasterState();
 document.addEventListener('click',clickHandler,true);document.addEventListener('keydown',keyHandler,true);
 document.querySelectorAll('.nav button[data-section]').forEach(b=>b.addEventListener('click',()=>{scheduleCascade();const name=window.__GRA_SELECTED_SCHOOL__;if(name)setTimeout(()=>focusCurrentSection(name),120)}));
 ['somAgente','adrAgente','geoAgent','filterAgente','resultAgente'].forEach(id=>$(id)?.addEventListener('change',()=>{if(window.__GRA_MASTER_SCOPE__===MINE)scheduleCascade()}));
 
 
 [700,2200].forEach(ms=>setTimeout(()=>{ensureMaster();cascadeAll()},ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
