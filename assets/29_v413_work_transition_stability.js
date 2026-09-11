/*
 * GRA v413(work) — estabilidade das transições entre avaliações somativas.
 *
 * Três módulos históricos podem solicitar a mesma reconstrução completa quando
 * modalidade/ano/componente muda. Este patch mantém o carregamento assíncrono
 * existente, agrupa somente essas solicitações e entrega uma renderização final.
 * O hard guard v409 continua sendo carregado depois deste arquivo.
 */
(function(){
  'use strict';

  const VERSION='v413(work)';
  const $=id=>document.getElementById(id);
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const TRANSITION_FILTERS=new Set(['somModalidade','somAnoEscolar','somComponente']);
  const FILTER_CONTROLS=['regionalScopeSelect','somMode','somModalidade','somAnoEscolar','somComponente','somEdicao','somMetric','somCre','somAgente','somPriority','somSearch'];

  let epoch=0;
  let active=false;
  let pending=false;
  let flushing=false;
  let suppressedRenders=0;
  let passedRenders=0;
  let completedTransitions=0;
  let completedSimuladoTransitions=0;
  let failedTransitions=0;
  let filterTickCache=null;
  let filterRowsReference=null;
  const filterStats=window.__GRA_V413_FILTER_STATS__={hits:0,misses:0,resets:0};

  function rowsReference(){
    try{return typeof SOM_ROWS!=='undefined'&&Array.isArray(SOM_ROWS)?SOM_ROWS:window.SOM_ROWS;}
    catch(_){return window.SOM_ROWS;}
  }

  function tickCache(){
    const rows=rowsReference();
    if(!filterTickCache||filterRowsReference!==rows){
      const cache=new Map();
      filterTickCache=cache;filterRowsReference=rows;filterStats.resets++;
      queueMicrotask(()=>{if(filterTickCache===cache){filterTickCache=null;filterRowsReference=null;}});
    }
    return filterTickCache;
  }

  function filterKey(options){
    const opts=options||{},access=window.__GRA_ACCESS__||{};
    return [
      !!opts.ignoreEdicao,!!opts.ignoreCre,!!opts.ignoreSearch,!!opts.ignoreComp,
      ...FILTER_CONTROLS.map(id=>{const el=$(id);return `${el?.value||''}\u0002${el?.selectedIndex??''}`;}),
      rowsReference()?.length||0,window.__GRA_MASTER_SCOPE__||'',access.role||'',access.cre||'',access.name||'',
      document.documentElement.getAttribute('data-gra-partner-master')||''
    ].join('\u0001');
  }

  function wrapFilteredRows(){
    const current=window.somFilteredRows;
    if(typeof current!=='function'||current.__v413WorkTickCache||current.__graV409HardSchoolFilter)return;
    const base=current;
    const wrapped=function(options){
      const cache=tickCache(),key=filterKey(options);
      if(cache.has(key)){filterStats.hits++;return cache.get(key).slice();}
      filterStats.misses++;
      const out=base.apply(this,arguments);
      if(Array.isArray(out))cache.set(key,out.slice());
      return out;
    };
    wrapped.__v413WorkTickCache=true;
    wrapped.__native=base;
    window.somFilteredRows=wrapped;
    try{somFilteredRows=wrapped;}catch(_){ }
  }

  function wrapRender(){
    const current=window.renderResultados;
    if(typeof current!=='function'||current.__v413WorkTransition)return;
    const base=current;
    const wrapped=function(){
      if(active&&!flushing){
        pending=true;
        suppressedRenders++;
        return undefined;
      }
      passedRenders++;
      return base.apply(this,arguments);
    };
    wrapped.__v413WorkTransition=true;
    wrapped.__native=base;
    window.renderResultados=wrapped;
    try{renderResultados=wrapped;}catch(_){ }
  }

  function cancelTransition(){
    epoch++;
    active=false;
    pending=false;
    document.documentElement.removeAttribute('data-gra-results-transition');
    document.documentElement.removeAttribute('data-gra-simulado-transition');
  }

  async function settleTransition(token,ensureSimulado){
    try{
      if(ensureSimulado&&typeof window.sim2026EnsureForSom==='function')await window.sim2026EnsureForSom();
    }catch(error){
      failedTransitions++;
      console.error('v413(work): falha ao preparar o recorte do Simulado 2026',error);
    }

    // Os callbacks legados conhecidos são agendados entre 0 e 80 ms.
    await wait(120);
    if(token!==epoch)return;

    active=false;
    completedTransitions++;
    if(ensureSimulado)completedSimuladoTransitions++;
    flushing=true;
    try{
      if(pending&&$('resultados')?.classList.contains('active'))window.renderResultados?.();
    }catch(error){
      failedTransitions++;
      console.error('v413(work): falha na renderização consolidada',error);
    }finally{
      pending=false;
      flushing=false;
      document.documentElement.removeAttribute('data-gra-simulado-transition');
      document.documentElement.removeAttribute('data-gra-results-transition');
    }
  }

  function beginTransition(ensureSimulado){
    const token=++epoch;
    active=true;
    pending=true;
    document.documentElement.setAttribute('data-gra-results-transition',ensureSimulado?'simulado':'filtros');
    if(ensureSimulado){
      document.documentElement.setAttribute('data-gra-simulado-transition','loading');
      const host=$('somMainChart');
      if(host)host.innerHTML='<div class="sim2026-loading">Preparando o recorte selecionado do Simulado 2026…</div>';
    }else{
      document.documentElement.removeAttribute('data-gra-simulado-transition');
    }
    void settleTransition(token,ensureSimulado);
  }

  function onChange(event){
    const id=event.target?.id||'';
    if(!TRANSITION_FILTERS.has(id))return;
    const ensureSimulado=$('somModalidade')?.value==='Simulado 2026';
    if(ensureSimulado&&id==='somComponente'&&$('somComponente')?.value==='GRAFICO_DISPERSAO'){
      if(active)cancelTransition();
      return;
    }
    beginTransition(ensureSimulado);
  }

  function install(){
    wrapFilteredRows();
    wrapRender();
    document.documentElement.dataset.graV413Work='installed';
  }

  document.addEventListener('change',onChange,true);
  install();

  window.__GRA_V413_WORK__={
    version:VERSION,
    install,
    cancel:cancelTransition,
    audit(){return {
      version:VERSION,
      installed:document.documentElement.dataset.graV413Work==='installed',
      active,
      pending,
      suppressedRenders,
      passedRenders,
      completedTransitions,
      completedSimuladoTransitions,
      failedTransitions
    };}
  };
})();
