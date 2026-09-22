(function(){
  'use strict';

  /* v414 — hidratação cooperativa das bases ADR.
     A versão monolítica preserva onze blocos JSON independentes. O código legado
     materializava todos no mesmo ciclo ao abrir ADRs/Georreferenciamento, o que
     podia bloquear a interface em máquinas mais lentas. Este módulo mantém os
     mesmos registros e a mesma ordem, mas processa uma CRE por ciclo. */
  const VERSION='v414';
  const SOURCE_CRES=Array.from({length:11},(_,index)=>index+1);
  const sourceNodes=new Map();
  const parsedCres=new Set();
  const parsedRows=new Map();
  const failures=[];
  let queue=Promise.resolve();
  let navigationIntent=0;
  let overlay=null;
  let overlayLabel=null;
  let activeStops=0;

  const audit=()=>({
    version:VERSION,
    staged:sourceNodes.size>0||parsedCres.size>0,
    preparing:activeStops>0,
    parsedCres:[...parsedCres].sort((a,b)=>a-b),
    pendingCres:SOURCE_CRES.filter(cre=>sourceNodes.has(cre)&&!parsedCres.has(cre)),
    rowsByCre:Object.fromEntries([...parsedRows.entries()].sort((a,b)=>a[0]-b[0])),
    rowsParsed:[...parsedRows.values()].reduce((sum,value)=>sum+value,0),
    failures:failures.slice()
  });

  function installVisuals(){
    if(document.getElementById('v414-runtime-stability-style'))return;
    const style=document.createElement('style');
    style.id='v414-runtime-stability-style';
    style.textContent=`
      #v414DataPreparation{position:fixed;right:22px;bottom:22px;z-index:2147482000;display:flex;align-items:center;gap:12px;max-width:min(390px,calc(100vw - 32px));padding:14px 16px;border:1px solid rgba(18,56,93,.16);border-radius:16px;background:rgba(255,255,255,.96);box-shadow:0 18px 48px rgba(18,56,93,.18);color:#12385d;font:700 13px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;backdrop-filter:blur(12px);pointer-events:none;opacity:0;transform:translateY(10px);transition:opacity .18s ease,transform .18s ease}
      #v414DataPreparation.is-visible{opacity:1;transform:translateY(0)}
      #v414DataPreparation.is-error{border-color:rgba(181,51,51,.28);color:#8c2525}
      #v414DataPreparation .v414-prep-spinner{width:21px;height:21px;flex:0 0 21px;border:3px solid #dce9f3;border-top-color:#1d8f68;border-radius:50%;animation:v414PrepSpin .8s linear infinite}
      #v414DataPreparation.is-error .v414-prep-spinner{border-color:#f4d5d5;border-top-color:#b53333}
      .nav button[aria-busy="true"],#graStartChooser [data-start-section][aria-busy="true"]{cursor:progress}
      @keyframes v414PrepSpin{to{transform:rotate(360deg)}}
      @media(max-width:640px){#v414DataPreparation{left:16px;right:16px;bottom:16px;max-width:none}}
      @media(prefers-reduced-motion:reduce){#v414DataPreparation{transition:none}#v414DataPreparation .v414-prep-spinner{animation-duration:1.5s}}
    `;
    document.head.appendChild(style);
  }

  function ensureOverlay(){
    installVisuals();
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='v414DataPreparation';
    overlay.setAttribute('role','status');
    overlay.setAttribute('aria-live','polite');
    overlay.setAttribute('aria-atomic','true');
    overlay.innerHTML='<span class="v414-prep-spinner" aria-hidden="true"></span><span class="v414-prep-label"></span>';
    overlayLabel=overlay.querySelector('.v414-prep-label');
    document.body.appendChild(overlay);
    return overlay;
  }

  function announce(message,{error=false,visible=true}={}){
    const box=ensureOverlay();
    if(overlayLabel)overlayLabel.textContent=message;
    box.classList.toggle('is-error',error);
    box.classList.toggle('is-visible',visible);
    const chooserStatus=document.getElementById('graStartStatus');
    if(chooserStatus&&!document.getElementById('graStartChooser')?.hidden)chooserStatus.textContent=message;
  }

  function hideAnnouncement(){
    if(overlay)overlay.classList.remove('is-visible','is-error');
  }

  function yieldToInterface(){
    return new Promise(resolve=>setTimeout(resolve,16));
  }

  function scopedTargets(explicitCre){
    const requested=Number(explicitCre||window.__GRA_AGENT_SCOPE__||0);
    if(requested&&SOURCE_CRES.includes(requested))return [requested];
    return SOURCE_CRES.filter(cre=>sourceNodes.has(cre)||parsedCres.has(cre));
  }

  function sourcesReady(explicitCre){
    const targets=scopedTargets(explicitCre);
    return targets.length===0||targets.every(cre=>parsedCres.has(cre));
  }

  function appendRows(rows){
    /* Mantém a semântica original: ADR_ROWS era uma cópia rasa de ADR_INITIAL. */
    for(const row of rows){
      ADR_INITIAL.push(row);
      ADR_ROWS.push(row);
    }
  }

  async function parseCre(cre,index,total){
    if(parsedCres.has(cre))return;
    const node=sourceNodes.get(cre);
    if(!node){
      parsedCres.add(cre);
      parsedRows.set(cre,0);
      return;
    }
    announce(`Preparando dados das ADRs com segurança · CRE ${String(cre).padStart(2,'0')} · ${index} de ${total}`);
    await yieldToInterface();
    let rows;
    try{
      rows=JSON.parse(node.textContent||'[]');
      if(!Array.isArray(rows))throw new Error('o bloco incorporado não é uma lista');
      appendRows(rows);
      parsedCres.add(cre);
      parsedRows.set(cre,rows.length);
      node.textContent='';
      sourceNodes.delete(cre);
    }catch(error){
      const message=`CRE ${cre}: ${error?.message||error}`;
      failures.push(message);
      throw new Error(`Falha ao preparar a base ADR da ${message}`);
    }
    await yieldToInterface();
  }

  async function prepareTargets(targets){
    const pending=targets.filter(cre=>!parsedCres.has(cre));
    if(!pending.length)return true;
    activeStops+=1;
    const stop=window.DashLoadingIndicator?.start?.();
    try{
      for(let index=0;index<pending.length;index+=1){
        await parseCre(pending[index],index+1,pending.length);
      }
      announce(`Dados das ADRs preparados · ${pending.length} ${pending.length===1?'CRE':'CREs'} · interface responsiva`);
      setTimeout(hideAnnouncement,900);
      return true;
    }catch(error){
      announce('Não foi possível preparar os dados das ADRs. Tente abrir a área novamente.',{error:true});
      setTimeout(hideAnnouncement,6000);
      throw error;
    }finally{
      activeStops=Math.max(0,activeStops-1);
      try{stop?.()}catch(_){ }
    }
  }

  function ensureSources(explicitCre){
    const targets=scopedTargets(explicitCre);
    if(sourcesReady(explicitCre))return Promise.resolve(true);
    const task=queue.catch(()=>true).then(()=>prepareTargets(targets));
    queue=task;
    return task;
  }

  function installSentinels(){
    /* O carregador v408 usa a presença desses IDs apenas como sinal de que o
       asset chegou. Os proxies já foram materializados vazios logo abaixo. */
    for(const cre of SOURCE_CRES){
      const id=`v318-data-adr-cre-${cre}`;
      if(document.getElementById(id))continue;
      const sentinel=document.createElement('script');
      sentinel.type='application/json';
      sentinel.id=id;
      sentinel.dataset.v414AdrSentinel='true';
      sentinel.textContent='[]';
      document.body.appendChild(sentinel);
    }
  }

  function stageEmbeddedSources(){
    if(typeof ADR_INITIAL==='undefined'||typeof ADR_ROWS==='undefined')return false;
    if(ADR_INITIAL?.__graLoaded===true||ADR_ROWS?.__graLoaded===true)return false;
    for(const cre of SOURCE_CRES){
      const id=`v318-data-adr-cre-${cre}`;
      const node=document.getElementById(id);
      if(!node)continue;
      const marker=document.createComment(`v414 ADR CRE ${cre} preparada sob demanda`);
      node.replaceWith(marker);
      sourceNodes.set(cre,node);
    }
    /* Com os blocos grandes destacados, a materialização custa apenas os
       pequenos sentinelas vazios. Os registros reais entram por CRE. */
    ADR_INITIAL.__graMaterialize?.();
    ADR_ROWS.__graMaterialize?.();
    installSentinels();
    return sourceNodes.size>0;
  }

  function requestedHeavySection(target){
    const nav=target?.closest?.('.nav button[data-section]');
    if(nav)return {button:nav,section:nav.dataset.section||'',kind:'nav'};
    const choice=target?.closest?.('#graStartChooser [data-start-section]');
    if(choice)return {button:choice,section:choice.dataset.startSection||'',kind:'chooser'};
    return null;
  }

  function installNavigationGuard(){
    document.addEventListener('click',event=>{
      const request=requestedHeavySection(event.target);
      if(!request)return;
      navigationIntent+=1;
      if(!['adrs','georreferenciamento'].includes(request.section)||sourcesReady())return;
      const ticket=navigationIntent;
      event.preventDefault();
      event.stopImmediatePropagation();
      request.button.setAttribute('aria-busy','true');
      request.button.disabled=true;
      ensureSources().then(()=>{
        request.button.disabled=false;
        request.button.removeAttribute('aria-busy');
        if(ticket!==navigationIntent)return;
        requestAnimationFrame(()=>setTimeout(()=>request.button.click(),0));
      }).catch(error=>{
        request.button.disabled=false;
        request.button.removeAttribute('aria-busy');
        console.error('Preparação cooperativa das ADRs',error);
      });
    },true);
  }

  function installBurstCoalescing(){
    if(window.__GRA_V414_EVENT_GUARD__)return;
    /* Teclado, automação e cliques muito rápidos podem emitir dezenas de eventos
       antes do primeiro frame. Mantemos a primeira atualização imediata e uma
       atualização final, evitando filas históricas de renders intermediários. */
    const changeIds=new Set([
      'regionalScopeSelect','somMode','somModalidade','somAnoEscolar','somComponente',
      'somEdicao','somMetric','somCre','somAgente','somPriority'
    ]);
    const states=new WeakMap();
    const replayed=new WeakSet();
    const guard=event=>{
      const target=event.target;
      if(!target||typeof target.dispatchEvent!=='function')return;
      const relevant=event.type==='input'?target.id==='somSearch':changeIds.has(target.id);
      if(!relevant)return;
      if(replayed.has(event)){
        const state=states.get(target)||{};
        state.lastPass=performance.now();state.timer=0;states.set(target,state);
        return;
      }
      const state=states.get(target)||{lastPass:-Infinity,timer:0,sameTask:false,taskTimer:0};
      if(!state.sameTask){
        state.sameTask=true;
        clearTimeout(state.taskTimer);
        state.taskTimer=setTimeout(()=>{state.sameTask=false;state.taskTimer=0;},0);
        state.lastPass=performance.now();states.set(target,state);return;
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
    };
    document.addEventListener('change',guard,true);
    document.addEventListener('input',guard,true);
  }

  function installFastAgentReconciliation(){
    if(typeof window.__graV204PatchResultRows!=='function')return;
    const targetNames=[
      'Creche Municipal Mané Garrincha I',
      'Creche Municipal Sempre Vida Palmeirinha',
      'Espaço de Desenvolvimento Infantil Professor Ubirajara de Paula Castro',
      'Creche Municipal Manoel da Rocha Aprisco',
      'Escola Municipal Oswaldo Goeldi',
      'Escola Municipal Rostham Pedro de Farias',
      'Escola Municipal Cervantes',
      'Escola Municipal Francisco Palheta',
      'Escola Municipal Ruy Carneiro da Cunha',
      'Escola Municipal Padre Dehon',
      'Escola Municipal Barão de Itararé',
      'Escola Municipal Silvio Romero'
    ];
    const normalize=value=>{
      try{return typeof norm==='function'?norm(value):String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
      catch(_){return String(value||'').toLowerCase().trim();}
    };
    const targets=new Set(targetNames.map(normalize));
    const schoolMatchCache=new Map();
    const isTargetSchool=value=>{
      const key=normalize(value);
      if(targets.has(key))return true;
      if(schoolMatchCache.has(key))return schoolMatchCache.get(key);
      let matches=false;
      try{
        const record=typeof somFindRecord==='function'?somFindRecord(value):null;
        matches=Boolean(record&&targets.has(normalize(record.unidade)));
      }catch(_){matches=false;}
      schoolMatchCache.set(key,matches);
      return matches;
    };
    window.__graV204PatchResultRows=function(){
      const pools=[];
      try{if(typeof SOM_ROWS!=='undefined'&&Array.isArray(SOM_ROWS))pools.push(SOM_ROWS);}catch(_){ }
      try{if(typeof SOM_INITIAL!=='undefined'&&Array.isArray(SOM_INITIAL))pools.push(SOM_INITIAL);}catch(_){ }
      try{if(typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS))pools.push(ADR_ROWS);}catch(_){ }
      try{if(typeof ADR_INITIAL!=='undefined'&&Array.isArray(ADR_INITIAL))pools.push(ADR_INITIAL);}catch(_){ }
      const seen=new WeakSet();
      let changed=0;
      for(const rows of pools){
        for(const row of rows){
          if(!row||typeof row!=='object'||seen.has(row))continue;
          seen.add(row);
          const rawCre=row.cre||row.regional||'';
          const match=String(rawCre).match(/\d+/);
          if(Number(match?.[0]||0)!==5||!isTargetSchool(row.escola))continue;
          row.agente='Paola Brum';
          changed+=1;
        }
      }
      return changed;
    };
  }

  const staged=stageEmbeddedSources();
  installFastAgentReconciliation();
  installBurstCoalescing();
  if(staged){
    window.__graEnsureAdrSources=ensureSources;
    window.__graAdrSourcesReady=sourcesReady;
    installNavigationGuard();
  }
  window.__GRA_V414_RUNTIME_STABILITY__={
    version:VERSION,
    staged,
    ensure:ensureSources,
    ready:sourcesReady,
    audit
  };
})();
