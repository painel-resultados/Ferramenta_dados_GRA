'use strict';

importScripts('v388-pptxgen.bundle.js');

const PptxCtor=self.PptxGenJS||self.pptxgen;

function progress(stage,percent,message,detail=''){
  self.postMessage({type:'progress',stage,percent,message,detail});
}

function asArrayBuffer(value){
  if(value instanceof ArrayBuffer)return value;
  if(ArrayBuffer.isView(value))return value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);
  throw new Error('O PptxGenJS não retornou um ArrayBuffer.');
}

function applyMeta(pptx,meta={}){
  for(const key of ['layout','author','company','subject','title','lang','theme']){
    if(meta[key]!==undefined&&meta[key]!==null)pptx[key]=meta[key];
  }
}

function replayDeck(recording){
  if(typeof PptxCtor!=='function')throw new Error('Biblioteca PptxGenJS não carregada dentro do Web Worker.');
  if(recording?.schema!=='gra-ppt-recording-v388'||!Array.isArray(recording?.slides)||!recording.slides.length){
    throw new Error('Registro de slides inválido.');
  }
  const pptx=new PptxCtor();
  applyMeta(pptx,recording.meta);
  let commandCount=0;
  recording.slides.forEach((source,index)=>{
    const slide=pptx.addSlide(source.options??undefined);
    if(source.background)slide.background=source.background;
    for(const command of source.commands||[]){
      const method=command?.method;
      if(!['addText','addShape','addImage','addChart','addTable','addMedia','addNotes'].includes(method)||typeof slide[method]!=='function'){
        throw new Error(`Comando não suportado no slide ${index+1}: ${String(method||'vazio')}.`);
      }
      slide[method](...(command.args||[]));
      commandCount+=1;
    }
    if(index===0||(index+1)%5===0||index+1===recording.slides.length){
      progress('replay',55+Math.round((index+1)/recording.slides.length*25),`Preparando slide ${index+1} de ${recording.slides.length}…`);
    }
  });
  return {pptx,commandCount};
}

async function generate(recording){
  progress('received',52,'Conteúdo recebido pelo compilador isolado.');
  const {pptx,commandCount}=replayDeck(recording);
  progress('serialize',82,`Compactando ${recording.slides.length} slides…`,'O painel continua responsivo enquanto o arquivo é montado.');
  const output=await pptx.write({outputType:'arraybuffer',compression:true});
  const buffer=asArrayBuffer(output);
  if(buffer.byteLength<4)throw new Error('Arquivo PowerPoint vazio.');
  const header=new Uint8Array(buffer,0,Math.min(4,buffer.byteLength));
  if(header[0]!==0x50||header[1]!==0x4b)throw new Error('O arquivo gerado não possui a assinatura ZIP/PPTX esperada.');
  progress('done',98,'PowerPoint compilado. Validando o download…');
  self.postMessage({type:'result',buffer,slideCount:recording.slides.length,commandCount,bytes:buffer.byteLength},[buffer]);
}

async function probe(){
  const pptx=new PptxCtor();pptx.layout='LAYOUT_WIDE';
  const slide=pptx.addSlide();slide.addText('GRA PPT v388 worker probe',{x:.4,y:.4,w:3,h:.3,fontSize:9});
  const buffer=asArrayBuffer(await pptx.write({outputType:'arraybuffer',compression:true}));
  self.postMessage({type:'result',buffer,slideCount:1,commandCount:1,bytes:buffer.byteLength},[buffer]);
}

self.addEventListener('message',event=>{
  const request=event.data||{};
  Promise.resolve()
    .then(()=>request.type==='probe'?probe():request.type==='generate'?generate(request.deck):Promise.reject(new Error('Operação desconhecida.')))
    .catch(error=>self.postMessage({type:'error',stage:'compilação PowerPoint',message:String(error?.message||error||'erro desconhecido'),stack:String(error?.stack||'')}));
});
