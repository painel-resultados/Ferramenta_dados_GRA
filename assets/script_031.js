
(function(){
  'use strict';
  const indicator=document.getElementById('dashLoadingIndicator');
  if(!indicator)return;
  const SHOW_DELAY=220;
  const MIN_VISIBLE=300;
  let showTimer=0,hideTimer=0,visibleSince=0,cycle=0;

  function setVisible(on){
    if(on){
      clearTimeout(hideTimer);
      if(indicator.classList.contains('is-active'))return;
      indicator.classList.add('is-active');
      indicator.setAttribute('aria-hidden','false');
      visibleSince=performance.now();
    }else{
      clearTimeout(showTimer);
      const wait=Math.max(0,MIN_VISIBLE-(performance.now()-visibleSince));
      clearTimeout(hideTimer);
      hideTimer=setTimeout(()=>{
        indicator.classList.remove('is-active');
        indicator.setAttribute('aria-hidden','true');
      },wait);
    }
  }

  function beginDelayed(){
    const id=++cycle;
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    showTimer=setTimeout(()=>{if(id===cycle)setVisible(true)},SHOW_DELAY);
    return id;
  }
  function finish(id){
    if(id!==cycle)return;
    clearTimeout(showTimer);
    setVisible(false);
  }
  function finishAfterPaint(id){
    requestAnimationFrame(()=>requestAnimationFrame(()=>finish(id)));
  }

  // O primeiro carregamento é mostrado de imediato e desaparece quando a página conclui a inicialização.
  function finishInitial(){
    const id=++cycle;
    requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>finish(id),90)));
  }
  if(document.readyState==='complete')finishInitial();
  else window.addEventListener('load',finishInitial,{once:true});

  // Feedback apenas para controles que podem recalcular ou trocar grandes recortes de dados.
  const selector=[
    '#regionalScopeSelect',
    '#resultados select','#resultados input.search',
    '#adrs select','#adrs input.search',
    '#banco select','#banco input',
    '.nav button[data-section]',
    '.pill','.legend-row[data-value]','.search-result'
  ].join(',');

  function interactionStart(event){
    const target=event.target?.closest?.(selector);
    if(!target)return;
    const id=beginDelayed();
    finishAfterPaint(id);
  }
  document.addEventListener('change',interactionStart,true);
  document.addEventListener('click',interactionStart,true);

  // Busca digitada: debounce para não piscar a cada tecla.
  let inputDebounce=0;
  document.addEventListener('input',event=>{
    const target=event.target?.closest?.('#resultados input.search,#adrs input.search,#banco input,#globalSearch');
    if(!target)return;
    clearTimeout(inputDebounce);
    inputDebounce=setTimeout(()=>{const id=beginDelayed();finishAfterPaint(id)},180);
  },true);

  // API opcional para rotinas futuras/assíncronas sem acoplar o indicador à lógica dos dados.
  window.DashLoadingIndicator={
    start(){const id=beginDelayed();return ()=>finish(id)},
    show(){++cycle;setVisible(true)},
    hide(){++cycle;setVisible(false)}
  };
})();
