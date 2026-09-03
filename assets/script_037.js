
(function(){
  'use strict';
  const ALFA_CRE=Object.freeze({
    'CRE 01':62,'CRE 02':73,'CRE 03':68,'CRE 04':66,'CRE 05':67,'CRE 06':64,
    'CRE 07':70,'CRE 08':73,'CRE 09':71,'CRE 10':72,'CRE 11':74
  });
  const ALFA_SME=69;
  window.SIMULADO2026_ALFABETIZADOS_CRE=ALFA_CRE;

  function isBaseContext(){
    return document.getElementById('somModalidade')?.value==='Simulado 2026' &&
           document.getElementById('somAnoEscolar')?.value==='2º ano';
  }
  function isActive(){return isBaseContext()&&document.getElementById('somMetric')?.value==='alfabetizados';}
  function region(){return Number(document.getElementById('regionalScopeSelect')?.value||0);}
  function creNum(cre){const m=String(cre||'').match(/\d+/);return m?Number(m[0]):99;}
  function officialLP(cre){
    return (typeof SIMULADO2026_CRE_ROWS!=='undefined'?SIMULADO2026_CRE_ROWS:[]).find(r=>r.anoEscolar==='2º ano'&&r.componente==='LP'&&r.cre===cre)||null;
  }
  function creRows(){
    const r=region();
    return Object.entries(ALFA_CRE)
      .filter(([cre])=>!r||creNum(cre)===r)
      .map(([cre,value])=>{const off=officialLP(cre);return {cre,value,avaliados:Number(off?.avaliados)||0,previstos:Number(off?.previstos)||0};})
      .sort((a,b)=>b.value-a.value||creNum(a.cre)-creNum(b.cre));
  }
  function aggregate(){
    const r=region();
    if(!r)return ALFA_SME;
    const row=creRows()[0];return row?row.value:null;
  }
  function setLocked(el,locked,title=''){
    if(!el)return;el.disabled=!!locked;el.classList.toggle('v291-locked-control',!!locked);
    el.setAttribute('aria-disabled',String(!!locked));el.title=locked?title:'';
  }
  function applyLocks(){
    const active=isActive();
    const comp=document.getElementById('somComponente');
    const mode=document.getElementById('somMode');
    const agent=document.getElementById('somAgente');
    const priority=document.getElementById('somPriority');
    const search=document.getElementById('somSearch');
    if(mode){const opt=[...mode.options].find(o=>o.value==='individual');if(opt)opt.textContent=active?'Visão por CRE':'Análise individual';}
    if(active){
      if(comp)comp.value='LP';
      if(mode)mode.value='individual';
      if(agent){if([...agent.options].some(o=>o.value===''))agent.value='';else if(typeof SOM_ALL_SCHOOLS_VALUE!=='undefined'&&[...agent.options].some(o=>o.value===SOM_ALL_SCHOOLS_VALUE))agent.value=SOM_ALL_SCHOOLS_VALUE;}
      if(priority)priority.value='';if(search)search.value='';
    }
    setLocked(comp,active,'O indicador % de Alfabetizados do 2º ano está disponível somente em Língua Portuguesa.');
    setLocked(mode,active,'O indicador % de Alfabetizados é um resultado consolidado por CRE, sem progressão ou visão por escola.');
    setLocked(agent,active,'Não há dado de alfabetização por escola/agente neste recorte; o resultado é consolidado por CRE.');
    setLocked(priority,active,'Não há dado de alfabetização por escola neste recorte.');
    setLocked(search,active,'Não há dado de alfabetização por escola neste recorte.');
    return active;
  }
  window.sim2026AlfaCreRows=creRows;
  window.sim2026AlfaAggregate=aggregate;
  window.sim2026AlfaActive=isActive;

  const prevMetricLabel=window.somMetricLabel;
  window.somMetricLabel=function(metric){return metric==='alfabetizados'?'% de Alfabetizados':prevMetricLabel(metric);};

  const prevAdjust=window.somAdjustMetricOptions;
  window.somAdjustMetricOptions=function(){
    const sel=document.getElementById('somMetric');const before=sel?.value||'';
    const result=prevAdjust.apply(this,arguments);
    if(isBaseContext()&&sel){
      if(![...sel.options].some(o=>o.value==='alfabetizados'))sel.add(new Option('% de Alfabetizados','alfabetizados'));
      if(before==='alfabetizados')sel.value='alfabetizados';
    }
    applyLocks();return result;
  };

  const prevUX=window.somUpdateFilterUX;
  window.somUpdateFilterUX=function(){
    const result=prevUX.apply(this,arguments);const active=applyLocks();
    const ctx=document.getElementById('somFilterContext');
    if(active&&ctx&&!ctx.querySelector('.v291-alfa-chip')){
      ctx.insertAdjacentHTML('beforeend','<span class="ctx-chip fixed v291-alfa-chip">Resultado consolidado por CRE · LP</span>');
    }
    return result;
  };

  const prevKpis=window.renderSomKpis;
  window.renderSomKpis=function(rows,baseRows){
    if(!isActive())return prevKpis.apply(this,arguments);
    const cr=creRows(),avg=aggregate(),evaluated=cr.reduce((a,r)=>a+r.avaliados,0);
    renderKpis('somKpis',[
      {label:'CREs no recorte',value:cr.length.toLocaleString('pt-BR'),note:region()?'regional selecionada':'11 regionais da rede'},
      {label:'Avaliados',value:evaluated.toLocaleString('pt-BR'),note:'2º ano · Língua Portuguesa'},
      {label:'% de Alfabetizados',value:Number.isFinite(avg)?fmtPctValue(avg,1):'—',note:region()?'resultado oficial da CRE':'resultado oficial SME'},
      {label:'Nível do dado',value:'CRE',note:'não disponível por escola ou agente'}
    ]);
  };

  const prevCre=window.renderSomCreChart;
  window.renderSomCreChart=function(){
    if(!isActive())return prevCre.apply(this,arguments);
    const card=document.getElementById('somCreCompareCard'),chart=document.getElementById('somCreChart');if(card)card.style.display='block';if(!chart)return;
    const rows=creRows();
    document.getElementById('somCreTitle').textContent='Comparativo entre CREs — % de Alfabetizados';
    document.getElementById('somCreSubtitle').textContent='Simulado 2026 · 2º ano · Língua Portuguesa. Resultado consolidado oficial por CRE.';
    renderSomCreBadges('somCreChart',rows.map(r=>({name:r.cre,value:r.value,sub:`${r.avaliados.toLocaleString('pt-BR')} avaliados`,note:fmtPctValue(r.value,1)})),'alfabetizados');
  };

  const prevDonut=window.renderSomDonut;
  window.renderSomDonut=function(rows){
    if(!isActive())return prevDonut.apply(this,arguments);
    const value=aggregate();const yes=Number.isFinite(value)?value:0,no=Math.max(0,100-yes);const donut=document.getElementById('somPie');if(!donut)return;
    const items=[{categoria:'Alfabetizados',total:yes,color:'#1d8f68'},{categoria:'Ainda não alfabetizados',total:no,color:'#b23b3b'}];
    let acc=0;const paths=items.map(it=>{const deg=it.total/100*360,start=acc+.35,end=acc+deg-.35;acc+=deg;return `<path d="${describeArc(100,100,72,start,Math.max(start,end))}" stroke="${it.color}" stroke-width="36" fill="none"><title>${esc(it.categoria)}: ${esc(fmtPctValue(it.total,1))}</title></path>`;}).join('');
    donut.innerHTML=`<svg viewBox="0 0 200 200" aria-label="Distribuição de alfabetização"><path d="${describeArc(100,100,72,0,359.9)}" stroke="#edf3f8" stroke-width="36" fill="none"/>${paths}</svg><div class="donut-center"><b>${Number.isFinite(value)?esc(fmtPctValue(value,1)):'—'}</b><span>alfabetizados</span></div>`;
    const legend=document.getElementById('somPieLegend');if(legend)legend.innerHTML=items.map(it=>`<div class="legend-row"><i class="swatch" style="background:${it.color}"></i><strong>${esc(it.categoria)}</strong><span>${esc(fmtPctValue(it.total,1))}</span></div>`).join('');
    const sub=document.getElementById('somPieSubtitle');if(sub)sub.textContent=region()?'Percentual consolidado da CRE selecionada.':'Percentual oficial da SME no Simulado 2026.';
  };

  const prevMain=window.renderSomMainChart;
  window.renderSomMainChart=function(rows){
    const target=document.getElementById('somMainChart');
    if(!isActive()){target?.classList.remove('v291-alfa-cre-list');return prevMain.apply(this,arguments);}
    const cr=creRows();if(!target)return;target.classList.add('v291-alfa-cre-list');
    if(region()){
      document.getElementById('somMainTitle').textContent='Resultado da CRE — % de Alfabetizados';
      document.getElementById('somMainSubtitle').textContent='Resultado consolidado da regional selecionada. Não existe desagregação por escola neste indicador.';
      renderSomCreBadges('somMainChart',cr.map(r=>({name:r.cre,value:r.value,sub:`${r.avaliados.toLocaleString('pt-BR')} avaliados`,note:fmtPctValue(r.value,1)})),'alfabetizados');
      return;
    }
    document.getElementById('somMainTitle').textContent='Destaques entre CREs — % de Alfabetizados';
    document.getElementById('somMainSubtitle').textContent='Todas as CREs são distribuídas entre maiores resultados e resultados mais desafiadores; nenhuma regional intermediária é omitida.';
    const __split313=window.graSplitOddRanking(cr,10),top=__split313.best,bottom=__split313.challenge;
    const block=(title,list)=>`<section style="min-width:0"><div style="color:#12385d;font-weight:900;font-size:12px;margin:2px 0 6px">${esc(title)}</div>${list.map(r=>`<div class="som-cre-row"><div class="som-cre-name"><strong>${esc(r.cre)}</strong><span>${r.avaliados.toLocaleString('pt-BR')} avaliados</span></div><div class="som-cre-badge">${esc(fmtPctValue(r.value,1))}</div></div>`).join('')}</section>`;
    target.innerHTML=`<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;width:100%">${block('Maiores resultados',top)}${block('Resultados mais desafiadores',bottom)}</div>`;
  };

  const prevSkills=window.renderSomSkills;
  window.renderSomSkills=function(rows){
    if(isActive()){
      // Mantém a leitura pedagógica das habilidades do 2º ano LP, usando os consolidados oficiais da CRE/rede.
      const comp=document.getElementById('somComponente');if(comp)comp.value='LP';
    }
    return prevSkills.apply(this,arguments);
  };

  const prevProgress=window.renderSomProgress;
  window.renderSomProgress=function(){
    if(!isActive())return prevProgress.apply(this,arguments);
    const card=document.getElementById('somProgressCard');if(card)card.classList.remove('open');
  };

  const prevTable=window.renderSomTable;
  window.renderSomTable=function(rows){
    if(!isActive()){document.getElementById('somTable')?.classList.remove('v291-alfa-table');return prevTable.apply(this,arguments);}
    const cr=creRows();const count=document.getElementById('somCount');if(count)count.textContent=`${cr.length} CRE${cr.length===1?'':'s'} exibida${cr.length===1?'':'s'}. O indicador não possui resultado por escola.`;
    const tbl=document.getElementById('somTable');if(tbl)tbl.classList.add('v291-alfa-table');
    table('somTable',cr.map((r,i)=>({pos:i+1,cre:r.cre,avaliados:r.avaliados,valor:fmtPctValue(r.value,1)})),[['pos','Pos.'],['cre','CRE'],['avaliados','Avaliados'],['valor','% de Alfabetizados']]);
  };

  const prevRender=window.renderResultados;
  window.renderResultados=function(){applyLocks();return prevRender.apply(this,arguments);};

  // Se o usuário chegar ao indicador a partir de MT, carrega LP sob demanda e reprocessa a tela.
  const metric=document.getElementById('somMetric');
  metric?.addEventListener('change',async()=>{
    if(!isActive())return;
    try{
      if(typeof sim2026EnsureCombo==='function')await sim2026EnsureCombo('2º ano','LP');
      applyLocks();
      if(typeof somRefreshSelectors==='function')somRefreshSelectors();
      const sel=document.getElementById('somMetric');if(sel)sel.value='alfabetizados';applyLocks();
      window.renderResultados();
    }catch(err){console.error('Não foi possível carregar o consolidado de alfabetização',err);}
  });

  // Reaplica após mudanças do ano/modalidade/escopo global.
  ['somModalidade','somAnoEscolar','regionalScopeSelect'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(()=>{window.somAdjustMetricOptions();applyLocks();window.renderResultados();},40)));
  setTimeout(()=>{try{window.somAdjustMetricOptions();applyLocks();window.renderResultados();}catch(_){ }},120);
})();
