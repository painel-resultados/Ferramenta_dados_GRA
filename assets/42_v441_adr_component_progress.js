/* Dashboard Definitivo 33 · v441 HF7 · progressão multicurricular ADR; componente na grade principal. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
 const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
 const compOrder=['LP','MT','CN','Geografia','História','CH'];
 const titles={LP:'Língua Portuguesa',MT:'Matemática',CN:'Ciências da Natureza',Geografia:'Geografia','História':'História',CH:'Ciências Humanas'};
 const colors={'LP':'#1670b8','MT':'#15835b','CN':'#db8621','Geografia':'#8d58c7','História':'#d34b68','CH':'#19a3aa'};
 const ADRS=['ADR 1','ADR 2','ADR 3'];
 const style=`
 #adrProgressAllToolbar{display:none;flex-wrap:wrap;gap:12px;align-items:end;padding:10px 0 2px}
 #adrProgressAllToolbar label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:800;color:#38556b;min-width:180px}
 #adrProgressAllToolbar select{border-radius:9px;border:1px solid #bed4e6;background:#fff;padding:10px 12px;color:#12385d;font-size:14px;font-weight:750;max-width:100%;min-height:42px}
 #adrs.adr-multi-progression #adrProgressAllToolbar{display:flex}
 #adrs.adr-multi-progression #adrComp{display:none!important}
 /* O filtro de progressão ocupa a coluna que a grade já reservava ao Componente. */
 #adrs .adr-controls .adr-all-comp-inline{display:none!important;min-width:0;width:100%}
 #adrs.adr-multi-progression .adr-controls .adr-all-comp-inline{display:grid!important;order:40}
 #adrs.adr-multi-progression .adr-controls .v222-field-label:has(> #adrComp){display:none!important}
 #adrs .adr-controls #adrProgressAllComp{width:100%;min-width:0;max-width:100%;min-height:42px;border:1px solid #bed4e6;border-radius:10px;background:#fff;padding:9px 12px;color:#12385d;font-size:14px;font-weight:750}
 @media(min-width:1101px){#adrs.adr-multi-progression .adr-controls .adr-all-comp-inline{grid-column:4;grid-row:1}}
 #adrAllChartCard{display:none;margin-top:16px;min-width:0}
 #adrs.adr-multi-progression.adr-multi-all #adrAllChartCard{display:block}
 #adrs.adr-multi-progression.adr-multi-all #adrKpis,#adrs.adr-multi-progression.adr-multi-all #adrCreCompareCard,#adrs.adr-multi-progression.adr-multi-all #adrProgressCard{display:none!important}
 #adrs.adr-multi-progression.adr-multi-all #adrKpis + .grid,#adrs.adr-multi-progression.adr-multi-all #adrSchoolBars{display:none!important}
 #adrs.adr-multi-progression.adr-multi-all #adrSchoolBars{display:none!important}
 #adrs.adr-multi-progression.adr-multi-all #adrSchoolBars{display:none!important}
 #adrs.adr-multi-progression.adr-multi-all .adr-dashboard-grid,#adrs.adr-multi-progression.adr-multi-all #adrSchoolBars{display:none!important}
 #adrs.adr-multi-progression.adr-multi-all #adrTable{display:none!important}
 #adrs.adr-multi-progression.adr-multi-all .adr-all-hide-detail{display:none!important}
 #adrs.adr-multi-progression.adr-multi-all .adr-dashboard-grid + .grid.two-col{display:none!important}
 #adrs.adr-multi-progression.adr-multi-all #adrTable{display:none!important}
 #adrs.adr-multi-progression.adr-multi-all .adr-all-hide-detail{display:none!important}
 #adrAllChartCard h3{font-size:19px;margin:0 0 6px;color:#12385d}
 #adrAllChartSubtitle{color:#526f85;line-height:1.55;font-size:13px;margin:0 0 12px}
 #adrAllChartPlot{background:linear-gradient(180deg,#fff,#fbfdff);border:1px solid #e3edf5;border-radius:12px;padding:10px 8px 2px}
 #adrAllChartPlot svg{display:block;width:100%;height:auto;min-height:240px;max-height:390px}
 #adrAllChartLegend{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0 6px;align-items:center}
 #adrAllChartLegend button{border:1px solid #d7e4ee;border-radius:22px;background:white;color:#27485f;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:7px;line-height:1.3}
 #adrAllChartLegend button[aria-pressed="true"]{border-color:#438abf;background:#edf7ff;box-shadow:0 3px 10px #12385d19}
 #adrAllChartLegend .adr-all-clear{color:#16628f;border-color:#bcd7e9}
 #adrAllChartLegend .swatch{display:inline-block;height:11px;width:11px;border-radius:50%;flex-shrink:0}
 #adrAllChartTable{overflow-x:auto;margin-top:15px}
 #adrAllChartTable table{width:100%;border-collapse:collapse;min-width:480px;font-size:12.5px}
 #adrAllChartTable th,#adrAllChartTable td{padding:10px 12px;text-align:center;border-bottom:1px solid #e4edf5;white-space:nowrap}
 #adrAllChartTable th:first-child,#adrAllChartTable td:first-child{text-align:left;font-weight:800}
 #adrAllChartTable tr[data-component]{transition:opacity .15s}
 #adrAllMethod{font-size:12px;line-height:1.6;color:#526c80;margin:14px 0 2px}
 #adrAllMethod strong{color:#244c69}
 #adrAllChartCard .adr-empty{padding:24px;color:#64748b;text-align:center}
 @media(max-width:680px){#adrProgressAllToolbar label{min-width:145px;flex:1}#adrAllChartCard h3{font-size:17px}#adrAllChartLegend button{font-size:11px}}
 `;
 const st=document.createElement('style');st.id='adr-all-style-hf6';st.textContent=style;document.head.appendChild(st);
 let chosen='ALL',manualScope='',chosenLines=new Set();let signature='',lastSchool='',lastCre=null;let updating=false;
 function currentRows(){try{return (typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS))?ADR_ROWS:(Array.isArray(window.ADR_ROWS)?window.ADR_ROWS:[])}catch(_){return []}}
 function masterCre(){return Number($('regionalScopeSelect')?.value||0)}
 function currentSchool(rows){
   const explicit=String(window.__GRA_SELECTED_SCHOOL__||'').trim();
   if(explicit && rows.some(r=>norm(r.escola)===norm(explicit))) return explicit;
   const q=norm($('adrSearch')?.value||'');
   if(!q)return '';
   const names=[...new Set(rows.filter(r=>norm(r.escola).includes(q)).map(r=>r.escola))];
   return names.length===1?names[0]:'';
 }
 function scopeState(rows){
   const school=currentSchool(rows),cre=masterCre();
   const available=school?['Escola',cre?'CRE':'SME']:[cre?'CRE':'SME'];
   if(school!==lastSchool || cre!==lastCre || !available.includes(manualScope)){manualScope=school?'Escola':cre?'CRE':'SME';lastSchool=school;lastCre=cre;}
   return {school,cre,available,scope:manualScope};
 }
 function baseRows(){
   const ano=$('adrAno')?.value||'',cre=masterCre(),searchSchool=String(window.__GRA_SELECTED_SCHOOL__||'').trim();
   const priorityOnly=$('adrPriority')?.value==='sim';
   const valid= currentRows().filter(r=>{
     if(r.ano!==ano || !ADRS.includes(r.adr) || !r.componente)return false;
     if(cre&&Number(String(r.regional||'').match(/\d+/)?.[0]||0)!==cre)return false;
     if(typeof window.graMasterAllowsRow==='function'&&!window.graMasterAllowsRow(r))return false;
     if(priorityOnly && typeof window.priorityMatchesContext==='function' && !window.priorityMatchesContext(r.escola,ano,'ADR',r.regional))return false;
     return true;
   });
   return valid;
 }
 function seriesForScope(rows,scope,school){
   if(scope==='Escola' && school)rows=rows.filter(r=>norm(r.escola)===norm(school));
   const comps=[...new Set(rows.map(r=>r.componente))].sort((a,b)=>(compOrder.indexOf(a)<0?99:compOrder.indexOf(a))-(compOrder.indexOf(b)<0?99:compOrder.indexOf(b))||String(a).localeCompare(String(b),'pt-BR'));
   return comps.map(comp=>{
     // LP/MT: % Adequado (ADR 3 não contém Acerto Total). Demais: % de Acerto Total.
     const metric=['LP','MT'].includes(comp)?'adequado':'acerto';
     const byEdition=new Map();
     const subset=rows.filter(r=>r.componente===comp && num(r[metric])!==null && num(r.avaliados)>0);
     const editions=ADRS.filter(a=>subset.some(r=>r.adr===a));
     // Uma mesma unidade compõe todas as edições válidas desse componente.
     const coverage=new Map();
     subset.forEach(r=>{const k=norm(r.regional)+'|'+norm(r.escola);if(!r.escola)return;if(!coverage.has(k))coverage.set(k,new Set());coverage.get(k).add(r.adr)});
     const paired=new Set([...coverage].filter(([,ed])=>editions.every(a=>ed.has(a))).map(([k])=>k));
     for(const a of ADRS){
       let numerator=0,denominator=0;
       for(const r of subset){if(r.adr!==a||!paired.has(norm(r.regional)+'|'+norm(r.escola)))continue;
         const v=num(r[metric]), w=num(r.avaliados);if(v===null||!(w>0))continue;
         numerator+=v*w;denominator+=w;
       }
       byEdition.set(a,denominator?numerator/denominator:null);
     }
     return {key:comp,label:titles[comp]||comp,metric,values:ADRS.map(a=>byEdition.get(a)),schools:paired.size,color:colors[comp]||'#607d8b'};
   }).filter(s=>s.values.some(v=>v!==null));
 }
 function fmt(v){return v===null?'—':Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'}
 function delta(s){const available=s.values.filter(v=>v!==null);if(available.length<2)return '—';const diff=available.at(-1)-available[0];return (diff>0?'+':'')+diff.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' p.p.'}
 function ensure(){
   if($('adrProgressAllToolbar'))return;
   const filter=$('adrFiltersCard'),anchor=$('adrKpis');if(!filter||!anchor)return;
   const toolbar=document.createElement('div');toolbar.id='adrProgressAllToolbar';toolbar.innerHTML='<label for="adrProgressAllScope">Abrangência<select id="adrProgressAllScope"></select></label>';
   filter.querySelector('.adr-controls')?.insertAdjacentElement('afterend',toolbar);
   const compField=document.createElement('label');compField.className='v222-field-label adr-all-comp-inline';compField.htmlFor='adrProgressAllComp';
   compField.innerHTML='<span>Componente</span><select id="adrProgressAllComp" aria-label="Componente"><option value="ALL">Todos</option></select>';
   const originalComp=$('adrComp'),compSlot=originalComp?.closest('.v222-field-label')||originalComp;
   if(compSlot?.parentElement)compSlot.insertAdjacentElement('beforebegin',compField);
   const card=document.createElement('div');card.id='adrAllChartCard';card.className='card';card.innerHTML='<div class="panel-title"><div><h3 id="adrAllChartTitle">Evolução dos componentes curriculares</h3><p id="adrAllChartSubtitle"></p></div></div><div id="adrAllChartPlot"></div><div id="adrAllChartLegend"></div><div class="table-wrap" id="adrAllChartTable"></div><p id="adrAllMethod"></p>';
   anchor.parentNode.insertBefore(card,anchor);
   [$('adrSchoolBars')?.closest('.grid'),$('adrTable')?.closest('.card')].forEach(x=>x?.classList.add('adr-all-hide-detail'));
   $('adrProgressAllComp').addEventListener('change',()=>{
     chosen=$('adrProgressAllComp').value;chosenLines.clear();
     if(chosen!=='ALL' && $('adrComp').value!==chosen){$('adrComp').value=chosen;$('adrComp').dispatchEvent(new Event('change',{bubbles:true}));}
     else render();
   });
   $('adrProgressAllScope').addEventListener('change',()=>{manualScope=$('adrProgressAllScope').value;chosenLines.clear();render()});
   $('adrAllChartLegend').addEventListener('click',e=>{
     const b=e.target.closest('button');if(!b)return;
     const key=b.dataset.component;
     if(key==='*'){chosenLines.clear();}
     else if(e.shiftKey){if(chosenLines.has(key))chosenLines.delete(key);else chosenLines.add(key)}
     else if(chosenLines.size===1&&chosenLines.has(key))chosenLines.clear();
     else {chosenLines.clear();chosenLines.add(key)}
     updateVisibility();
   });
 }
 function updateVisibility(){
   const area=$('adrAllChartCard');if(!area)return;
   const active=chosenLines;
   area.querySelectorAll('g[data-component]').forEach(el=>{const yes=!active.size||active.has(el.dataset.component);el.style.opacity=yes?'1':'.10'});
   area.querySelectorAll('tr[data-component]').forEach(el=>{const yes=!active.size||active.has(el.dataset.component);el.style.opacity=yes?'1':'.24'});
   area.querySelectorAll('#adrAllChartLegend button[data-component]').forEach(el=>{const yes=active.has(el.dataset.component);el.setAttribute('aria-pressed',String(yes));el.style.opacity=!active.size||yes?'1':'.55'});
 }
 function draw(data,sc){
   const title=$('adrAllChartTitle'),sub=$('adrAllChartSubtitle'),plot=$('adrAllChartPlot'),legend=$('adrAllChartLegend'),tab=$('adrAllChartTable'),method=$('adrAllMethod');
   const where=sc.scope==='Escola'?sc.school:sc.scope==='CRE'?`CRE ${String(sc.cre).padStart(2,'0')}`:'Toda a SME';
   title.textContent=`Progressão das ADRs — ${where}`;
   sub.textContent=`${$('adrAno').value} · ${data.length} componente${data.length===1?'':'s'} com resultados · ADR 1 → ADR 2 → ADR 3. Selecione uma linha na legenda para destacá-la.`;
   const W=960,H=350, L=70,R=28,T=26,B=58,plotH=H-T-B;
   const X=i=>L+(W-L-R)*(i/(ADRS.length-1)),Y=v=>T+plotH*(1-v/100);
   const grids=[0,20,40,60,80,100].map(v=>`<g><line x1="${L}" y1="${Y(v)}" x2="${W-R}" y2="${Y(v)}" stroke="#e3edf5"/><text x="${L-14}" y="${Y(v)+5}" fill="#6e8191" font-size="15" text-anchor="end">${v}%</text></g>`).join('');
   const labels=ADRS.map((a,i)=>`<text x="${X(i)}" y="${H-18}" text-anchor="middle" fill="#34566f" font-size="17" font-weight="800">${a}</text>`).join('');
   const groups=data.map(s=>{
     const segments=[];let segment=[];
     s.values.forEach((v,i)=>{if(v===null){if(segment.length)segments.push(segment);segment=[]}else segment.push([i,v])});if(segment.length)segments.push(segment);
     const lines=segments.map(points=>points.length>1?`<polyline points="${points.map(([i,v])=>X(i)+','+Y(v)).join(' ')}" stroke="${s.color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`:'').join('');
     const dots=s.values.map((v,i)=>v===null?'':`<circle cx="${X(i)}" cy="${Y(v)}" r="5.5" fill="${s.color}" stroke="white" stroke-width="2"><title>${esc(s.label)} · ${ADRS[i]}: ${fmt(v)}</title></circle>`).join('');
     return `<g data-component="${esc(s.key)}" class="adr-all-series" style="transition:opacity .15s">${lines}${dots}</g>`;
   }).join('');
   plot.innerHTML=data.length?`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução dos componentes curriculares em três ADRs, com legenda interativa"><text x="${L}" y="15" font-size="14" fill="#526f86">Percentual (%)</text>${grids}<line x1="${L}" y1="${Y(0)}" x2="${W-R}" y2="${Y(0)}" stroke="#c5d5e4"/>${groups}${labels}</svg>`:'<div class="adr-empty">Não há resultados disponíveis para este ano e esta abrangência.</div>';
   legend.innerHTML=(data.length?'<button type="button" data-component="*" class="adr-all-clear">Mostrar todas</button>':'')+data.map(s=>`<button type="button" data-component="${esc(s.key)}" aria-pressed="false"><span class="swatch" style="background:${s.color}"></span>${esc(s.label)}</button>`).join('');
   tab.innerHTML=data.length?`<table><thead><tr><th>Componente / indicador</th>${ADRS.map(s=>`<th>${s}</th>`).join('')}<th>Variação</th><th>Escolas pareadas</th></tr></thead><tbody>${data.map(s=>`<tr data-component="${esc(s.key)}"><td><span style="color:${s.color}">●</span> ${esc(s.label)}<div style="font-size:11px;font-weight:500;color:#667e90">${s.metric==='adequado'?'% Adequado':'% Acerto Total'}</div></td>${s.values.map(v=>`<td>${fmt(v)}</td>`).join('')}<td>${delta(s)}</td><td>${s.schools.toLocaleString('pt-BR')}</td></tr>`).join('')}</tbody></table>`:'';
   method.innerHTML='<strong>Critério de cálculo:</strong> LP e Matemática usam o percentual de estudantes em <strong>Adequado</strong>; Ciências da Natureza, Geografia e História usam o <strong>percentual de acerto total</strong>. São indicadores distintos, apresentados juntos apenas para visualizar tendências. Cada componente utiliza as mesmas escolas com informação válida em todas as ADRs disponíveis para ele; o resultado de cada ADR é ponderado pelo número de estudantes avaliados. Ausências aparecem como “—”, nunca como 0%. A tabela explicita a métrica de cada linha.';
   updateVisibility();
 }
 function render(){
   if(updating)return;
   ensure();const section=$('adrs');if(!section||!$('adrMode'))return;
   const progress=$('adrMode').value==='progressao';
   section.classList.toggle('adr-multi-progression',progress);
   section.classList.toggle('adr-multi-all',progress&&chosen==='ALL');
   if(!progress)return;
   updating=true;
   try{
     const rows=baseRows(),sc=scopeState(rows);
     const comps=[...new Set(rows.map(r=>r.componente))].sort((a,b)=>(compOrder.indexOf(a)<0?99:compOrder.indexOf(a))-(compOrder.indexOf(b)<0?99:compOrder.indexOf(b))||String(a).localeCompare(String(b),'pt-BR'));
     const compSel=$('adrProgressAllComp'),scopeSel=$('adrProgressAllScope');
     if(chosen!=='ALL'&&!comps.includes(chosen))chosen='ALL';
     compSel.innerHTML='<option value="ALL">Todos</option>'+comps.map(c=>`<option value="${esc(c)}">${esc(titles[c]||c)}</option>`).join('');compSel.value=chosen;
     scopeSel.innerHTML=sc.available.map(v=>`<option value="${v}">${v==='Escola'?`Escola — ${esc(sc.school)}`:v==='CRE'?`CRE ${String(sc.cre).padStart(2,'0')}`:'SME — toda a rede'}</option>`).join('');scopeSel.value=sc.scope;
     if(chosen==='ALL'){
       const key=[$('adrAno')?.value,sc.scope,sc.school,sc.cre,$('adrPriority')?.value,rows.length].join('|');if(signature!==key){chosenLines.clear();signature=key}
       draw(seriesForScope(rows,sc.scope,sc.school),sc);
     }
   }catch(e){console.error('[ADR componentes HF6] Falha ao renderizar',e);const card=$('adrAllChartPlot');if(card)card.innerHTML='<div class="adr-empty">Não foi possível gerar a comparação. Verifique o recorte selecionado.</div>'}
   finally{updating=false}
 }
 function boot(){
   ensure();
   const previous=window.renderADRs;
   if(typeof previous==='function'&&!previous.__graAdrAll){
     const fn=function(){const out=previous.apply(this,arguments);render();return out};fn.__graAdrAll=true;window.renderADRs=fn;try{renderADRs=fn}catch(_){ }
   }
   const relevant=['adrMode','adrAno','adrComp','adrMetric','adrAgente','adrPriority','adrSearch','regionalScopeSelect'];
   document.addEventListener('change',e=>{if(relevant.includes(e.target?.id)){if(e.target?.id==='adrMode'&&e.target.value==='progressao'){chosen='ALL';chosenLines.clear();}setTimeout(render,45)}},true);
   let searchTimer=0;document.addEventListener('input',e=>{if(e.target?.id==='adrSearch'){clearTimeout(searchTimer);searchTimer=setTimeout(render,140)}},true);
   document.addEventListener('click',e=>{if(e.target.closest?.('button[data-section="adrs"]'))setTimeout(render,140)},true);
   setTimeout(render,250);
   window.__GRA_ADR_ALL_COMPONENTS__={version:'v441-HF7',render,seriesForScope,baseRows,scopeState,get selected(){return chosen}};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
