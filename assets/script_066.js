
(function(){
  'use strict';

  const VERSION='v366';
  const LEVELS=[
    {key:'muitoBaixo',label:'Muito Baixo'},
    {key:'baixo',label:'Baixo'},
    {key:'medio',label:'Médio'},
    {key:'alto',label:'Alto'}
  ];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const EXTRA_ALIASES=new Set([
    'cn','ciencias da natureza','ciencia da natureza','ciencias','ciencia',
    'historia','his',
    'geografia','geo'
  ]);
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const selectedComp=()=>document.getElementById('adrComp')?.value||'';
  const selectedMode=()=>document.getElementById('adrMode')?.value||'individual';
  const isExtraComp=v=>EXTRA_ALIASES.has(norm(v));
  const rowIsExtra=r=>isExtraComp(r?.componente);

  function adrOrderSafe(value){
    try{return typeof window.adrOrder==='function'?window.adrOrder(value):Number(String(value||'').match(/\d+/)?.[0]||0);}
    catch(_){return 0;}
  }
  function displayRows(rows){
    const list=Array.isArray(rows)?rows:[];
    if(selectedMode()!=='progressao') return list;
    const editions=[...new Set(list.map(r=>r?.adr).filter(Boolean))].sort((a,b)=>adrOrderSafe(a)-adrOrderSafe(b));
    const latest=editions.at(-1);
    return latest?list.filter(r=>r?.adr===latest):list;
  }
  function schoolKey(r){
    return norm(r?.regional||'')+'|'+norm(r?.escola||'');
  }
  function uniqueSchoolCount(rows){
    return new Set((rows||[]).filter(r=>r?.escola).map(schoolKey)).size;
  }
  function weighted(rows,key){
    let sw=0,sv=0;
    (rows||[]).forEach(r=>{
      if(!finite(r?.[key]))return;
      const w=finite(r?.avaliados)&&Number(r.avaliados)>0?Number(r.avaliados):1;
      sw+=w; sv+=Number(r[key])*w;
    });
    return sw?sv/sw:null;
  }
  function currentFilteredRows(){
    try{
      const mode=selectedMode();
      if(typeof window.adrFilteredRows==='function')return window.adrFilteredRows({ignoreAdr:mode==='progressao'});
      if(typeof adrFilteredRows==='function')return adrFilteredRows({ignoreAdr:mode==='progressao'});
    }catch(e){console.warn('v250: não foi possível obter o recorte ADR',e);}
    return [];
  }
  function setCardCopy(card,extra,latest=''){
    const title=card?.querySelector('.panel-title h3');
    const sub=card?.querySelector('.panel-title p');
    if(extra){
      if(title)title.textContent='Distribuição por faixa de desempenho';
      if(sub){
        sub.textContent=selectedMode()==='progressao'&&latest
          ? `Percentual de estudantes em Muito Baixo, Baixo, Médio e Alto em ${latest}. Clique em uma faixa para detalhar as escolas.`
          : 'Percentual de estudantes em Muito Baixo, Baixo, Médio e Alto no recorte filtrado. Clique em uma faixa para detalhar as escolas.';
      }
    }else{
      if(title)title.textContent='Distribuição por nível';
      if(sub)sub.textContent='Abaixo do básico, Básico e Adequado no recorte filtrado.';
    }
  }
  function forceMainMetricForExtra(extra){
    const sel=document.getElementById('adrMetric');
    document.getElementById('adrs')?.classList.toggle('v250-extra-component',extra);
    if(!sel||!extra)return;
    if(sel.options.length!==1||sel.options[0]?.value!=='acerto'){
      sel.innerHTML='<option value="acerto">% Acerto Total</option>';
    }
    sel.value='acerto';
    sel.title='Métrica principal deste componente: Acerto Total. As quatro faixas aparecem na rosca como distribuição complementar.';
  }
  function renderExtra(rows,pie,legend,card){
    const shown=displayRows(rows);
    const values=LEVELS.map(def=>({...def,value:weighted(shown,def.key)}));
    const available=values.filter(x=>finite(x.value));
    const total=available.reduce((sum,x)=>sum+Number(x.value||0),0);
    if(!available.length||!(total>0)){
      if(card)card.style.display='none';
      pie.innerHTML=''; legend.innerHTML='';
      return;
    }
    if(card)card.style.display='';
    const editions=[...new Set((rows||[]).map(r=>r?.adr).filter(Boolean))].sort((a,b)=>adrOrderSafe(a)-adrOrderSafe(b));
    const latest=editions.at(-1)||'';
    setCardCopy(card,true,latest);
    const items=available.map(x=>({
      categoria:x.label,
      total:Number(Number(x.value).toFixed(1)),
      percentual:Number(x.value)/total
    }));
    pie.innerHTML='<div class="donut-center"><b>100%</b><span>ESTUDANTES</span></div>';
    pie.classList.remove('v249-drill-enabled');
    legend.classList.remove('v249-drill-enabled');

    const canDrill=uniqueSchoolCount(shown)>1;
    const callback=canDrill
      ? category=>{
          try{
            if(typeof window.v249OpenExtraLevelDrawer==='function')window.v249OpenExtraLevelDrawer(category,rows);
          }catch(e){console.warn('v250: falha ao abrir drill-down',e);}
        }
      : null;

    renderDonut('adrPie','adrPieLegend',items,total,callback);

    // O valor mostrado é o percentual oficial da faixa, não o percentual do percentual.
    [...legend.querySelectorAll('.legend-row')].forEach((row,i)=>{
      const value=row.querySelector('span');
      if(value&&items[i])value.textContent=Number(items[i].total).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
    });
    if(canDrill){
      pie.classList.add('v249-drill-enabled');
      legend.classList.add('v249-drill-enabled');
    }
  }
  function renderRegular(rows,pie,legend,card){
    if(card)card.style.display='';
    setCardCopy(card,false,'');
    const defs=[
      {key:'abaixo',label:'Abaixo do Básico'},
      {key:'basico',label:'Básico'},
      {key:'adequado',label:'Adequado'}
    ];
    const values=defs.map(def=>({categoria:def.label,total:weighted(rows,def.key)||0}));
    const total=values.reduce((sum,x)=>sum+Number(x.total||0),0)||100;
    const items=values.map(x=>({
      categoria:x.categoria,
      total:Number(Number(x.total||0).toFixed(1)),
      percentual:Number(x.total||0)/total
    }));
    pie.innerHTML='<div class="donut-center"><b>100%</b><span>NÍVEIS</span></div>';
    pie.classList.remove('v249-drill-enabled');
    legend.classList.remove('v249-drill-enabled');
    renderDonut('adrPie','adrPieLegend',items,total,category=>{
      try{
        if(typeof window.adrOpenLevelDrawer==='function')window.adrOpenLevelDrawer(category,rows);
      }catch(_){}
    });
  }

  function renderCore(rows){
    const pie=document.getElementById('adrPie');
    const legend=document.getElementById('adrPieLegend');
    const card=pie?.closest('.card');
    if(!pie||!legend)return;

    // Dupla detecção: pelo seletor E pelos próprios registros. Assim aliases/códigos antigos não derrubam a rosca.
    const extra=isExtraComp(selectedComp())||(rows||[]).some(rowIsExtra);
    forceMainMetricForExtra(extra);
    if(extra)return renderExtra(rows,pie,legend,card);
    return renderRegular(rows,pie,legend,card);
  }

  window.v250RenderADRPieCore=renderCore;
  window.renderADRPie=renderCore;
  try{renderADRPie=renderCore;}catch(_){}

  function stampVersion(){
    const badge=document.getElementById('dashboardVersionBadge');
    if(badge&&badge.textContent.trim()!==VERSION)badge.textContent=VERSION;
    document.querySelectorAll('.exp-badge').forEach(item=>{if(item.textContent.trim()!==VERSION)item.textContent=VERSION;});
  }

  let scheduled=0;
  function forceAfterFilters(){
    clearTimeout(scheduled);
    scheduled=setTimeout(()=>{
      stampVersion();
      const rows=currentFilteredRows();
      if(rows.length||isExtraComp(selectedComp())){
        try{renderCore(rows);}catch(e){console.warn('v250: falha ao redesenhar rosca',e);}
      }
    },25);
  }

  // Garante que qualquer renderização histórica termine com a rosca correta.
  const oldRenderADRs=window.renderADRs;
  if(typeof oldRenderADRs==='function'){
    window.renderADRs=function(){
      const result=oldRenderADRs.apply(this,arguments);
      forceAfterFilters();
      return result;
    };
    try{renderADRs=window.renderADRs;}catch(_){}
  }

  // Executa depois dos listeners históricos, inclusive em CRE, agente e busca por escola.
  ['adrMode','adrAno','adrComp','adrSelect','adrMetric','adrEvolucao','adrCre','adrAgente','adrPriority'].forEach(id=>{
    document.getElementById(id)?.addEventListener('change',forceAfterFilters);
  });
  document.getElementById('adrSearch')?.addEventListener('input',forceAfterFilters);

  const init=()=>{
    stampVersion();
    forceAfterFilters();
    setTimeout(forceAfterFilters,120);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,60),{once:true});
  else setTimeout(init,60);
})();
