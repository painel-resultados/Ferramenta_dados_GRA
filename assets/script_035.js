
(function(){
  const scienceComponents=new Set(['CN','CH','História','Geografia']);
  const compLabels={LP:'Língua Portuguesa',MT:'Matemática',CN:'Ciências da Natureza',CH:'Ciências Humanas','HISTÓRIA':'História','GEOGRAFIA':'Geografia'};
  window.adrComponentLabel=function(v){const raw=String(v||'').trim(),up=raw.toUpperCase();return compLabels[raw]||compLabels[up]||raw||'Componente';};
  const isScienceComp=v=>scienceComponents.has(String(v||'').trim())||['HISTÓRIA','GEOGRAFIA'].includes(String(v||'').trim().toUpperCase());

  // Parser: mantém códigos compactos internamente e nomenclatura completa na interface.
  window.adrInferComp=function(v,filename=''){
    const raw=String(v||'').trim(),txt=norm(`${raw} ${filename||''}`).toUpperCase();
    if(/(^|\b)(CH|CIEHUM)(\b|$)/.test(txt)||txt.includes('CIENCIAS HUMANAS'))return 'CH';
    if(/(^|\b)(CN|CIENAT)(\b|$)/.test(txt)||txt.includes('CIENCIAS DA NATUREZA'))return 'CN';
    if(txt.includes('HISTORIA'))return 'História';
    if(txt.includes('GEOGRAFIA'))return 'Geografia';
    if(txt.includes('MAT')||/(^|\b)MT(\b|$)/.test(txt))return 'MT';
    if(/(^|\b)LP(\b|$)/.test(txt)||txt.includes('PORT'))return 'LP';
    return raw.toUpperCase()||'Componente não identificado';
  };
  try{adrInferComp=window.adrInferComp;}catch(_){ }

  const oldNormalize=window.adrNormalizeRow||adrNormalizeRow;
  window.adrNormalizeRow=function(raw,sourceName='arquivo',meta={}){
    const r=oldNormalize(raw,sourceName,meta);
    r.componente=meta.componente||window.adrInferComp(adrGet(raw,['Componente Curricular','Componente','Disciplina']),sourceName);
    r.muitoBaixo=adrParseNum(adrGet(raw,['Muito baixo','Muito Baixo']));
    r.baixo=adrParseNum(adrGet(raw,['Baixo']));
    r.medio=adrParseNum(adrGet(raw,['Médio','Medio']));
    r.alto=adrParseNum(adrGet(raw,['Alto']));
    if(isScienceComp(r.componente)){
      // Não inventar equivalência pedagógica: ciências preservam as quatro faixas oficiais.
      r.abaixo=null;r.basico=null;r.adequado=null;
    }
    return r;
  };
  try{adrNormalizeRow=window.adrNormalizeRow;}catch(_){ }

  window.adrMetricLabel=function(key){
    return key==='abaixo'?'% Abaixo do Básico':key==='acerto'?'% Acerto Total':key==='muitoBaixo'?'% Muito baixo':key==='baixo'?'% Baixo':key==='medio'?'% Médio':key==='alto'?'% Alto':'% Adequado';
  };
  try{adrMetricLabel=window.adrMetricLabel;}catch(_){ }
  window.adrLowerIsBetter=function(metric){return ['abaixo','muitoBaixo','baixo'].includes(metric);};
  try{adrLowerIsBetter=window.adrLowerIsBetter;}catch(_){ }

  function metricOptionsFor(comp){
    return isScienceComp(comp)
      ? [{v:'acerto',t:'% Acerto Total'},{v:'muitoBaixo',t:'% Muito baixo'},{v:'baixo',t:'% Baixo'},{v:'medio',t:'% Médio'},{v:'alto',t:'% Alto'}]
      : [{v:'adequado',t:'% Adequado'},{v:'abaixo',t:'% Abaixo do Básico'},{v:'acerto',t:'% Acerto Total'}];
  }
  window.adrUpdateMetricOptionsV243=function(){
    const sel=document.getElementById('adrMetric'),comp=document.getElementById('adrComp')?.value||'';if(!sel)return;
    const old=sel.value,opts=metricOptionsFor(comp);sel.innerHTML=opts.map(o=>`<option value="${o.v}">${o.t}</option>`).join('');sel.value=opts.some(o=>o.v===old)?old:opts[0].v;
    document.getElementById('adrs')?.classList.toggle('v244-science-mode',isScienceComp(comp));
  };

  window.adrRefreshSelectors=function(){
    const anoSel=document.getElementById('adrAno'),compSel=document.getElementById('adrComp'),adrSel=document.getElementById('adrSelect'),creSel=document.getElementById('adrCre'),agenteSel=document.getElementById('adrAgente');
    if(!anoSel||!compSel||!adrSel||!creSel)return;
    const modeSel=document.getElementById('adrMode'),adrModeValue=modeSel?.value||'individual';
    const cur={ano:anoSel.value,comp:compSel.value,adr:adrSel.value,cre:creSel.value,agente:agenteSel?.value||''};
    const anos=adrUnique(ADR_ROWS.map(r=>r.ano)).sort((a,b)=>adrYearOrder(a)-adrYearOrder(b));
    const defaultAno=(cur.ano&&anos.includes(cur.ano))?cur.ano:(anos.includes('2º ano')?'2º ano':anos[0]||'');
    const comps=adrUnique(ADR_ROWS.filter(r=>!defaultAno||r.ano===defaultAno).map(r=>r.componente)).sort((a,b)=>{const ord={LP:1,MT:2,CN:3,CH:4,'História':5,'Geografia':6};return (ord[a]||99)-(ord[b]||99)||String(a).localeCompare(String(b),'pt-BR')});
    const defaultComp=(cur.comp&&comps.includes(cur.comp))?cur.comp:(comps.includes('LP')?'LP':comps[0]||'');
    const relevant=ADR_ROWS.filter(r=>(!defaultAno||r.ano===defaultAno)&&(!defaultComp||r.componente===defaultComp));
    const adrs=adrUnique(relevant.map(r=>r.adr)).sort((a,b)=>adrOrder(a)-adrOrder(b));
    const cres=adrUnique(relevant.map(r=>r.regional)).sort((a,b)=>adrOrder(a)-adrOrder(b));
    const defaultAdr=(cur.adr&&adrs.includes(cur.adr))?cur.adr:(adrs.includes('ADR 1')?'ADR 1':adrs[0]||'');
    const creHadOptions=!!creSel?.options?.length;const defaultCre=(cur.cre&&cres.includes(cur.cre))?cur.cre:((cur.cre===''&&creHadOptions)?'':(cres.includes('CRE 02')?'CRE 02':''));
    const agentAdr=adrModeValue==='progressao'?'':defaultAdr;
    const agentes=adrAgentOptions({ano:defaultAno,componente:defaultComp,adr:agentAdr,cre:defaultCre});
    const regionalScope=Number(document.getElementById('regionalScopeSelect')?.value||0),aggregateLabel=regionalScope===0?'Todas as CREs':'Todos os agentes';
    const currentAllSchools=adrIsAllSchoolsScope(cur.agente),curAgenteCanonical=currentAllSchools?'':adrCanonicalAgentName(cur.agente),defaultAgente=currentAllSchools?ADR_ALL_SCHOOLS_VALUE:((curAgenteCanonical&&agentes.includes(curAgenteCanonical))?curAgenteCanonical:'');
    anoSel.innerHTML=adrOptionHtml(anos,defaultAno);
    compSel.innerHTML=comps.map(v=>`<option value="${esc(v)}" ${v===defaultComp?'selected':''}>${esc(window.adrComponentLabel(v))}</option>`).join('');
    adrSel.innerHTML=adrOptionHtml(adrs,defaultAdr,'Todas as ADRs');creSel.innerHTML=adrOptionHtml(cres,defaultCre,'Todas as CREs');
    if(agenteSel)agenteSel.innerHTML=`<option value="${ADR_ALL_SCHOOLS_VALUE}">Todas as escolas</option>`+adrOptionHtml(agentes,defaultAgente,aggregateLabel);
    anoSel.value=defaultAno;compSel.value=defaultComp;adrSel.value=defaultAdr;creSel.value=defaultCre;if(agenteSel)agenteSel.value=defaultAgente;
    window.adrUpdateMetricOptionsV243();
  };
  try{adrRefreshSelectors=window.adrRefreshSelectors;}catch(_){ }

  window.renderADRPie=function(rows){
    const comp=document.getElementById('adrComp')?.value||'',science=isScienceComp(comp);
    const vals=science
      ? [{categoria:'Muito baixo',key:'muitoBaixo'},{categoria:'Baixo',key:'baixo'},{categoria:'Médio',key:'medio'},{categoria:'Alto',key:'alto'}]
      : [{categoria:'Abaixo do Básico',key:'abaixo'},{categoria:'Básico',key:'basico'},{categoria:'Adequado',key:'adequado'}];
    const items=vals.map(v=>({categoria:v.categoria,total:adrWeightAvg(rows,v.key)||0}));const total=items.reduce((a,b)=>a+b.total,0)||100;
    const normalized=items.map(v=>({categoria:v.categoria,total:Number(v.total.toFixed(1)),percentual:v.total/total}));
    const title=document.querySelector('#adrPie')?.closest('.card')?.querySelector('.panel-title h3'),sub=document.querySelector('#adrPie')?.closest('.card')?.querySelector('.panel-title p');
    if(title)title.textContent=science?'Distribuição por faixa':'Distribuição por nível';
    if(sub)sub.textContent=science?'Muito baixo, Baixo, Médio e Alto no recorte filtrado.':'Abaixo do básico, Básico e Adequado no recorte filtrado.';
    document.getElementById('adrPie').innerHTML='<div class="donut-center"><b>100%</b><span>'+(science?'faixas':'níveis')+'</span></div>';
    renderDonut('adrPie','adrPieLegend',normalized,total,science?()=>{}:(categoria)=>adrOpenLevelDrawer(categoria,rows));
  };
  try{renderADRPie=window.renderADRPie;}catch(_){ }

  window.renderADRTable=function(rows){
    const metric=document.getElementById('adrMetric').value,comp=document.getElementById('adrComp')?.value||'',science=isScienceComp(comp);const sorted=rows.slice().sort((a,b)=>adrMetricSort(a[metric],b[metric],metric));
    document.getElementById('adrCount').textContent=`${sorted.length} registros exibidos.`;
    const mapped=sorted.map(r=>({adr:r.adr,ano:r.ano,componente:window.adrComponentLabel(r.componente),regional:r.regional,escola:r.escola,agente:adrRowAgent(r)||'—',territorio:adrRowTerritorio(r)||'—',previstos:Math.round(r.previstos||0).toLocaleString('pt-BR'),avaliados:Math.round(r.avaliados||0).toLocaleString('pt-BR'),avaliadosPct:fmtPctValue(r.avaliadosPct,1),abaixo:fmtPctValue(r.abaixo,1),basico:fmtPctValue(r.basico,1),adequado:fmtPctValue(r.adequado,1),muitoBaixo:fmtPctValue(r.muitoBaixo,1),baixo:fmtPctValue(r.baixo,1),medio:fmtPctValue(r.medio,1),alto:fmtPctValue(r.alto,1),acerto:fmtPctValue(r.acerto,1)}));
    const cols=science?[['adr','ADR'],['ano','Ano/Segmento'],['componente','Comp.'],['regional','CRE'],['escola','Escola'],['agente','Agente'],['territorio','Terr.'],['avaliados','Avaliados'],['avaliadosPct','Part.'],['muitoBaixo','Muito baixo'],['baixo','Baixo'],['medio','Médio'],['alto','Alto'],['acerto','Acerto']]:[['adr','ADR'],['ano','Ano/Segmento'],['componente','Comp.'],['regional','CRE'],['escola','Escola'],['agente','Agente'],['territorio','Terr.'],['avaliados','Avaliados'],['avaliadosPct','Part.'],['abaixo','Abaixo'],['basico','Básico'],['adequado','Adequado'],['acerto','Acerto']];
    table('adrTable',mapped,cols);
  };
  try{renderADRTable=window.renderADRTable;}catch(_){ }

  const oldUpdateUX=adrUpdateFilterUX;
  window.adrUpdateFilterUX=function(){oldUpdateUX();const comp=document.getElementById('adrComp')?.value||'';document.querySelectorAll('#adrFilterContext .ctx-chip').forEach(chip=>{if(chip.textContent.includes(` · ${comp}`))chip.textContent=chip.textContent.replace(comp,window.adrComponentLabel(comp));});};
  try{adrUpdateFilterUX=window.adrUpdateFilterUX;}catch(_){ }

  const oldRender=renderADRs;
  window.renderADRs=function(){window.adrUpdateMetricOptionsV243();oldRender();const comp=document.getElementById('adrComp')?.value||'',chip=document.getElementById('adrScopeChip');if(chip)chip.textContent=chip.textContent.replace(` · ${comp}`,` · ${window.adrComponentLabel(comp)}`);};
  try{renderADRs=window.renderADRs;}catch(_){ }

  // Upload manual também oferece os novos componentes.
  const up=document.getElementById('adrUploadComp');if(up&&!up.querySelector('option[value="CN"]'))up.insertAdjacentHTML('beforeend','<option value="CN">Ciências da Natureza</option><option value="CH">Ciências Humanas</option><option value="História">História</option><option value="Geografia">Geografia</option>');

  // PPTs completos: 5º/9º deixam de ser excluídos. Ciências entram como dados, nunca como prioridade.
  window.componentFullName=function(c){return window.adrComponentLabel(c);};try{componentFullName=window.componentFullName;}catch(_){ }
  window.v179GroupAdrUnitRowsByYear=function(rows){
    const ord={LP:1,MT:2,CN:3,CH:4,'História':5,'Geografia':6};
    const years=unique((rows||[]).map(r=>cleanText(r.ano))).sort((a,b)=>adrYearOrder(a)-adrYearOrder(b));
    return years.map(ano=>{const yearRows=(rows||[]).filter(r=>cleanText(r.ano)===ano);const comps=unique(yearRows.map(r=>cleanText(r.componente))).sort((a,b)=>(ord[a]||99)-(ord[b]||99)||String(a).localeCompare(String(b),'pt-BR'));return {ano,rows:yearRows,components:comps.map(component=>({component,rows:yearRows.filter(r=>cleanText(r.componente)===component)}))};});
  };
  try{v179GroupAdrUnitRowsByYear=window.v179GroupAdrUnitRowsByYear;}catch(_){ }

  // Métricas do PPT completo por componente. LP/MT preservam Adequado/Abaixo; ciências usam as faixas oficiais.
  window.v244MetricDefsForComp=function(comp){return isScienceComp(comp)?[
    {key:'acerto',label:'% Acerto Total',color:'1C79B8'},{key:'muitoBaixo',label:'% Muito baixo',color:'B23B3B'},{key:'baixo',label:'% Baixo',color:'D9861C'},{key:'medio',label:'% Médio',color:'7C8DA0'},{key:'alto',label:'% Alto',color:'1D8F68'}
  ]:[{key:'adequado',label:'% Adequado',color:'1D8F68'},{key:'abaixo',label:'% Abaixo do Básico',color:'B23B3B'}];};

  // O gerador de métricas da unidade é substituído para não misturar escalas entre componentes.
  window.addAdrUnitMetricDeckSlide=function(pptx,ctx,unit,comp,ano,rows,slideNumber){
    const adrs=unique(rows.map(r=>cleanText(r.adr))).sort((a,b)=>adrOrder(a)-adrOrder(b));if(!adrs.length)return false;
    const defs=window.v244MetricDefsForComp(comp),series=defs.map(def=>({def,values:adrs.map(adr=>{const rs=rows.filter(r=>cleanText(r.adr)===adr);return rs.length?adrWeightAvg(rs,def.key):null;})})).filter(s=>s.values.some(v=>Number.isFinite(Number(v))));if(!series.length)return false;
    const slide=pptx.addSlide();addHeader(slide,ctx,`${componentFullName(comp)} · ${ano}`,(adrs.length>1?'Evolução por indicador disponível nas ADRs.':'Resultado da ADR disponível, preservando a escala oficial do componente.'),slideNumber);
    const chart={x:.78,y:1.45,w:11.78,h:3.85};slide.addShape('roundRect',{x:chart.x,y:chart.y,w:chart.w,h:chart.h,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});const plot={x:chart.x+.72,y:chart.y+.42,w:chart.w-1.05,h:chart.h-.88};
    for(let t=0;t<=4;t++){const yy=plot.y+plot.h*t/4;slide.addShape('line',{x:plot.x,y:yy,w:plot.w,h:0,line:{color:'E6EDF3',width:.75}});slide.addText(`${100-t*25}%`,{x:chart.x+.1,y:yy-.07,w:.48,h:.12,fontFace:'Aptos',fontSize:7.2,color:MUTED,align:'right',margin:0});}
    const x=i=>plot.x+(adrs.length===1?plot.w/2:plot.w*i/(adrs.length-1)),y=v=>plot.y+plot.h*(1-Math.max(0,Math.min(100,Number(v)))/100);
    series.forEach(s=>{for(let i=0;i<adrs.length-1;i++){const a=s.values[i],b=s.values[i+1];if(Number.isFinite(Number(a))&&Number.isFinite(Number(b)))pptSafeLineSegmentV226(slide,x(i),y(a),x(i+1),y(b),{color:s.def.color,width:3});}s.values.forEach((v,i)=>{if(!Number.isFinite(Number(v)))return;slide.addShape('ellipse',{x:x(i)-.055,y:y(v)-.055,w:.11,h:.11,line:{color:WHITE,width:1},fill:{color:s.def.color}});slide.addText(slidePct(v),{x:x(i)-.42,y:y(v)-.32,w:.84,h:.12,fontFace:'Aptos',fontSize:7.8,bold:true,color:NAVY,align:'center',margin:0,fit:'shrink'});});});
    adrs.forEach((adr,i)=>slide.addText(adr,{x:x(i)-.45,y:chart.y+chart.h-.32,w:.9,h:.13,fontFace:'Aptos',fontSize:8.5,bold:true,color:MUTED,align:'center',margin:0}));
    series.slice(0,5).forEach((s,idx)=>{const x0=.9+(idx%3)*4.0,y0=5.52+Math.floor(idx/3)*.35;slide.addShape('ellipse',{x:x0,y:y0+.015,w:.09,h:.09,line:{color:s.def.color,transparency:100},fill:{color:s.def.color}});slide.addText(s.def.label,{x:x0+.14,y:y0,w:3.35,h:.13,fontFace:'Aptos',fontSize:8.2,bold:true,color:INK,margin:0,fit:'shrink'});});
    const latest=adrs.at(-1),latestRows=rows.filter(r=>cleanText(r.adr)===latest);series.slice(0,5).forEach((s,idx)=>{const col=idx%3,row=Math.floor(idx/3),x0=.78+col*4.03,y0=6.05+row*.45;slide.addText(`${s.def.label}: ${slidePct(latestRows.length?adrWeightAvg(latestRows,s.def.key):NaN)}`,{x:x0,y:y0,w:3.7,h:.18,fontFace:'Aptos',fontSize:9,bold:true,color:s.def.color,margin:0,fit:'shrink'});});
    return true;
  };
  try{addAdrUnitMetricDeckSlide=window.addAdrUnitMetricDeckSlide;}catch(_){ }

  // Full ADR deck, now all years/components.
  window.generateAdrUnitFullPresentation=async function(){
    const unit=adrSelectedUnitForFullDeck();if(!unit){slideToast('Selecione uma única escola na aba ADRs para gerar todos os dados da unidade.',true);return;}const ctx=presentationContext();ctx.scopeTitle=unit.school;ctx.scopeKind='Escola';ctx.school=unit.school;setSlideBusy(true,'Montando apresentação completa de ADR da unidade…');
    try{await ensureLibraries();const PptxCtor=window.PptxGenJS||window.pptxgen,pptx=new PptxCtor();pptx.layout='LAYOUT_WIDE';pptx.author='GRA · SME-Rio';pptx.company='Secretaria Municipal de Educação do Rio de Janeiro';pptx.subject=`ADRs · ${unit.school}`;pptx.title=`${unit.school} — Todos os dados de ADR`;pptx.lang='pt-BR';pptx.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'pt-BR'};addCoverSlide(pptx,ctx);let slideNumber=2;
      for(const group of groupAdrUnitRows(unit.rows)){addBigDividerSlide(pptx,ctx,componentFullName(group.component),`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);for(const yr of group.years){setSlideBusy(true,`Preparando ${componentFullName(group.component)} · ${yr.ano}…`);if(addAdrUnitMetricDeckSlide(pptx,ctx,unit,group.component,yr.ano,yr.rows,slideNumber))slideNumber++;for(const adr of unique(yr.rows.map(r=>cleanText(r.adr))).sort((a,b)=>adrOrder(a)-adrOrder(b))){if(addAdrUnitSkillDeckSlide(pptx,ctx,unit,group.component,yr.ano,yr.rows,adr,slideNumber))slideNumber++;}}}
      const d=new Date(),stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,filename=`Dashboard_GRA_${safeFile(unit.school)}_Todos_Dados_ADR_${stamp}.pptx`;setSlideBusy(true,'Finalizando e iniciando o download…');const output=await pptx.write({outputType:'blob',compression:true}),blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});forcePresentationDownload(blob,filename,null);slideToast(`Download iniciado: ${filename}`);
    }catch(err){console.error('Falha ao gerar PPTX completo de ADR',err);slideToast(`Não foi possível gerar os slides: ${cleanText(err?.message||'erro desconhecido')}`,true);}finally{setSlideBusy(false);}
  };
  try{generateAdrUnitFullPresentation=window.generateAdrUnitFullPresentation;}catch(_){ }

  // All-evaluation deck uses same updated grouping/metric engine.
  const oldAllEval=typeof window.generateAllEvaluationUnitPresentationV188==='function'?window.generateAllEvaluationUnitPresentationV188:null;
  window.generateAllEvaluationUnitPresentationV188=async function(){
    const unit=await allEvaluationSelectedUnitV190();if(!unit){slideToast('Selecione uma única escola para gerar todos os dados de avaliação.',true);return;}const ctx=presentationContext();ctx.scopeTitle=unit.school;ctx.scopeKind='Escola';ctx.school=unit.school;setSlideBusy(true,'Organizando todos os dados de avaliação…');
    try{await ensureLibraries();const PptxCtor=window.PptxGenJS||window.pptxgen,pptx=new PptxCtor();pptx.layout='LAYOUT_WIDE';pptx.author='GRA · SME-Rio';pptx.company='Secretaria Municipal de Educação do Rio de Janeiro';pptx.subject=`Todos os dados de avaliação · ${unit.school}`;pptx.title=`${unit.school} — Todos os dados de avaliação`;pptx.lang='pt-BR';pptx.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'pt-BR'};addCoverSlide(pptx,ctx);let slideNumber=2;
      const somMeta=collectSomUnitAllData(unit.school,unit.cre);addBigDividerSlide(pptx,ctx,'Avaliações Somativas',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);if(somMeta?.summary?.length){slideNumber=addSomUnitPresentationSlides(pptx,{...ctx,sectionId:'resultados',sectionLabel:'Avaliações Somativas'},slideNumber);}else addNoDataUnitSlideV187(pptx,ctx,'Avaliações Somativas','Não há resultados somativos disponíveis para esta unidade na base atual.',slideNumber++);
      addBigDividerSlide(pptx,ctx,'Avaliações Formativas · ADRs',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);const groups=groupAdrUnitRows(unit.adrRows||[]);if(!groups.length)addNoDataUnitSlideV187(pptx,ctx,'Avaliações Formativas · ADRs','Não há registros de ADR disponíveis para esta unidade na base atual.',slideNumber++);else for(const group of groups){addBigDividerSlide(pptx,ctx,componentFullName(group.component),`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);for(const yr of group.years){if(addAdrUnitMetricDeckSlide(pptx,ctx,unit,group.component,yr.ano,yr.rows,slideNumber))slideNumber++;for(const adr of unique(yr.rows.map(r=>cleanText(r.adr))).sort((a,b)=>adrOrder(a)-adrOrder(b))){if(addAdrUnitSkillDeckSlide(pptx,ctx,unit,group.component,yr.ano,yr.rows,adr,slideNumber))slideNumber++;}}}
      const d=new Date(),stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,filename=`Dashboard_GRA_${safeFile(unit.school)}_Todos_Dados_Avaliacao_${stamp}.pptx`;setSlideBusy(true,'Finalizando e iniciando o download…');const output=await pptx.write({outputType:'blob',compression:false}),blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});forcePresentationDownload(blob,filename,null);slideToast(`Download iniciado: ${filename}`);
    }catch(err){console.error('Falha ao gerar PPTX completo de avaliação',err);if(typeof oldAllEval==='function')return oldAllEval();slideToast(`Não foi possível gerar os slides: ${cleanText(err?.message||'erro desconhecido')}`,true);}finally{setSlideBusy(false);}
  };
  try{generateAllEvaluationUnitPresentationV188=window.generateAllEvaluationUnitPresentationV188;}catch(_){ }

  // Report priority safety: science rows can never enter managerial priority evidence.
  if(typeof schoolMetrics==='function'){
    const oldSchoolMetrics=schoolMetrics;window.schoolMetrics=function(adrSource,somSource){return oldSchoolMetrics((adrSource||[]).filter(r=>['LP','MT'].includes(r.componente)),somSource);};try{schoolMetrics=window.schoolMetrics;}catch(_){ }
  }

  // Initialize labels/metrics after all historical scripts are loaded.
  setTimeout(()=>{try{adrRefreshSelectors();renderADRs();}catch(err){console.warn('v244 ADR init',err)}},0);
})();
