(function(){
  'use strict';

  /* v414 — guarda instalada no <head>, antes dos módulos históricos.
     Preserva a primeira atualização e a intenção final quando automação, teclado
     ou cliques muito rápidos emitem muitos eventos no mesmo ciclo JavaScript. */
  if(window.__GRA_V414_EVENT_GUARD__)return;
  const changeIds=new Set([
    'regionalScopeSelect','somMode','somModalidade','somAnoEscolar','somComponente',
    'somEdicao','somMetric','somCre','somAgente','somPriority'
  ]);
  const states=new WeakMap();
  const replayed=new WeakSet();
  const stats={passed:0,coalesced:0,replayed:0};

  function guard(event){
    const target=event.target;
    if(!target||typeof target.dispatchEvent!=='function')return;
    const relevant=event.type==='input'?target.id==='somSearch':changeIds.has(target.id);
    if(!relevant)return;
    if(replayed.has(event)){
      const state=states.get(target)||{};
      state.sameTask=false;
      state.timer=0;
      state.lastPass=performance.now();
      states.set(target,state);
      stats.replayed+=1;
      return;
    }
    const state=states.get(target)||{timer:0,sameTask:false,taskTimer:0,lastPass:-Infinity};
    if(!state.sameTask){
      state.sameTask=true;
      clearTimeout(state.taskTimer);
      state.taskTimer=setTimeout(()=>{state.sameTask=false;state.taskTimer=0;},0);
      state.lastPass=performance.now();
      states.set(target,state);
      stats.passed+=1;
      return;
    }
    event.stopImmediatePropagation();
    clearTimeout(state.timer);
    state.timer=setTimeout(()=>{
      state.timer=0;
      const finalEvent=new Event(event.type,{bubbles:true,cancelable:false});
      replayed.add(finalEvent);
      target.dispatchEvent(finalEvent);
    },event.type==='input'?110:90);
    states.set(target,state);
    stats.coalesced+=1;
  }

  document.addEventListener('change',guard,true);
  document.addEventListener('input',guard,true);
  window.__GRA_V414_EVENT_GUARD__={
    version:'v414',
    audit(){return {...stats};}
  };
})();
