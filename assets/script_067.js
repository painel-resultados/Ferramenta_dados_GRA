
(function(){
  'use strict';

  const VERSION='v366';
  const EXTRA_ALIASES=new Set([
    'cn','ciencias da natureza','ciencia da natureza','ciencias','ciencia',
    'historia','his','geografia','geo'
  ]);
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const isExtra=v=>EXTRA_ALIASES.has(norm(v));
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const compColor=comp=>{
    const n=norm(comp);
    if(n==='lp'||n==='lingua portuguesa')return (typeof BLUE!=='undefined'?BLUE:'1C79B8');
    if(n==='mt'||n==='matematica')return (typeof GREEN!=='undefined'?GREEN:'1D8F68');
    if(n==='cn'||n.includes('ciencia'))return 'D9861C';
    if(n==='historia'||n==='his')return '8B5CF6';
    if(n==='geografia'||n==='geo')return '0EA5A4';
    return '64748B';
  };
  const metricShort=series=>series.metricKey==='acerto'?'Acerto Total':series.metricKey==='adequado'?'Adequado':'Abaixo do Básico';
  const componentName=comp=>{
    try{return typeof componentFullName==='function'?componentFullName(comp):String(comp||'');}
    catch(_){return String(comp||'');}
  };
  const adrOrd=value=>{
    try{return typeof adrOrder==='function'?adrOrder(value):Number(String(value||'').match(/\d+/)?.[0]||0);}
    catch(_){return 0;}
  };

  /*
   * Corrige exatamente o motor usado pelo PPT "Todos os dados de avaliação":
   * - no slide principal, LP/MT = % Adequado;
   * - CN/História/Geografia = % Acerto Total;
   * - no slide de Abaixo do Básico, componentes adicionais são excluídos,
   *   em vez de serem desenhados como 0%.
   */
  function addPrimaryMetricYearSlide(pptx,ctx,unit,yearBlock,metricDef,slideNumber){
    const rows=Array.isArray(yearBlock?.rows)?yearBlock.rows:[];
    const adrs=[...new Set(rows.map(r=>String(r?.adr||'').trim()).filter(Boolean))].sort((a,b)=>adrOrd(a)-adrOrd(b));
    if(adrs.length<2)return false;

    const components=(Array.isArray(yearBlock?.components)?yearBlock.components:[]).map(comp=>{
      const extra=isExtra(comp?.component);
      let metricKey=metricDef?.key||'adequado';
      let metricLabel=metricDef?.label||'% Adequado';

      // Somente o slide principal recebe os componentes adicionais.
      if(extra){
        if(metricKey!=='adequado')return null;
        metricKey='acerto';
        metricLabel='% Acerto Total';
      }

      const compRows=Array.isArray(comp?.rows)?comp.rows:[];
      const values=adrs.map(adr=>{
        const rs=compRows.filter(r=>String(r?.adr||'').trim()===adr);
        if(!rs.length)return null;
        try{
          const v=adrWeightAvg(rs,metricKey);
          return finite(v)?Number(v):null;
        }catch(_){return null;}
      });

      if(!values.some(finite))return null;
      return {
        component:comp.component,
        color:compColor(comp.component),
        metricKey,
        metricLabel,
        values
      };
    }).filter(Boolean);

    if(!components.length)return false;

    const mixedPrimary=metricDef?.key==='adequado'&&components.some(s=>s.metricKey==='acerto');
    const slide=pptx.addSlide();
    const extrasInSlide=components.filter(s=>s.metricKey==='acerto');
    const joinPt=items=>items.length<=1?(items[0]||''):items.length===2?`${items[0]} e ${items[1]}`:`${items.slice(0,-1).join(', ')} e ${items.at(-1)}`;
    const extraTitlePhrases=extrasInSlide.map(s=>`% de Acerto Total em ${componentName(s.component)}`);
    const title=mixedPrimary
      ? `${yearBlock.ano} · % Adequado e ${joinPt(extraTitlePhrases)}`
      : `${yearBlock.ano} · ${metricDef.label}`;

    const subtitle=mixedPrimary
      ? `Evolução entre ${adrs[0]} e ${adrs[adrs.length-1]}: Língua Portuguesa e Matemática em % Adequado; ${joinPt(extrasInSlide.map(s=>componentName(s.component)))} em % de Acerto Total.`
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

    // Até 5 componentes cabem em duas linhas de legenda sem sobreposição.
    components.slice(0,5).forEach((series,idx)=>{
      const col=idx%3,row=Math.floor(idx/3);
      const x0=.95+col*4.05,y0=6.02+row*.39;
      slide.addShape('ellipse',{x:x0,y:y0+.04,w:.11,h:.11,line:{color:series.color,transparency:100},fill:{color:series.color}});
      slide.addText(`${componentName(series.component)} · ${metricShort(series)}`,{
        x:x0+.16,y:y0,w:3.55,h:.14,fontFace:'Aptos',fontSize:8.3,bold:true,color:INK,margin:0,fit:'shrink'
      });
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

  window.v252AddAdrUnitYearIndicatorSlide=addPrimaryMetricYearSlide;
  window.v179AddAdrUnitYearIndicatorSlide=addPrimaryMetricYearSlide;
  try{v179AddAdrUnitYearIndicatorSlide=addPrimaryMetricYearSlide;}catch(_){}

  // Mantém todos os motores novos coerentes: componentes adicionais têm uma única série principal, Acerto Total.
  window.v252MetricDefsForComp=function(comp){
    return isExtra(comp)
      ? [{key:'acerto',label:'% Acerto Total',color:compColor(comp)}]
      : [{key:'adequado',label:'% Adequado',color:'1D8F68'},{key:'abaixo',label:'% Abaixo do Básico',color:'B23B3B'}];
  };
  window.v247MetricDefsForComp=window.v252MetricDefsForComp;
  window.v246MetricDefsForComp=window.v252MetricDefsForComp;
  window.v244MetricDefsForComp=window.v252MetricDefsForComp;

  // O gerador alternativo de "Todos os dados" tinha uma chamada inexistente e podia cair no motor histórico.
  // Reaproveita a função estável já existente para a parte somativa e o motor corrigido para ADR.
  async function generateAllEvaluationV252(){
    setSlideBusy(true,'Localizando todos os dados da unidade…');
    await (typeof pptYieldV190==='function'?pptYieldV190():Promise.resolve());

    const unit=await allEvaluationSelectedUnitV190();
    if(!unit){
      setSlideBusy(false);
      slideToast('Selecione uma única escola para gerar todos os dados de avaliação da unidade.',true);
      return;
    }

    const ctx=presentationContext();
    ctx.scopeTitle=unit.school;
    ctx.scopeKind='Escola';
    ctx.school=unit.school;
    ctx.sectionLabel='Todos os dados de avaliação';

    try{
      await ensureLibraries();
      const PptxCtor=window.PptxGenJS||window.pptxgen;
      const pptx=new PptxCtor();
      pptx.layout='LAYOUT_WIDE';
      pptx.author='GRA · SME-Rio';
      pptx.company='Secretaria Municipal de Educação do Rio de Janeiro';
      pptx.subject=`Todos os dados de avaliação · ${unit.school}`;
      pptx.title=`${unit.school} — Todos os dados de avaliação`;
      pptx.lang='pt-BR';
      pptx.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'pt-BR'};

      addCoverSlide(pptx,ctx);
      let slideNumber=2;

      setSlideBusy(true,'Organizando todas as avaliações somativas da unidade…');
      addBigDividerSlide(pptx,ctx,'Avaliações Somativas',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
      let somMeta=null;
      try{somMeta=typeof somUnitRelevantBundle==='function'?somUnitRelevantBundle(unit.school):null;}catch(_){}
      if(somMeta?.summary?.length){
        const somCtx={...ctx,sectionId:'resultados',sectionLabel:'Avaliações Somativas'};
        slideNumber=addSomUnitPresentationSlides(pptx,somCtx,slideNumber);
      }else{
        addNoDataUnitSlideV187(pptx,ctx,'Avaliações Somativas','Não há resultados somativos disponíveis para esta unidade na base atual.',slideNumber++);
      }

      setSlideBusy(true,'Organizando todos os dados das ADRs…');
      addBigDividerSlide(pptx,ctx,'Avaliações Formativas · ADRs',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);

      const years=(typeof v179GroupAdrUnitRowsByYear==='function'?v179GroupAdrUnitRowsByYear(unit.adrRows||[]):[]);
      if(!years.length){
        addNoDataUnitSlideV187(pptx,ctx,'Avaliações Formativas · ADRs','Não há registros de ADR disponíveis para esta unidade na base atual.',slideNumber++);
      }else{
        for(const yearBlock of years){
          addBigDividerSlide(pptx,ctx,yearBlock.ano,`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);

          // Primeiro slide: LP/MT Adequado + componentes adicionais em Acerto Total.
          if(addPrimaryMetricYearSlide(pptx,ctx,unit,yearBlock,{key:'adequado',label:'% Adequado'},slideNumber))slideNumber++;

          // Segundo slide: somente LP/MT em Abaixo do Básico.
          if(addPrimaryMetricYearSlide(pptx,ctx,unit,yearBlock,{key:'abaixo',label:'% Abaixo do Básico'},slideNumber))slideNumber++;

          // Habilidades continuam por componente, sem transformar ciência em proficiência.
          for(const compBlock of yearBlock.components||[]){
            const adrs=[...new Set((compBlock.rows||[]).map(r=>String(r?.adr||'').trim()).filter(Boolean))].sort((a,b)=>adrOrd(a)-adrOrd(b));
            for(const adr of adrs){
              if(typeof addAdrUnitSkillDeckSlide==='function'&&addAdrUnitSkillDeckSlide(pptx,ctx,unit,compBlock.component,yearBlock.ano,compBlock.rows,adr,slideNumber))slideNumber++;
            }
          }
        }
      }

      const d=new Date();
      const stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const filename=`Dashboard_GRA_${safeFile(unit.school)}_Todos_Dados_Avaliacao_${stamp}.pptx`;
      setSlideBusy(true,'Finalizando a apresentação completa…');
      const output=await pptx.write({outputType:'blob',compression:false});
      const blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      forcePresentationDownload(blob,filename,null);
      slideToast(`Download iniciado: ${filename}`);
    }catch(err){
      console.error('Falha ao gerar todos os dados de avaliação v252',err);
      slideToast(`Não foi possível gerar a apresentação completa: ${cleanText(err?.message||'erro desconhecido')}`,true);
    }finally{
      setSlideBusy(false);
    }
  }

  window.generateAllEvaluationUnitPresentationV188=generateAllEvaluationV252;
  try{generateAllEvaluationUnitPresentationV188=generateAllEvaluationV252;}catch(_){}
  if(typeof globalThis!=='undefined')globalThis.generateAllEvaluationUnitPresentationV188=generateAllEvaluationV252;

  // Auditoria exposta para confirmar a regra do relatório sem alterar o motor de prioridade:
  // CN/História/Geografia -> Acerto Total; prioridade -> apenas LP/MT.
  window.v252AdrExtraAudit=function(){
    const rows=Array.isArray(window.ADR_ROWS)?window.ADR_ROWS:(typeof ADR_ROWS!=='undefined'?ADR_ROWS:[]);
    const extras=rows.filter(r=>isExtra(r?.componente));
    const missingAcerto=extras.filter(r=>!finite(r?.acerto));
    const accidentalPriority=extras.filter(r=>['LP','MT'].includes(String(r?.componente||'')));
    return {
      version:VERSION,
      extraRows:extras.length,
      missingAcerto:missingAcerto.length,
      accidentalPriorityRows:accidentalPriority.length,
      reportRule:'Ciências da Natureza, História e Geografia são exibidas por % Acerto Total e não entram em prioridades.'
    };
  };

  function stamp(){
    const badge=document.getElementById('dashboardVersionBadge');
    if(badge&&badge.textContent.trim()!==VERSION)badge.textContent=VERSION;
    document.querySelectorAll('.exp-badge').forEach(x=>{if(x.textContent.trim()!==VERSION)x.textContent=VERSION;});
  }
  const badge=document.getElementById('dashboardVersionBadge');
  if(badge){
    const observer=new MutationObserver(()=>{if(badge.textContent.trim()!==VERSION)badge.textContent=VERSION;});
    observer.observe(badge,{childList:true,characterData:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(stamp,50),{once:true});
  else setTimeout(stamp,50);
})();
