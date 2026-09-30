(function(){
'use strict';
const VERSION='v419';
const OFFICIAL=Array.isArray(window.GRA_GETS_OFFICIAL_ROWS)?window.GRA_GETS_OFFICIAL_ROWS:[];
const BLUE='#0a66d9',GREEN='#1d8f68';
const codeSet=new Set(),creNameSet=new Set(),displayNameSet=new Set();
const compareState={som:false,adr:false};

function norm(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function creNumber(value){const m=String(value??'').match(/\d{1,2}/);return m?Number(m[0]):0}
function code(value){
  const raw=typeof value==='object'&&value?value.codeSME??value.codigoSME??value.designacao??value.sme??value.codigo??'':value;
  const digits=String(raw??'').replace(/\D/g,'');return digits?digits.replace(/^0+(?=\d)/,''):'';
}
function canonicalName(value){
  let key=norm(value).replace(/^\d{5,}\s*/,'');
  key=key.replace(/^e m /,'escola municipal ').replace(/^em /,'escola municipal ');
  return key;
}
function namesFrom(value){
  if(typeof value==='string')return[value];
  if(!value||typeof value!=='object')return[];
  return [value.name,value.escola,value.unidade,value.dataRioName,...(value.aliases||[]),...(value.somAliases||[]),...(value.adrAliases||[])].filter(Boolean);
}
function addDisplayName(value){const key=canonicalName(value);if(key)displayNameSet.add(key)}
OFFICIAL.forEach(row=>{codeSet.add(code(row.code));const key=canonicalName(row.name);creNameSet.add(`${Number(row.cre)}|${key}`);addDisplayName(row.name)});

function isGet(value,creHint=''){
  const directCode=code(value);if(directCode&&codeSet.has(directCode))return true;
  const cre=creNumber(creHint||(typeof value==='object'&&value?(value.cre??value.regional??value.creLabel):''));
  for(const name of namesFrom(value)){
    const key=canonicalName(name);if(!key)continue;
    if(cre&&creNameSet.has(`${cre}|${key}`))return true;
    if(!cre&&displayNameSet.has(key))return true;
  }
  return false;
}
function applyOfficialClassification(){
  try{
    if(typeof GEO_POINTS!=='undefined'&&Array.isArray(GEO_POINTS))GEO_POINTS.forEach(point=>{
      point.isGET=isGet(point);
      if(point.isGET)namesFrom(point).forEach(addDisplayName);
    });
  }catch(error){console.warn('GETs oficiais: mapa indisponível para classificação.',error)}
}
function badgeHtml(value,cre=''){return isGet(value,cre)?'<span class="gra-get-badge" aria-label="Ginásio Educacional Tecnológico">GET</span>':''}

function elementSchoolName(el){
  return el?.dataset?.graSchoolName||el?.dataset?.somSchool||el?.dataset?.school||String(el?.textContent||'').replace(/\s+GET\s*$/i,'').trim();
}
function decorateElement(el){
  if(!(el instanceof Element)||el.dataset.graGetChecked==='1'||el.closest('.gra-get-badge'))return;
  const name=elementSchoolName(el);el.dataset.graGetChecked='1';
  if(!name||!isGet(name))return;
  if(el.namespaceURI==='http://www.w3.org/2000/svg'&&el.tagName.toLowerCase()==='text'){
    const t=document.createElementNS('http://www.w3.org/2000/svg','tspan');t.setAttribute('dx','8');t.setAttribute('class','gra-get-svg-badge');t.textContent='GET';el.appendChild(t);return;
  }
  const badge=document.createElement('span');badge.className='gra-get-badge';badge.setAttribute('aria-label','Ginásio Educacional Tecnológico');badge.textContent='GET';el.appendChild(badge);
}
const DECORATE_SELECTOR='[data-gra-school-name],[data-som-school],[data-school],.bar-name>strong,.adr-school-context strong,.geo-detail h3,.dossier-school-name,.dossier-title h2,.unit,h1,h2,h3,h4,strong,table td,svg text';
function decorate(root=document){
  if(root instanceof Element&&root.matches(DECORATE_SELECTOR))decorateElement(root);
  root.querySelectorAll?.(DECORATE_SELECTOR).forEach(decorateElement);
}
let decorateFrame=0;function scheduleDecorate(root=document){if(decorateFrame)return;decorateFrame=requestAnimationFrame(()=>{decorateFrame=0;decorate(root)})}

function weighted(rows,valueFn){let sum=0,weight=0;for(const row of rows){const value=Number(valueFn(row));if(!Number.isFinite(value))continue;const w=Math.max(1,Number(row.avaliados)||1);sum+=value*w;weight+=w}return weight?sum/weight:null}
function mean(values){const valid=values.map(Number).filter(Number.isFinite);return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null}
function schoolKey(row){return `${creNumber(row?.cre||row?.regional)}|${canonicalName(row?.escola||row?.unidade||row?.name||'')}`}
function groupRowsBySchool(rows){const groups=new Map();for(const row of rows||[]){const key=schoolKey(row);if(!key.endsWith('|')){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}}return [...groups.values()]}
function withoutSearch(id,fn){const input=document.getElementById(id);if(!input)return fn();const old=input.value;input.value='';try{return fn()}finally{input.value=old}}
function masterLabel(){return document.getElementById('regionalScopeSelect')?.selectedOptions?.[0]?.textContent?.trim()||'Toda a SME'}
function metricFormat(value,mode){if(!Number.isFinite(value))return'—';const d=mode==='score'?2:1;return value.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+(mode==='pct'?'%':mode==='delta'?' p.p.':'')}

function adrComparison(){
  if(typeof adrFilteredRows!=='function')return null;
  const rows=withoutSearch('adrSearch',()=>adrFilteredRows());
  const metric=document.getElementById('adrMetric')?.value||'adequado';
  const progress=document.getElementById('adrMode')?.value==='progressao';
  const groups=groupRowsBySchool(rows),items=[];
  for(const schoolRows of groups){
    let value=null;
    if(progress){
      const editions=[...new Set(schoolRows.map(r=>String(r.adr||'')).filter(Boolean))].sort((a,b)=>Number(a.match(/\d+/)?.[0]||0)-Number(b.match(/\d+/)?.[0]||0));
      if(editions.length>1){const first=weighted(schoolRows.filter(r=>r.adr===editions[0]),r=>r[metric]);const last=weighted(schoolRows.filter(r=>r.adr===editions.at(-1)),r=>r[metric]);if(Number.isFinite(first)&&Number.isFinite(last))value=last-first}
    }else value=weighted(schoolRows,r=>r[metric]);
    if(Number.isFinite(value))items.push({get:isGet(schoolRows[0]),value});
  }
  return {items,mode:progress?'delta':'pct',title:progress?`GET × não GET — variação média de ${typeof adrMetricLabel==='function'?adrMetricLabel(metric):metric}`:`GET × não GET — ${typeof adrMetricLabel==='function'?adrMetricLabel(metric):metric}`,subtitle:`${masterLabel()} · ${document.getElementById('adrAno')?.value||''} · ${document.getElementById('adrComp')?.value||''}`};
}
function somComparison(){
  if(typeof somFilteredRows!=='function'||typeof somMetricValue!=='function')return null;
  const rows=somFilteredRows({ignoreSearch:true});
  const metric=document.getElementById('somMetric')?.value||'principal';
  const progress=document.getElementById('somMode')?.value==='progressao';
  const groups=groupRowsBySchool(rows),items=[];
  for(const schoolRows of groups){
    let value=null;
    if(progress){
      const editions=[...new Set(schoolRows.map(r=>String(r.edicao||'')).filter(Boolean))].sort((a,b)=>{try{return typeof somOrderEdicao==='function'?somOrderEdicao(a)-somOrderEdicao(b):a.localeCompare(b)}catch(_){return a.localeCompare(b)}});
      if(editions.length>1){const first=weighted(schoolRows.filter(r=>String(r.edicao||'')===editions[0]),r=>somMetricValue(r,metric));const last=weighted(schoolRows.filter(r=>String(r.edicao||'')===editions.at(-1)),r=>somMetricValue(r,metric));if(Number.isFinite(first)&&Number.isFinite(last))value=last-first}
    }else value=weighted(schoolRows,r=>somMetricValue(r,metric));
    if(Number.isFinite(value))items.push({get:isGet(schoolRows[0]),value});
  }
  const score=['ideb2023','ideb2025','notaPadronizada'].includes(metric);const mode=progress?'delta':score?'score':'pct';
  const label=typeof somMetricLabel==='function'?somMetricLabel(metric):metric;
  return {items,mode,title:progress?`GET × não GET — variação média de ${label}`:`GET × não GET — ${label}`,subtitle:`${masterLabel()} · ${document.getElementById('somModalidade')?.selectedOptions?.[0]?.textContent||''} · ${document.getElementById('somAnoEscolar')?.value||''} · ${document.getElementById('somComponente')?.selectedOptions?.[0]?.textContent||''}`};
}
function renderComparison(kind){
  const panel=document.getElementById(`${kind}GetOfficialPanel`);if(!panel||!compareState[kind])return;
  const result=kind==='som'?somComparison():adrComparison();
  if(!result){panel.innerHTML='<div class="get-official-empty">A comparação não está disponível neste recorte.</div>';return}
  const getValues=result.items.filter(x=>x.get).map(x=>x.value),nonValues=result.items.filter(x=>!x.get).map(x=>x.value);
  const data=[{label:'GETs',color:BLUE,value:mean(getValues),count:getValues.length},{label:'Não GETs',color:GREEN,value:mean(nonValues),count:nonValues.length}];
  const finite=data.map(x=>x.value).filter(Number.isFinite),max=finite.length?Math.max(...finite.map(Math.abs),1):1;
  const rows=data.map(item=>`<div class="get-official-row"><div class="get-official-label"><i style="background:${item.color}"></i>${item.label}</div><div class="get-official-track"><b style="width:${Number.isFinite(item.value)?Math.max(3,Math.abs(item.value)/max*100):0}%;background:${item.color}"></b></div><div class="get-official-value">${metricFormat(item.value,result.mode)}<small>${item.count} escola${item.count===1?'':'s'}</small></div></div>`).join('');
  panel.innerHTML=`<div class="get-official-compare-head"><div><h4>${result.title}</h4><p>${result.subtitle}. A comparação mantém os filtros analíticos atuais e o universo do filtro Master.</p></div><span class="get-official-compare-source">Base oficial · 355 GETs</span></div>${finite.length?`<div class="get-official-bars">${rows}</div>`:'<div class="get-official-empty">Não há resultados numéricos suficientes para comparar os dois grupos neste recorte.</div>'}`;
  scheduleDecorate(panel);
}
function installComparison(kind){
  const card=document.getElementById(kind==='som'?'somFiltersCard':'adrFiltersCard');if(!card||document.getElementById(`${kind}GetOfficialButton`))return;
  const actions=document.createElement('div');actions.className='get-official-actions';
  const button=document.createElement('button');button.type='button';button.id=`${kind}GetOfficialButton`;button.className='get-official-compare-button';button.setAttribute('aria-pressed','false');button.textContent='Comparar GET × não GET';actions.appendChild(button);card.appendChild(actions);
  const panel=document.createElement('div');panel.id=`${kind}GetOfficialPanel`;panel.className='get-official-compare';panel.hidden=true;card.insertAdjacentElement('afterend',panel);
  button.addEventListener('click',()=>{compareState[kind]=!compareState[kind];button.setAttribute('aria-pressed',String(compareState[kind]));panel.hidden=!compareState[kind];if(compareState[kind])renderComparison(kind)});
}
function refreshOpenComparisons(){for(const kind of ['som','adr'])if(compareState[kind])renderComparison(kind)}
function stamp(){document.documentElement.dataset.graVersion=VERSION;document.querySelectorAll('#dashboardVersionBadge,.gra-start-version,.gra-access-version,.exp-badge').forEach(el=>{if(/^v?\d+/i.test((el.textContent||'').trim()))el.textContent=VERSION});document.title=`Ferramenta GRA de análise de dados — ${VERSION}`}
function boot(){
  applyOfficialClassification();installComparison('som');installComparison('adr');decorate();stamp();
  new MutationObserver(mutations=>{for(const mutation of mutations)for(const node of mutation.addedNodes)if(node.nodeType===1)scheduleDecorate(node)}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('change',event=>{if(event.target?.closest('#somFiltersCard,#adrFiltersCard')||event.target?.id==='regionalScopeSelect')setTimeout(refreshOpenComparisons,0)},true);
  document.addEventListener('input',event=>{if(['somSearch','adrSearch'].includes(event.target?.id))setTimeout(refreshOpenComparisons,80)},true);
  document.addEventListener('click',event=>{if(event.target?.closest('.nav button[data-section]'))setTimeout(()=>{decorate();refreshOpenComparisons();stamp()},80)},true);
  [250,900,1800].forEach(ms=>setTimeout(()=>{applyOfficialClassification();decorate();stamp()},ms));
}
window.GRA_GETS={version:VERSION,source:'20260930_GETs_SMERio.xlsx',rows:OFFICIAL,isGet,badgeHtml,decorate,applyOfficialClassification};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
