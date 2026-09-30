(function(){
'use strict';
const VERSION='v426';
const OFFICIAL=Array.isArray(window.GRA_GETS_OFFICIAL_ROWS)?window.GRA_GETS_OFFICIAL_ROWS:[];
const BLUE='#0a66d9',GREEN='#1d8f68';
const officialByCode=new Map(),officialByCreName=new Map(),officialByName=new Map();
const compareState={active:false};

function norm(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]))}
function creNumber(value){const m=String(value??'').match(/\d{1,2}/);return m?Number(m[0]):0}
function code(value){
  const raw=typeof value==='object'&&value?value.codeSME??value.codigoSME??value.designacao??value.sme??value.codigo??'':value;
  const digits=String(raw??'').replace(/\D/g,'');
  return digits?digits.replace(/^0+(?=\d)/,''):'';
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
OFFICIAL.forEach(row=>{
  const c=code(row.code),key=canonicalName(row.name),creKey=`${Number(row.cre)}|${key}`;
  officialByCode.set(c,row);
  officialByCreName.set(creKey,row);
  if(!officialByName.has(key))officialByName.set(key,row);
});

function officialRow(value,creHint=''){
  const directCode=code(value);if(directCode&&officialByCode.has(directCode))return officialByCode.get(directCode);
  const cre=creNumber(creHint||(typeof value==='object'&&value?(value.cre??value.regional??value.creLabel):''));
  for(const name of namesFrom(value)){
    const key=canonicalName(name);if(!key)continue;
    if(cre&&officialByCreName.has(`${cre}|${key}`))return officialByCreName.get(`${cre}|${key}`);
    if(!cre&&officialByName.has(key))return officialByName.get(key);
  }
  return null;
}
function isGet(value,creHint=''){return Boolean(officialRow(value,creHint))}
function badgeHtml(value,cre=''){return isGet(value,cre)?'<span class="gra-get-badge" aria-label="Ginásio Educacional Tecnológico">GET</span>':''}

function applyOfficialClassification(){
  try{
    if(typeof GEO_POINTS!=='undefined'&&Array.isArray(GEO_POINTS))GEO_POINTS.forEach(point=>{point.isGET=isGet(point)});
  }catch(error){console.warn('GETs oficiais: mapa indisponível para classificação.',error)}
}

function elementSchoolName(el){
  const direct=el?.dataset?.graSchoolName||el?.dataset?.somSchool||el?.dataset?.school;if(direct)return direct;
  const clone=el?.cloneNode?.(true);clone?.querySelectorAll?.('.gra-get-badge').forEach(x=>x.remove());
  return String(clone?.textContent||el?.textContent||'').replace(/\s+GET\s*$/i,'').trim();
}
function decorateElement(el){
  if(!(el instanceof Element)||el.closest('.gra-get-badge'))return;
  const name=elementSchoolName(el),key=canonicalName(name);if(el.dataset.graGetChecked===key)return;
  el.dataset.graGetChecked=key;el.querySelectorAll(':scope > .gra-get-badge').forEach(x=>x.remove());
  if(!name||!isGet(name,el.dataset.cre||el.closest('[data-cre]')?.dataset?.cre||''))return;
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
let decorateFrame=0;const decorateRoots=new Set();
function scheduleDecorate(root=document){
  decorateRoots.add(root||document);if(decorateFrame)return;
  decorateFrame=requestAnimationFrame(()=>{decorateFrame=0;const roots=[...decorateRoots];decorateRoots.clear();for(const item of roots)decorate(item)});
}

function formatInauguration(value){
  const text=String(value??'').trim();if(!text)return'—';
  const m=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:text;
}
function masterOfficialRows(){
  const select=document.getElementById('regionalScopeSelect'),mode=select?.selectedOptions?.[0]?.dataset?.graMasterMode||window.__GRA_MASTER_SCOPE__||'',cre=creNumber(select?.value)||creNumber(window.__GRA_ACCESS__?.cre);
  if(String(window.__GRA_ACCESS__?.role||'').toLowerCase()==='agent'&&mode==='mine'){
    const who=norm(window.__GRA_ACCESS__?.name||''),found=new Map();
    try{
      const points=(Array.isArray(window.GEO_POINTS)?window.GEO_POINTS:(typeof GEO_POINTS!=='undefined'&&Array.isArray(GEO_POINTS)?GEO_POINTS:[]));
      for(const point of points){if(norm(point?.agent||point?.agente||'')!==who)continue;const row=officialRow(point);if(row)found.set(row.code,row)}
    }catch(_){ }
    if(found.size)return[...found.values()];
  }
  return cre?OFFICIAL.filter(row=>Number(row.cre)===cre):OFFICIAL.slice();
}
function contextCard(html){const section=document.createElement('section');section.className='v392-context-card gra-get-context-card';section.dataset.graGetContext='1';section.innerHTML=html;return section}
function enhanceContextDrawer(){
  const overlay=document.getElementById('v392SchoolContextOverlay'),body=document.getElementById('v392ContextBody');
  if(!overlay?.classList.contains('open')||!body)return;
  body.querySelectorAll('[data-gra-get-context]').forEach(x=>x.remove());
  if(overlay.dataset.graContextType==='school'){
    const cre=overlay.dataset.graContextSchoolCre||'',row=officialRow({codeSME:overlay.dataset.graContextSchoolCode,name:overlay.dataset.graContextSchoolName,cre},cre);if(!row)return;
    const card=contextCard(`<h3>Ginásio Educacional Tecnológico</h3><p class="v392-desc">Classificação oficial da unidade na base de GETs da SME-Rio.</p><div class="v392-kpis gra-get-context-kpis"><div class="v392-kpi"><small>Inauguração como GET</small><b>${formatInauguration(row.inauguration)}</b><span>Registro informado na planilha oficial</span></div></div>`);
    body.insertBefore(card,body.firstChild);return;
  }
  if(overlay.dataset.graContextType!=='aggregate')return;
  const rows=masterOfficialRows(),card=contextCard(`<h3>Ginásios Educacionais Tecnológicos</h3><p class="v392-desc">Quantidade de GETs no universo definido pelo filtro Master.</p><div class="v392-kpis gra-get-context-kpis"><div class="v392-kpi"><small>GETs no universo</small><b>${rows.length.toLocaleString('pt-BR')}</b><span>Base oficial da SME-Rio</span></div></div>`);
  body.insertBefore(card,body.firstChild);
}

function weighted(rows,valueFn){let sum=0,weight=0;for(const row of rows){const value=Number(valueFn(row));if(!Number.isFinite(value))continue;const w=Math.max(1,Number(row.avaliados)||1);sum+=value*w;weight+=w}return weight?sum/weight:null}
function mean(values){const valid=values.map(Number).filter(Number.isFinite);return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null}
function schoolKey(row){return `${creNumber(row?.cre||row?.regional)}|${canonicalName(row?.escola||row?.unidade||row?.name||'')}`}
function groupRowsBySchool(rows){const groups=new Map();for(const row of rows||[]){const key=schoolKey(row);if(!key.endsWith('|')){if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}}return [...groups.values()]}
function withoutSearch(id,fn){const input=document.getElementById(id);if(!input)return fn();const old=input.value;input.value='';try{return fn()}finally{input.value=old}}
function masterLabel(){return document.getElementById('regionalScopeSelect')?.selectedOptions?.[0]?.textContent?.trim()||'Toda a SME'}
function metricFormat(value,mode){if(!Number.isFinite(value))return'—';const d=mode==='score'?2:1;return value.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+(mode==='pct'?'%':mode==='delta'?' p.p.':'')}
function currentDifferenceFormat(value,mode){if(!Number.isFinite(value))return'—';const decimals=mode==='score'?2:2;return value.toLocaleString('pt-BR',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}
function axisTicks(min,max,steps=4){
  if(!Number.isFinite(min)||!Number.isFinite(max))return[];
  if(min===max){const only=min||0;return [only];}
  const out=[];for(let i=0;i<=steps;i++)out.push(min+((max-min)*i/steps));return out;
}
function orderAdrEdition(value){return Number(String(value??'').match(/\d+/)?.[0]||0)}
function orderSomEdition(a,b){try{return typeof somOrderEdicao==='function'?somOrderEdicao(a)-somOrderEdicao(b):String(a).localeCompare(String(b), 'pt-BR', {numeric:true})}catch(_){return String(a).localeCompare(String(b), 'pt-BR', {numeric:true})}}

function computeSeries(kind){
  if(kind==='adr'){
    if(typeof adrFilteredRows!=='function')return null;
    const rows=withoutSearch('adrSearch',()=>adrFilteredRows());
    const metric=document.getElementById('adrMetric')?.value||'adequado';
    const progress=document.getElementById('adrMode')?.value==='progressao';
    const groups=groupRowsBySchool(rows);
    const label=typeof adrMetricLabel==='function'?adrMetricLabel(metric):metric;
    const subtitle=`${masterLabel()} · ${document.getElementById('adrAno')?.value||''} · ${document.getElementById('adrComp')?.value||''}`;
    if(progress){
      const editions=[...new Set(rows.map(r=>String(r.adr||'')).filter(Boolean))].sort((a,b)=>orderAdrEdition(a)-orderAdrEdition(b));
      const points=editions.map(ed=>{
        const getVals=[],nonVals=[];
        for(const schoolRows of groups){
          const value=weighted(schoolRows.filter(r=>String(r.adr||'')===ed),r=>r[metric]);
          if(!Number.isFinite(value))continue;
          (isGet(schoolRows[0])?getVals:nonVals).push(value);
        }
        return {label:ed,get:mean(getVals),non:mean(nonVals),getCount:getVals.length,nonCount:nonVals.length};
      }).filter(point=>Number.isFinite(point.get)||Number.isFinite(point.non));
      const allGet=points.flatMap(p=>Number.isFinite(p.get)?[p.get]:[]),allNon=points.flatMap(p=>Number.isFinite(p.non)?[p.non]:[]);
      return {kind:'line',mode:'pct',title:`GETs × não GETs — progressão média de ${label}`,subtitle,points,getSchoolCount:Math.max(0,...points.map(p=>p.getCount)),nonSchoolCount:Math.max(0,...points.map(p=>p.nonCount)),getCurrent:points.at(-1)?.get??mean(allGet),nonCurrent:points.at(-1)?.non??mean(allNon)};
    }
    const getVals=[],nonVals=[];
    for(const schoolRows of groups){
      const value=weighted(schoolRows,r=>r[metric]);if(!Number.isFinite(value))continue;
      (isGet(schoolRows[0])?getVals:nonVals).push(value);
    }
    return {kind:'bar',mode:'pct',title:`GETs × não GETs — média de ${label}`,subtitle,data:[{label:'GETs',color:BLUE,value:mean(getVals),count:getVals.length},{label:'Não GETs',color:GREEN,value:mean(nonVals),count:nonVals.length}]};
  }

  if(kind==='som'){
    if(typeof somFilteredRows!=='function'||typeof somMetricValue!=='function')return null;
    const rows=somFilteredRows({ignoreSearch:true});
    const metric=document.getElementById('somMetric')?.value||'principal';
    const progress=document.getElementById('somMode')?.value==='progressao';
    const groups=groupRowsBySchool(rows);
    const score=['ideb2023','ideb2025','notaPadronizada','crescimento'].includes(metric);
    const mode=progress?'delta':score?'score':'pct';
    const label=typeof somMetricLabel==='function'?somMetricLabel(metric):metric;
    const titleLabel=metric==='crescimento'?'crescimento médio em pontos':label;
    const subtitle=`${masterLabel()} · ${document.getElementById('somModalidade')?.selectedOptions?.[0]?.textContent||''} · ${document.getElementById('somAnoEscolar')?.value||''} · ${document.getElementById('somComponente')?.selectedOptions?.[0]?.textContent||''}`;
    if(progress){
      const editions=[...new Set(rows.map(r=>String(r.edicao||'')).filter(Boolean))].sort(orderSomEdition);
      const points=editions.map(ed=>{
        const getVals=[],nonVals=[];
        for(const schoolRows of groups){
          const value=weighted(schoolRows.filter(r=>String(r.edicao||'')===ed),r=>somMetricValue(r,metric));
          if(!Number.isFinite(value))continue;
          (isGet(schoolRows[0])?getVals:nonVals).push(value);
        }
        return {label:ed,get:mean(getVals),non:mean(nonVals),getCount:getVals.length,nonCount:nonVals.length};
      }).filter(point=>Number.isFinite(point.get)||Number.isFinite(point.non));
      return {kind:'line',mode:score?'score':'pct',title:`GETs × não GETs — progressão média de ${titleLabel}`,subtitle,points,getSchoolCount:Math.max(0,...points.map(p=>p.getCount)),nonSchoolCount:Math.max(0,...points.map(p=>p.nonCount)),getCurrent:points.at(-1)?.get??null,nonCurrent:points.at(-1)?.non??null};
    }
    const getVals=[],nonVals=[];
    for(const schoolRows of groups){
      const value=weighted(schoolRows,r=>somMetricValue(r,metric));if(!Number.isFinite(value))continue;
      (isGet(schoolRows[0])?getVals:nonVals).push(value);
    }
    return {kind:'bar',mode,title:`GETs × não GETs — média de ${titleLabel}`,subtitle,data:[{label:'GETs',color:BLUE,value:mean(getVals),count:getVals.length},{label:'Não GETs',color:GREEN,value:mean(nonVals),count:nonVals.length}]};
  }
  return null;
}

function barChartSvg(data,mode){
  const values=data.map(d=>Number(d.value)).filter(Number.isFinite);
  if(!values.length)return '';
  const width=760,height=320,margin={top:38,right:20,bottom:64,left:72};
  const plotW=width-margin.left-margin.right,plotH=height-margin.top-margin.bottom;
  const max=Math.max(...values,1)*1.14;
  const ticks=axisTicks(0,max,4);
  const usableW=plotW/data.length;
  const barW=Math.min(128,usableW*0.48);
  const zeroY=margin.top+plotH;
  const y=v=>margin.top+plotH-(v/max)*plotH;
  let svg=`<svg class="get-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Comparação média entre GETs e não GETs">`;
  svg+=`<rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="#fff"/>`;
  ticks.forEach(t=>{const yy=y(t);svg+=`<line x1="${margin.left}" y1="${yy}" x2="${width-margin.right}" y2="${yy}" stroke="#dbe6ef" stroke-width="1"/>`;svg+=`<text x="${margin.left-12}" y="${yy+4}" text-anchor="end" class="get-chart-axis">${esc(metricFormat(t,mode))}</text>`});
  data.forEach((item,index)=>{
    const center=margin.left+(usableW*index)+(usableW/2),barX=center-(barW/2),barY=y(item.value),barH=Math.max(0,zeroY-barY);
    svg+=`<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="12" fill="${item.color}" opacity="0.95"/>`;
    svg+=`<text x="${center}" y="${Math.max(22,barY-10)}" text-anchor="middle" class="get-chart-value">${esc(metricFormat(item.value,mode))}</text>`;
    svg+=`<text x="${center}" y="${zeroY+26}" text-anchor="middle" class="get-chart-label">${esc(item.label)}</text>`;
    svg+=`<text x="${center}" y="${zeroY+42}" text-anchor="middle" class="get-chart-sub">${esc(item.count+' escola'+(item.count===1?'':'s'))}</text>`;
  });
  svg+=`<line x1="${margin.left}" y1="${zeroY}" x2="${width-margin.right}" y2="${zeroY}" stroke="#9fb5c8" stroke-width="1.4"/>`;
  svg+='</svg>';
  return svg;
}

function linePath(points,xFn,yFn){return points.map((p,i)=>`${i===0?'M':'L'} ${xFn(p,i)} ${yFn(p,i)}`).join(' ')}
function lineChartSvg(points,mode){
  const values=points.flatMap(p=>[p.get,p.non]).filter(Number.isFinite);
  if(!values.length)return '';
  const width=820,height=344,margin={top:34,right:30,bottom:70,left:72};
  const plotW=width-margin.left-margin.right,plotH=height-margin.top-margin.bottom;
  let min=Math.min(...values),max=Math.max(...values);
  if(min===max){min=min-1;max=max+1}
  const span=max-min||1,pad=span*0.12;min-=pad;max+=pad;
  const ticks=axisTicks(min,max,4);
  const x=(index)=>points.length<=1?margin.left+(plotW/2):margin.left+(plotW*(index/(points.length-1)));
  const y=(value)=>margin.top+plotH-(((value-min)/(max-min))*plotH);
  const getPts=points.map((p,i)=>({x:x(i),y:y(p.get),value:p.get,label:p.label,count:p.getCount})).filter(p=>Number.isFinite(p.value));
  const nonPts=points.map((p,i)=>({x:x(i),y:y(p.non),value:p.non,label:p.label,count:p.nonCount})).filter(p=>Number.isFinite(p.value));
  let svg=`<svg class="get-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Progressão média entre GETs e não GETs">`;
  svg+=`<rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="#fff"/>`;
  ticks.forEach(t=>{const yy=y(t);svg+=`<line x1="${margin.left}" y1="${yy}" x2="${width-margin.right}" y2="${yy}" stroke="#dbe6ef" stroke-width="1"/>`;svg+=`<text x="${margin.left-12}" y="${yy+4}" text-anchor="end" class="get-chart-axis">${esc(metricFormat(t,mode))}</text>`});
  points.forEach((point,index)=>{const xx=x(index);svg+=`<line x1="${xx}" y1="${margin.top}" x2="${xx}" y2="${height-margin.bottom}" stroke="#eff4f8" stroke-width="1"/>`;svg+=`<text x="${xx}" y="${height-margin.bottom+26}" text-anchor="middle" class="get-chart-label">${esc(point.label)}</text>`});
  if(getPts.length)svg+=`<path d="${linePath(getPts,p=>p.x,p=>p.y)}" fill="none" stroke="${BLUE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  if(nonPts.length)svg+=`<path d="${linePath(nonPts,p=>p.x,p=>p.y)}" fill="none" stroke="${GREEN}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  getPts.forEach(p=>{svg+=`<circle cx="${p.x}" cy="${p.y}" r="5.5" fill="${BLUE}" stroke="#fff" stroke-width="2"/>`;svg+=`<text x="${p.x}" y="${Math.max(18,p.y-12)}" text-anchor="middle" class="get-chart-value is-get">${esc(metricFormat(p.value,mode))}</text>`});
  nonPts.forEach(p=>{svg+=`<circle cx="${p.x}" cy="${p.y}" r="5.5" fill="${GREEN}" stroke="#fff" stroke-width="2"/>`;svg+=`<text x="${p.x}" y="${Math.min(height-margin.bottom-8,p.y+18)}" text-anchor="middle" class="get-chart-value is-non">${esc(metricFormat(p.value,mode))}</text>`});
  svg+=`<line x1="${margin.left}" y1="${height-margin.bottom}" x2="${width-margin.right}" y2="${height-margin.bottom}" stroke="#9fb5c8" stroke-width="1.4"/>`;
  svg+='</svg>';
  return svg;
}

function ensurePanel(kind){
  const filterCard=document.getElementById(kind==='som'?'somFiltersCard':'adrFiltersCard');
  if(!filterCard)return null;
  let panel=document.getElementById(`${kind}GetOfficialPanel`);
  if(!panel){
    panel=document.createElement('section');
    panel.id=`${kind}GetOfficialPanel`;
    panel.className='get-official-compare get-official-primary';
    panel.hidden=true;
    filterCard.insertAdjacentElement('afterend',panel);
  }
  return panel;
}

function renderComparison(kind){
  const panel=ensurePanel(kind);if(!panel)return;
  panel.hidden=!compareState.active;
  if(!compareState.active)return;
  const result=computeSeries(kind);
  if(!result){panel.innerHTML='<div class="get-official-empty">A comparação dos GETs não está disponível neste recorte.</div>';return}
  if(result.kind==='line'&&!result.points?.length){panel.innerHTML='<div class="get-official-empty">Não há resultados numéricos suficientes para comparar GETs e não GETs neste recorte.</div>';return}
  if(result.kind==='bar'&&!result.data?.some(item=>Number.isFinite(item.value))){panel.innerHTML='<div class="get-official-empty">Não há resultados numéricos suficientes para comparar GETs e não GETs neste recorte.</div>';return}
  const getCount=result.kind==='line'?Number(result.getSchoolCount||0):Number(result.data?.[0]?.count||0);
  const nonCount=result.kind==='line'?Number(result.nonSchoolCount||0):Number(result.data?.[1]?.count||0);
  const currentGet=result.kind==='line'?result.getCurrent:result.data?.[0]?.value;
  const currentNon=result.kind==='line'?result.nonCurrent:result.data?.[1]?.value;
  const delta=Number.isFinite(currentGet)&&Number.isFinite(currentNon)?currentGet-currentNon:null;
  const chart=result.kind==='line'?lineChartSvg(result.points,result.mode):barChartSvg(result.data,result.mode);
  panel.innerHTML=`
    <div class="get-official-compare-head">
      <div>
        <h4>${esc(result.title)}</h4>
        <p>${esc(result.subtitle)}. A chave GETs considera a base oficial da SME-Rio e preserva todas as visualizações da aba.</p>
      </div>
      <span class="get-official-compare-source">Base oficial · ${OFFICIAL.length.toLocaleString('pt-BR')} GETs</span>
    </div>
    <div class="get-official-kpis">
      <div class="get-official-kpi"><small>GETs no recorte</small><b>${getCount.toLocaleString('pt-BR')}</b><span>escolas consideradas</span></div>
      <div class="get-official-kpi"><small>Não GETs no recorte</small><b>${nonCount.toLocaleString('pt-BR')}</b><span>escolas consideradas</span></div>
      <div class="get-official-kpi ${delta>=0?'is-positive':'is-negative'}"><small>Diferença atual</small><b>${currentDifferenceFormat(delta,result.mode)}</b><span>GETs − não GETs · mesma unidade do indicador</span></div>
    </div>
    <div class="get-official-chart-wrap">${chart}</div>`;
  scheduleDecorate(panel);
}

function refreshOpenComparisons(){['som','adr'].forEach(renderComparison)}
function updateTopSwitchUi(){
  const button=document.getElementById('getsOfficialBtn');
  if(!button)return;
  button.classList.toggle('active',compareState.active);
  button.setAttribute('aria-pressed',String(compareState.active));
  const status=button.querySelector('.gra-gets-switch-status');
  if(status)status.textContent=compareState.active?'Ativado':'Desativado';
  document.documentElement.dataset.graGetsComparison=compareState.active?'1':'0';
}
function setComparisonActive(active){compareState.active=!!active;updateTopSwitchUi();refreshOpenComparisons()}

function installTopSwitch(){
  if(document.getElementById('getsOfficialBtn'))return;
  const actions=document.querySelector('.topbar .actions');if(!actions)return;
  const button=document.createElement('button');
  button.type='button';button.id='getsOfficialBtn';button.className='gra-gets-switch';button.setAttribute('aria-pressed','false');
  button.innerHTML='<span class="gra-gets-switch-copy"><span class="gra-gets-switch-label">GETs</span><span class="gra-gets-switch-status">Desativado</span></span><span class="gra-gets-switch-track" aria-hidden="true"><span class="gra-gets-switch-thumb"></span></span>';
  const anchor=document.getElementById('partnersEducationBtn');
  if(anchor?.nextSibling)actions.insertBefore(button,anchor.nextSibling);else if(anchor)actions.appendChild(button);else actions.appendChild(button);
  button.addEventListener('click',()=>setComparisonActive(!compareState.active));
  updateTopSwitchUi();
}

function stamp(){
  document.documentElement.dataset.graVersion=VERSION;
  document.querySelectorAll('#dashboardVersionBadge,.gra-start-version,.gra-access-version,.exp-badge').forEach(el=>{if(/^v?\d+/i.test((el.textContent||'').trim()))el.textContent=VERSION});
  document.title=`Ferramenta GRA de análise de dados — ${VERSION}`;
}

function boot(){
  applyOfficialClassification();
  ensurePanel('som');ensurePanel('adr');
  installTopSwitch();
  decorate();
  stamp();
  new MutationObserver(mutations=>{
    for(const mutation of mutations){
      let elementAdded=false;
      for(const node of mutation.addedNodes)if(node.nodeType===1){elementAdded=true;scheduleDecorate(node)}
      if(!elementAdded&&mutation.target instanceof Element)scheduleDecorate(mutation.target);
    }
    installTopSwitch();
  }).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('change',event=>{if(event.target?.closest('#somFiltersCard,#adrFiltersCard')||event.target?.id==='regionalScopeSelect')setTimeout(refreshOpenComparisons,0)},true);
  document.addEventListener('input',event=>{if(['somSearch','adrSearch'].includes(event.target?.id))setTimeout(refreshOpenComparisons,80)},true);
  document.addEventListener('click',event=>{if(event.target?.closest('.nav button[data-section],#partnersEducationBtn,#v392SchoolContextBtn'))setTimeout(()=>{installTopSwitch();decorate();refreshOpenComparisons();stamp()},80)},true);
  document.addEventListener('click',event=>{if(event.target?.closest('#partnersEducationBtn')&&document.getElementById('v392SchoolContextOverlay')?.classList.contains('open'))setTimeout(enhanceContextDrawer,60)},true);
  document.addEventListener('change',event=>{if(event.target?.id==='regionalScopeSelect'&&document.getElementById('v392SchoolContextOverlay')?.classList.contains('open'))setTimeout(enhanceContextDrawer,30)},true);
  [250,900,1800].forEach(ms=>setTimeout(()=>{applyOfficialClassification();installTopSwitch();decorate();refreshOpenComparisons();stamp()},ms));
}
window.GRA_GETS={version:VERSION,source:'20260930_GETs_SMERio.xlsx',rows:OFFICIAL,isGet,officialRow,badgeHtml,decorate,applyOfficialClassification,enhanceContextDrawer,setComparisonActive,get comparisonActive(){return compareState.active}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
