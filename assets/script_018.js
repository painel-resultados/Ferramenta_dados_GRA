
/* v179: aprimora o PPT de ADR da unidade — slides de evolução por indicador com linhas por componente; habilidades apenas da ADR mais recente; descrições oficiais priorizadas e cards ampliados. */
(function(){
  function v179CompOrder(comp){const order={LP:1,MT:2,CN:3,CH:4};return order[String(comp||'').toUpperCase()]||99;}
  function v179YearOrder(year){const m=String(year||'').match(/\d+/);return m?Number(m[0]):99;}
  function v179Color(comp){const map={LP:(typeof BLUE!=='undefined'?BLUE:'1C79B8'),MT:(typeof GREEN!=='undefined'?GREEN:'27956C'),CN:'D9861C',CH:'8B5CF6'};return map[String(comp||'').toUpperCase()]||'64748B';}
  function v179IndicatorDefs(){return [
    {key:'adequado',label:'% Adequado',color:(typeof GREEN!=='undefined'?GREEN:'27956C')},
    {key:'abaixo',label:'% Abaixo do Básico',color:'B23B3B'}
  ];}
  function groupAdrUnitRowsByYear(rows){
    const years=(typeof unique==='function'?unique(rows.map(r=>cleanText(r.ano))):[...new Set(rows.map(r=>cleanText(r.ano)))]).sort((a,b)=>v179YearOrder(a)-v179YearOrder(b));
    return years.map(ano=>{
      const yearRows=rows.filter(r=>cleanText(r.ano)===ano);
      const comps=(typeof unique==='function'?unique(yearRows.map(r=>cleanText(r.componente))):[...new Set(yearRows.map(r=>cleanText(r.componente)))]).sort((a,b)=>v179CompOrder(a)-v179CompOrder(b)||String(a).localeCompare(String(b),'pt-BR'));
      return {ano,rows:yearRows,components:comps.map(comp=>({component:comp,rows:yearRows.filter(r=>cleanText(r.componente)===comp)}))};
    });
  }
  function addAdrUnitYearIndicatorSlide(pptx,ctx,unit,yearBlock,metricDef,slideNumber){
    const adrs=unique(yearBlock.rows.map(r=>cleanText(r.adr))).sort((a,b)=>adrOrder(a)-adrOrder(b));
    if(adrs.length<2)return false;
    const normComp=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
    const extraComp=v=>['cn','ciencias da natureza','ciencia da natureza','ciencias','ciencia','historia','his','geografia','geo'].includes(normComp(v));
    const seriesColor=comp=>{
      const n=normComp(comp);
      if(n==='lp'||n==='lingua portuguesa')return BLUE;
      if(n==='mt'||n==='matematica')return GREEN;
      if(n==='cn'||n.includes('ciencia'))return 'D9861C';
      if(n==='historia'||n==='his')return '8B5CF6';
      if(n==='geografia'||n==='geo')return '0EA5A4';
      return v179Color(comp);
    };
    const components=yearBlock.components.map(comp=>{
      const extra=extraComp(comp.component);
      // Componentes adicionais não têm Abaixo do Básico. No slide principal usam Acerto Total.
      if(extra&&metricDef.key==='abaixo')return null;
      const metricKey=extra?'acerto':metricDef.key;
      const values=adrs.map(adr=>{
        const rs=comp.rows.filter(r=>cleanText(r.adr)===adr);
        return rs.length?adrWeightAvg(rs,metricKey):null;
      });
      if(!values.some(v=>Number.isFinite(Number(v))))return null;
      return {
        component:comp.component,
        color:seriesColor(comp.component),
        metricKey,
        metricLabel:metricKey==='acerto'?'% Acerto Total':metricDef.label,
        values
      };
    }).filter(Boolean);
    if(!components.length)return false;

    const slide=pptx.addSlide();
    const extras=components.filter(s=>s.metricKey==='acerto');
    const joinPt=items=>items.length<=1?(items[0]||''):items.length===2?`${items[0]} e ${items[1]}`:`${items.slice(0,-1).join(', ')} e ${items.at(-1)}`;
    const extraTitlePhrases=extras.map(s=>`% de Acerto Total em ${componentFullName(s.component)}`);
    const title=(metricDef.key==='adequado'&&extraTitlePhrases.length)
      ? `${yearBlock.ano} · % Adequado e ${joinPt(extraTitlePhrases)}`
      : `${yearBlock.ano} · ${metricDef.label}`;
    const subtitle=(metricDef.key==='adequado'&&extras.length)
      ? `Evolução entre ${adrs[0]} e ${adrs[adrs.length-1]}: Língua Portuguesa e Matemática em % Adequado; ${joinPt(extras.map(s=>componentFullName(s.component)))} em % de Acerto Total.`
      : `Evolução entre ${adrs[0]} e ${adrs[adrs.length-1]} na unidade, comparando ${components.map(s=>componentFullName(s.component)).join(' e ')}.`;
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
        if(!Number.isFinite(Number(a))||!Number.isFinite(Number(b)))continue;
        pptSafeLineSegmentV226(slide,x(i),y(a),x(i+1),y(b),{color:series.color,width:3.2});
      }
      series.values.forEach((v,i)=>{
        if(!Number.isFinite(Number(v)))return;
        slide.addShape('ellipse',{x:x(i)-.07,y:y(v)-.07,w:.14,h:.14,line:{color:WHITE,width:1.1},fill:{color:series.color}});
        slide.addText(slidePct(v),{x:x(i)-.48,y:y(v)-.34,w:.96,h:.14,fontFace:'Aptos Display',fontSize:9.4,bold:true,color:NAVY,align:'center',margin:0,fit:'shrink'});
      });
    });
    adrs.forEach((adr,i)=>slide.addText(adr,{x:x(i)-.52,y:chart.y+chart.h-.34,w:1.04,h:.14,fontFace:'Aptos',fontSize:9,bold:true,color:MUTED,align:'center',margin:0,fit:'shrink'}));

    // Legenda explicita qual métrica cada disciplina usa.
    components.slice(0,5).forEach((series,idx)=>{
      const col=idx%3,row=Math.floor(idx/3);
      const x0=.95+col*4.05,y0=6.02+row*.39;
      slide.addShape('ellipse',{x:x0,y:y0+.04,w:.11,h:.11,line:{color:series.color,transparency:100},fill:{color:series.color}});
      slide.addText(`${componentFullName(series.component)} · ${series.metricKey==='acerto'?'Acerto Total':series.metricKey==='adequado'?'Adequado':'Abaixo do Básico'}`,{x:x0+.16,y:y0,w:3.55,h:.14,fontFace:'Aptos',fontSize:8.3,bold:true,color:INK,margin:0,fit:'shrink'});
      const first=series.values[0],last=series.values[series.values.length-1];
      if(Number.isFinite(Number(first))&&Number.isFinite(Number(last))){
        const delta=Number(last)-Number(first);
        const favorable=series.metricKey==='abaixo'?delta<=0:delta>=0;
        slide.addText(`${slidePct(first)} → ${slidePct(last)} · ${delta>=0?'+':''}${slidePct(delta)}`,{x:x0+.16,y:y0+.18,w:3.55,h:.14,fontFace:'Aptos',fontSize:7.7,color:favorable?GREEN_DARK:'9B2F2F',margin:0,fit:'shrink'});
      }
    });
    return true;
  }
  
  function addAdrUnitSkillDeckSlide(pptx,ctx,unit,comp,ano,rows,slideNumber){
    const adrs=(typeof unique==='function'?unique(rows.map(r=>cleanText(r.adr))):[...new Set(rows.map(r=>cleanText(r.adr)))]).sort((a,b)=>adrOrder(a)-adrOrder(b));
    const latestAdr=adrs.at(-1);
    const adrRows=rows.filter(r=>cleanText(r.adr)===latestAdr);
    let skills=(typeof collectAdrSkillGroupsFromRows==='function'?collectAdrSkillGroupsFromRows(adrRows,{limit:5,includeAdr:false}):[]).slice(0,5);
    skills=skills.map(item=>{
      const info=adrSkillDisplay(item.codigo||item.code,ano,comp,latestAdr,false);
      const desc=cleanText(info?.desc||item.description||'');
      return {...item,description:desc||item.description||'Descrição pedagógica indisponível nesta versão.'};
    }).filter(item=>item.description);
    if(!skills.length)return false;
    const slide=pptx.addSlide();
    addHeader(slide,ctx,`${componentFullName(comp)} · ${ano} · ${latestAdr}`,`Cinco habilidades mais desafiadoras na avaliação mais recente da unidade, com descrições oficiais da matriz ADR.`,slideNumber);
    slide.addText('Foram mantidas apenas as habilidades com menor percentual de acerto para ampliar a leitura e evitar excesso de informação.',{x:.86,y:1.4,w:11.5,h:.16,fontFace:'Aptos',fontSize:8.2,color:MUTED,margin:0,fit:'shrink'});
    skills.forEach((item,idx)=>{
      const x=.78,y=1.72+idx*1.0,w=11.82,h=.86;
      slide.addShape('roundRect',{x,y,w,h,rectRadius:.06,line:{color:BORDER,width:.9},fill:{color:WHITE}});
      slide.addText(item.code,{x:x+.22,y:y+.12,w:1.65,h:.16,fontFace:'Aptos',fontSize:9.8,bold:true,color:GREEN_DARK,margin:0,fit:'shrink'});
      slide.addText(item.valueLabel||slidePct(item.value),{x:x+w-1.05,y:y+.11,w:.82,h:.16,fontFace:'Aptos Display',fontSize:13.2,bold:true,color:NAVY,align:'right',margin:0,fit:'shrink'});
      slide.addText(item.description,{x:x+.22,y:y+.31,w:w-.44,h:.24,fontFace:'Aptos',fontSize:8.8,color:INK,margin:0,fit:'shrink'});
      drawMiniBar(slide,{x:x+.22,y:y+.64,w:w-.44,h:.09,value:item.value,max:100,color:v179Color(comp),fontSize:8});
    });
    return true;
  }
  async function generateAdrUnitFullPresentation(){
    const unit=adrSelectedUnitForFullDeck();
    if(!unit){slideToast('Selecione uma única escola na aba ADRs para gerar todos os dados da unidade.',true);return;}
    const ctx=presentationContext();
    ctx.scopeTitle=unit.school;ctx.scopeKind='Escola';ctx.school=unit.school;
    setSlideBusy(true,'Montando apresentação completa de ADR da unidade…');
    try{
      await ensureLibraries();
      const PptxCtor=window.PptxGenJS||window.pptxgen;
      const pptx=new PptxCtor();
      pptx.layout='LAYOUT_WIDE';pptx.author='GRA · SME-Rio';pptx.company='Secretaria Municipal de Educação do Rio de Janeiro';pptx.subject=`ADRs · ${unit.school}`;pptx.title=`${unit.school} — Todos os dados de ADR`;pptx.lang='pt-BR';pptx.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'pt-BR'};
      addCoverSlide(pptx,ctx);
      let slideNumber=2;
      const years=groupAdrUnitRowsByYear(unit.rows);
      years.forEach(yearBlock=>{
        addBigDividerSlide(pptx,ctx,yearBlock.ano,`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
        v179IndicatorDefs().forEach(def=>{if(addAdrUnitYearIndicatorSlide(pptx,ctx,unit,yearBlock,def,slideNumber))slideNumber++;});
        yearBlock.components.forEach(compBlock=>{
          addBigDividerSlide(pptx,ctx,componentFullName(compBlock.component),`${yearBlock.ano} · ${unit.school}`,slideNumber++);
          if(addAdrUnitSkillDeckSlide(pptx,ctx,unit,compBlock.component,yearBlock.ano,compBlock.rows,slideNumber))slideNumber++;
        });
      });
      const date=new Date();const stamp=`${String(date.getFullYear())}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
      const filename=`Dashboard_GRA_${safeFile(unit.school)}_Todos_Dados_ADR_${stamp}.pptx`;
      setSlideBusy(true,'Finalizando e iniciando o download…');
      const output=await pptx.write({outputType:'blob',compression:true});
      const blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      forcePresentationDownload(blob,filename,null);slideToast(`Download iniciado: ${filename}`);
    }catch(err){console.error('Falha ao gerar PPTX completo de ADR',err);slideToast(`Não foi possível gerar os slides: ${cleanText(err?.message||'erro desconhecido')}`,true);}finally{setSlideBusy(false);}
  }
  window.generateAdrUnitFullPresentation=generateAdrUnitFullPresentation;
  try{generateAdrUnitFullPresentation=window.generateAdrUnitFullPresentation;}catch(_){ }
  if(typeof globalThis!=='undefined')globalThis.generateAdrUnitFullPresentation=window.generateAdrUnitFullPresentation;
})();
