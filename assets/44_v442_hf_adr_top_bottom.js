/* Ferramenta GRA v442 · Hotfix Top 10 / Bottom 10 das ADRs.
   Sem alterar a base original, a lógica de progresso, a ordem de carregamento nem as exportações. */
(function(){
 'use strict';
 if(window.__GRA_V442_HF_ADR_RANK__)return;
 const $=id=>document.getElementById(id);
 const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalized=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 const has=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
 const num=x=>Number(x).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:2});
 const pct=x=>has(x)?num(x)+'%':'—';
 const delta=x=>has(x)?(x>0?'+':'')+num(x)+' p.p.':'—';
 const metricLabel=k=>({adequado:'% Adequado',abaixo:'% Abaixo do Básico',acerto:'% Acerto Total'})[k]||k;
 const lower=k=>k==='abaixo';
 const order=x=>Number(String(x||'').match(/\d+/)?.[0]||99);
 const creNumber=x=>Number(String(x||'').match(/\d+/)?.[0]||0);
 const key=r=>normalized(`${r.regional||r.cre||''}|${r.escola||''}`);
 const getRows=()=>{try{return typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS)?ADR_ROWS:(Array.isArray(window.ADR_ROWS)?window.ADR_ROWS:[])}catch(_){return []}};
 function weighted(rows,metric){
   let sum=0,weights=0;
   for(const row of rows){if(!has(row[metric]))continue;const w=has(row.avaliados)&&Number(row.avaliados)>0?Number(row.avaliados):1;sum+=Number(row[metric])*w;weights+=w}
   return weights?sum/weights:null;
 }
 function getComponent(rows,mode){
   const chosen=$('adrProgressAllComp')?.value;
   const all=mode==='progressao'&&(!chosen||chosen==='ALL');
   const available=[...new Set(rows.map(r=>r.componente).filter(Boolean))].sort((a,b)=>{
     const list=['LP','MT','CN','CH','Geografia','História'];return (list.indexOf(a)<0?99:list.indexOf(a))-(list.indexOf(b)<0?99:list.indexOf(b))||a.localeCompare(b,'pt-BR');
   });
   const select=$('adrHfRankComp'),wrapper=$('adrHfCompWrap');
   if(!select||!wrapper)return $('adrComp')?.value||'';
   if(mode==='progressao'&&all){
     const preferred=available.includes(select.value)?select.value:(available.includes($('adrComp')?.value)?$('adrComp').value:available[0]||'');
     const sig=available.join('|');
     if(select.dataset.options!==sig){select.innerHTML=available.map(c=>`<option value="${safe(c)}">${safe(c)}</option>`).join('');select.dataset.options=sig;}
     select.value=preferred;wrapper.hidden=false;return preferred;
   }
   wrapper.hidden=true;
   const comp=mode==='progressao'?chosen:($('adrComp')?.value||'');
   if(comp && available.includes(comp))select.value=comp;
   return comp||'';
 }
 function scopedRows(raw,mode,component){
   const year=$('adrAno')?.value||'',adr=$('adrSelect')?.value||'',cre=Number($('regionalScopeSelect')?.value||0);
   const pairCode=$('adrEvolucao')?.value||'13';
   const interval=mode==='progressao'&&pairCode!=='13'?new Set(pairCode==='12'?['ADR 1','ADR 2']:['ADR 2','ADR 3']):null;
   const agent=$('adrAgente')?.value||'',priority=$('adrPriority')?.value==='sim';
   const q=normalized($('adrSearch')?.value||'');
   const selected=normalized(window.__GRA_SELECTED_SCHOOL__||'');
   return raw.filter(r=>{
     if(!r.escola||r.ano!==year||r.componente!==component)return false;
     if(mode==='individual'&&adr&&r.adr!==adr)return false;
     if(interval&&!interval.has(r.adr))return false;
     if(cre&&creNumber(r.regional||r.cre)!==cre)return false;
     if(typeof window.graMasterAllowsRow==='function'&&!window.graMasterAllowsRow(r))return false;
     if(priority&&typeof window.priorityMatchesContext==='function'&&!window.priorityMatchesContext(r.escola,year,'ADR',r.regional))return false;
     if(agent==='__gra_adr_school__' && selected && normalized(r.escola)!==selected)return false;
     if(agent&& !['__gra_adr_school__','__gra_adr_cre_lines__','__todas_escolas__'].includes(agent)){
       const a=typeof window.adrRowAgent==='function'?window.adrRowAgent(r):'';
       if(a!==agent)return false;
     }
     if(q){const a=typeof window.adrRowAgent==='function'?window.adrRowAgent(r):'';
       const t=normalized(`${r.escola} ${r.regional} ${a} ${r.adr} ${r.ano} ${r.componente}`);
       if(!t.includes(q))return false;
     }
     return true;
   });
 }
 function applyEvolution(groups,metric){return groups;} // Evolução seleciona exclusivamente intervalo
 function makeItems(rows,metric,mode){
   const groups=new Map();
   for(const row of rows){if(!has(row[metric]))continue;const k=key(row);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(row);}
   const paired=mode==='progressao'?applyEvolution([...groups.values()],metric):[...groups.values()];
   const editions=[...new Set(rows.filter(r=>has(r[metric])).map(r=>r.adr).filter(Boolean))].sort((a,b)=>order(a)-order(b));
   const [chosenFirst,chosenLast]=window.adrMainPair?.()||['ADR 1','ADR 3'];
   const first=mode==='progressao'?chosenFirst:(editions[0]||'');
   const last=mode==='progressao'?chosenLast:(editions[editions.length-1]||'');
   const items=paired.map(rs=>{
     const r=rs[0];let value=null,initial=null,rawDelta=null;
     if(mode==='progressao'){
       if(editions.length<2)return null;
       const begin=rs.filter(x=>x.adr===first),end=rs.filter(x=>x.adr===last);
       if(!begin.length||!end.length)return null;
       initial=weighted(begin,metric);value=weighted(end,metric);
       if(!has(initial)||!has(value))return null;
       rawDelta=value-initial;
     }else{value=weighted(rs,metric)}
     if(!has(value))return null;
     return {name:r.escola,cre:r.regional||r.cre||'',value,initial,rawDelta,first,last};
   }).filter(Boolean);
   items.sort((a,b)=>(lower(metric)?a.value-b.value:b.value-a.value)||a.name.localeCompare(b.name,'pt-BR')||creNumber(a.cre)-creNumber(b.cre));
   return {items,first,last};
 }
 function divide(items){
   const n=items.length;if(n>=20)return {best:items.slice(0,10),worst:items.slice(-10).reverse()};
   const up=Math.ceil(n/2);return {best:items.slice(0,up),worst:items.slice(up).reverse()};
 }
 function panel(title,items,metric,mode,challenging){
   const max=Math.max(100,...items.map(x=>x.value));
   const note=mode==='progressao'?` · ${safe(items[0]?.first||'ADR 1')} → ${safe(items[0]?.last||'ADR 3')}`:'';
   return `<div class="adr-hf-panel ${challenging?'challenge':'best'}"><div class="adr-hf-title"><h4>${safe(title)}</h4><span>${items.length} escola${items.length===1?'':'s'}${note}</span></div><div class="adr-hf-items">${items.length?items.map((r,i)=>{
      const rank=i+1;
      const progress=mode==='progressao'&&has(r.rawDelta);
      const favorable=progress?(lower(metric)?-r.rawDelta:r.rawDelta):null;
      const schoolName=safe(r.name);
      const label=progress?`${safe(r.first)}: ${pct(r.initial)} → ${safe(r.last)}: ${pct(r.value)} · Δ ${delta(r.rawDelta)}`:'';
      const changeText=progress?`<span style="color:${favorable>=0?'#16805f':'#b04f46'};font-weight:750">${favorable>0?'▲':favorable<0?'▼':'↔'} ${safe(label)}</span>`:'';
      return `<article class="adr-hf-item"><div class="adr-hf-topline"><b class="adr-hf-order">${rank}º</b><strong class="adr-hf-school">${schoolName}</strong><strong class="adr-hf-score">${pct(r.value)}</strong></div><div class="adr-hf-context">${safe(r.cre)}${progress?' · ':''}${changeText}</div><div class="adr-hf-meter" aria-hidden="true"><b style="width:${Math.max(0,Math.min(100,r.value/max*100)).toFixed(2)}%"></b></div></article>`;
   }).join(''):'<div class="adr-hf-empty">Não há escolas suficientes com dados válidos neste recorte.</div>'}</div></div>`;
 }
 function render(){
   const root=$('adrTopBottomHf442');if(!root||!$('adrMode'))return;
   const mode=$('adrMode').value||'individual',year=$('adrAno')?.value||'',selectedMetric=$('adrMetric')?.value||'adequado';
   const all=getRows();
   if(!all.length){$('adrHfSubtitle').textContent='Carregando dados das ADRs…';$('adrHfPanels').innerHTML='';return;}
   const component=getComponent(all.filter(r=>r.ano===year),mode);
   const metric=['LP','MT'].includes(component)?selectedMetric:'acerto';
   const rows=scopedRows(all,mode,component);
   const {items,first,last}=makeItems(rows,metric,mode);
   const {best,worst}=divide(items);
   const title=mode==='progressao'?`Resultado final na progressão — ${metricLabel(metric)}`:`Ranking de escolas — ${metricLabel(metric)}`;
   $('adrHfTitle').textContent=title;
   const ed=mode==='progressao'?` · ${first||'ADR inicial'} → ${last||'ADR final'}`:` · ${$('adrSelect')?.value||'ADR'}`;
   $('adrHfSubtitle').textContent=`${year} · ${component||'Componente não selecionado'}${ed} · ${items.length} escolas com resultado válido. ${metric==='abaixo'?'Menor Abaixo do Básico significa melhor desempenho.':'Maior resultado significa melhor desempenho.'}`;
   $('adrHfPanels').innerHTML=panel('Top 10 · melhores resultados',best,metric,mode,false)+panel('Bottom 10 · mais desafiadores',worst,metric,mode,true);
   $('adrHfFootnote').textContent=mode==='progressao'?'Ordenação pelo resultado da última ADR comparável, com variação real em pontos percentuais e somente escolas com resultados nas duas edições. A classificação não usa a variação como nota.': 'Classificação por escola, sem duplicidade entre Top e Bottom; valores agregados por média ponderada de estudantes avaliados. Escolas sem indicador não entram como zero.';
   window.__GRA_V442_HF_ADR_RANK__.last={mode,year,component,metric,total:items.length,top:best.map(x=>x.name),bottom:worst.map(x=>x.name),first,last};
 }
 let timer=0;
 function schedule(ms=75){clearTimeout(timer);timer=setTimeout(()=>{try{render()}catch(e){console.error('[v442 hotfix ranking ADR]',e)}},ms)}
 function boot(){
   const old=window.renderADRs;
   if(typeof old==='function'&&!old.__v442Rank){const wrapped=function(){const result=old.apply(this,arguments);schedule(30);return result};wrapped.__v442Rank=true;window.renderADRs=wrapped;try{renderADRs=wrapped}catch(_){}}
   document.addEventListener('change',e=>{
     const id=e.target?.id;
     if(id==='adrHfRankComp')schedule(0);
     else if(['adrMode','adrAno','adrComp','adrSelect','adrMetric','adrEvolucao','adrCre','adrAgente','adrPriority','regionalScopeSelect','adrProgressAllComp'].includes(id))schedule(120);
   },true);
   document.addEventListener('input',e=>{if(e.target?.id==='adrSearch')schedule(170)},true);
   document.addEventListener('click',e=>{if(e.target?.closest?.('button[data-section="adrs"]'))schedule(350)},true);
   schedule(400);
 }
 window.__GRA_V442_HF_ADR_RANK__={version:'v442',render,schedule,makeItems,divide,weighted,last:null};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
