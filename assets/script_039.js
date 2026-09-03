
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
  installBuildOverride();
  window.__GRA_GEO_V295={inflateIndexRows,installBuildOverride,get indexReady(){return !!window.GEO_STATE?.adrReady;},get indexSize(){return window.GEO_STATE?.adrIndex?.size||0;}};
})();
