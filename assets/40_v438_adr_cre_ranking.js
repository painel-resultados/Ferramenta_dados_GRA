(function(){
'use strict';
const byId=id=>document.getElementById(id);
const has=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const creNumber=v=>{const m=String(v||'').match(/\d+/);return m?Number(m[0]):0};
const schoolKey=r=>String(r.escola||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const ordinal=v=>Number(String(v||'').match(/\d+/)?.[0]||99);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>has(v)?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}):'—';
const pct=v=>has(v)?number(v)+'%':'—';
const delta=v=>has(v)?(v>0?'+':'')+number(v)+' p.p.':'—';
const lower=metric=>typeof window.adrLowerIsBetter==='function'?window.adrLowerIsBetter(metric):metric==='abaixo';
function weighted(rows,metric){let sum=0,weight=0;for(const r of rows){if(!has(r[metric]))continue;const w=has(r.avaliados)&&Number(r.avaliados)>0?Number(r.avaliados):1;sum+=Number(r[metric])*w;weight+=w}return weight?sum/weight:null}
function countSchools(rows){return new Set(rows.filter(r=>r.escola).map(schoolKey)).size}
function ordered(items,metric,progress){
 items.sort((a,b)=>(progress?b.favorable-a.favorable:lower(metric)?a.value-b.value:b.value-a.value)||a.cre-b.cre);
 let rank=0,last=null;items.forEach((item,i)=>{const value=progress?item.favorable:item.value;if(last===null||Math.abs(value-last)>1e-9)rank=i+1;item.rank=rank;last=value});return items;
}
function calculate(rows,metric,mode='individual'){
 const groups=new Map();for(const row of rows||[]){const cre=creNumber(row.regional||row.cre);if(cre<1||cre>11)continue;if(!groups.has(cre))groups.set(cre,[]);groups.get(cre).push(row)}
 const editions=[...new Set((rows||[]).map(r=>r.adr).filter(Boolean))].sort((a,b)=>ordinal(a)-ordinal(b));
 if(mode!=='progressao')return {mode,rankings:editions.map(edition=>({edition,items:ordered([...groups].map(([cre,rs])=>{const valid=rs.filter(r=>r.adr===edition&&has(r[metric]));const value=weighted(valid,metric);return has(value)?{cre,value,schools:countSchools(valid)}:null}).filter(Boolean),metric,false)})),editions};
 const comparable=editions.filter(edition=>(rows||[]).some(r=>r.adr===edition&&has(r[metric])));
 const missing=editions.filter(e=>!comparable.includes(e));
 if(comparable.length<2)return {mode,items:[],editions,comparable,missing,first:'',last:''};
 const first=comparable[0],last=comparable.at(-1);
 const items=[...groups].map(([cre,rs])=>{
  const seen=new Map();for(const r of rs){if(!r.escola||!has(r[metric])||!comparable.includes(r.adr))continue;const key=schoolKey(r);if(!seen.has(key))seen.set(key,new Set());seen.get(key).add(r.adr)}
  const paired=new Set([...seen].filter(([,es])=>comparable.every(e=>es.has(e))).map(([key])=>key));
  const valid=rs.filter(r=>paired.has(schoolKey(r))&&has(r[metric]));
  const initial=weighted(valid.filter(r=>r.adr===first),metric),final=weighted(valid.filter(r=>r.adr===last),metric);
  if(!has(initial)||!has(final))return null;
  const change=final-initial;return {cre,initial,final,change,favorable:lower(metric)?-change:change,schools:paired.size};
 }).filter(Boolean);
 return {mode,items:ordered(items,metric,true),editions,comparable,missing,first,last};
}
function enabled(){const master=byId('regionalScopeSelect');return !!master&&Number(master.value||0)===0&&(byId('adrAgente')?.value||'')===''}
function individualHtml(ranking){
 const max=Math.max(...ranking.items.map(r=>r.value),1);
 return `<section class="adr-cre-ranking-section"><h4>${esc(ranking.edition)}</h4>${ranking.items.length?ranking.items.map(item=>`<div class="adr-cre-ranking-row" data-cre="${item.cre}" data-value="${item.value}" data-rank="${item.rank}"><b class="adr-cre-position">${item.rank}º</b><div class="adr-cre-name"><strong>CRE ${String(item.cre).padStart(2,'0')}</strong><small>${item.schools} escolas com indicador</small></div><div class="adr-cre-meter" aria-hidden="true"><span style="width:${Math.max(0,item.value/max*100)}%"></span></div><strong class="adr-cre-score">${pct(item.value)}</strong></div>`).join(''):'<p class="adr-empty">Indicador não fornecido nesta ADR.</p>'}</section>`;
}
function progressionHtml(data){
 if(!data.items.length)return '<div class="adr-empty">Não há duas ADRs com o indicador e escolas pareadas neste recorte para calcular o ranking de progressão.</div>';
 const max=Math.max(...data.items.map(r=>Math.abs(r.favorable)),1);
 return `<section class="adr-cre-ranking-section"><h4>${esc(data.first)} → ${esc(data.last)}</h4>${data.items.map(item=>{
  const width=Math.abs(item.favorable)/max*50;
  return `<div class="adr-cre-ranking-row progress" data-cre="${item.cre}" data-value="${item.favorable}" data-rank="${item.rank}"><b class="adr-cre-position">${item.rank}º</b><div class="adr-cre-name"><strong>CRE ${String(item.cre).padStart(2,'0')}</strong><small>${pct(item.initial)} → ${pct(item.final)} · ${item.schools} escolas pareadas</small><small>Variação real: ${delta(item.change)}</small></div><div class="adr-cre-meter signed" aria-hidden="true"><span class="${item.favorable<0?'negative':'positive'}" style="left:${item.favorable<0?50-width:50}%;width:${width}%"></span></div><strong class="adr-cre-score ${item.favorable<0?'negative':'positive'}">${delta(item.favorable)}</strong></div>`;
 }).join('')}</section>`;
}
function render(){
 if(!enabled())return;
 const card=byId('adrCreCompareCard'),chart=byId('adrCreChart');if(!card||!chart)return;
 const metric=byId('adrMetric')?.value||'adequado',mode=byId('adrMode')?.value||'individual';
 const rows=typeof window.adrFilteredRows==='function'?window.adrFilteredRows({ignoreCre:true,ignoreAdr:mode==='progressao'}):[];
 const data=calculate(rows,metric,mode),label=typeof window.adrMetricLabel==='function'?window.adrMetricLabel(metric):metric;
 card.style.display='block';chart.className='adr-cre-ranking';
 byId('adrCreTitle').textContent=mode==='progressao'?`Ranking de progressão das CREs — ${label}`:`Ranking das CREs — ${label}`;
 byId('adrCreSubtitle').textContent=mode==='progressao'?`Ordenação pela evolução favorável em pontos percentuais. ${lower(metric)?'Reduzir o indicador é melhorar.':'Aumentar o indicador é melhorar.'}`:`Média ponderada pelo número de avaliados. ${lower(metric)?'Menor percentual primeiro.':'Maior percentual primeiro.'}`;
 chart.innerHTML=mode==='progressao'?progressionHtml(data):data.rankings.map(individualHtml).join('');
 if(!rows.length)chart.innerHTML='<div class="adr-empty">Não há dados neste recorte.</div>';
 const missing=data.missing?.length?` Indicador não fornecido em ${data.missing.join(', ')}; essas edições não são tratadas como zero.`:'';
 const note=mode==='progressao'?`Mesmas escolas em todas as ADRs com indicador disponível (${data.comparable?.join(' → ')||'sem comparação'}). Médias ponderadas por avaliados em cada edição. A variação real e os percentuais inicial e final acompanham a evolução favorável.${missing}`:'Somente CREs com indicador disponível são classificadas. Empates compartilham a mesma posição. Prioridade e busca respeitam o recorte selecionado.';
 chart.insertAdjacentHTML('beforeend',`<p class="adr-cre-ranking-note">${esc(note)}</p>`);
 window.__GRA_ADR_CRE_RANKING__.last={metric,...data};
}
function boot(){
 const previousRender=window.renderADRs;
 window.renderADRs=function(){
  // The visible Master and Abrangência determine this view; a stale hidden
  // selector must not turn an SME comparison into a single-CRE chart.
  if(enabled()&&byId('adrCre'))byId('adrCre').value='';
  return typeof previousRender==='function'?previousRender.apply(this,arguments):undefined;
 };
 const previous=window.renderADRCreChart;
 window.renderADRCreChart=function(){const result=typeof previous==='function'?previous.apply(this,arguments):undefined;render();return result};
 const previousProgress=window.renderADRProgress;
 window.renderADRProgress=function(){
  const result=typeof previousProgress==='function'?previousProgress.apply(this,arguments):undefined;
  byId('adrProgressChart')?.classList.toggle('adr-cre-lines-mode',enabled()&&byId('adrMode')?.value==='progressao');
  return result;
 };
 window.__GRA_ADR_CRE_RANKING__={version:'438-hotfix',calculate,weighted,enabled,render,last:null};
 // Refresh only a section already initialized; opening ADR remains lazy.
 if(window.__GRA_SECTION_INIT?.adrs)render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
