
(function(){
  'use strict';
  const state=window.__GRA_SECTION_INIT=window.__GRA_SECTION_INIT||{
    resultados:true,adrs:false,georreferenciamento:false,cre:false,agentes:false,banco:false,exclusivas:false,efpd:false,criterios:false
  };
  const initMap={adrs:'initADRs',georreferenciamento:'initGeoref',cre:'initCRE',agentes:'initAgents',banco:'initBanco',exclusivas:'initExclusivas',efpd:'initEfpd',criterios:'initCriteria'};
  const originals={};let forceSection='';
  function wrapInit(section,name){
    const fn=window[name];if(typeof fn!=='function')return;originals[name]=fn;
    window[name]=function(){
      if(state[section])return fn.apply(this,arguments);
      const active=document.getElementById(section)?.classList.contains('active');
      if(!active&&forceSection!==section)return;
      state[section]=true;
      try{
        const result=fn.apply(this,arguments);
        if(section==='adrs'&&typeof window.__graV204PatchResultRows==='function')window.__graV204PatchResultRows();
        return result;
      }catch(error){state[section]=false;throw error;}
    };
  }
  Object.entries(initMap).forEach(([section,name])=>wrapInit(section,name));
  function gate(name,section){
    const fn=window[name];if(typeof fn!=='function')return;
    window[name]=function(){if(!state[section])return;return fn.apply(this,arguments);};
  }
  ['adrRefreshSelectors','renderADRs','renderADRFileChips'].forEach(name=>gate(name,'adrs'));
  ['populateGeoAgents','geoRender','geoRenderMarkers','geoRefreshEvaluationFilters','geoUpdateContextUI'].forEach(name=>gate(name,'georreferenciamento'));
  function loadDeferredModule(sourceId){
    const source=document.getElementById(sourceId);if(!source)return;
    const code=source.textContent||'';source.textContent='';source.remove();
    (0,eval)(code);
  }
  let geoOpenFrame=0,geoPrewarmed=false;
  function scheduleGeoOpen(){
    if(geoOpenFrame)return;
    geoOpenFrame=requestAnimationFrame(()=>requestAnimationFrame(()=>{
      geoOpenFrame=0;
      if(!document.getElementById('georreferenciamento')?.classList.contains('active'))return;
      try{if(typeof window.ensureGeoMap==='function')window.ensureGeoMap();}catch(error){console.warn('Preparação do mapa 2D',error);}
      const region=document.getElementById('regionalScopeSelect')?.value||'';
      let regionChanged=false;
      try{
        if(typeof window.setGeoRegion==='function'&&String(window.GEO_STATE?.region||'')!==String(region)){
          regionChanged=true;window.setGeoRegion(region);
        }
      }catch(error){console.warn('Escopo do georreferenciamento',error);}
      try{
        if(!regionChanged&&(window.GEO_STATE?.pendingFilterRender||window.GEO_STATE?.needsInitialFit)){
          if(typeof window.geoScheduleFilters==='function')window.geoScheduleFilters(0);
        }else if(!regionChanged&&typeof window.geoRender==='function')window.geoRender();
      }catch(error){console.warn('Renderização do georreferenciamento',error);}
      if(window.GEO_3D_STATE?.mode==='3d'){
        try{window.GEO_3D_STATE.map?.resize();window.geo3dUpdatePoints?.();}catch(_){}
      }
    }));
  }
  function prewarmGeorefControls(){
    if(geoPrewarmed)return true;
    geoPrewarmed=true;
    try{loadDeferredModule('v113-experimental-ui-script');}catch(error){console.warn('Pré-compilação cartográfica',error);}
    const name=initMap.georreferenciamento,fn=name&&window[name];
    if(typeof fn==='function'){
      const previous=state.georreferenciamento;
      forceSection='georreferenciamento';
      window.__GRA_GEO_PREWARMING=true;
      try{fn();}catch(error){console.warn('Pré-vínculo dos controles do mapa',error);}finally{
        window.__GRA_GEO_PREWARMING=false;forceSection='';state.georreferenciamento=previous;
      }
    }
    try{if(typeof window.geoInitStage==='function')window.geoInitStage();}catch(error){console.warn('Pré-montagem do mapa 2D',error);}
    return true;
  }
  function activate(section){
    if(!section||section==='resultados')return;
    if(section==='georreferenciamento'){
      /* v299: o georreferenciamento já é pré-aquecido pela rotina v295.
         Evita reexecutar o prewarm legado v239 na abertura, que disparava
         ativações concorrentes e prendia a thread principal. */
      if(!state[section]){
        const fn=originals.initGeoref||window.initGeoref;
        state[section]=true;
        try{if(typeof fn==='function')fn();}catch(error){state[section]=false;throw error;}
      }
      scheduleGeoOpen();
      return;
    }
    if(state[section])return;
    const name=initMap[section],fn=name&&window[name];if(typeof fn!=='function')return;
    forceSection=section;try{fn();}finally{forceSection='';}
  }
  window.__graPrewarmGeorefControls=prewarmGeorefControls;
  window.__graOpenGeoOnce=scheduleGeoOpen;
  window.__graActivateSection=activate;
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('.nav button[data-section]');if(!button)return;
    const section=button.dataset.section;if(!section||section==='resultados')return;
    setTimeout(()=>{if(document.getElementById(section)?.classList.contains('active'))activate(section);},0);
  },true);
  const observer=new MutationObserver(()=>{const active=document.querySelector('.section.active')?.id;if(active&&active!=='resultados'&&!state[active])setTimeout(()=>activate(active),0);});
  const main=document.querySelector('.main');if(main)observer.observe(main,{subtree:true,attributes:true,attributeFilter:['class']});

  function installLazyGlobal(name,sourceId){
    if(Object.prototype.hasOwnProperty.call(window,name)&&window[name]!==undefined)return;
    let loading=false;
    const descriptor={
      configurable:true,
      get(){
        if(loading)return undefined;loading=true;
        const source=document.getElementById(sourceId);if(!source){loading=false;return undefined;}
        const code=source.textContent||'';
        try{
          delete window[name];(0,eval)(code);
          const value=window[name];source.textContent='';source.remove();return value;
        }catch(error){loading=false;Object.defineProperty(window,name,descriptor);console.error('Falha ao ativar biblioteca local '+name,error);throw error;}
      },
      set(value){Object.defineProperty(window,name,{configurable:true,enumerable:true,writable:true,value});}
    };
    Object.defineProperty(window,name,descriptor);
  }
  installLazyGlobal('XLSX','v222-xlsx-bundle');
  installLazyGlobal('PptxGenJS','v172-pptxgen-bundle');
  installLazyGlobal('html2canvas','v222-html2canvas-bundle');
  installLazyGlobal('maplibregl','v222-maplibre-bundle-js');
  window.GRA_LOW_POWER_V237={get initialized(){return {...state};},activate,loadLibrary(name){return window[name];}};
})();
