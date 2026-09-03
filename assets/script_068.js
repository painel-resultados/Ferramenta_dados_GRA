
(function(){
  'use strict';
  const VERSION='v366';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const isExtra=v=>['cn','ciencias da natureza','ciencia da natureza','ciencias','ciencia','historia','his','geografia','geo'].includes(norm(v));
  const compOrder=v=>({lp:1,'lingua portuguesa':1,mt:2,matematica:2,cn:3,'ciencias da natureza':3,historia:4,his:4,geografia:5,geo:5}[norm(v)]||99);
  const compColor=v=>{
    const n=norm(v);
    if(n==='lp'||n==='lingua portuguesa')return (typeof BLUE!=='undefined'?BLUE:'1C79B8');
    if(n==='mt'||n==='matematica')return (typeof GREEN!=='undefined'?GREEN:'1D8F68');
    if(n==='cn'||n.includes('ciencia'))return 'D9861C';
    if(n==='historia'||n==='his')return '8B5CF6';
    if(n==='geografia'||n==='geo')return '0EA5A4';
    return '64748B';
  };
  const fullName=v=>{try{return typeof componentFullName==='function'?componentFullName(v):String(v||'');}catch(_){return String(v||'');}};
  const orderAdr=v=>{try{return typeof adrOrder==='function'?adrOrder(v):Number(String(v||'').match(/\d+/)?.[0]||0);}catch(_){return 0;}};
  const uniq=arr=>[...new Set((arr||[]).filter(v=>v!==null&&v!==undefined&&String(v).trim()!==''))];

  /*
   * Constrói as séries diretamente das linhas reais do ano.
   * Não depende de yearBlock.components, evitando que listas históricas omitam História/Geografia.
   */
  function buildYearSeries(yearRows,metricDef){
    const rows=Array.isArray(yearRows)?yearRows:[];
    const adrs=uniq(rows.map(r=>String(r?.adr||'').trim())).sort((a,b)=>orderAdr(a)-orderAdr(b));
    const components=uniq(rows.map(r=>String(r?.componente||'').trim())).sort((a,b)=>compOrder(a)-compOrder(b)||String(a).localeCompare(String(b),'pt-BR'));
    const series=[];
    for(const component of components){
      const extra=isExtra(component);
      let metricKey=metricDef?.key||'adequado';
      let metricLabel=metricDef?.label||'% Adequado';
      if(extra){
        if(metricKey!=='adequado')continue; // componentes adicionais não entram no slide Abaixo do Básico
        metricKey='acerto';
        metricLabel='% Acerto Total';
      }
      const values=adrs.map(adr=>{
        const rs=rows.filter(r=>String(r?.componente||'').trim()===component&&String(r?.adr||'').trim()===adr);
        if(!rs.length)return null;
        try{
          const value=typeof adrWeightAvg==='function'?adrWeightAvg(rs,metricKey):Number(rs[0]?.[metricKey]);
          return finite(value)?Number(value):null;
        }catch(_){return null;}
      });
      if(values.some(finite))series.push({component,color:compColor(component),metricKey,metricLabel,values});
    }
    return {adrs,series};
  }

  function joinPt(items){
    const a=(items||[]).filter(Boolean);
    return a.length<=1?(a[0]||''):a.length===2?`${a[0]} e ${a[1]}`:`${a.slice(0,-1).join(', ')} e ${a[a.length-1]}`;
  }

  function addPrimaryMetricYearSlideV257(pptx,ctx,unit,yearBlock,metricDef,slideNumber){
    const rows=Array.isArray(yearBlock?.rows)?yearBlock.rows:[];
    const built=buildYearSeries(rows,metricDef);
    const adrs=built.adrs,components=built.series;
    if(adrs.length<2||!components.length)return false;

    const slide=pptx.addSlide();
    const extras=components.filter(s=>s.metricKey==='acerto');
    const mixed=metricDef?.key==='adequado'&&extras.length>0;
    const extraTitle=extras.map(s=>`% de Acerto Total em ${fullName(s.component)}`);
    const title=mixed?`${yearBlock.ano} · % Adequado e ${joinPt(extraTitle)}`:`${yearBlock.ano} · ${metricDef.label}`;
    const subtitle=mixed
      ? `Evolução entre ${adrs[0]} e ${adrs[adrs.length-1]}: Língua Portuguesa e Matemática em % Adequado; ${joinPt(extras.map(s=>fullName(s.component)))} em % de Acerto Total.`
      : `Evolução entre ${adrs[0]} e ${adrs[adrs.length-1]} na unidade, usando ${metricDef.label}.`;
    addHeader(slide,ctx,title,subtitle,slideNumber);

    const chart={x:.78,y:1.5,w:11.82,h:4.35};
    slide.addShape('roundRect',{x:chart.x,y:chart.y,w:chart.w,h:chart.h,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    const plot={x:chart.x+.72,y:chart.y+.42,w:chart.w-1.08,h:chart.h-.92};
    for(let t=0;t<=4;t++){
      const yy=plot.y+plot.h*t/4;
      slide.addShape('line',{x:plot.x,y:yy,w:plot.w,h:0,line:{color:'E6EDF3',width:.75}});
      slide.addText(`${100-t*25}%`,{x:chart.x+.1,y:yy-.07,w:.48,h:.12,fontFace:'Aptos',fontSize:7.3,color:MUTED,align:'right',margin:0});
    }
    const x=i=>plot.x+(adrs.length===1?plot.w/2:plot.w*i/(adrs.length-1));
    const y=v=>plot.y+plot.h*(1-Math.max(0,Math.min(100,Number(v)))/100);

    components.forEach(series=>{
      for(let i=0;i<adrs.length-1;i++){
        const a=series.values[i],b=series.values[i+1];
        if(!finite(a)||!finite(b))continue;
        pptSafeLineSegmentV226(slide,x(i),y(a),x(i+1),y(b),{color:series.color,width:3.2,beginArrowType:'none',endArrowType:'none'});
      }
      series.values.forEach((v,i)=>{
        if(!finite(v))return;
        slide.addShape('ellipse',{x:x(i)-.07,y:y(v)-.07,w:.14,h:.14,line:{color:WHITE,width:1.1},fill:{color:series.color}});
        slide.addText(slidePct(v),{x:x(i)-.48,y:y(v)-.34,w:.96,h:.14,fontFace:'Aptos Display',fontSize:9.4,bold:true,color:NAVY,align:'center',margin:0,fit:'shrink'});
      });
    });

    adrs.forEach((adr,i)=>slide.addText(adr,{x:x(i)-.52,y:chart.y+chart.h-.34,w:1.04,h:.14,fontFace:'Aptos',fontSize:9,bold:true,color:MUTED,align:'center',margin:0,fit:'shrink'}));

    // Cinco componentes cabem: LP, MT, Ciências, História e Geografia.
    components.slice(0,5).forEach((series,idx)=>{
      const col=idx%3,row=Math.floor(idx/3);
      const x0=.95+col*4.05,y0=6.02+row*.39;
      slide.addShape('ellipse',{x:x0,y:y0+.04,w:.11,h:.11,line:{color:series.color,transparency:100},fill:{color:series.color}});
      const metricName=series.metricKey==='acerto'?'Acerto Total':series.metricKey==='adequado'?'Adequado':'Abaixo do Básico';
      slide.addText(`${fullName(series.component)} · ${metricName}`,{x:x0+.16,y:y0,w:3.55,h:.14,fontFace:'Aptos',fontSize:8.3,bold:true,color:INK,margin:0,fit:'shrink'});
      const first=series.values[0],last=series.values[series.values.length-1];
      if(finite(first)&&finite(last)){
        const delta=Number(last)-Number(first);
        const favorable=series.metricKey==='abaixo'?delta<=0:delta>=0;
        slide.addText(`${slidePct(first)} → ${slidePct(last)} · ${delta>=0?'+':''}${slidePct(delta)}`,{
          x:x0+.16,y:y0+.18,w:3.55,h:.14,fontFace:'Aptos',fontSize:7.7,
          color:favorable?(typeof GREEN_DARK!=='undefined'?GREEN_DARK:'166246'):'9B2F2F',margin:0,fit:'shrink'
        });
      }
    });
    return true;
  }

  // Expõe o motor e substitui os aliases históricos.
  window.v257BuildAdrYearSeries=buildYearSeries;
  window.v257AddAdrUnitYearIndicatorSlide=addPrimaryMetricYearSlideV257;
  window.v252AddAdrUnitYearIndicatorSlide=addPrimaryMetricYearSlideV257;
  window.v179AddAdrUnitYearIndicatorSlide=addPrimaryMetricYearSlideV257;
  try{v179AddAdrUnitYearIndicatorSlide=addPrimaryMetricYearSlideV257;}catch(_){}

  async function generateAllEvaluationV257(){
    setSlideBusy(true,'Localizando todos os dados da unidade…');
    await (typeof pptYieldV190==='function'?pptYieldV190():Promise.resolve());
    const unit=await allEvaluationSelectedUnitV190();
    if(!unit){setSlideBusy(false);slideToast('Selecione uma única escola para gerar todos os dados de avaliação da unidade.',true);return;}
    const ctx=presentationContext();ctx.scopeTitle=unit.school;ctx.scopeKind='Escola';ctx.school=unit.school;ctx.sectionLabel='Todos os dados de avaliação';
    try{
      await ensureLibraries();
      const PptxCtor=window.PptxGenJS||window.pptxgen,pptx=new PptxCtor();
      pptx.layout='LAYOUT_WIDE';pptx.author='GRA · SME-Rio';pptx.company='Secretaria Municipal de Educação do Rio de Janeiro';pptx.subject=`Todos os dados de avaliação · ${unit.school}`;pptx.title=`${unit.school} — Todos os dados de avaliação`;pptx.lang='pt-BR';pptx.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'pt-BR'};
      addCoverSlide(pptx,ctx);let slideNumber=2;

      setSlideBusy(true,'Organizando todas as avaliações somativas da unidade…');
      addBigDividerSlide(pptx,ctx,'Avaliações Somativas',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
      let somMeta=null;try{somMeta=typeof somUnitRelevantBundle==='function'?somUnitRelevantBundle(unit.school):null;}catch(_){}
      if(somMeta?.summary?.length)slideNumber=addSomUnitPresentationSlides(pptx,{...ctx,sectionId:'resultados',sectionLabel:'Avaliações Somativas'},slideNumber);
      else addNoDataUnitSlideV187(pptx,ctx,'Avaliações Somativas','Não há resultados somativos disponíveis para esta unidade na base atual.',slideNumber++);

      setSlideBusy(true,'Organizando todos os dados das ADRs…');
      addBigDividerSlide(pptx,ctx,'Avaliações Formativas · ADRs',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
      const years=(typeof v179GroupAdrUnitRowsByYear==='function'?v179GroupAdrUnitRowsByYear(unit.adrRows||[]):[]);
      if(!years.length)addNoDataUnitSlideV187(pptx,ctx,'Avaliações Formativas · ADRs','Não há registros de ADR disponíveis para esta unidade na base atual.',slideNumber++);
      else{
        for(const yearBlock of years){
          addBigDividerSlide(pptx,ctx,yearBlock.ano,`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
          if(addPrimaryMetricYearSlideV257(pptx,ctx,unit,yearBlock,{key:'adequado',label:'% Adequado'},slideNumber))slideNumber++;
          if(addPrimaryMetricYearSlideV257(pptx,ctx,unit,yearBlock,{key:'abaixo',label:'% Abaixo do Básico'},slideNumber))slideNumber++;
          const componentNames=uniq((yearBlock.rows||[]).map(r=>String(r?.componente||'').trim())).sort((a,b)=>compOrder(a)-compOrder(b));
          for(const component of componentNames){
            const compRows=(yearBlock.rows||[]).filter(r=>String(r?.componente||'').trim()===component);
            const adrs=uniq(compRows.map(r=>String(r?.adr||'').trim())).sort((a,b)=>orderAdr(a)-orderAdr(b));
            for(const adr of adrs){if(typeof addAdrUnitSkillDeckSlide==='function'&&addAdrUnitSkillDeckSlide(pptx,ctx,unit,component,yearBlock.ano,compRows,adr,slideNumber))slideNumber++;}
          }
        }
      }
      const d=new Date(),stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,filename=`Dashboard_GRA_${safeFile(unit.school)}_Todos_Dados_Avaliacao_${stamp}.pptx`;
      setSlideBusy(true,'Finalizando a apresentação completa…');
      const output=await pptx.write({outputType:'blob',compression:false});
      const blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      forcePresentationDownload(blob,filename,null);slideToast(`Download iniciado: ${filename}`);
    }catch(err){console.error('Falha ao gerar todos os dados de avaliação v257',err);slideToast(`Não foi possível gerar a apresentação completa: ${cleanText(err?.message||'erro desconhecido')}`,true);}finally{setSlideBusy(false);}
  }

  async function generateAdrFullV257(){
    const unit=adrSelectedUnitForFullDeck();
    if(!unit){slideToast('Selecione uma única escola na aba ADRs para gerar todos os dados da unidade.',true);return;}
    const ctx=presentationContext();ctx.scopeTitle=unit.school;ctx.scopeKind='Escola';ctx.school=unit.school;ctx.sectionLabel='ADRs';setSlideBusy(true,'Montando apresentação completa de ADR da unidade…');
    try{
      await ensureLibraries();const PptxCtor=window.PptxGenJS||window.pptxgen,pptx=new PptxCtor();pptx.layout='LAYOUT_WIDE';pptx.author='GRA · SME-Rio';pptx.company='Secretaria Municipal de Educação do Rio de Janeiro';pptx.subject=`ADRs · ${unit.school}`;pptx.title=`${unit.school} — Todos os dados de ADR`;pptx.lang='pt-BR';pptx.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'pt-BR'};addCoverSlide(pptx,ctx);let slideNumber=2;
      const years=(typeof v179GroupAdrUnitRowsByYear==='function'?v179GroupAdrUnitRowsByYear(unit.rows||[]):[]);
      for(const yearBlock of years){
        addBigDividerSlide(pptx,ctx,yearBlock.ano,`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
        if(addPrimaryMetricYearSlideV257(pptx,ctx,unit,yearBlock,{key:'adequado',label:'% Adequado'},slideNumber))slideNumber++;
        if(addPrimaryMetricYearSlideV257(pptx,ctx,unit,yearBlock,{key:'abaixo',label:'% Abaixo do Básico'},slideNumber))slideNumber++;
        const componentNames=uniq((yearBlock.rows||[]).map(r=>String(r?.componente||'').trim())).sort((a,b)=>compOrder(a)-compOrder(b));
        for(const component of componentNames){
          const compRows=(yearBlock.rows||[]).filter(r=>String(r?.componente||'').trim()===component);
          const adrs=uniq(compRows.map(r=>String(r?.adr||'').trim())).sort((a,b)=>orderAdr(a)-orderAdr(b));
          for(const adr of adrs){if(typeof addAdrUnitSkillDeckSlide==='function'&&addAdrUnitSkillDeckSlide(pptx,ctx,unit,component,yearBlock.ano,compRows,adr,slideNumber))slideNumber++;}
        }
      }
      const d=new Date(),stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,filename=`Dashboard_GRA_${safeFile(unit.school)}_Todos_Dados_ADR_${stamp}.pptx`;
      setSlideBusy(true,'Finalizando e iniciando o download…');const output=await pptx.write({outputType:'blob',compression:false}),blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});forcePresentationDownload(blob,filename,null);slideToast(`Download iniciado: ${filename}`);
    }catch(err){console.error('Falha ao gerar PPTX ADR v257',err);slideToast(`Não foi possível gerar os slides: ${cleanText(err?.message||'erro desconhecido')}`,true);}finally{setSlideBusy(false);}
  }

  window.generateAllEvaluationUnitPresentationV188=generateAllEvaluationV257;
  window.generateAdrUnitFullPresentation=generateAdrFullV257;
  try{generateAllEvaluationUnitPresentationV188=generateAllEvaluationV257;}catch(_){}
  try{generateAdrUnitFullPresentation=generateAdrFullV257;}catch(_){}
  if(typeof globalThis!=='undefined'){
    globalThis.generateAllEvaluationUnitPresentationV188=generateAllEvaluationV257;
    globalThis.generateAdrUnitFullPresentation=generateAdrFullV257;
  }

  // Auditoria simples para inspeção em console e testes de regressão.
  window.v257PptSeriesAudit=function(school){
    const all=Array.isArray(window.ADR_ROWS)?window.ADR_ROWS:(typeof ADR_ROWS!=='undefined'?ADR_ROWS:[]);
    const key=norm(school);
    const rows=all.filter(r=>norm(r?.escola)===key);
    const years=uniq(rows.map(r=>r.ano)).sort((a,b)=>Number(String(a).match(/\d+/)?.[0]||99)-Number(String(b).match(/\d+/)?.[0]||99));
    return years.map(ano=>{
      const yr=rows.filter(r=>r.ano===ano),built=buildYearSeries(yr,{key:'adequado',label:'% Adequado'});
      return {ano,series:built.series.map(s=>({component:s.component,metric:s.metricKey,values:s.values}))};
    });
  };

  // Bloqueio complementar do pull-to-refresh do Chrome/Android no topo.
  let touchStartY=0;
  document.addEventListener('touchstart',e=>{if(e.touches&&e.touches.length===1)touchStartY=e.touches[0].clientY;},{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!e.touches||e.touches.length!==1)return;
    const currentY=e.touches[0].clientY;
    const pullingDown=currentY-touchStartY>8;
    const root=document.scrollingElement||document.documentElement;
    if(!pullingDown||Number(root?.scrollTop||0)>0)return;
    // Se o gesto estiver dentro de um painel que ainda pode rolar para cima, preserva o gesto local.
    let node=e.target instanceof Element?e.target:null;
    while(node&&node!==document.body&&node!==document.documentElement){
      try{
        const cs=getComputedStyle(node);
        if(/auto|scroll/.test(cs.overflowY)&&node.scrollTop>0)return;
      }catch(_){}
      node=node.parentElement;
    }
    e.preventDefault();
  },{passive:false});

  // Garante a versão final sem criar observers concorrentes com versões antigas já atualizadas para v257.
  const stamp=()=>{const b=document.getElementById('dashboardVersionBadge');if(b)b.textContent=VERSION;document.querySelectorAll('.exp-badge').forEach(x=>x.textContent=VERSION);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(stamp,0),{once:true});else setTimeout(stamp,0);
})();
