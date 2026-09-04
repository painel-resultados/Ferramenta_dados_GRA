(function(){
  'use strict';

  const DATA_SCHEMA='gra-ppt-data-v388';
  const DATA_CACHE=new Map();
  const DATA_TIMEOUT_MS=30000;
  const WORKER_TIMEOUT_MS=180000;
  const PPTX_MIME='application/vnd.openxmlformats-officedocument.presentationml.presentation';

  function creNumber(value){
    const match=String(value??'').match(/\d{1,2}/);
    const cre=match?Number(match[0]):0;
    return cre>=1&&cre<=11?cre:0;
  }

  async function fetchTextWithProgress(url,onProgress){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(new Error('Tempo esgotado ao buscar os dados da CRE.')),DATA_TIMEOUT_MS);
    try{
      const response=await fetch(url,{cache:'force-cache',credentials:'same-origin',signal:controller.signal});
      if(!response.ok)throw new Error(`Servidor retornou HTTP ${response.status} ao buscar ${url.pathname}.`);
      const total=Math.max(0,Number(response.headers.get('content-length'))||0);
      if(!response.body||typeof response.body.getReader!=='function'){
        const text=await response.text();
        onProgress?.({loaded:text.length,total:text.length,percent:100});
        return text;
      }
      const reader=response.body.getReader(),chunks=[];
      let loaded=0;
      while(true){
        const part=await reader.read();
        if(part.done)break;
        chunks.push(part.value);loaded+=part.value.byteLength;
        onProgress?.({loaded,total,percent:total?Math.min(99,Math.round(loaded/total*100)):0});
      }
      const merged=new Uint8Array(loaded);let offset=0;
      for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength;}
      onProgress?.({loaded,total:total||loaded,percent:100});
      return new TextDecoder().decode(merged);
    }catch(error){
      if(error?.name==='AbortError')throw new Error('A busca dos dados demorou mais de 30 segundos e foi interrompida.');
      throw error;
    }finally{clearTimeout(timer);}
  }

  async function loadCreData(creValue,options={}){
    const cre=creNumber(creValue);
    if(!cre)throw new Error('Não foi possível identificar a CRE da escola selecionada.');
    if(DATA_CACHE.has(cre))return DATA_CACHE.get(cre);
    const promise=(async()=>{
      const url=new URL(`assets/ppt-data/v388-ppt-data-cre-${cre}.json`,document.baseURI);
      const text=await fetchTextWithProgress(url,options.onProgress);
      let payload;
      try{payload=JSON.parse(text);}catch(_){throw new Error(`O pacote de dados da ${cre}ª CRE chegou incompleto ou inválido.`);}
      if(payload?.schema!==DATA_SCHEMA||Number(payload?.cre)!==cre||!Array.isArray(payload?.adr)||!Array.isArray(payload?.som)){
        throw new Error(`O pacote de dados da ${cre}ª CRE não corresponde ao formato esperado da v388.`);
      }
      if(Number(payload?.counts?.adr)!==payload.adr.length||Number(payload?.counts?.som)!==payload.som.length){
        throw new Error(`A auditoria de contagem falhou no pacote da ${cre}ª CRE.`);
      }
      return payload;
    })().catch(error=>{DATA_CACHE.delete(cre);throw error;});
    DATA_CACHE.set(cre,promise);
    return promise;
  }

  class RecordingSlideV388{
    constructor(options){
      this.record={options:options??null,background:null,commands:[]};
    }
    set background(value){this.record.background=value??null;}
    get background(){return this.record.background;}
  }
  for(const method of ['addText','addShape','addImage','addChart','addTable','addMedia','addNotes']){
    RecordingSlideV388.prototype[method]=function(...args){
      this.record.commands.push({method,args});
      return this;
    };
  }

  class RecordingDeckV388{
    constructor(){
      this.slides=[];
      this.layout='LAYOUT_WIDE';
      this.author='';this.company='';this.subject='';this.title='';this.lang='pt-BR';this.theme=null;
    }
    addSlide(options){
      const slide=new RecordingSlideV388(options);
      this.slides.push(slide);
      return slide;
    }
    toJSON(){
      return {
        schema:'gra-ppt-recording-v388',
        meta:{layout:this.layout,author:this.author,company:this.company,subject:this.subject,title:this.title,lang:this.lang,theme:this.theme},
        slides:this.slides.map(slide=>slide.record)
      };
    }
  }

  function workerRequest(message,{timeoutMs=WORKER_TIMEOUT_MS,onProgress}={}){
    return new Promise((resolve,reject)=>{
      const workerUrl=new URL('assets/v388-ppt-worker.js',document.baseURI);
      const worker=new Worker(workerUrl);
      let settled=false;
      const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);worker.terminate();fn(value);};
      const timer=setTimeout(()=>finish(reject,new Error('A compilação do PowerPoint ultrapassou 3 minutos e foi interrompida com segurança.')),timeoutMs);
      worker.addEventListener('message',event=>{
        const data=event.data||{};
        if(data.type==='progress'){onProgress?.(data);return;}
        if(data.type==='result')return finish(resolve,data);
        if(data.type==='error')return finish(reject,new Error(`${data.stage?data.stage+': ':''}${data.message||'Falha desconhecida no compilador PowerPoint.'}`));
      });
      worker.addEventListener('error',event=>finish(reject,new Error(`O compilador isolado do PowerPoint não iniciou: ${event.message||'erro no Web Worker'}.`)));
      worker.addEventListener('messageerror',()=>finish(reject,new Error('O navegador não conseguiu transferir os slides para o compilador isolado.')));
      try{worker.postMessage(message);}catch(error){finish(reject,new Error(`Não foi possível enviar os slides ao compilador: ${error?.message||error}`));}
    });
  }

  async function serializeDeck(deck,onProgress){
    const recording=typeof deck?.toJSON==='function'?deck.toJSON():deck;
    if(recording?.schema!=='gra-ppt-recording-v388'||!Array.isArray(recording?.slides)||!recording.slides.length){
      throw new Error('A gravação dos slides está vazia ou inválida.');
    }
    const result=await workerRequest({type:'generate',deck:recording},{onProgress});
    if(!(result.buffer instanceof ArrayBuffer)||!result.buffer.byteLength)throw new Error('O compilador terminou sem devolver o arquivo PowerPoint.');
    return {
      blob:new Blob([result.buffer],{type:PPTX_MIME}),
      slideCount:Number(result.slideCount)||0,
      commandCount:Number(result.commandCount)||0,
      bytes:result.buffer.byteLength
    };
  }

  async function probeWorker(){
    const result=await workerRequest({type:'probe'},{timeoutMs:25000});
    if(!(result.buffer instanceof ArrayBuffer)||result.buffer.byteLength<1000)throw new Error('O teste do compilador PowerPoint retornou um arquivo inválido.');
    return {ready:true,probeBytes:result.buffer.byteLength,engine:'v388-worker'};
  }

  window.GRA_PPT_DATA_LOAD_V388=loadCreData;
  window.GRA_PPT_CREATE_RECORDER_V388=()=>new RecordingDeckV388();
  window.GRA_PPT_SERIALIZE_V388=serializeDeck;
  window.GRA_PPT_WORKER_PROBE_V388=probeWorker;
  window.__GRA_PPT_RUNTIME_V388__={version:'v388',dataSchema:DATA_SCHEMA,worker:true};
})();
