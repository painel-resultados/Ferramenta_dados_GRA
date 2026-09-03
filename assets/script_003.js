
(function(){
  'use strict';
  const VERSION='v366';
  const ALLOWED=new Set(['adrs','resultados','banco','georreferenciamento']);
  let requested=null,applied=false,readyToUse=false,lastProgress=0,watchdog=0;
  const chooser=document.getElementById('graStartChooser');
  const choices=()=>chooser?[...chooser.querySelectorAll('[data-start-section]')]:[];

  function stampVersion(){
    const badge=document.getElementById('dashboardVersionBadge');
    if(badge)badge.textContent=VERSION;
    document.querySelectorAll('.exp-badge').forEach(el=>el.textContent=VERSION);
    const start=document.querySelector('.gra-start-version');if(start)start.textContent=VERSION;
  }
  function progress(value,label){
    const pct=Math.max(lastProgress,Math.min(100,Math.round(Number(value)||0)));lastProgress=pct;
    const bar=document.getElementById('graStartLoadBar'),out=document.getElementById('graStartLoadPct'),track=document.getElementById('graStartProgress'),copy=document.getElementById('graStartLoadLabel');
    if(bar)bar.style.width=pct+'%';if(out)out.textContent=pct+'%';if(track)track.setAttribute('aria-valuenow',String(pct));if(copy&&label)copy.textContent=label;
  }
  window.__graStartupProgress=function(ratio,label){
    const r=Math.max(0,Math.min(1,Number(ratio)||0));
    progress(34+r*56,label||'Preparando dados das ADRs para o mapa…');
  };
  function enableChoices(message='Pronto. Escolha a área que deseja abrir.'){
    if(readyToUse)return;readyToUse=true;clearTimeout(watchdog);progress(100,'Preparação essencial concluída.');
    chooser?.classList.add('gra-start-ready');choices().forEach(el=>el.disabled=false);
    const status=document.getElementById('graStartStatus');if(status)status.textContent=message;
    if(requested)applyChoice(requested);
  }
  function activateSection(sectionId){
    if(!ALLOWED.has(sectionId))sectionId='adrs';
    const btn=document.querySelector('.nav button[data-section="'+sectionId+'"]');
    if(btn){const group=btn.closest('.nav-group');if(group)group.classList.add('open');try{btn.click();}catch(_){}}
    const target=document.getElementById(sectionId);
    if(target&&!target.classList.contains('active')){
      document.querySelectorAll('.section').forEach(el=>el.classList.remove('active'));
      target.classList.add('active');
      document.querySelectorAll('.nav button[data-section]').forEach(el=>el.classList.toggle('active',el.dataset.section===sectionId));
    }
    try{if(sectionId!=='resultados'&&typeof window.__graActivateSection==='function')window.__graActivateSection(sectionId);}catch(error){console.warn('Ativação adiada',error);}
    try{window.scrollTo({top:0,behavior:'auto'});}catch(_){}
    return Boolean(target?.classList.contains('active'));
  }
  function finishEntry(){
    stampVersion();document.documentElement.classList.remove('gra-start-open');if(chooser)chooser.remove();
    setTimeout(()=>document.querySelector('.nav button[data-section="'+requested+'"]')?.focus({preventScroll:true}),30);
  }
  function applyChoice(sectionId){
    if(applied)return;
    requested=ALLOWED.has(sectionId)?sectionId:'adrs';
    if(!readyToUse)return;
    applied=true;choices().forEach(el=>{el.disabled=true;el.classList.toggle('selected',el.dataset.startSection===requested);});
    const label=chooser?.querySelector('[data-start-section="'+requested+'"] strong')?.textContent||'área selecionada';
    const status=document.getElementById('graStartStatus');if(status)status.textContent='Abrindo '+label+'…';
    activateSection(requested);
    // Mantém a tela de boas-vindas por dois frames enquanto o módulo solicitado estabiliza.
    requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(finishEntry,requested==='georreferenciamento'?140:45)));
  }
  function prewarmGeorreferenciamento(done){
    const yieldStep=fn=>requestAnimationFrame(()=>setTimeout(fn,0));
    progress(91,'Preparando os controles do Georreferenciamento…');
    yieldStep(()=>{
      try{window.__graPrewarmGeorefControls?.();}catch(error){console.warn('Pré-carga dos controles do mapa',error);}
      progress(94,'Montando a estrutura do mapa 2D…');
      yieldStep(()=>{
        try{window.geoInitStage?.();}catch(error){console.warn('Pré-montagem do mapa',error);}
        progress(96,'Preparando o recorte inicial do mapa…');
        yieldStep(()=>{
          try{
            if(typeof window.geoEvalContext==='function'&&typeof window.geoAdrSnapshot==='function'){
              const ctx=window.geoEvalContext();window.geoAdrSnapshot(ctx);
            }
          }catch(error){console.warn('Pré-cálculo do recorte geográfico',error);}
          progress(98,'Georreferenciamento pronto para abrir.');
          yieldStep(()=>done?.());
        });
      });
    });
  }
  function preflight(){
    stampVersion();progress(12,'Validando a interface…');
    requestAnimationFrame(()=>{
      progress(38,'Preparando o cadastro essencial…');
      setTimeout(()=>{
        try{if(typeof buildSchoolLookup==='function')buildSchoolLookup();}catch(error){console.warn('Preparação do cadastro',error);}
        progress(78,'Preparando filtros e navegação…');
        requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>enableChoices('Pronto. Georreferenciamento, ADRs volumosas e bibliotecas de exportação serão carregados somente quando necessários.'),45)));
      },30);
    });
    watchdog=setTimeout(()=>enableChoices('Preparação essencial concluída em modo de segurança.'),18000);
  }

  if(chooser){
    chooser.addEventListener('click',ev=>{
      const btn=ev.target.closest('[data-start-section]');if(!btn)return;
      requested=btn.dataset.startSection||'adrs';
      if(!readyToUse)return;
      applyChoice(requested);
    });
  }
  function ready(){preflight();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
  window.__graStartChooserTest={activateSection,applyChoice,options:Array.from(ALLOWED),version:VERSION,get ready(){return readyToUse;},progress};
})();
