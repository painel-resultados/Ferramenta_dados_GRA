
(function(){
  'use strict';
  const VERSION='v366';
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const uniq=a=>[...new Set((a||[]).filter(v=>v!==null&&v!==undefined&&String(v).trim()!==''))];
  const isExtra=v=>['cn','ciencias da natureza','ciencia da natureza','ciencias','ciencia','historia','his','geografia','geo'].includes(norm(v));
  const orderComp=v=>({lp:1,'lingua portuguesa':1,mt:2,matematica:2,cn:3,'ciencias da natureza':3,historia:4,his:4,geografia:5,geo:5}[norm(v)]||99);
  const colorComp=v=>{
    const n=norm(v);
    if(n==='lp'||n==='lingua portuguesa')return typeof BLUE!=='undefined'?BLUE:'1C79B8';
    if(n==='mt'||n==='matematica')return typeof GREEN!=='undefined'?GREEN:'1D8F68';
    if(n==='cn'||n.includes('ciencia'))return 'D9861C';
    if(n==='historia'||n==='his')return '8B5CF6';
    if(n==='geografia'||n==='geo')return '0EA5A4';
    return '64748B';
  };
  const fullName=v=>{
    const n=norm(v);
    if(n==='lp'||n==='lingua portuguesa')return 'Língua Portuguesa';
    if(n==='mt'||n==='matematica')return 'Matemática';
    if(n==='cn'||n.includes('ciencia'))return 'Ciências da Natureza';
    if(n==='historia'||n==='his')return 'História';
    if(n==='geografia'||n==='geo')return 'Geografia';
    return String(v||'Componente');
  };
  const adrNum=v=>{try{return typeof adrOrder==='function'?adrOrder(v):Number(String(v||'').match(/\d+/)?.[0]||0);}catch(_){return Number(String(v||'').match(/\d+/)?.[0]||0);}};
  const yearNum=v=>Number(String(v||'').match(/\d+/)?.[0]||99);
  const joinPt=a=>{a=(a||[]).filter(Boolean);return a.length<2?(a[0]||''):a.length===2?`${a[0]} e ${a[1]}`:`${a.slice(0,-1).join(', ')} e ${a[a.length-1]}`;};
  const avg=(rows,key)=>{
    if(!rows?.length)return null;
    try{
      const v=typeof adrWeightAvg==='function'?adrWeightAvg(rows,key):rows[0]?.[key];
      return finite(v)?Number(v):null;
    }catch(_){const v=rows[0]?.[key];return finite(v)?Number(v):null;}
  };
  function groupYears(rows){
    return uniq((rows||[]).map(r=>String(r?.ano||'').trim())).sort((a,b)=>yearNum(a)-yearNum(b)).map(ano=>{
      const yr=(rows||[]).filter(r=>String(r?.ano||'').trim()===ano);
      return {ano,rows:yr,components:uniq(yr.map(r=>String(r?.componente||'').trim())).sort((a,b)=>orderComp(a)-orderComp(b)||String(a).localeCompare(String(b),'pt-BR'))};
    });
  }
  function buildSeries(rows,kind){
    const adrs=uniq(rows.map(r=>String(r?.adr||'').trim())).sort((a,b)=>adrNum(a)-adrNum(b));
    const components=uniq(rows.map(r=>String(r?.componente||'').trim())).sort((a,b)=>orderComp(a)-orderComp(b)||String(a).localeCompare(String(b),'pt-BR'));
    const series=[];
    for(const component of components){
      const extra=isExtra(component);
      if(kind==='abaixo'&&extra)continue;
      const metricKey=extra?'acerto':kind;
      const values=adrs.map(adr=>avg(rows.filter(r=>String(r?.componente||'').trim()===component&&String(r?.adr||'').trim()===adr),metricKey));
      if(values.some(finite))series.push({component,metricKey,color:colorComp(component),values});
    }
    return {adrs,series};
  }
  function addEvolutionSlide(pptx,ctx,yearBlock,kind,slideNumber){
    const built=buildSeries(yearBlock.rows,kind),adrs=built.adrs,series=built.series;
    if(adrs.length<2||!series.length)return false;
    const extras=series.filter(s=>s.metricKey==='acerto');
    const mixed=kind==='adequado'&&extras.length>0;
    const title=mixed
      ? `${yearBlock.ano} · % Adequado e ${joinPt(extras.map(s=>`% de Acerto Total em ${fullName(s.component)}`))}`
      : `${yearBlock.ano} · ${kind==='adequado'?'% Adequado':'% Abaixo do Básico'}`;
    const subtitle=mixed
      ? `Evolução entre ${adrs[0]} e ${adrs[adrs.length-1]}: Língua Portuguesa e Matemática em % Adequado; ${joinPt(extras.map(s=>fullName(s.component)))} em % de Acerto Total.`
      : `Evolução entre ${adrs[0]} e ${adrs[adrs.length-1]} na unidade, comparando Língua Portuguesa e Matemática.`;
    const slide=pptx.addSlide();
    addHeader(slide,ctx,title,subtitle,slideNumber);
    const chart={x:.78,y:1.5,w:11.82,h:4.35};
    slide.addShape('roundRect',{x:chart.x,y:chart.y,w:chart.w,h:chart.h,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    const plot={x:chart.x+.72,y:chart.y+.42,w:chart.w-1.08,h:chart.h-.92};
    for(let t=0;t<=4;t++){
      const yy=plot.y+plot.h*t/4;
      slide.addShape('line',{x:plot.x,y:yy,w:plot.w,h:0,line:{color:'E6EDF3',width:.75}});
      slide.addText(`${100-t*25}%`,{x:chart.x+.1,y:yy-.07,w:.48,h:.12,fontFace:'Aptos',fontSize:7.3,color:MUTED,align:'right',margin:0});
    }
    const x=i=>plot.x+plot.w*i/(adrs.length-1);
    const y=v=>plot.y+plot.h*(1-Math.max(0,Math.min(100,Number(v)))/100);
    for(const item of series){
      for(let i=0;i<adrs.length-1;i++){
        const a=item.values[i],b=item.values[i+1];
        if(!finite(a)||!finite(b))continue;
        pptSafeLineSegmentV226(slide,x(i),y(a),x(i+1),y(b),{color:item.color,width:3.1,beginArrowType:'none',endArrowType:'none'});
      }
      item.values.forEach((v,i)=>{
        if(!finite(v))return;
        slide.addShape('ellipse',{x:x(i)-.07,y:y(v)-.07,w:.14,h:.14,line:{color:WHITE,width:1.1},fill:{color:item.color}});
        slide.addText(slidePct(v),{x:x(i)-.48,y:y(v)-.34,w:.96,h:.14,fontFace:'Aptos Display',fontSize:9.1,bold:true,color:NAVY,align:'center',margin:0,fit:'shrink'});
      });
    }
    adrs.forEach((adr,i)=>slide.addText(adr,{x:x(i)-.52,y:chart.y+chart.h-.34,w:1.04,h:.14,fontFace:'Aptos',fontSize:9,bold:true,color:MUTED,align:'center',margin:0,fit:'shrink'}));
    // 5 componentes: 3 na primeira linha e 2 na segunda, sem cortar a legenda.
    series.slice(0,5).forEach((item,idx)=>{
      const col=idx%3,row=Math.floor(idx/3),x0=.95+col*4.05,y0=6.0+row*.43;
      slide.addShape('ellipse',{x:x0,y:y0+.04,w:.11,h:.11,line:{color:item.color,transparency:100},fill:{color:item.color}});
      const metric=item.metricKey==='acerto'?'Acerto Total':item.metricKey==='adequado'?'Adequado':'Abaixo do Básico';
      slide.addText(`${fullName(item.component)} · ${metric}`,{x:x0+.16,y:y0,w:3.55,h:.14,fontFace:'Aptos',fontSize:8.1,bold:true,color:INK,margin:0,fit:'shrink'});
      const first=item.values[0],last=item.values[item.values.length-1];
      if(finite(first)&&finite(last)){
        const delta=Number(last)-Number(first),favorable=item.metricKey==='abaixo'?delta<=0:delta>=0;
        slide.addText(`${slidePct(first)} → ${slidePct(last)} · ${delta>=0?'+':''}${slidePct(delta)}`,{x:x0+.16,y:y0+.18,w:3.55,h:.14,fontFace:'Aptos',fontSize:7.6,color:favorable?(typeof GREEN_DARK!=='undefined'?GREEN_DARK:'166246'):'9B2F2F',margin:0,fit:'shrink'});
      }
    });
    return true;
  }

  async function generateFull(){
    setSlideBusy(true,'Localizando todos os dados da unidade…');
    try{if(typeof pptYieldV190==='function')await pptYieldV190();}catch(_){}
    const unit=await allEvaluationSelectedUnitV190();
    if(!unit){setSlideBusy(false);slideToast('Selecione uma única escola para gerar todos os dados de avaliação da unidade.',true);return;}
    const originalActive=document.querySelector('.section.active')?.id||'adrs';
    const originalNav=document.querySelector('.nav button[data-section].active')?.dataset?.section||originalActive;
    const originalScrollY=window.scrollY||0;
    const restore=()=>{
      try{
        document.querySelectorAll('.section').forEach(el=>el.classList.remove('active'));
        document.getElementById(originalActive)?.classList.add('active');
        document.querySelectorAll('.nav button[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===originalNav));
        if(originalActive==='resultados'&&typeof renderResultados==='function')renderResultados();
        if(originalActive==='adrs'&&typeof renderADRs==='function')renderADRs();
        window.scrollTo(0,originalScrollY);
      }catch(_){}
    };
    const ctx=presentationContext();ctx.scopeTitle=unit.school;ctx.scopeKind='Escola';ctx.school=unit.school;ctx.sectionLabel='Todos os dados de avaliação';
    setSlideBusy(true,'Montando todos os dados de avaliação da unidade…');
    try{
      await ensureLibraries();
      const PptxCtor=window.PptxGenJS||window.pptxgen;
      if(typeof PptxCtor!=='function')throw new Error('Biblioteca PowerPoint não foi carregada.');
      const pptx=new PptxCtor();
      pptx.layout='LAYOUT_WIDE';pptx.author='GRA · SME-Rio';pptx.company='Secretaria Municipal de Educação do Rio de Janeiro';pptx.subject=`Todos os dados de avaliação · ${unit.school}`;pptx.title=`${unit.school} — Todos os dados de avaliação`;pptx.lang='pt-BR';pptx.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'pt-BR'};
      addCoverSlide(pptx,ctx);let slideNumber=2;

      // Somativas: falha isolada não impede a geração das ADRs.
      addBigDividerSlide(pptx,ctx,'Avaliações Somativas',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
      try{
        const somMeta=typeof somUnitRelevantBundle==='function'?somUnitRelevantBundle(unit.school):unit.somMeta;
        if(somMeta?.summary?.length&&typeof addSomUnitPresentationSlides==='function'){
          const next=addSomUnitPresentationSlides(pptx,{...ctx,sectionId:'resultados',sectionLabel:'Avaliações Somativas'},slideNumber);
          slideNumber=Number.isFinite(Number(next))?Number(next):slideNumber;
        }else addNoDataUnitSlideV187(pptx,ctx,'Avaliações Somativas','Não há resultados somativos disponíveis para esta unidade na base atual.',slideNumber++);
      }catch(err){
        console.warn('Somativas omitidas no PPT v260',err);
        addNoDataUnitSlideV187(pptx,ctx,'Avaliações Somativas','Os dados somativos não puderam ser incluídos nesta geração. As ADRs foram preservadas.',slideNumber++);
      }

      addBigDividerSlide(pptx,ctx,'Avaliações Formativas · ADRs',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
      try{if(typeof window.GRA_EXP_ENSURE_DATA==='function')await window.GRA_EXP_ENSURE_DATA(true);}catch(err){console.warn('Base individual não carregada para o PPT v284',err);}
      const years=groupYears(unit.adrRows||[]);
      if(!years.length)addNoDataUnitSlideV187(pptx,ctx,'Avaliações Formativas · ADRs','Não há registros de ADR disponíveis para esta unidade na base atual.',slideNumber++);
      else{
        for(const yearBlock of years){
          addBigDividerSlide(pptx,ctx,yearBlock.ano,`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
          if(addEvolutionSlide(pptx,ctx,yearBlock,'adequado',slideNumber))slideNumber++;
          if(addEvolutionSlide(pptx,ctx,yearBlock,'abaixo',slideNumber))slideNumber++;
          for(const component of yearBlock.components){
            const compRows=yearBlock.rows.filter(r=>String(r?.componente||'').trim()===component);
            const adrs=uniq(compRows.map(r=>String(r?.adr||'').trim())).sort((a,b)=>adrNum(a)-adrNum(b));
            for(const adr of adrs){
              try{if(typeof addAdrUnitSkillDeckSlide==='function'&&addAdrUnitSkillDeckSlide(pptx,ctx,unit,component,yearBlock.ano,compRows,adr,slideNumber))slideNumber++;}catch(err){console.warn('Habilidade omitida no PPT v260',component,yearBlock.ano,adr,err);}
              try{if(typeof window.GRA_EXP_ADD_STUDENT_SLIDES==='function')slideNumber=window.GRA_EXP_ADD_STUDENT_SLIDES(pptx,ctx,unit,slideNumber,{year:yearBlock.ano,component,adr});}catch(err){console.warn('Detalhamento individual omitido no PPT v284',component,yearBlock.ano,adr,err);}
            }
          }
        }
      }
      const d=new Date(),stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,filename=`Dashboard_GRA_${safeFile(unit.school)}_Todos_Dados_Avaliacao_${stamp}.pptx`;
      setSlideBusy(true,'Finalizando a apresentação completa…');
      const output=await pptx.write({outputType:'blob',compression:false});
      const blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      if(!blob||!Number(blob.size))throw new Error('O PowerPoint foi criado sem conteúdo.');
      forcePresentationDownload(blob,filename,null);
      slideToast(`Download iniciado: ${filename}`);
    }catch(err){
      console.error('Falha ao gerar PPTX v260',err);
      slideToast(`Não foi possível gerar a apresentação: ${cleanText(err?.message||'erro desconhecido')}`,true);
    }finally{restore();setSlideBusy(false);}
  }

  // O botão chama este roteador diretamente; o dispatcher histórico deixa de participar da geração completa.
  window.GRA_PPT_V259=async function(){
    try{
      const choice=await askSlideExportMode();
      if(!choice)return;
      if(choice==='allEvaluation'||choice==='adrUnitAll'||choice==='combined')return await generateFull();
      return await generatePresentationFromCurrentView('current');
    }catch(err){
      console.error('Falha no roteador PPT v260',err);
      try{slideToast(`Não foi possível iniciar o PowerPoint: ${cleanText(err?.message||'erro desconhecido')}`,true);}catch(_){}
    }
  };
  window.generateAllEvaluationUnitPresentationV259=generateFull;
  window.v260BuildAdrYearSeries=(rows,kind='adequado')=>buildSeries(rows,kind);

  // Versão final.
  const stamp=()=>{document.getElementById('dashboardVersionBadge')?.replaceChildren(document.createTextNode(VERSION));const start=document.querySelector('.gra-start-version');if(start)start.textContent=VERSION;document.querySelectorAll('.exp-badge').forEach(x=>x.textContent=VERSION);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp,{once:true});else stamp();
})();
