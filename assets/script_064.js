
(function(){
  'use strict';
  const EXTRA=new Set(['CN','História','Geografia']);
  const normComp=v=>String(v||'').trim();
  const isExtra=v=>EXTRA.has(normComp(v))||['HISTÓRIA','GEOGRAFIA'].includes(normComp(v).toUpperCase());
  const hasNumber=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const levelDefs=[
    ['muitoBaixo','Muito Baixo','#b23b3b'],
    ['baixo','Baixo','#d9861c'],
    ['medio','Médio','#527a9b'],
    ['alto','Alto','#1d8f68']
  ];

  function selectedComp(){return document.getElementById('adrComp')?.value||'';}
  function weightedLevel(rows,key){
    let sw=0,sv=0;
    (rows||[]).forEach(r=>{
      if(!hasNumber(r?.[key]))return;
      const w=hasNumber(r?.avaliados)&&Number(r.avaliados)>0?Number(r.avaliados):1;
      sw+=w;sv+=Number(r[key])*w;
    });
    return sw?sv/sw:null;
  }
  function setMainMetric(){
    const sel=document.getElementById('adrMetric'),comp=selectedComp(),extra=isExtra(comp);
    document.getElementById('adrs')?.classList.toggle('v247-extra-component',extra);
    if(!sel)return;
    if(extra){
      sel.innerHTML='<option value="acerto">% Acerto Total</option>';
      sel.value='acerto';
      sel.title='Métrica principal fixa para este componente: Acerto Total. As faixas de desempenho aparecem na distribuição por faixa.';
    }else{
      const previous=sel.value;
      const opts=[['adequado','% Adequado'],['abaixo','% Abaixo do Básico'],['acerto','% Acerto Total']];
      const signature=[...sel.options].map(o=>o.value).join('|');
      if(signature!=='adequado|abaixo|acerto')sel.innerHTML=opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
      sel.value=opts.some(([v])=>v===previous)?previous:'adequado';
      sel.title='';
    }
  }

  // A interface nunca oferece as faixas como métrica central para os componentes adicionais.
  window.adrUpdateMetricOptionsV243=function(){setMainMetric();};
  try{adrUpdateMetricOptionsV243=window.adrUpdateMetricOptionsV243;}catch(_){ }

  // Paleta semântica fixa da rosca; não altera as cores dos gráficos de ranking/progressão.
  const oldDonutColor=window.donutColorForCategory;
  window.donutColorForCategory=function(category,index){
    const key=String(category||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    if(key==='muito baixo')return '#b23b3b';
    if(key==='baixo')return '#d9861c';
    if(key==='medio')return '#527a9b';
    if(key==='alto')return '#1d8f68';
    return typeof oldDonutColor==='function'?oldDonutColor(category,index):(Array.isArray(window.COLORS)?window.COLORS[index%window.COLORS.length]:'#1c79b8');
  };
  try{donutColorForCategory=window.donutColorForCategory;}catch(_){ }

  window.renderADRPie=function(rows){
    const pie=document.getElementById('adrPie'),legend=document.getElementById('adrPieLegend'),card=pie?.closest('.card');
    if(!pie||!legend)return;
    const extra=isExtra(selectedComp());
    if(extra){
      const vals=levelDefs.map(([key,label])=>({key,label,value:weightedLevel(rows,key)}));
      const available=vals.filter(x=>hasNumber(x.value));
      const total=available.reduce((a,x)=>a+Number(x.value||0),0);
      if(!available.length||!(total>0)){
        if(card)card.style.display='none';
        pie.innerHTML='';legend.innerHTML='';
        return;
      }
      if(card)card.style.display='';
      const title=card?.querySelector('.panel-title h3'),sub=card?.querySelector('.panel-title p');
      if(title)title.textContent='Distribuição por faixa de desempenho';
      if(sub)sub.textContent='Percentual de estudantes em Muito Baixo, Baixo, Médio e Alto no recorte filtrado.';
      const items=available.map(x=>({categoria:x.label,total:Number(x.value.toFixed(1)),percentual:Number(x.value)/total}));
      pie.innerHTML='<div class="donut-center"><b>100%</b><span>ESTUDANTES</span></div>';
      renderDonut('adrPie','adrPieLegend',items,total,null);
      // Evita a leitura duplicada "valor · percentual" da rotina histórica: nestes extratos o próprio valor já é percentual de alunos.
      [...legend.querySelectorAll('.legend-row')].forEach((row,i)=>{
        const span=row.querySelector('span');
        if(span&&items[i])span.textContent=Number(items[i].total).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
        row.removeAttribute('role');row.removeAttribute('tabindex');row.removeAttribute('aria-label');row.onclick=null;row.onkeydown=null;
      });
      return;
    }
    if(card)card.style.display='';
    const defs=[['abaixo','Abaixo do Básico'],['basico','Básico'],['adequado','Adequado']];
    const vals=defs.map(([key,label])=>({categoria:label,total:adrWeightAvg(rows,key)||0}));
    const total=vals.reduce((a,b)=>a+Number(b.total||0),0)||100;
    const items=vals.map(v=>({categoria:v.categoria,total:Number(Number(v.total||0).toFixed(1)),percentual:Number(v.total||0)/total}));
    const title=card?.querySelector('.panel-title h3'),sub=card?.querySelector('.panel-title p');
    if(title)title.textContent='Distribuição por nível';
    if(sub)sub.textContent='Abaixo do básico, Básico e Adequado no recorte filtrado.';
    pie.innerHTML='<div class="donut-center"><b>100%</b><span>NÍVEIS</span></div>';
    renderDonut('adrPie','adrPieLegend',items,total,(categoria)=>adrOpenLevelDrawer(categoria,rows));
  };
  try{renderADRPie=window.renderADRPie;}catch(_){ }

  // Guardas redundantes: qualquer chamada isolada de renderização mantém Acerto Total nos componentes adicionais.
  const wrapMetricGuard=name=>{
    const old=window[name];if(typeof old!=='function')return;
    window[name]=function(){setMainMetric();return old.apply(this,arguments);};
    try{if(name==='renderADRs')renderADRs=window[name];else if(name==='renderADRProgress')renderADRProgress=window[name];else if(name==='renderADRCreChart')renderADRCreChart=window[name];else if(name==='renderADRKpis')renderADRKpis=window[name];else if(name==='renderADRSchoolBars')renderADRSchoolBars=window[name];else if(name==='renderADRTable')renderADRTable=window[name];}catch(_){ }
  };
  ['renderADRProgress','renderADRCreChart','renderADRKpis','renderADRSchoolBars','renderADRTable'].forEach(wrapMetricGuard);

  const oldRefresh=window.adrRefreshSelectors;
  if(typeof oldRefresh==='function'){
    window.adrRefreshSelectors=function(){const r=oldRefresh.apply(this,arguments);setMainMetric();return r;};
    try{adrRefreshSelectors=window.adrRefreshSelectors;}catch(_){ }
  }
  const oldRender=window.renderADRs;
  if(typeof oldRender==='function'){
    window.renderADRs=function(){setMainMetric();return oldRender.apply(this,arguments);};
    try{renderADRs=window.renderADRs;}catch(_){ }
  }

  // PPTs completos: componente adicional continua usando exclusivamente Acerto Total como série principal.
  window.v247MetricDefsForComp=function(comp){
    return isExtra(comp)?[{key:'acerto',label:'% Acerto Total',color:'1C79B8'}]:[{key:'adequado',label:'% Adequado',color:'1D8F68'},{key:'abaixo',label:'% Abaixo do Básico',color:'B23B3B'}];
  };
  window.v246MetricDefsForComp=window.v247MetricDefsForComp;
  window.v244MetricDefsForComp=window.v247MetricDefsForComp;

  function stampVersion(){
    const badge=document.getElementById('dashboardVersionBadge');if(badge)badge.textContent='v366';
    document.querySelectorAll('.exp-badge').forEach(b=>b.textContent='v366');
  }
  ['adrAno','adrComp','adrMode'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(()=>{setMainMetric();try{window.renderADRs?.();}catch(_){ }},0)));
  const init=()=>{stampVersion();setMainMetric();try{window.renderADRs?.();}catch(e){console.warn('v247 ADR init',e);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})();
