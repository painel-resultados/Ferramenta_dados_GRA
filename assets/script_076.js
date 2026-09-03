
(function(){
  'use strict';

  const byId=id=>document.getElementById(id);
  const safe=value=>typeof window.esc==='function'
    ? window.esc(String(value??''))
    : String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtNP=v=>Number.isFinite(Number(v))
    ? Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
    : '—';
  const fmtInt=v=>Number.isFinite(Number(v))
    ? Math.round(Number(v)).toLocaleString('pt-BR')
    : '—';
  const fmtPct0=v=>Number.isFinite(Number(v))
    ? `${Math.round(Number(v)).toLocaleString('pt-BR')}%`
    : '—';
  const creLabel=n=>`${Number(n)}ª CRE`;
  const creCode=n=>`CRE ${String(Number(n)).padStart(2,'0')}`;
  const creNumber=value=>{const m=String(value||'').match(/\d+/);return m?Number(m[0]):0;};

  /* Valores consolidados revalidados no arquivo CGRA recebido em 27/08/2026.
     2º ano LP: % alfabetizados; 2º ano MT: % Adequado + % Avançado.
     4º/8º: Nota Padronizada geral, proficiência LP/MT e respectivos níveis. */
  const OFFICIAL=Object.freeze({"2º ano":{"LP":{"label":"% Alfabetizados","sme":69.40022633,"cre":{"1":61.92373364,"2":73.33068362,"3":67.57015306,"4":65.67049808,"5":66.93409742,"6":64.19354839,"7":70.25728988,"8":73.22649573,"9":70.7032967,"10":71.67871486,"11":73.63013699}},"MT":{"label":"% Adequado + Avançado","sme":80.3747,"cre":{"1":71.3631,"2":80.4936,"3":76.7301,"4":77.5938,"5":76.5198,"6":79.6096,"7":80.3082,"8":85.0594,"9":79.63419999999999,"10":85.9308,"11":80.78649999999999}}},"4º ano":{"sme":{"np":5.37667,"lpProf":195.62952879,"lpLevel":3,"mtProf":202.03941278,"mtLevel":4},"cre":{"1":{"np":5.20904,"lpProf":191.10126451,"lpLevel":3,"mtProf":197.56980296,"mtLevel":3},"2":{"np":5.57051,"lpProf":200.9798082,"lpLevel":4,"mtProf":207.09949115,"mtLevel":4},"3":{"np":5.28802,"lpProf":193.40215247,"lpLevel":3,"mtProf":199.51658139,"mtLevel":4},"4":{"np":5.25012,"lpProf":192.21624388,"lpLevel":3,"mtProf":198.6604598,"mtLevel":3},"5":{"np":5.42819,"lpProf":197.77900181,"lpLevel":3,"mtProf":202.69144942,"mtLevel":4},"6":{"np":5.17367,"lpProf":190.20970741,"lpLevel":3,"mtProf":196.56577723,"mtLevel":3},"7":{"np":5.36902,"lpProf":195.93841662,"lpLevel":3,"mtProf":201.34436007,"mtLevel":4},"8":{"np":5.40399,"lpProf":194.96354492,"lpLevel":3,"mtProf":204.10542276,"mtLevel":4},"9":{"np":5.44193,"lpProf":197.56369757,"lpLevel":3,"mtProf":203.61633389,"mtLevel":4},"10":{"np":5.43174,"lpProf":197.0514423,"lpLevel":3,"mtProf":203.57050757,"mtLevel":4},"11":{"np":5.65351,"lpProf":202.54231476,"lpLevel":4,"mtProf":209.96014512,"mtLevel":4}}},"8º ano":{"sme":{"np":4.6362,"lpProf":238.11156292,"lpLevel":2,"mtProf":240.06033883,"mtLevel":2},"cre":{"1":{"np":4.66131,"lpProf":238.66911486,"lpLevel":2,"mtProf":241.00933077,"mtLevel":2},"2":{"np":4.77177,"lpProf":242.39543454,"lpLevel":2,"mtProf":243.91106527,"mtLevel":2},"3":{"np":4.66648,"lpProf":239.55016018,"lpLevel":2,"mtProf":240.43838307,"mtLevel":2},"4":{"np":4.4808,"lpProf":233.63720971,"lpLevel":2,"mtProf":235.21100998,"mtLevel":2},"5":{"np":4.66305,"lpProf":239.44034969,"lpLevel":2,"mtProf":240.34237293,"mtLevel":2},"6":{"np":4.35504,"lpProf":229.57685844,"lpLevel":2,"mtProf":231.72575521,"mtLevel":2},"7":{"np":4.8677,"lpProf":244.41253483,"lpLevel":2,"mtProf":247.64925891,"mtLevel":2},"8":{"np":4.64339,"lpProf":238.54900875,"lpLevel":2,"mtProf":240.05451553,"mtLevel":2},"9":{"np":4.6331,"lpProf":238.10740304,"lpLevel":2,"mtProf":239.87841333,"mtLevel":2},"10":{"np":4.5208,"lpProf":234.30010272,"lpLevel":2,"mtProf":236.94802674,"mtLevel":2},"11":{"np":4.84566,"lpProf":244.40441616,"lpLevel":2,"mtProf":246.33496364,"mtLevel":2}}}});

  const isSim=()=>byId('somModalidade')?.value==='Simulado 2026';
  const year=()=>byId('somAnoEscolar')?.value||'';
  const component=()=>byId('somComponente')?.value==='MT'?'MT':'LP';
  const region=()=>Number(byId('regionalScopeSelect')?.value||0);
  const isUnfiltered=()=>{
    try{return typeof window.sim2026ScopeIsUnfiltered==='function'?window.sim2026ScopeIsUnfiltered():true;}
    catch(_){return true;}
  };
  function officialSummary(y=year(),scope=region()){
    const block=OFFICIAL[y];if(!block||y==='2º ano')return null;
    return scope?block.cre[scope]||null:block.sme||null;
  }
  function official2(y=year(),comp=component(),scope=region()){
    if(y!=='2º ano')return null;
    const block=OFFICIAL['2º ano'][comp];if(!block)return null;
    return scope?block.cre[scope]:block.sme;
  }

  /* O 2º ano passa a ter um único indicador por componente:
     LP = alfabetizados; MT = Adequado + Avançado. Ambos usam o campo adqAv já existente. */
  const previousLabel=window.somMetricLabel;
  const metricLabel=function(metric){
    if(isSim()&&year()==='2º ano'&&metric==='adqAv')return OFFICIAL['2º ano'][component()].label;
    return typeof previousLabel==='function'?previousLabel(metric):metric;
  };
  window.somMetricLabel=metricLabel;
  try{somMetricLabel=metricLabel;}catch(_){}

  function sync2YearMetric(){
    const sel=byId('somMetric');if(!sel)return;
    const active=isSim()&&year()==='2º ano';
    if(active){
      const label=OFFICIAL['2º ano'][component()].label;
      sel.innerHTML=`<option value="adqAv">${safe(label)}</option>`;
      sel.value='adqAv';
      sel.disabled=true;
      sel.classList.add('v302-metric-locked');
      sel.setAttribute('aria-disabled','true');
      sel.title=component()==='LP'
        ? 'No 2º ano em Língua Portuguesa, o indicador é % Alfabetizados (proficiência ≥ 743).'
        : 'No 2º ano em Matemática, o indicador é % Adequado + % Avançado.';
    }else if(sel.classList.contains('v302-metric-locked')){
      sel.disabled=false;
      sel.classList.remove('v302-metric-locked');
      sel.removeAttribute('aria-disabled');
      sel.removeAttribute('title');
    }
    const oldChip=byId('somFilterContext')?.querySelector('.v291-alfa-chip');
    oldChip?.remove();
    if(active){
      const ctx=byId('somFilterContext');
      if(ctx){
        let chip=ctx.querySelector('.v302-official-indicator-chip');
        if(!chip){chip=document.createElement('span');chip.className='ctx-chip fixed v302-official-indicator-chip';ctx.appendChild(chip);}
        chip.textContent=component()==='LP'
          ? '2º ano · LP · % Alfabetizados (≥ 743)'
          : '2º ano · MT · % Adequado + Avançado';
      }
    }else byId('somFilterContext')?.querySelector('.v302-official-indicator-chip')?.remove();
  }

  const previousAdjust=window.somAdjustMetricOptions;
  if(typeof previousAdjust==='function'){
    const wrapped=function(){
      const result=previousAdjust.apply(this,arguments);
      sync2YearMetric();
      return result;
    };
    window.somAdjustMetricOptions=wrapped;
    try{somAdjustMetricOptions=wrapped;}catch(_){}
  }

  /* Mantém habilidades e percentuais de níveis da base já incorporada,
     mas força os números oficiais fornecidos pela CGRA nos campos cobertos pela nova fonte. */
  const previousWeighted=window.sim2026Weighted;
  if(typeof previousWeighted==='function'){
    const wrapped=function(rows,key){
      if(isSim()&&Array.isArray(rows)&&rows.length){
        const y=rows[0]?.anoEscolar||year();
        const comp=rows[0]?.componente||component();
        const scope=region();
        if(y==='2º ano'&&key==='adqAv'&&['LP','MT'].includes(comp)){
          const exact=official2(y,comp,scope);
          if(Number.isFinite(Number(exact)))return Number(exact);
        }
        if((y==='4º ano'||y==='8º ano')&&key==='proficiencia'&&['LP','MT'].includes(comp)){
          const s=officialSummary(y,scope);
          const exact=comp==='LP'?s?.lpProf:s?.mtProf;
          if(Number.isFinite(Number(exact)))return Number(exact);
        }
      }
      return previousWeighted.apply(this,arguments);
    };
    window.sim2026Weighted=wrapped;
    try{sim2026Weighted=wrapped;}catch(_){}
  }

  const previousOfficialMetric=window.sim2026OfficialMetric;
  if(typeof previousOfficialMetric==='function'){
    const wrapped=function(metric,y,comp){
      const scope=region();
      if(y==='2º ano'&&metric==='adqAv'&&['LP','MT'].includes(comp)){
        const exact=official2(y,comp,scope);if(Number.isFinite(Number(exact)))return Number(exact);
      }
      if((y==='4º ano'||y==='8º ano')&&metric==='notaPadronizada'){
        const exact=officialSummary(y,scope)?.np;if(Number.isFinite(Number(exact)))return Number(exact);
      }
      if((y==='4º ano'||y==='8º ano')&&metric==='proficiencia'&&['LP','MT'].includes(comp)){
        const s=officialSummary(y,scope);const exact=comp==='LP'?s?.lpProf:s?.mtProf;
        if(Number.isFinite(Number(exact)))return Number(exact);
      }
      return previousOfficialMetric.apply(this,arguments);
    };
    window.sim2026OfficialMetric=wrapped;
    try{sim2026OfficialMetric=wrapped;}catch(_){}
  }

  const previousFormat=window.somFormatMetric;
  if(typeof previousFormat==='function'){
    const wrapped=function(v,metric,row=null){
      if(isSim()&&isUnfiltered()&&!row){
        if((year()==='4º ano'||year()==='8º ano')&&metric==='notaPadronizada')return fmtNP(v);
        if(year()==='2º ano'&&metric==='adqAv')return fmtPct0(v);
      }
      return previousFormat.apply(this,arguments);
    };
    window.somFormatMetric=wrapped;
    try{somFormatMetric=wrapped;}catch(_){}
  }

  function render2CreTable(chart){
    const comp=component(),block=OFFICIAL['2º ano'][comp];
    const rows=Object.entries(block.cre)
      .map(([n,value])=>({n:Number(n),value:Number(value)}))
      .sort((a,b)=>b.value-a.value||a.n-b.n);
    chart.innerHTML=`<div class="v302-table-wrap"><table class="v302-official-grid" aria-label="Consolidado oficial por CRE — 2º ano"><thead><tr><th>Pos.</th><th>CRE</th><th>${safe(block.label)}</th></tr></thead><tbody>${
      rows.map((r,i)=>`<tr><td class="v302-rank">${i+1}º</td><td class="v302-cre">${safe(creLabel(r.n))}</td><td class="v302-primary">${safe(fmtPct0(r.value))}</td></tr>`).join('')
    }<tr class="v302-sme-row"><td>—</td><td>SME</td><td class="v302-primary">${safe(fmtPct0(block.sme))}</td></tr></tbody></table></div><div class="v302-official-source">Consolidado oficial informado pela CGRA. ${
      comp==='LP'?'Em LP, alfabetizado = estudante com proficiência ≥ 743.':'Em Matemática, o indicador corresponde à soma de Adequado + Avançado.'
    }</div>`;
  }

  function render48CreTable(chart,y){
    const block=OFFICIAL[y];
    const rows=Object.entries(block.cre)
      .map(([n,d])=>({n:Number(n),...d}))
      .sort((a,b)=>b.np-a.np||a.n-b.n);
    const rowHtml=(r,i,isSme=false)=>`<tr class="${isSme?'v302-sme-row':''}">
      <td class="v302-rank">${isSme?'—':`${i+1}º`}</td>
      <td class="v302-cre">${isSme?'SME':safe(creLabel(r.n))}</td>
      <td class="v302-primary">${safe(fmtNP(r.np))}</td>
      <td>${safe(fmtInt(r.lpProf))}</td><td><span class="v302-level">${safe(fmtInt(r.lpLevel))}</span></td>
      <td>${safe(fmtInt(r.mtProf))}</td><td><span class="v302-level">${safe(fmtInt(r.mtLevel))}</span></td>
    </tr>`;
    chart.innerHTML=`<div class="v302-table-wrap"><table class="v302-official-grid" aria-label="Consolidado oficial por CRE — ${safe(y)}"><thead><tr>
      <th>Pos.</th><th>CRE</th><th>Nota Padronizada</th><th>Proficiência LP</th><th>Nível LP</th><th>Proficiência MT</th><th>Nível MT</th>
    </tr></thead><tbody>${rows.map((r,i)=>rowHtml(r,i,false)).join('')}${rowHtml(block.sme,rows.length,true)}</tbody></table></div>
    <div class="v302-official-source">Consolidado oficial informado pela CGRA. A Nota Padronizada é o indicador geral; as proficiências e os níveis são apresentados separadamente para LP e MT.</div>`;
  }

  const previousCreChart=window.renderSomCreChart;
  if(typeof previousCreChart==='function'){
    const wrapped=function(){
      const card=byId('somCreCompareCard'),chart=byId('somCreChart');
      if(!isSim()) {
        chart?.classList.remove('v302-official-table');
        return previousCreChart.apply(this,arguments);
      }
      const y=year();
      /* Este card é a comparação das CREs: só existe quando o universo é Toda a SME,
         sem busca/agente/prioridade que mudariam o universo. */
      if(region()!==0||!isUnfiltered()){
        if(card)card.style.display='none';
        if(chart){chart.innerHTML='';chart.classList.remove('v302-official-table');}
        return;
      }
      if(!['2º ano','4º ano','8º ano'].includes(y))return previousCreChart.apply(this,arguments);
      if(card)card.style.display='block';
      if(!chart)return;
      chart.className='bars adr-cre-list v302-official-table';
      const title=byId('somCreTitle'),subtitle=byId('somCreSubtitle');
      if(y==='2º ano'){
        const label=OFFICIAL[y][component()].label;
        if(title)title.textContent=`Consolidado oficial por CRE — ${label}`;
        if(subtitle)subtitle.textContent=`Simulado 2026 · 2º ano · ${component()==='LP'?'Língua Portuguesa':'Matemática'} · Toda a SME.`;
        render2CreTable(chart);
      }else{
        if(title)title.textContent=`Consolidado oficial por CRE — ${y}`;
        if(subtitle)subtitle.textContent='Nota Padronizada, proficiências de Língua Portuguesa e Matemática e respectivos níveis · Toda a SME.';
        render48CreTable(chart,y);
      }
    };
    window.renderSomCreChart=wrapped;
    try{renderSomCreChart=wrapped;}catch(_){}
  }

  function syncDualOfficial(){
    if(!isSim()||!(year()==='4º ano'||year()==='8º ano'))return;
    const dual=document.querySelector('#resultados .v301-sim-summary');if(!dual)return;
    const exact=officialSummary();if(!exact||!isUnfiltered()) {
      dual.querySelectorAll('.v302-level-inline').forEach(el=>el.remove());
      return;
    }
    const np=dual.querySelector('.v301-np-value');if(np)np.textContent=fmtNP(exact.np);
    [['LP',exact.lpProf,exact.lpLevel],['MT',exact.mtProf,exact.mtLevel]].forEach(([comp,prof,level])=>{
      const col=dual.querySelector(`[data-v301-component="${comp}"]`);if(!col)return;
      const metrics=col.querySelectorAll('.v301-comp-metric');
      const profBox=metrics[1];const value=profBox?.querySelector('b');
      if(value)value.textContent=fmtInt(prof);
      if(profBox){
        let pill=profBox.querySelector('.v302-level-inline');
        if(!pill){pill=document.createElement('em');pill.className='v302-level-inline';profBox.appendChild(pill);}
        pill.textContent=`Nível ${fmtInt(level)}`;
      }
    });
  }

  function stamp(){
    const badge=byId('dashboardVersionBadge');if(badge)badge.textContent='v366';
    document.querySelectorAll('.gra-start-version,.exp-badge').forEach(el=>{
      if(/^v?\d+/i.test(el.textContent||''))el.textContent='v366';
    });
    document.title=document.title.replace(/\bv301\b/ig,'v318');
  }

  function syncAll(){
    sync2YearMetric();
    syncDualOfficial();
  }

  const previousRender=window.renderResultados;
  if(typeof previousRender==='function'){
    const wrapped=function(){
      sync2YearMetric();
      const result=previousRender.apply(this,arguments);
      sync2YearMetric();
      syncDualOfficial();
      return result;
    };
    window.renderResultados=wrapped;
    try{renderResultados=wrapped;}catch(_){}
  }

  document.addEventListener('change',event=>{
    const id=event.target?.id;
    if(['somModalidade','somAnoEscolar','somComponente','regionalScopeSelect','somAgente','somPriority'].includes(id)){
      setTimeout(syncAll,0);
      setTimeout(syncAll,120);
    }
  },true);
  document.addEventListener('input',event=>{
    if(event.target?.id==='somSearch')setTimeout(syncAll,100);
  },true);

  function install(){
    stamp();
    syncAll();
    window.__GRA_V302_OFFICIAL_SIMULADO__={
      version:'v363',
      source:'CGRA · dados oficiais fornecidos em 23/08/2026',
      official:OFFICIAL,
      get context(){return {year:year(),component:component(),region:region(),metric:byId('somMetric')?.value||''};},
      get expectedCurrent(){
        if(year()==='2º ano')return official2();
        return officialSummary();
      }
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
