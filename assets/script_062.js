
(function(){
  'use strict';
  const extra=new Set(['CN','História','Geografia','CH']);
  const isExtra=v=>extra.has(String(v||'').trim())||['HISTÓRIA','GEOGRAFIA'].includes(String(v||'').trim().toUpperCase());
  const levelDefs=[['muitoBaixo','Muito baixo'],['baixo','Baixo'],['medio','Médio'],['alto','Alto']];
  const finite=v=>Number.isFinite(Number(v));

  // Ciência/História/Geografia: Acerto Total é a métrica principal. Níveis só são oferecidos quando existem na base.
  window.adrUpdateMetricOptionsV243=function(){
    const sel=document.getElementById('adrMetric'),comp=document.getElementById('adrComp')?.value||'',ano=document.getElementById('adrAno')?.value||'';if(!sel)return;
    const old=sel.value;let opts;
    if(isExtra(comp)){
      const relevant=(Array.isArray(window.ADR_ROWS)?window.ADR_ROWS:[]).filter(r=>(!ano||r.ano===ano)&&r.componente===comp);
      opts=[{v:'acerto',t:'% Acerto Total'}];
      levelDefs.forEach(([v,t])=>{if(relevant.some(r=>finite(r?.[v])))opts.push({v,t:`% ${t}`});});
    }else opts=[{v:'adequado',t:'% Adequado'},{v:'abaixo',t:'% Abaixo do Básico'},{v:'acerto',t:'% Acerto Total'}];
    sel.innerHTML=opts.map(o=>`<option value="${o.v}">${o.t}</option>`).join('');sel.value=opts.some(o=>o.v===old)?old:opts[0].v;
    document.getElementById('adrs')?.classList.toggle('v245-science-mode',isExtra(comp));
  };
  try{adrUpdateMetricOptionsV243=window.adrUpdateMetricOptionsV243;}catch(_){ }

  window.renderADRPie=function(rows){
    const comp=document.getElementById('adrComp')?.value||'',science=isExtra(comp),pie=document.getElementById('adrPie'),legend=document.getElementById('adrPieLegend'),card=pie?.closest('.card');
    if(!pie||!legend)return;
    if(science){
      const validDefs=levelDefs.filter(([key])=>(rows||[]).some(r=>finite(r?.[key])));
      if(!validDefs.length){if(card)card.style.display='none';pie.innerHTML='';legend.innerHTML='';return;}
      if(card)card.style.display='';
      const items=validDefs.map(([key,label])=>({categoria:label,total:adrWeightAvg(rows,key)})).filter(v=>finite(v.total));
      const total=items.reduce((a,b)=>a+Number(b.total||0),0);
      if(!items.length||!(total>0)){if(card)card.style.display='none';pie.innerHTML='';legend.innerHTML='';return;}
      const normalized=items.map(v=>({categoria:v.categoria,total:Number(v.total.toFixed(1)),percentual:v.total/total}));
      const title=card?.querySelector('.panel-title h3'),sub=card?.querySelector('.panel-title p');if(title)title.textContent='Distribuição por faixa';if(sub)sub.textContent='Faixas de desempenho disponíveis no arquivo selecionado.';
      pie.innerHTML='<div class="donut-center"><b>100%</b><span>faixas</span></div>';renderDonut('adrPie','adrPieLegend',normalized,total,()=>{});return;
    }
    if(card)card.style.display='';
    const vals=[{categoria:'Abaixo do Básico',key:'abaixo'},{categoria:'Básico',key:'basico'},{categoria:'Adequado',key:'adequado'}];
    const items=vals.map(v=>({categoria:v.categoria,total:adrWeightAvg(rows,v.key)||0})),total=items.reduce((a,b)=>a+b.total,0)||100,normalized=items.map(v=>({categoria:v.categoria,total:Number(v.total.toFixed(1)),percentual:v.total/total}));
    const title=card?.querySelector('.panel-title h3'),sub=card?.querySelector('.panel-title p');if(title)title.textContent='Distribuição por nível';if(sub)sub.textContent='Abaixo do básico, Básico e Adequado no recorte filtrado.';pie.innerHTML='<div class="donut-center"><b>100%</b><span>níveis</span></div>';renderDonut('adrPie','adrPieLegend',normalized,total,(categoria)=>adrOpenLevelDrawer(categoria,rows));
  };
  try{renderADRPie=window.renderADRPie;}catch(_){ }

  // Full ADR / All-evaluation PPT: no pseudo-proficiência for extra components; only official Acerto Total.
  window.v246MetricDefsForComp=function(comp){return isExtra(comp)?[{key:'acerto',label:'% Acerto Total',color:'1C79B8'}]:[{key:'adequado',label:'% Adequado',color:'1D8F68'},{key:'abaixo',label:'% Abaixo do Básico',color:'B23B3B'}];};
  window.v244MetricDefsForComp=window.v246MetricDefsForComp;

  setTimeout(()=>{try{window.adrUpdateMetricOptionsV243();window.renderADRs?.();}catch(e){console.warn('v246 science/report/PPT init',e);}},0);
})();
