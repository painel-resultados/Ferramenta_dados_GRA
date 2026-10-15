
(function(){
  'use strict';
  const VERSION='v366';
  const DATA_ID='v295-geo-adr-index-gzip';
  let inflatePromise=null;
  let installed=false;
  const yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0));
  async function inflateIndexRows(){
    if(inflatePromise)return inflatePromise;
    inflatePromise=(async()=>{
      const node=document.getElementById(DATA_ID);
      if(!node)throw new Error('Índice geográfico ADR v295 não encontrado.');
      const b64=(node.textContent||'').trim();
      if(!b64)throw new Error('Índice geográfico ADR v295 vazio.');
      if(!('DecompressionStream' in window))throw new Error('Este navegador precisa oferecer DecompressionStream para o índice geográfico.');
      const bin=atob(b64),bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const jsonText=await new Response(stream).text();
      const rows=JSON.parse(jsonText);
      if(!Array.isArray(rows)||!rows.length)throw new Error('Índice geográfico ADR v295 inválido.');
      return rows;
    })();
    return inflatePromise;
  }
  function finishCallbacks(){
    const callbacks=Array.isArray(GEO_STATE.adrCallbacks)?GEO_STATE.adrCallbacks.splice(0):[];
    callbacks.forEach(fn=>{try{fn();}catch(error){console.error(error);}});
  }
  function installBuildOverride(){
    if(installed||typeof GEO_STATE==='undefined')return false;
    installed=true;
    geoBuildAdrIndex=function(callback){
      if(typeof callback==='function')GEO_STATE.adrCallbacks.push(callback);
      if(GEO_STATE.adrReady){
        window.__graStartupProgress?.(1,'Índice geográfico das ADRs pronto.');
        queueMicrotask(finishCallbacks);return;
      }
      if(GEO_STATE.adrBuilding)return;
      GEO_STATE.adrBuilding=true;
      (async()=>{
        try{
          window.__graStartupProgress?.(.03,'Abrindo o índice geográfico compacto…');
          const rows=await inflateIndexRows();
          window.__graStartupProgress?.(.12,'Índice geográfico descompactado. Organizando os dados…');
          GEO_STATE.adrIndex=new Map();
          const total=rows.length||1;
          const chunkSize=900;
          for(let start=0;start<rows.length;start+=chunkSize){
            const end=Math.min(rows.length,start+chunkSize);
            for(let i=start;i<end;i++){
              const r=rows[i];
              const key=geoAdrIndexKey(r[0],r[1],r[2],r[3]);
              GEO_STATE.adrIndex.set(key,{
                adequadoS:r[4]??0,adequadoN:r[4]==null?0:1,
                abaixoS:r[5]??0,abaixoN:r[5]==null?0:1,
                basicoS:r[6]??0,basicoN:r[6]==null?0:1,
                avaliadosPctS:r[7]??0,avaliadosPctN:r[7]==null?0:1
              });
            }
            const ratio=.12+.84*(end/total);
            window.__graStartupProgress?.(ratio,'Preparando o índice geográfico em etapas…');
            await yieldFrame();
          }
          GEO_STATE.adrReady=true;GEO_STATE.adrBuilding=false;
          GEO_STATE.evolutionCache.clear();GEO_STATE.evalCache.clear();
          window.__graStartupProgress?.(1,'Índice geográfico das ADRs pronto.');
          const node=document.getElementById(DATA_ID);if(node){node.textContent='';node.remove();}
          // Nunca renderiza o mapa escondido. Renderização só ocorre depois que a aba estiver ativa.
          if(document.getElementById('georreferenciamento')?.classList.contains('active')){
            try{geoUpdateContextUI();geoScheduleFilters(0);}catch(error){console.warn('Atualização do mapa após índice v295',error);}
          }
          finishCallbacks();
        }catch(error){
          GEO_STATE.adrBuilding=false;
          console.error('Falha ao preparar índice geográfico v295',error);
          finishCallbacks();
        }
      })();
    };
    window.geoBuildAdrIndex=geoBuildAdrIndex;
    return true;
  }
  // A tela inicial prepara somente DOM leve + índice compacto; não executa initGeoref escondido.
  window.__graPrewarmGeorefControls=function(){
    try{if(typeof geoInitStage==='function')geoInitStage();}catch(error){console.warn('Pré-montagem leve do mapa v295',error);}
    try{if(typeof populateGeoAgentFilter==='function')populateGeoAgentFilter();}catch(error){console.warn('Pré-carga de agentes v295',error);}
    return true;
  };

  // HF20 — terceira edição na análise geográfica, sem modificar o índice compacto legado.
  // A ADR 3 é indexada somente quando a nova comparação é solicitada.
  const ADR13_VALUE='progress13';
  let adr3Promise=null,adr3IndexMap=null,adr3IndexedRows=new WeakSet(),patchedContext=false,patchedFilters=false;
  const selectedMode=()=>{
    const root=document.getElementById('georreferenciamento');
    if(!root)return null;
    return [...root.querySelectorAll('select')].find(sel=>
      [...sel.options].some(option=>option.value==='progress')&&
      [...sel.options].some(option=>option.value==='adr1'||option.value==='adr2')
    )||null;
  };
  function syncAdr13Option(){
    const sel=selectedMode();if(!sel)return false;
    if(![...sel.options].some(option=>option.value===ADR13_VALUE)){
      const option=document.createElement('option');
      option.value=ADR13_VALUE;option.textContent='Progressão ADR 1 → ADR 3';
      const original=[...sel.options].find(option=>option.value==='progress');
      if(original?.nextSibling)sel.insertBefore(option,original.nextSibling);else sel.appendChild(option);
    }
    return true;
  }
  function indexAdr3Row(row){
    if(row?.adr!=='ADR 3'||!row.escola)return false;
    const schoolRef=row.codigoSME?String(row.codigoSME)+' '+row.escola:row.escola;
    const point=typeof geoFindPointForSchool==='function'
      ? (geoFindPointForSchool(schoolRef,row.cre||row.regional)||geoFindPointForSchool(row.escola,row.cre||row.regional))
      : null;
    if(!point)return false;
    const key=geoAdrIndexKey(point.name,row.ano,row.componente,'ADR 3');
    let aggregate=GEO_STATE.adrIndex.get(key);
    if(!aggregate){
      aggregate={adequadoS:0,adequadoN:0,abaixoS:0,abaixoN:0,basicoS:0,basicoN:0,avaliadosPctS:0,avaliadosPctN:0};
      GEO_STATE.adrIndex.set(key,aggregate);
    }
    for(const field of ['adequado','abaixo','basico','avaliadosPct']){
      const value=row[field];
      if(value===null||value===undefined||value===''||!Number.isFinite(Number(value)))continue;
      aggregate[field+'S']+=Number(value);aggregate[field+'N']++;
    }
    return true;
  }
  async function ensureAdr3Index(){
    if(GEO_STATE?.adr3Ready&&adr3IndexMap===GEO_STATE.adrIndex)return true;
    if(adr3Promise)return adr3Promise;
    adr3Promise=(async()=>{
      GEO_STATE.adr3Ready=false;
      try{
        // Preserva o carregamento parcelado da base oficial adotado pela ferramenta.
        const region=Number(document.getElementById('regionalScopeSelect')?.value||GEO_STATE.region||0);
        if(typeof window.__graEnsureAdrSources==='function')
          await window.__graEnsureAdrSources(region||undefined);
        if(!GEO_STATE.adrReady){
          await new Promise((resolve,reject)=>{
            let done=false;const settle=(err)=>{if(done)return;done=true;err?reject(err):resolve();};
            try{geoBuildAdrIndex(()=>GEO_STATE.adrReady?settle():settle(new Error('Índice geográfico indisponível')));}
            catch(error){settle(error);}
          });
        }
        if(adr3IndexMap!==GEO_STATE.adrIndex){
          adr3IndexedRows=new WeakSet();adr3IndexMap=GEO_STATE.adrIndex;
        }
        const rows=(typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS))?ADR_ROWS:[];
        for(let i=0;i<rows.length;i++){
          const row=rows[i];
          if(row?.adr!=='ADR 3'||adr3IndexedRows.has(row))continue;
          indexAdr3Row(row);adr3IndexedRows.add(row);
          if(i>0&&i%1200===0)await yieldFrame();
        }
        GEO_STATE.adr3Ready=true;
        GEO_STATE.evalCache?.clear();GEO_STATE.evolutionCache?.clear();
        if(document.getElementById('georreferenciamento')?.classList.contains('active')){
          try{geoUpdateContextUI();geoScheduleFilters(0);}catch(error){console.warn('HF20 atualização mapa',error);}
        }
        return true;
      }catch(error){
        GEO_STATE.adr3Ready=false;
        GEO_STATE.evalCache?.clear();
        console.error('HF20: não foi possível calcular ADR 1 → ADR 3',error);
        return false;
      }
    })().finally(()=>{adr3Promise=null;});
    return adr3Promise;
  }
  function installAdr13Hooks(){
    if(!patchedContext&&typeof window.geoEvalContext==='function'){
      const old=window.geoEvalContext;
      const wrapped=function(){const ctx=old.apply(this,arguments);if(ctx&&ctx.evaluation==='ADR'&&selectedMode()?.value===ADR13_VALUE)ctx.adrView=ADR13_VALUE;return ctx;};
      window.geoEvalContext=wrapped;
      try{geoEvalContext=wrapped}catch(_){}
      patchedContext=true;
    }
    if(!patchedFilters&&typeof window.geoRefreshEvaluationFilters==='function'){
      const old=window.geoRefreshEvaluationFilters;
      const wrapped=function(){
        const previous=selectedMode()?.value;
        const out=old.apply(this,arguments);
        syncAdr13Option();
        const sel=selectedMode();
        if(previous===ADR13_VALUE&&sel)sel.value=ADR13_VALUE;
        return out;
      };
      window.geoRefreshEvaluationFilters=wrapped;
      try{geoRefreshEvaluationFilters=wrapped}catch(_){}
      patchedFilters=true;
    }
    syncAdr13Option();
  }
  document.addEventListener('change',event=>{
    const section=event.target?.closest?.('#georreferenciamento');
    if(!section)return;
    if(event.target?.value===ADR13_VALUE)void ensureAdr3Index();
    setTimeout(installAdr13Hooks,40);
    setTimeout(installAdr13Hooks,220);
  },true);
  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-section="georreferenciamento"]')){
      setTimeout(installAdr13Hooks,120);
      setTimeout(installAdr13Hooks,650);
    }
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installAdr13Hooks,{once:true});
  else installAdr13Hooks();
  window.__GRA_GEO_ADR13__={ensure:ensureAdr3Index,sync:syncAdr13Option,get ready(){return !!GEO_STATE?.adr3Ready;}};

  installBuildOverride();
  window.__GRA_GEO_V295={inflateIndexRows,installBuildOverride,get indexReady(){return !!window.GEO_STATE?.adrReady;},get indexSize(){return window.GEO_STATE?.adrIndex?.size||0;}};
})();
