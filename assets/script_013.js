
(function(){
  'use strict';

  const PPTX_CDNS=[
    'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js',
    'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js',
    'https://unpkg.com/pptxgenjs@4.0.1/dist/pptxgen.bundle.js'
  ];
  const H2C_CDNS=[
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
  ];
  const NAVY='12385D', BLUE='1C79B8', GREEN='16865F', GREEN_DARK='0F6748';
  const BG='F4F8FB', BORDER='D9E5EF', MUTED='65758B', INK='1F3448', WHITE='FFFFFF';
  let loadingPromise=null;

  function slideToast(message,error=false){
    let el=document.getElementById('slideExportToast');
    if(!el){
      el=document.createElement('div');
      el.id='slideExportToast';
      el.className='slide-export-toast';
      document.body.appendChild(el);
    }
    el.textContent=message;
    el.classList.toggle('error',!!error);
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer=setTimeout(()=>el.classList.remove('show'),4200);
  }

  function setSlideBusy(open,message='Preparando a apresentação…'){
    let overlay=document.getElementById('slideExportOverlay');
    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='slideExportOverlay';
      overlay.className='slide-export-overlay';
      overlay.innerHTML='<div class="slide-export-dialog"><div class="slide-export-spinner"></div><strong>Gerando slides</strong><span id="slideExportProgress">Preparando a apresentação…</span></div>';
      document.body.appendChild(overlay);
    }
    const progress=document.getElementById('slideExportProgress');
    if(progress)progress.textContent=message;
    overlay.classList.toggle('open',!!open);
    const btn=document.getElementById('slideExportBtn');
    if(btn){
      btn.disabled=!!open;
      btn.setAttribute('aria-busy',open?'true':'false');
    }
  }

  function loadOne(url){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===url);
      if(existing){
        if(existing.dataset.loaded==='1')return resolve();
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=url;
      script.async=true;
      script.crossOrigin='anonymous';
      script.onload=()=>{script.dataset.loaded='1';resolve();};
      script.onerror=()=>reject(new Error('Falha ao carregar '+url));
      document.head.appendChild(script);
    });
  }

  async function loadFallback(urls,test){
    if(test())return;
    let lastError=null;
    for(const url of urls){
      try{
        await loadOne(url);
        if(test())return;
      }catch(err){lastError=err;}
    }
    throw lastError||new Error('Biblioteca indisponível');
  }

  function ensureLibraries(){
    const hasPptx=typeof (window.PptxGenJS||window.pptxgen)==='function';
    if(hasPptx)return Promise.resolve();
    if(!loadingPromise){
      loadingPromise=(async()=>{
        await loadFallback(PPTX_CDNS,()=>typeof (window.PptxGenJS||window.pptxgen)==='function');
      })().catch(err=>{loadingPromise=null;throw err;});
    }
    return loadingPromise;
  }

  function cleanText(value){
    return String(value||'').replace(/\s+/g,' ').trim();
  }
  function safeFile(value){
    return cleanText(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)||'recorte';
  }
  function isVisible(el){
    if(!el||el.hidden)return false;
    const style=getComputedStyle(el);
    return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>0&&el.getBoundingClientRect().width>0;
  }
  function selectedText(id){
    const el=document.getElementById(id);
    if(!el)return '';
    return cleanText(el.selectedOptions?.[0]?.textContent||el.value);
  }
  function unique(values){return [...new Set(values.filter(Boolean))];}

  function selectedSchoolForSection(sectionId){
    try{
      if(sectionId==='resultados'){
        const q=cleanText(document.getElementById('somSearch')?.value);
        if(q&&typeof somFilteredRows==='function'){
          const schools=unique(somFilteredRows().map(r=>cleanText(r.escola)));
          if(schools.length===1)return schools[0];
        }
      }
      if(sectionId==='adrs'){
        const q=cleanText(document.getElementById('adrSearch')?.value);
        if(q&&typeof adrFilteredRows==='function'){
          const schools=unique(adrFilteredRows().map(r=>cleanText(r.escola)));
          if(schools.length===1)return schools[0];
        }
      }
      if(sectionId==='georreferenciamento'){
        const geoState=(typeof GEO_STATE!=='undefined'?GEO_STATE:window.GEO_STATE);
        const geoPoints=(typeof GEO_POINTS!=='undefined'?GEO_POINTS:window.GEO_POINTS);
        const focused=cleanText(geoState?.focusedSchool);
        if(focused)return focused;
        const q=cleanText(document.getElementById('geoSearch')?.value);
        if(q&&Array.isArray(geoPoints)){
          const matches=geoPoints.filter(p=>cleanText(p.name).toLocaleLowerCase('pt-BR').includes(q.toLocaleLowerCase('pt-BR')));
          if(matches.length===1)return cleanText(matches[0].name);
        }
      }
      const drawer=document.getElementById('detailDrawer');
      if(drawer?.classList.contains('open')){
        const title=cleanText(drawer.querySelector('h3')?.textContent);
        if(title)return title;
      }
    }catch(err){console.warn('Não foi possível inferir a escola selecionada',err);}
    return '';
  }

  function activeSectionLabel(active){
    const button=active?document.querySelector(`.nav button[data-section="${active.id}"]`):null;
    const label=cleanText(button?.textContent).replace(/[⌂◆◌▦⌕★＋✓⌖]/g,'').trim();
    return label||cleanText(document.querySelector('.title h2')?.textContent)||'Análise atual';
  }

  function contextFilters(sectionId){
    const idsBySection={
      resultados:['somMode','somModalidade','somAnoEscolar','somComponente','somEdicao','somMetric','somAgente','somPriority'],
      adrs:['adrMode','adrAno','adrComp','adrSelect','adrMetric','adrAgente','adrPriority'],
      georreferenciamento:['geoEvalSegment','geoAdrView','geoEvalComponent','geoEvalIndicator','geoPriority','geoGet','geoAgent'],
      banco:['filterSegmento','filterPlano','filterGet','filterIntegral','filterPrioridade']
    };
    const values=(idsBySection[sectionId]||[]).map(selectedText).filter(v=>v&&(!/^todos|^todas|todas as unidades|todos os agentes$/i.test(v)||/^todas as escolas$/i.test(v)));
    return unique(values).slice(0,7);
  }

  function presentationContext(){
    const active=document.querySelector('.section.active')||document.querySelector('.section');
    const sectionId=active?.id||'';
    const sectionLabel=activeSectionLabel(active);
    const school=selectedSchoolForSection(sectionId);
    const regional=document.getElementById('regionalScopeSelect');
    const regionValue=cleanText(regional?.value);
    const regionLabel=cleanText(regional?.selectedOptions?.[0]?.textContent)||'Toda a SME';
    const geoAgentValue=sectionId==='georreferenciamento'?cleanText(document.getElementById('geoAgent')?.value):'';
    const allSchools=sectionId==='georreferenciamento'&&geoAgentValue===GEO_ALL_SCHOOLS_VALUE;
    const scopeTitle=school || (regionValue?regionLabel:'SME-Rio');
    const scopeKind=school?'Escola':(allSchools?'Todas as escolas':(regionValue?'Coordenadoria Regional':'Rede municipal'));
    const filters=contextFilters(sectionId);
    return {active,sectionId,sectionLabel,school,regionLabel,scopeTitle,scopeKind,filters,allSchools};
  }

  function elementTitle(el,index){
    const title=cleanText(el.querySelector?.('h3,h4')?.textContent);
    if(title)return title;
    if(el.id==='somKpis'||el.id==='adrKpis'||el.classList?.contains('kpis'))return 'Indicadores principais';
    if(el.id==='geoMap'||el.classList?.contains('geo-map-card'))return 'Distribuição territorial';
    return `Visão ${index+1}`;
  }

  function dedupeElements(elements){
    const out=[];
    for(const el of elements){
      if(!el||!isVisible(el))continue;
      if(out.some(parent=>parent===el||parent.contains(el)))continue;
      for(let i=out.length-1;i>=0;i--){if(el.contains(out[i]))out.splice(i,1);}
      out.push(el);
    }
    return out;
  }

  function contentElements(ctx){
    const q=sel=>document.querySelector(sel);
    let elements=[];
    if(ctx.sectionId==='resultados'){
      elements=[q('#somKpis'),q('#somMainChart')?.closest('.card'),q('#somSkillCard'),q('#somCreCompareCard'),q('#somGetCompareCard')];
    }else if(ctx.sectionId==='adrs'){
      elements=[q('#adrKpis'),q('#adrMainChart')?.closest('.card'),q('#adrSkillBars')?.closest('.card'),q('#adrSchoolBars')?.closest('.card'),q('#adrProgressCard'),q('#adrGetCompareCard')];
    }else if(ctx.sectionId==='georreferenciamento'){
      elements=[q('#georreferenciamento .geo-map-card'),q('#georreferenciamento .geo-header-card')];
    }else{
      const section=ctx.active;
      if(section){
        const kpis=section.querySelector('.kpis');
        if(kpis)elements.push(kpis);
        elements.push(...[...section.querySelectorAll(':scope > .card, :scope > .grid > .card')].filter(el=>!el.classList.contains('result-filter-card')));
      }
    }
    return dedupeElements(elements).slice(0,6);
  }

  function copyCanvasPixels(source,clone){
    const sourceCanvases=source.querySelectorAll?.('canvas')||[];
    const cloneCanvases=clone.querySelectorAll?.('canvas')||[];
    sourceCanvases.forEach((canvas,index)=>{
      const target=cloneCanvases[index];
      if(!target)return;
      try{
        target.width=canvas.width;
        target.height=canvas.height;
        target.getContext('2d')?.drawImage(canvas,0,0);
      }catch(_){/* WebGL ou canvas protegido: html2canvas capturará o original quando possível. */}
    });
  }

  async function captureElement(el){
    await document.fonts?.ready;
    const isMap=el.classList?.contains('geo-map-card')||el.id==='geoMap'||el.id==='geoMap3d';
    let target=el,host=null;
    if(!isMap){
      host=document.createElement('div');
      host.style.cssText='position:fixed;left:-100000px;top:0;width:1180px;padding:20px;background:#f4f8fb;z-index:-1;pointer-events:none;';
      const clone=el.cloneNode(true);
      clone.removeAttribute('id');
      clone.style.width='100%';
      clone.style.maxWidth='none';
      clone.style.height='auto';
      clone.style.maxHeight='none';
      clone.style.overflow='visible';
      if(clone.classList.contains('kpis'))clone.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';
      copyCanvasPixels(el,clone);
      host.appendChild(clone);
      document.body.appendChild(host);
      target=clone;
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    }
    const rect=target.getBoundingClientRect();
    const scale=Math.max(1.15,Math.min(1.85,1700/Math.max(rect.width,1)));
    try{
      const canvas=await window.html2canvas(target,{
        backgroundColor:isMap?'#dfe8ee':'#f4f8fb',
        scale,
        useCORS:true,
        allowTaint:false,
        logging:false,
        imageTimeout:5000,
        scrollX:0,
        scrollY:isMap?-window.scrollY:0,
        ignoreElements:node=>node.classList?.contains('geo-map-message')&&node.hidden
      });
      return {data:canvas.toDataURL('image/png',0.95),width:canvas.width,height:canvas.height};
    }finally{
      host?.remove();
    }
  }

  function addFooter(slide,number){
    slide.addShape('line',{x:.65,y:7.17,w:12.05,h:0,line:{color:BORDER,width:.8}});
    slide.addText('GRA · Gestão para Resultados de Aprendizagem',{x:.7,y:7.2,w:4.9,h:.16,fontFace:'Aptos',fontSize:7.5,color:MUTED,margin:0});
    slide.addText(String(number).padStart(2,'0'),{x:12.02,y:7.17,w:.55,h:.2,fontFace:'Aptos Display',fontSize:8.5,bold:true,color:NAVY,align:'right',margin:0});
  }

  function addHeader(slide,ctx,title,subtitle,slideNumber){
    slide.background={color:BG};
    slide.addShape('rect',{x:0,y:0,w:13.333,h:.11,line:{color:GREEN,transparency:100},fill:{color:GREEN}});
    slide.addText(ctx.scopeTitle,{x:.68,y:.34,w:8.65,h:.42,fontFace:'Aptos Display',fontSize:24,bold:true,color:NAVY,margin:0,breakLine:false,fit:'shrink'});
    slide.addText(title,{x:.7,y:.84,w:8.8,h:.25,fontFace:'Aptos',fontSize:12.5,bold:true,color:INK,margin:0,fit:'shrink'});
    if(subtitle)slide.addText(subtitle,{x:.7,y:1.12,w:9.65,h:.25,fontFace:'Aptos',fontSize:8.5,color:MUTED,margin:0,fit:'shrink'});
    slide.addShape('roundRect',{x:10.45,y:.35,w:2.18,h:.47,rectRadius:.08,line:{color:GREEN,width:1},fill:{color:'EAF6F1'}});
    slide.addText(ctx.scopeKind.toUpperCase(),{x:10.55,y:.49,w:1.98,h:.13,fontFace:'Aptos',fontSize:7.2,bold:true,color:GREEN_DARK,align:'center',margin:0,fit:'shrink'});
    addFooter(slide,slideNumber);
  }

  function fitImage(iw,ih,box){
    const ratio=Math.min(box.w/iw,box.h/ih);
    const w=iw*ratio,h=ih*ratio;
    return {x:box.x+(box.w-w)/2,y:box.y+(box.h-h)/2,w,h};
  }

  function addScreenshotSlide(pptx,ctx,title,capture,slideNumber,subtitle='Dados e visualizações do recorte ativo na dashboard.'){
    const slide=pptx.addSlide();
    addHeader(slide,ctx,title,subtitle,slideNumber);
    const box={x:.68,y:1.52,w:11.98,h:5.38};
    slide.addShape('roundRect',{x:box.x,y:box.y,w:box.w,h:box.h,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    const placed=fitImage(capture.width,capture.height,{x:box.x+.12,y:box.y+.12,w:box.w-.24,h:box.h-.24});
    slide.addImage({data:capture.data,x:placed.x,y:placed.y,w:placed.w,h:placed.h,altText:title});
    return slide;
  }

  function addCoverSlide(pptx,ctx){
    const slide=pptx.addSlide();
    slide.background={color:BG};
    slide.addShape('rect',{x:0,y:0,w:8.55,h:7.5,line:{color:NAVY,transparency:100},fill:{color:NAVY}});
    slide.addShape('rect',{x:8.55,y:0,w:4.783,h:7.5,line:{color:'EAF6F1',transparency:100},fill:{color:'EAF6F1'}});
    slide.addShape('rect',{x:8.55,y:0,w:.14,h:7.5,line:{color:GREEN,transparency:100},fill:{color:GREEN}});
    slide.addText('GRA',{x:.72,y:.55,w:1.15,h:.35,fontFace:'Aptos Display',fontSize:17,bold:true,color:'8ED4B8',margin:0});
    slide.addText(ctx.scopeTitle,{x:.72,y:1.65,w:7.05,h:1.25,fontFace:'Aptos Display',fontSize:35,bold:true,color:WHITE,margin:0,fit:'shrink',valign:'mid'});
    slide.addText(ctx.sectionLabel,{x:.75,y:3.13,w:6.8,h:.48,fontFace:'Aptos',fontSize:18,bold:true,color:'D6E9F5',margin:0,fit:'shrink'});
    const filterLine=ctx.filters.length?ctx.filters.join('  ·  '):'Recorte atual da dashboard';
    slide.addText(filterLine,{x:.75,y:3.72,w:6.95,h:.7,fontFace:'Aptos',fontSize:10.5,color:'BDD0DE',margin:0,breakLine:false,fit:'shrink'});
    slide.addText('Apresentação gerada a partir da visualização selecionada',{x:.75,y:6.63,w:6.9,h:.22,fontFace:'Aptos',fontSize:9,color:'A8C1D2',margin:0});
    slide.addShape('roundRect',{x:9.28,y:1.28,w:3.18,h:1.02,rectRadius:.08,line:{color:GREEN,width:1.2},fill:{color:WHITE}});
    slide.addText(ctx.scopeKind,{x:9.55,y:1.6,w:2.65,h:.25,fontFace:'Aptos',fontSize:13,bold:true,color:GREEN_DARK,align:'center',margin:0,fit:'shrink'});
    slide.addText('ANÁLISE ORIENTADA POR DADOS',{x:9.2,y:3.03,w:3.4,h:.2,fontFace:'Aptos',fontSize:8.5,bold:true,color:GREEN_DARK,align:'center',margin:0,fit:'shrink'});
    slide.addShape('line',{x:9.55,y:3.47,w:2.72,h:0,line:{color:'BFDCCE',width:2}});
    slide.addText(new Date().toLocaleDateString('pt-BR'),{x:9.4,y:5.85,w:3.0,h:.28,fontFace:'Aptos Display',fontSize:16,bold:true,color:NAVY,align:'center',margin:0});
    slide.addText('SME-Rio',{x:9.4,y:6.23,w:3.0,h:.2,fontFace:'Aptos',fontSize:9.5,color:MUTED,align:'center',margin:0});
    return slide;
  }


  function findKpiRoot(ctx){
    if(ctx.sectionId==='resultados')return document.getElementById('somKpis');
    if(ctx.sectionId==='adrs')return document.getElementById('adrKpis');
    return ctx.active?.querySelector('.kpis')||null;
  }

  function findSkillCard(ctx){
    if(ctx.sectionId==='resultados')return document.getElementById('somSkillCard');
    if(ctx.sectionId==='adrs')return document.getElementById('adrSkillBars')?.closest('.card')||null;
    return null;
  }

  function parsePctNumber(value){
    const raw=String(value||'').trim();
    if(!raw)return NaN;
    const normalized=raw
      .replace(/\u00a0/g,' ')
      .replace(/\./g,'')
      .replace(/,/g,'.')
      .match(/-?\d+(?:\.\d+)?/);
    return normalized?Number(normalized[0]):NaN;
  }

  function collectVisibleKpis(ctx){
    const root=findKpiRoot(ctx);
    if(!root||!isVisible(root))return [];
    return [...root.querySelectorAll('.kpi')].filter(isVisible).map((card,idx)=>({
      label:cleanText(card.querySelector('.label')?.textContent||`Indicador ${idx+1}`),
      value:cleanText(card.querySelector('.value')?.textContent||'—'),
      note:cleanText(card.querySelector('.note')?.textContent||''),
      accent:idx%3===0?BLUE:idx%3===1?GREEN:'2E5B84'
    })).filter(item=>item.value&&item.value!=='—'&&!/avaliad/i.test(item.label)).slice(0,6);
  }

  function collectAdrSkillGroupsFromRows(rows,{limit=8,includeAdr=false}={}){
    const map=new Map();
    (rows||[]).forEach(row=>{
      (row.habilidades||[]).forEach(skill=>{
        const value=Number(skill.valor);
        if(!Number.isFinite(value))return;
        const key=[row.adr,row.ano,row.componente,skill.codigo].join('|');
        if(!map.has(key))map.set(key,{adr:row.adr,ano:row.ano,componente:row.componente,codigo:skill.codigo,sv:0,sw:0,count:0});
        const item=map.get(key);
        const weight=Number(row.avaliados)||1;
        item.sv+=value*weight; item.sw+=weight; item.count+=1;
      });
    });
    const items=[...map.values()].map(item=>{
      const info=adrSkillDisplay(item.codigo,item.ano,item.componente,item.adr,includeAdr);
      return {
        code:info.label,
        description:info.desc,
        meta:`${item.count.toLocaleString('pt-BR')} registro${item.count===1?'':'s'}`,
        valueLabel:slidePct(item.sw?item.sv/item.sw:NaN),
        value:item.sw?item.sv/item.sw:NaN,
        adr:item.adr,ano:item.ano,componente:item.componente,codigo:item.codigo
      };
    }).filter(item=>Number.isFinite(item.value));
    return items.sort((a,b)=>a.value-b.value||String(a.code).localeCompare(String(b.code),'pt-BR')).slice(0,limit);
  }

  function collectSkillGroups(ctx){
    if(ctx.sectionId==='resultados'){
      const container=document.getElementById('somSkillBars');
      if(!container||!isVisible(container))return [];
      const groups=[...container.querySelectorAll('.som-skill-component')].map(section=>({
        title:cleanText(section.querySelector('.som-skill-component-head strong')?.textContent||'Habilidades'),
        hint:cleanText(section.querySelector('.som-skill-component-head span')?.textContent||''),
        items:[...section.querySelectorAll('.som-skill-row')].map(row=>({
          code:cleanText(row.querySelector('.som-skill-meta strong')?.textContent||row.querySelector('.bar-name strong')?.textContent||''),
          description:cleanText(row.querySelector('.som-skill-description')?.textContent||''),
          meta:cleanText(row.querySelector('.som-skill-count')?.textContent||''),
          valueLabel:cleanText(row.querySelector('.muted')?.textContent||row.querySelector('.meter span')?.textContent||''),
          value:parsePctNumber(row.querySelector('.muted')?.textContent||row.querySelector('.meter span')?.textContent||'')
        })).filter(item=>item.code)
      })).filter(group=>group.items.length);
      return groups.slice(0,2);
    }
    if(ctx.sectionId==='adrs'){
      let rows=[];
      try{rows=adrFilteredRows({ignoreAdr:false}).filter(Boolean);}catch(_){rows=[];}
      const items=collectAdrSkillGroupsFromRows(rows,{limit:8,includeAdr:true});
      return items.length?[{title:'Habilidades mais desafiadoras',hint:'Descrições oficiais da matriz ADR',items}]:[];
    }
    return [];
  }

  function addBadge(slide,text,x,y,w,color='EAF6F1',ink=GREEN_DARK){
    slide.addShape('roundRect',{x,y,w,h:.34,rectRadius:.12,line:{color:ink,width:.8},fill:{color}});
    slide.addText(text,{x:x+.08,y:y+.09,w:w-.16,h:.12,fontFace:'Aptos',fontSize:7.7,bold:true,color:ink,align:'center',margin:0,fit:'shrink'});
  }

  function addOverviewSlide(pptx,ctx,slideNumber){
    const kpis=collectVisibleKpis(ctx);
    if(!kpis.length)return false;
    const slide=pptx.addSlide();
    const subtitle=ctx.school
      ? 'Leitura executiva da escola selecionada, com destaque para o recorte ativo e os principais indicadores da aba.'
      : `Leitura executiva do recorte ${ctx.regionLabel||'SME-Rio'}, preservando os filtros aplicados na dashboard.`;
    addHeader(slide,ctx,'Panorama executivo',subtitle,slideNumber);
    slide.addShape('roundRect',{x:.7,y:1.52,w:3.08,h:1.18,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    slide.addText('RECORTE FOCAL',{x:.88,y:1.72,w:1.4,h:.14,fontFace:'Aptos',fontSize:8.2,bold:true,color:MUTED,margin:0});
    slide.addText(ctx.scopeTitle,{x:.88,y:1.98,w:2.72,h:.34,fontFace:'Aptos Display',fontSize:18,bold:true,color:NAVY,margin:0,fit:'shrink'});
    slide.addText(ctx.sectionLabel,{x:.88,y:2.35,w:2.65,h:.16,fontFace:'Aptos',fontSize:8.7,color:INK,margin:0,fit:'shrink'});
    const filtersText=ctx.filters.length?ctx.filters.join('  •  '):'Sem filtros adicionais além do recorte principal';
    slide.addShape('roundRect',{x:3.98,y:1.52,w:8.68,h:1.18,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:'F9FBFD'}});
    slide.addText('Filtros ativos',{x:4.2,y:1.72,w:1.1,h:.14,fontFace:'Aptos',fontSize:8.2,bold:true,color:MUTED,margin:0});
    slide.addText(filtersText,{x:4.2,y:1.96,w:8.25,h:.42,fontFace:'Aptos',fontSize:12,color:INK,margin:0,fit:'shrink'});
    slide.addText(ctx.school?'Os slides seguintes preservam o foco na unidade selecionada e destacam seus resultados dentro do recorte atual.':'Os slides seguintes organizam os visuais da dashboard em um formato de apresentação com leitura rápida e hierarquia clara.',{x:4.2,y:2.35,w:8.1,h:.18,fontFace:'Aptos',fontSize:8.4,color:MUTED,margin:0,fit:'shrink'});
    const cols=Math.min(3,kpis.length);
    const gap=.24;
    const cardW=(12.0 - gap*(cols-1))/cols;
    const startX=.7;
    const startY=3.02;
    kpis.forEach((item,idx)=>{
      const row=Math.floor(idx/cols), col=idx%cols;
      const x=startX+col*(cardW+gap), y=startY+row*1.56;
      slide.addShape('roundRect',{x,y,w:cardW,h:1.3,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
      slide.addShape('rect',{x,y,w:.09,h:1.3,line:{color:item.accent,transparency:100},fill:{color:item.accent}});
      slide.addText(item.label.toUpperCase(),{x:x+.22,y:y+.17,w:cardW-.38,h:.16,fontFace:'Aptos',fontSize:8.2,bold:true,color:MUTED,margin:0,fit:'shrink'});
      slide.addText(item.value,{x:x+.22,y:y+.45,w:cardW-.38,h:.36,fontFace:'Aptos Display',fontSize:22,bold:true,color:NAVY,margin:0,fit:'shrink'});
      if(item.note){
        slide.addText(item.note,{x:x+.22,y:y+.91,w:cardW-.38,h:.2,fontFace:'Aptos',fontSize:8.3,color:INK,margin:0,fit:'shrink'});
      }
    });
    return true;
  }

  function addSkillInsightSlide(pptx,ctx,slideNumber){
    if(ctx.sectionId==='adrs' && document.getElementById('adrMode')?.value==='progressao') return false;
    const groups=collectSkillGroups(ctx);
    if(!groups.length)return false;
    const slide=pptx.addSlide();
    const title=ctx.sectionId==='resultados'?'Habilidades mais desafiadoras':'Habilidades em destaque';
    const subtitle=ctx.school
      ? `Leitura pedagógica da escola selecionada em ${ctx.sectionLabel.toLowerCase()}, preservando o recorte ativo da dashboard.`
      : 'As barras abaixo reorganizam as habilidades com maior desafio no recorte ativo, priorizando legibilidade e leitura rápida.';
    addHeader(slide,ctx,title,subtitle,slideNumber);
    const isDual=groups.length>1;
    const colGap=.32;
    const colW=isDual?5.83:11.98;
    const maxRows=isDual?5:8;
    groups.forEach((group,gIdx)=>{
      const x=.68+gIdx*(colW+colGap), y=1.52;
      slide.addShape('roundRect',{x,y,w:colW,h:5.34,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
      slide.addText(group.title,{x:x+.22,y:y+.18,w:colW-.44,h:.22,fontFace:'Aptos Display',fontSize:15,bold:true,color:NAVY,margin:0,fit:'shrink'});
      if(group.hint)slide.addText(group.hint,{x:x+.22,y:y+.41,w:colW-.44,h:.13,fontFace:'Aptos',fontSize:7.8,color:MUTED,margin:0,fit:'shrink'});
      const rowStep=isDual ? .92 : .6;
      group.items.slice(0,maxRows).forEach((item,idx)=>{
        const rowY=y+.66+idx*rowStep;
        const val=Number.isFinite(item.value)?Math.max(0,Math.min(100,item.value)):0;
        const barW=colW-1.18;
        slide.addShape('roundRect',{x:x+.18,y:rowY-.05,w:colW-.36,h:(isDual ? .78 : .52),rectRadius:.04,line:{color:'EEF3F7',width:.7},fill:{color:'FBFDFE'}});
        slide.addText(item.code,{x:x+.3,y:rowY+.03,w:1.1,h:.14,fontFace:'Aptos',fontSize:isDual?8.8:8.6,bold:true,color:GREEN_DARK,margin:0,fit:'shrink'});
        slide.addText(item.valueLabel||'—',{x:x+colW-1.0,y:rowY+.02,w:.72,h:.14,fontFace:'Aptos Display',fontSize:isDual?10.8:10.2,bold:true,color:NAVY,align:'right',margin:0,fit:'shrink'});
        slide.addText(item.description||'Habilidade sem descrição carregada na matriz desta versão.',{x:x+.3,y:rowY+.19,w:colW-1.36,h:.16,fontFace:'Aptos',fontSize:isDual?7.2:7.6,color:INK,margin:0,fit:'shrink'});
        slide.addShape('roundRect',{x:x+.3,y:rowY+.47,w:barW,h:.09,rectRadius:.04,line:{color:'E6EEF4',transparency:100},fill:{color:'E6EEF4'}});
        slide.addShape('roundRect',{x:x+.3,y:rowY+.47,w:Math.max(.18,barW*(val/100)),h:.09,rectRadius:.04,line:{color:gIdx===0?BLUE:GREEN,transparency:100},fill:{color:gIdx===0?BLUE:GREEN}});
      });
    });
    return true;
  }


  function slideNum(v){
    const n=Number(v);
    return Number.isFinite(n)?n:null;
  }
  function slidePct(v,digits=1){
    const n=slideNum(v);
    return n===null?'—':`${n.toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits})}%`;
  }
  function slideScore(v,digits=1){
    const n=slideNum(v);
    return n===null?'—':n.toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  }
  function slideNorm(value){
    try{return typeof norm==='function'?norm(value):String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
    catch(_){return String(value||'').toLowerCase().trim();}
  }
  function drawMiniBar(slide,{x,y,w,h,value,max=100,color=GREEN,bg='E8EEF4',label='',left='',right='',fontSize=8.5}){
    const v=Math.max(0,Math.min(Number(max)||100,Number(value)||0));
    slide.addShape('roundRect',{x,y,w,h,rectRadius:.05,line:{color:bg,transparency:100},fill:{color:bg}});
    slide.addShape('roundRect',{x,y,w:Math.max(.05,w*(v/(Number(max)||100))),h,rectRadius:.05,line:{color,transparency:100},fill:{color}});
    if(left)slide.addText(left,{x,y:y-.22,w:w*.66,h:.14,fontFace:'Aptos',fontSize,bold:true,color:INK,margin:0,fit:'shrink'});
    if(right||label)slide.addText(right||label,{x:x+w*.68,y:y-.22,w:w*.32,h:.14,fontFace:'Aptos Display',fontSize:fontSize+1,bold:true,color:NAVY,align:'right',margin:0,fit:'shrink'});
  }
  function addMessageBox(slide,text,{x=.8,y=6.35,w=11.7,h=.36,color='F7FBFE',ink=MUTED}={}){
    slide.addShape('roundRect',{x,y,w,h,rectRadius:.08,line:{color:BORDER,width:.8},fill:{color}});
    slide.addText(text,{x:x+.18,y:y+.11,w:w-.36,h:.12,fontFace:'Aptos',fontSize:8.2,color:ink,margin:0,fit:'shrink'});
  }
  function getSomRowsForPresentation(ctx,{ignoreSearchForScatter=false}={}){
    if(typeof somFilteredRows!=='function')return [];
    try{return somFilteredRows(ignoreSearchForScatter?{ignoreSearch:true}:{}).filter(Boolean);}catch(_){return [];}
  }
  function somMetricForPpt(){return document.getElementById('somMetric')?.value||'principal';}
  function somMetricLabelForPpt(){return typeof somMetricLabel==='function'?somMetricLabel(somMetricForPpt()):somMetricForPpt();}
  function somValueForPpt(row,metric=somMetricForPpt()){
    try{return typeof somMetricValue==='function'?somMetricValue(row,metric):Number(row?.[metric]);}catch(_){return Number(row?.[metric]);}
  }
  function somDisplayForPpt(row,value,metric=somMetricForPpt()){
    try{return typeof somFormatMetric==='function'?somFormatMetric(value,metric,row):slidePct(value,1);}catch(_){return slidePct(value,1);}
  }
  function collectSomScatterRows(ctx){
    const modality=document.getElementById('somModalidade')?.value||'';
    if(modality!=='Avalia RJ')return [];
    const q=cleanText(document.getElementById('somSearch')?.value||'');
    const selectedCre=document.getElementById('somCre')?.value||'';
    const selectedAgent=document.getElementById('somAgente')?.value||'';
    let rows=[];
    try{
      if(!q&&!selectedCre&&!selectedAgent&&typeof somAvaliaCreScatterRows==='function')rows=somAvaliaCreScatterRows();
      else rows=getSomRowsForPresentation(ctx,{ignoreSearchForScatter:!!q});
    }catch(_){rows=getSomRowsForPresentation(ctx,{ignoreSearchForScatter:!!q});}
    const focus=slideNorm(ctx.school||q);
    return rows.map(r=>{
      const name=cleanText(r.escola||r.cre||'Registro');
      return {name,cre:cleanText(r.cre||''),lp:Number(r.lp),mt:Number(r.mt),row:r,highlight:!!focus&&slideNorm(name).includes(focus)};
    }).filter(p=>Number.isFinite(p.lp)&&Number.isFinite(p.mt));
  }
  function addSomScatterSlide(pptx,ctx,slideNumber){
    const points=collectSomScatterRows(ctx);
    if(points.length<2)return false;
    const slide=pptx.addSlide();
    addHeader(slide,ctx,'Avalia RJ — LP × Matemática','Cada ponto representa uma escola. Indicador: % Adequado + % Avançado. Sem classificação ou ranking.',slideNumber);
    const box={x:.72,y:1.58,w:11.95,h:5.28};
    slide.addShape('roundRect',{x:box.x,y:box.y,w:box.w,h:box.h,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    const padL=.58,padR=.28,padT=.30,padB=.56;
    const cx0=box.x+padL,cy0=box.y+padT,cw=box.w-padL-padR,ch=box.h-padT-padB;
    [0,20,40,60,80,100].forEach(t=>{
      const x=cx0+cw*t/100,y=cy0+ch*(100-t)/100;
      slide.addShape('line',{x,y:cy0,w:0,h:ch,line:{color:'E5EDF3',width:.55}});
      slide.addShape('line',{x:cx0,y,w:cw,h:0,line:{color:'E5EDF3',width:.55}});
      slide.addText(`${t}%`,{x:x-.18,y:cy0+ch+.08,w:.36,h:.1,fontFace:'Aptos',fontSize:6.4,color:MUTED,align:'center',margin:0});
      slide.addText(`${t}%`,{x:cx0-.43,y:y-.05,w:.32,h:.1,fontFace:'Aptos',fontSize:6.4,color:MUTED,align:'right',margin:0});
    });
    slide.addShape('line',{x:cx0,y:cy0+ch,w:cw,h:0,line:{color:'AFC3D2',width:1}});
    slide.addShape('line',{x:cx0,y:cy0,w:0,h:ch,line:{color:'AFC3D2',width:1}});
    points.forEach(p=>{
      const px=cx0+cw*Math.max(0,Math.min(100,p.lp))/100;
      const py=cy0+ch*(100-Math.max(0,Math.min(100,p.mt)))/100;
      const hi=p.highlight,s=hi?.16:.075;
      slide.addShape('ellipse',{x:px-s/2,y:py-s/2,w:s,h:s,line:{color:hi?GREEN_DARK:WHITE,width:hi?1.1:.25,transparency:hi?0:100},fill:{color:hi?GREEN:BLUE,transparency:hi?0:points.length>100?50:30}});
      if(hi)slide.addText(p.name,{x:Math.min(px+.10,box.x+box.w-2.0),y:Math.max(box.y+.12,py-.08),w:1.8,h:.13,fontFace:'Aptos',fontSize:7.2,bold:true,color:GREEN_DARK,margin:0,fit:'shrink'});
    });
    slide.addText('Língua Portuguesa (Leitura + Escrita) — % Adequado + Avançado',{x:cx0+2.2,y:box.y+box.h-.24,w:6.0,h:.12,fontFace:'Aptos',fontSize:7.2,bold:true,color:MUTED,align:'center',margin:0});
    slide.addText('Matemática — % Adequado + Avançado',{x:box.x+.08,y:cy0+1.55,w:.15,h:1.9,fontFace:'Aptos',fontSize:7.2,bold:true,color:MUTED,rotate:270,align:'center',margin:0,fit:'shrink'});
    addMessageBox(slide,`${points.length} escolas com pares válidos de LP e Matemática no recorte. Visualização exclusivamente descritiva; sem médias de referência, classificação ou ranking.`);
    return true;
  }
  function collectSomRankItems(ctx){
    const modality=document.getElementById('somModalidade')?.value||'';
    const regional=Number(document.getElementById('regionalScopeSelect')?.value||0);
    const agent=document.getElementById('somAgente')?.value||'';
    const query=cleanText(document.getElementById('somSearch')?.value||'');
    const segment=document.getElementById('somAnoEscolar')?.value||'';
    const metric=somMetricForPpt();
    if(modality==='IDEB 2025'&&regional===0&&!agent&&!query&&window.V235_IDEB_AGGREGATES?.[segment]&&['principal','ideb2023','ideb2025','crescimento'].includes(metric)){
      const key=metric==='principal'?'ideb2025':metric;
      const fmtOfficial=v=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:key==='crescimento'?1:1,maximumFractionDigits:key==='crescimento'?1:1});
      return Object.entries(window.V235_IDEB_AGGREGATES[segment]).filter(([n])=>Number(n)>0).map(([n,d])=>{
        const value=key==='ideb2023'?d.v23:key==='crescimento'?d.delta:d.v25;
        return {name:`CRE ${String(n).padStart(2,'0')}`,value,display:key==='crescimento'?`${value>0?'+':''}${fmtOfficial(value)}`:fmtOfficial(value),row:{cre:`CRE ${String(n).padStart(2,'0')}`,ideb2023:d.v23,ideb2025:d.v25,crescimento:d.delta}};
      }).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'pt-BR')).slice(0,50);
    }
    if(typeof somRankingItems!=='function')return [];
    const rows=getSomRowsForPresentation(ctx);
    try{return somRankingItems(rows,metric).slice(0,50);}catch(_){return [];}
  }
  function addBarList(slide,items,{x,y,w,h,title,color=BLUE,metricMax=null,metric='principal',limit=7}){
    slide.addShape('roundRect',{x,y,w,h,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    slide.addText(title,{x:x+.22,y:y+.18,w:w-.44,h:.2,fontFace:'Aptos Display',fontSize:14,bold:true,color:NAVY,margin:0,fit:'shrink'});
    const vals=items.map(i=>Math.abs(Number(i.value)||0));
    const max=metricMax||Math.max(...vals,1);
    const rows=items.slice(0,limit);
    const rowH=(h-.78)/Math.max(limit,1);
    rows.forEach((item,idx)=>{
      const yy=y+.6+idx*rowH;
      const val=Math.abs(Number(item.value)||0);
      slide.addText(item.name,{x:x+.24,y:yy,w:w-1.25,h:.14,fontFace:'Aptos',fontSize:7.8,bold:true,color:INK,margin:0,fit:'shrink'});
      slide.addText(item.display||somDisplayForPpt(item.row,item.value,metric),{x:x+w-1.0,y:yy,w:.74,h:.14,fontFace:'Aptos Display',fontSize:8.8,bold:true,color:NAVY,align:'right',margin:0,fit:'shrink'});
      slide.addShape('roundRect',{x:x+.24,y:yy+.22,w:w-1.24,h:.1,rectRadius:.04,line:{color:'E8EEF4',transparency:100},fill:{color:'E8EEF4'}});
      slide.addShape('roundRect',{x:x+.24,y:yy+.22,w:Math.max(.08,(w-1.24)*(val/max)),h:.1,rectRadius:.04,line:{color,transparency:100},fill:{color}});
    });
  }
  function addSomRankSlide(pptx,ctx,slideNumber){
    const items=collectSomRankItems(ctx);
    if(!items.length)return false;
    const metric=somMetricForPpt();
    let best=[],challenge=[];
    try{const split=typeof adrSplitRanking==='function'?adrSplitRanking(items):null;best=split?.best||items.slice(0,10);challenge=split?.challenge||items.slice(-10).reverse();}
    catch(_){best=items.slice(0,10);challenge=items.slice(-10).reverse();}
    const slide=pptx.addSlide();
    addHeader(slide,ctx,`Ranking — ${somMetricLabelForPpt()}`,'As unidades são organizadas em dois grupos para separar bons resultados e maiores desafios sem gerar tabelas densas.',slideNumber);
    const max=Math.max(...items.map(i=>Math.abs(Number(i.value)||0)),1);
    addBarList(slide,best,{x:.72,y:1.58,w:5.86,h:5.28,title:'Melhores resultados',color:GREEN,metricMax:max,metric,limit:10});
    addBarList(slide,challenge,{x:6.82,y:1.58,w:5.86,h:5.28,title:'Resultados mais desafiadores',color:'D45C5C',metricMax:max,metric,limit:10});
    return true;
  }
  function addSomProgressSlide(pptx,ctx,slideNumber){
    const card=document.getElementById('somProgressCard');
    if(!card?.classList.contains('open')||typeof somFilteredRows!=='function')return false;
    const metric=somMetricForPpt();
    let groups=[];
    const modality=document.getElementById('somModalidade')?.value||'';
    const regional=Number(document.getElementById('regionalScopeSelect')?.value||0);
    const agent=document.getElementById('somAgente')?.value||'';
    const query=cleanText(document.getElementById('somSearch')?.value||'');
    const priority=document.getElementById('somPriority')?.value||'';
    const segment=document.getElementById('somAnoEscolar')?.value||'';
    const official=modality==='IDEB 2025'&&regional>0&&!agent&&!query&&priority!=='sim'?window.V235_IDEB_AGGREGATES?.[segment]?.[regional]:null;
    if(official){
      groups=[{ed:'2023',value:official.v23,count:official.c23,row:{ideb2023:official.v23,ideb2025:official.v25}},{ed:'2025',value:official.v25,count:official.c25,row:{ideb2023:official.v23,ideb2025:official.v25}}];
    }else{
      try{
        const rows=somFilteredRows({ignoreEdicao:true});
        const map=new Map();
        rows.forEach(r=>{const k=r.edicao||'Sem edição';if(!map.has(k))map.set(k,[]);map.get(k).push(r);});
        groups=[...map.entries()].map(([ed,rs])=>({ed,value:somAvg(rs,metric),count:rs.length,row:rs[0]})).filter(x=>Number.isFinite(x.value)).sort((a,b)=>somOrderEdicao(a.ed)-somOrderEdicao(b.ed));
      }catch(_){groups=[];}
    }
    if(groups.length<2)return false;
    const slide=pptx.addSlide();
    addHeader(slide,ctx,'Evolução do resultado','A progressão é redesenhada como linha simples, com poucos rótulos e valores legíveis.',slideNumber);
    const box={x:.82,y:1.62,w:11.75,h:4.8};
    slide.addShape('roundRect',{x:box.x,y:box.y,w:box.w,h:box.h,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    const vals=groups.map(g=>g.value), min=Math.min(...vals), max=Math.max(...vals), pad=.45;
    const lo=Math.max(0,min-(max-min||10)*.15), hi=max+(max-min||10)*.15;
    const x=i=>box.x+pad+(box.w-pad*2)*(groups.length===1?0:i/(groups.length-1));
    const y=v=>box.y+pad+(box.h-pad*2)*(1-(v-lo)/(hi-lo||1));
    for(let t=0;t<=4;t++){
      const yy=box.y+pad+(box.h-pad*2)*t/4;
      slide.addShape('line',{x:box.x+pad,y:yy,w:box.w-pad*2,h:0,line:{color:'E7EEF4',width:.7}});
    }
    for(let i=0;i<groups.length-1;i++)pptSafeLineSegmentV226(slide,x(i),y(groups[i].value),x(i+1),y(groups[i+1].value),{color:BLUE,width:2});
    groups.forEach((g,i)=>{
      slide.addShape('ellipse',{x:x(i)-.06,y:y(g.value)-.06,w:.12,h:.12,line:{color:WHITE,width:1},fill:{color:BLUE}});
      slide.addText(somDisplayForPpt(g.row,g.value,metric),{x:x(i)-.35,y:y(g.value)-.36,w:.7,h:.12,fontFace:'Aptos Display',fontSize:9,bold:true,color:NAVY,align:'center',margin:0,fit:'shrink'});
      slide.addText(g.ed,{x:x(i)-.35,y:box.y+box.h-.32,w:.7,h:.12,fontFace:'Aptos',fontSize:8,bold:true,color:MUTED,align:'center',margin:0,fit:'shrink'});
    });
    const delta=groups.at(-1).value-groups[0].value;
    slide.addShape('roundRect',{x:9.1,y:5.63,w:2.7,h:.46,rectRadius:.1,line:{color:delta>=0?GREEN:'B23B3B',width:1},fill:{color:delta>=0?'EAF6F1':'FDEAEA'}});
    const deltaText=modality==='IDEB 2025'?`${delta>=0?'+':''}${Number(delta).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}`:`${delta>=0?'+':''}${slidePct(delta)}`;
    slide.addText(`Variação: ${deltaText}`,{x:9.28,y:5.8,w:2.34,h:.12,fontFace:'Aptos Display',fontSize:11,bold:true,color:delta>=0?GREEN_DARK:'9B2F2F',align:'center',margin:0,fit:'shrink'});
    return true;
  }
  function collectAdrProgressForPpt(ctx){
    if(ctx.sectionId!=='adrs'||document.getElementById('adrMode')?.value!=='progressao'||typeof adrFilteredRows!=='function')return null;
    const metric=document.getElementById('adrMetric')?.value||'adequado';if(metric==='avaliadosPct')return null;
    let rows=[];try{rows=adrFilteredRows({ignoreAdr:true}).filter(Boolean);}catch(_){rows=[];}
    const adrs=unique(rows.map(r=>cleanText(r.adr))).sort((a,b)=>adrOrder(a)-adrOrder(b));if(adrs.length<2)return null;
    const selectedCre=cleanText(document.getElementById('adrCre')?.value),selectedAgent=cleanText(document.getElementById('adrAgente')?.value),schoolNames=unique(rows.map(r=>cleanText(r.escola)));
    let kind='school';if(!(ctx.school||schoolNames.length===1||adrIsAllSchoolsScope(selectedAgent))){if(!selectedCre&&!selectedAgent)kind='cre';else if(selectedCre&&!selectedAgent)kind='agent';}
    const entityInfo=row=>{if(kind==='cre')return {key:cleanText(row.regional),name:cleanText(row.regional)};if(kind==='agent')return {key:cleanText(adrRowAgent(row)),name:cleanText(adrRowAgent(row))};return {key:`${cleanText(row.regional)}|${cleanText(row.escola)}`,name:cleanText(row.escola)};};
    const entities=new Map();rows.forEach(row=>{const info=entityInfo(row);if(!info.key||!info.name)return;if(!entities.has(info.key))entities.set(info.key,{name:info.name,rows:[]});entities.get(info.key).rows.push(row);});
    const schoolKey=row=>`${cleanText(row.regional)}|${cleanText(row.escola)}`;
    const series=[...entities.values()].map(entity=>{
      const coverage=new Map();entity.rows.forEach(row=>{const key=schoolKey(row),value=Number(row?.[metric]);if(!key||!cleanText(row.escola)||!Number.isFinite(value))return;if(!coverage.has(key))coverage.set(key,new Set());coverage.get(key).add(cleanText(row.adr));});
      const pairedKeys=new Set([...coverage.entries()].filter(([,seen])=>adrs.every(adr=>seen.has(adr))).map(([key])=>key));
      const paired=entity.rows.filter(row=>pairedKeys.has(schoolKey(row))&&Number.isFinite(Number(row?.[metric])));
      const values=adrs.map(adr=>{const rs=paired.filter(r=>cleanText(r.adr)===adr);return rs.length?adrWeightAvg(rs,metric):null;});
      return {name:entity.name,values,pairedCount:pairedKeys.size};
    }).filter(s=>s.pairedCount>0&&s.values.length===adrs.length&&s.values.every(v=>Number.isFinite(Number(v))))
      .sort((a,b)=>String(a.name).localeCompare(String(b.name),'pt-BR'));
    if(!series.length)return null;
    const metricLabel=adrMetricLabel(metric);return {metric,metricLabel,adrs,series,kind,rows};
  }

  function addAdrProgressSlide(pptx,ctx,slideNumber){
    const data=collectAdrProgressForPpt(ctx);
    if(!data)return false;
    const slide=pptx.addSlide();
    const one=data.series.length===1;
    const focus=one?data.series[0]:null;
    const scopeLabel=one?focus.name:(data.kind==='cre'?'CREs':data.kind==='agent'?'agentes':'escolas');
    addHeader(slide,ctx,`Progressão entre ADRs — ${data.metricLabel}`,one
      ? `A linha mostra exatamente como ${focus.name} estava na primeira ADR e como está na avaliação mais recente.`
      : `Cada linha representa ${data.kind==='cre'?'uma CRE':data.kind==='agent'?'um agente':'uma escola'} no recorte ativo.`,slideNumber);

    const chart={x:.78,y:1.48,w:11.78,h:one?4.12:4.78};
    slide.addShape('roundRect',{x:chart.x,y:chart.y,w:chart.w,h:chart.h,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    const left=.72,right=.42,top=.45,bottom=.55;
    const plot={x:chart.x+left,y:chart.y+top,w:chart.w-left-right,h:chart.h-top-bottom};
    const values=data.series.flatMap(s=>s.values).filter(v=>Number.isFinite(Number(v))).map(Number);
    let lo=0,hi=100;
    if(!/%/.test(data.metricLabel)){
      const min=Math.min(...values),max=Math.max(...values),span=Math.max(max-min,10);
      lo=Math.max(0,min-span*.18);hi=max+span*.18;
    }
    const x=i=>plot.x+(data.adrs.length===1?plot.w/2:plot.w*i/(data.adrs.length-1));
    const y=v=>plot.y+plot.h*(1-(Number(v)-lo)/(hi-lo||1));
    const ticks=5;
    for(let t=0;t<=ticks;t++){
      const val=lo+(hi-lo)*(ticks-t)/ticks,yy=plot.y+plot.h*t/ticks;
      slide.addShape('line',{x:plot.x,y:yy,w:plot.w,h:0,line:{color:'E6EDF3',width:.75}});
      slide.addText(`${Math.round(val)}${/%/.test(data.metricLabel)?'%':''}`,{x:chart.x+.08,y:yy-.08,w:.52,h:.13,fontFace:'Aptos',fontSize:7.5,color:MUTED,align:'right',margin:0,fit:'shrink'});
    }
    const palette=[BLUE,GREEN,'D9861C','8B5CF6','B23B3B','0EA5A4','6366F1','EC4899','64748B','1C79B8'];
    const shown=data.series.slice(0,one?1:10);
    shown.forEach((series,sidx)=>{
      const color=one?GREEN:palette[sidx%palette.length];
      for(let i=0;i<data.adrs.length-1;i++){
        const a=series.values[i],b=series.values[i+1];
        if(!Number.isFinite(Number(a))||!Number.isFinite(Number(b)))continue;
        pptSafeLineSegmentV226(slide,x(i),y(a),x(i+1),y(b),{color,width:one?4:2.2,beginArrowType:'none',endArrowType:'none'});
      }
      series.values.forEach((v,i)=>{
        if(!Number.isFinite(Number(v)))return;
        const r=one?.14:.075;
        slide.addShape('ellipse',{x:x(i)-r/2,y:y(v)-r/2,w:r,h:r,line:{color:WHITE,width:one?1.4:.6},fill:{color}});
        if(one){
          slide.addText(slidePct(v),{x:x(i)-.55,y:y(v)-.46,w:1.1,h:.24,fontFace:'Aptos Display',fontSize:16,bold:true,color:NAVY,align:'center',margin:0,fit:'shrink'});
        }
      });
    });
    data.adrs.forEach((adr,i)=>{
      slide.addText(adr,{x:x(i)-.55,y:chart.y+chart.h-.35,w:1.1,h:.16,fontFace:'Aptos',fontSize:10,bold:true,color:MUTED,align:'center',margin:0,fit:'shrink'});
    });

    if(one){
      const first=focus.values[0],last=focus.values[focus.values.length-1],delta=Number(last)-Number(first);
      const favorable=adrLowerIsBetter(data.metric)?delta<=0:delta>=0;
      const cards=[
        {label:data.adrs[0],value:slidePct(first),note:'Ponto de partida',color:BLUE},
        {label:data.adrs[data.adrs.length-1],value:slidePct(last),note:'Resultado atual',color:GREEN},
        {label:'Variação',value:`${delta>=0?'+':''}${slidePct(delta)}`,note:favorable?'Movimento favorável':'Movimento de atenção',color:favorable?GREEN:'B23B3B'}
      ];
      cards.forEach((card,idx)=>{
        const x0=.78+idx*4.03,y0=5.83;
        slide.addShape('roundRect',{x:x0,y:y0,w:3.79,h:.98,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:'F9FBFD'}});
        slide.addShape('rect',{x:x0,y:y0,w:.08,h:.98,line:{color:card.color,transparency:100},fill:{color:card.color}});
        slide.addText(card.label.toUpperCase(),{x:x0+.22,y:y0+.15,w:1.1,h:.13,fontFace:'Aptos',fontSize:7.8,bold:true,color:MUTED,margin:0,fit:'shrink'});
        slide.addText(card.value,{x:x0+.22,y:y0+.37,w:1.65,h:.28,fontFace:'Aptos Display',fontSize:20,bold:true,color:NAVY,margin:0,fit:'shrink'});
        slide.addText(card.note,{x:x0+1.9,y:y0+.42,w:1.62,h:.18,fontFace:'Aptos',fontSize:8.5,bold:true,color:card.color,align:'right',margin:0,fit:'shrink'});
      });
    }else{
      const legendY=6.43;
      shown.forEach((series,idx)=>{
        const col=idx%5,row=Math.floor(idx/5),x0=.9+col*2.37,y0=legendY+row*.27,color=palette[idx%palette.length];
        slide.addShape('ellipse',{x:x0,y:y0+.015,w:.08,h:.08,line:{color,transparency:100},fill:{color}});
        slide.addText(series.name,{x:x0+.13,y:y0,w:2.0,h:.12,fontFace:'Aptos',fontSize:7.1,color:INK,margin:0,fit:'shrink'});
      });
    }
    return true;
  }

  function addAdrRankSlide(pptx,ctx,slideNumber){
    const container=document.getElementById('adrSchoolBars');
    if(!container||!isVisible(container))return false;
    const rows=[...container.querySelectorAll('.bar-row,.v210-rank-row')].map(row=>({
      name:cleanText(row.querySelector('.bar-name strong,.v210-rank-school strong')?.textContent||''),
      sub:cleanText(row.querySelector('.bar-name span,.v218-adr-row-sub')?.textContent||''),
      display:cleanText(row.querySelector('.muted')?.textContent||row.querySelector('.meter span')?.textContent||row.querySelector('.v210-rank-value')?.textContent||''),
      value:parsePctNumber(row.querySelector('.muted')?.textContent||row.querySelector('.meter span')?.textContent||row.querySelector('.v210-rank-value')?.textContent||'')
    })).filter(r=>r.name).slice(0,20);
    if(!rows.length)return false;
    const slide=pptx.addSlide();
    addHeader(slide,ctx,'Unidades em destaque','Ranking redesenhado a partir das barras exibidas na aba, com fonte ampliada e leitura de apresentação.',slideNumber);
    const half=Math.ceil(rows.length/2);
    const max=Math.max(...rows.map(r=>Math.abs(r.value||0)),1);
    const bestTitle=cleanText(container.querySelector('.adr-rank-section.best .adr-rank-heading h4,.v210-rank-block.best .v210-rank-head h4')?.textContent)||'Melhores resultados';
    const challengeTitle=cleanText(container.querySelector('.adr-rank-section.challenge .adr-rank-heading h4,.v210-rank-block.challenge .v210-rank-head h4')?.textContent)||'Resultados mais desafiadores';
    addBarList(slide,rows.slice(0,half),{x:.72,y:1.58,w:5.86,h:5.28,title:bestTitle,color:GREEN,metricMax:max,limit:10});
    addBarList(slide,rows.slice(half),{x:6.82,y:1.58,w:5.86,h:5.28,title:challengeTitle,color:'D45C5C',metricMax:max,limit:10});
    return true;
  }
  function collectGeoRowsForPpt(){
    let pts=[];try{pts=typeof geoVisiblePoints==='function'?geoVisiblePoints():[];}catch(_){pts=[];}
    return pts.map(point=>{const result=geoEvolutionForPoint(point);return {point,result,status:result?.status||'nodata',label:geoReportStatusLabel(result),metric:geoMetricText(result)};}).sort((a,b)=>String(a.point.creLabel||'').localeCompare(String(b.point.creLabel||''),'pt-BR')||String(a.point.name||'').localeCompare(String(b.point.name||''),'pt-BR'));
  }
  function collectGeoAdrSkillsForPpt(rows){
    const ctx=geoEvalContext();if(ctx.evaluation!=='ADR'||!Array.isArray(ADR_ROWS))return [];
    const schools=new Set(rows.map(item=>slideNorm(item.point.name))),adrName=ctx.adrView==='adr1'?'ADR 1':'ADR 2',years=geoAdrYearsForContext(ctx),components=ctx.component?[ctx.component]:['LP','MT'],map=new Map();
    ADR_ROWS.forEach(row=>{if(row.adr!==adrName||!schools.has(slideNorm(row.escola))||!years.includes(row.ano)||!components.includes(row.componente))return;const weight=Number(row.avaliados)||1;(row.habilidades||[]).forEach(skill=>{const value=Number(skill.valor);if(!Number.isFinite(value))return;const key=[row.ano,row.componente,skill.codigo].join('|');if(!map.has(key))map.set(key,{ano:row.ano,componente:row.componente,codigo:skill.codigo,sv:0,sw:0});const item=map.get(key);item.sv+=value*weight;item.sw+=weight;});});
    return [...map.values()].map(item=>{const info=adrSkillDisplay(item.codigo,item.ano,item.componente,adrName,false);return {...item,value:item.sw?item.sv/item.sw:NaN,label:info.label,description:info.desc};}).filter(item=>Number.isFinite(item.value)).sort((a,b)=>a.value-b.value).slice(0,10);
  }
  function addGeoSummarySlide(pptx,ctx,slideNumber){
    if(ctx.sectionId!=='georreferenciamento')return false;
    const rows=collectGeoRowsForPpt(),gctx=geoEvalContext(),counts=rows.reduce((acc,item)=>{acc[item.status]=(acc[item.status]||0)+1;return acc;},{});
    const slide=pptx.addSlide();
    addHeader(slide,ctx,'Síntese territorial',`${gctx.evaluation}${gctx.segment?' · '+gctx.segment:''}${gctx.component?' · '+gctx.component:''} — panorama do recorte filtrado.`,slideNumber);
    const cards=[{v:rows.length,l:'Unidades analisadas',c:NAVY},{v:counts.up||0,l:'Avançou / acima',c:GREEN},{v:counts.flat||0,l:'Estagnou / próximo',c:'6F8497'},{v:counts.down||0,l:'Caiu / abaixo',c:'B23B3B'}];
    cards.forEach((card,i)=>{const x=.72+i*3.05;slide.addShape('roundRect',{x,y:1.65,w:2.8,h:1.25,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});slide.addShape('rect',{x,y:1.65,w:.09,h:1.25,line:{color:card.c,transparency:100},fill:{color:card.c}});slide.addText(String(card.v),{x:x+.25,y:1.93,w:2.25,h:.36,fontFace:'Aptos Display',fontSize:24,bold:true,color:NAVY,margin:0,fit:'shrink'});slide.addText(card.l,{x:x+.25,y:2.4,w:2.25,h:.18,fontFace:'Aptos',fontSize:9.5,bold:true,color:MUTED,margin:0,fit:'shrink'});});
    const agentLabel=document.getElementById('geoAgent')?.selectedOptions?.[0]?.textContent||'Todas as escolas';
    slide.addShape('roundRect',{x:.72,y:3.25,w:11.95,h:2.45,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:'F9FBFD'}});
    slide.addText('Recorte aplicado',{x:1.02,y:3.58,w:2.1,h:.22,fontFace:'Aptos Display',fontSize:16,bold:true,color:NAVY,margin:0});
    slide.addText([gctx.evaluation,gctx.segment,gctx.component,document.getElementById('geoEvalIndicator')?.selectedOptions?.[0]?.textContent,agentLabel].filter(Boolean).join('  ·  '),{x:1.02,y:4.0,w:10.85,h:.42,fontFace:'Aptos',fontSize:14,color:INK,margin:0,fit:'shrink'});
    slide.addText('Os próximos slides apresentam todas as unidades do recorte com seus resultados ou evoluções. Quando a avaliação possui habilidades, elas são organizadas em um slide pedagógico próprio.',{x:1.02,y:4.65,w:10.7,h:.48,fontFace:'Aptos',fontSize:12,color:MUTED,margin:0,fit:'shrink'});
    return true;
  }
  function addGeoSchoolResultSlides(pptx,ctx,slideNumber){
    const rows=collectGeoRowsForPpt();if(!rows.length)return slideNumber;
    const perSlide=9,total=Math.ceil(rows.length/perSlide);
    for(let page=0;page<total;page++){
      const chunk=rows.slice(page*perSlide,(page+1)*perSlide),slide=pptx.addSlide();
      addHeader(slide,ctx,`Resultados por unidade · ${page+1}/${total}`,'Cada linha preserva a escola, a CRE, o agente e o resultado calculado pelos filtros do mapa.',slideNumber++);
      chunk.forEach((item,idx)=>{const y=1.52+idx*.59,statusColor=({up:GREEN,down:'B23B3B',flat:'6F8497',attention:'E29B24',excellent:GREEN})[item.status]||'8AA0B2';slide.addShape('roundRect',{x:.72,y,w:11.95,h:.5,rectRadius:.05,line:{color:'E0E8EF',width:.7},fill:{color:idx%2?'FBFDFE':'FFFFFF'}});slide.addShape('rect',{x:.72,y,w:.08,h:.5,line:{color:statusColor,transparency:100},fill:{color:statusColor}});slide.addText(item.point.name,{x:.96,y:y+.08,w:5.05,h:.17,fontFace:'Aptos Display',fontSize:12.5,bold:true,color:NAVY,margin:0,fit:'shrink'});slide.addText(`${item.point.creLabel||''} · ${item.point.agent||'Sem agente'}`,{x:.96,y:y+.29,w:5.0,h:.11,fontFace:'Aptos',fontSize:7.8,color:MUTED,margin:0,fit:'shrink'});slide.addText(item.metric,{x:6.18,y:y+.11,w:3.72,h:.18,fontFace:'Aptos',fontSize:10.5,bold:true,color:INK,align:'right',margin:0,fit:'shrink'});slide.addShape('roundRect',{x:10.15,y:y+.09,w:2.22,h:.3,rectRadius:.1,line:{color:statusColor,width:.8},fill:{color:'F7FAFC'}});slide.addText(item.label,{x:10.28,y:y+.18,w:1.96,h:.1,fontFace:'Aptos',fontSize:7.8,bold:true,color:statusColor,align:'center',margin:0,fit:'shrink'});});
    }
    return slideNumber;
  }
  function addGeoSkillSlide(pptx,ctx,slideNumber){
    const rows=collectGeoRowsForPpt(),skills=collectGeoAdrSkillsForPpt(rows);if(!skills.length)return false;
    const slide=pptx.addSlide();addHeader(slide,ctx,'Habilidades mais desafiadoras','Médias ponderadas pelas quantidades avaliadas nas unidades visíveis; menores percentuais aparecem primeiro.',slideNumber);
    skills.forEach((item,idx)=>{const col=idx<5?0:1,row=idx%5,x=.72+col*6.1,y=1.58+row*1.02,w=5.82;slide.addShape('roundRect',{x,y,w,h:.88,rectRadius:.06,line:{color:BORDER,width:.8},fill:{color:WHITE}});slide.addText(item.label,{x:x+.2,y:y+.13,w:1.6,h:.16,fontFace:'Aptos',fontSize:10,bold:true,color:GREEN_DARK,margin:0,fit:'shrink'});slide.addText(`${slideScore(item.value,1)}%`,{x:x+w-1.05,y:y+.12,w:.82,h:.17,fontFace:'Aptos Display',fontSize:12.5,bold:true,color:NAVY,align:'right',margin:0,fit:'shrink'});slide.addText(item.description||'Habilidade sem descrição carregada na matriz desta versão.',{x:x+.2,y:y+.34,w:w-.42,h:.19,fontFace:'Aptos',fontSize:8.5,color:INK,margin:0,fit:'shrink'});drawMiniBar(slide,{x:x+.2,y:y+.69,w:w-.4,h:.09,value:item.value,max:100,color:col===0?BLUE:GREEN});});
    return true;
  }
  function addNativeDataSlides(pptx,ctx,slideNumber){
    let n=slideNumber;
    if(ctx.sectionId==='resultados'){
      if(addSomScatterSlide(pptx,ctx,n))n++;
      if(addSomRankSlide(pptx,ctx,n))n++;
      if(addSomProgressSlide(pptx,ctx,n))n++;
    }else if(ctx.sectionId==='adrs'){
      if(document.getElementById('adrMetric')?.value==='avaliadosPct')return n;
      const isProgress=document.getElementById('adrMode')?.value==='progressao';
      if(isProgress){if(addAdrProgressSlide(pptx,ctx,n))n++;}
      else if(addAdrRankSlide(pptx,ctx,n))n++;
    }else if(ctx.sectionId==='georreferenciamento'){
      if(addGeoSummarySlide(pptx,ctx,n))n++;
      n=addGeoSchoolResultSlides(pptx,ctx,n);
      if(addGeoSkillSlide(pptx,ctx,n))n++;
    }
    return n;
  }

  function addDualCaptureSlide(pptx,ctx,left,right,slideNumber){
    if(!left||!right)return false;
    const slide=pptx.addSlide();
    addHeader(slide,ctx,'Visuais centrais do recorte','Os principais painéis da dashboard são reorganizados em uma composição com melhor leitura para apresentação.',slideNumber);
    const boxes=[{x:.68,y:1.52,w:5.84,h:5.48,data:left},{x:6.81,y:1.52,w:5.84,h:5.48,data:right}];
    boxes.forEach(box=>{
      slide.addShape('roundRect',{x:box.x,y:box.y,w:box.w,h:box.h,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
      slide.addText(box.data.title,{x:box.x+.18,y:box.y+.16,w:box.w-.36,h:.18,fontFace:'Aptos',fontSize:9.5,bold:true,color:INK,margin:0,fit:'shrink'});
      const placed=fitImage(box.data.capture.width,box.data.capture.height,{x:box.x+.14,y:box.y+.46,w:box.w-.28,h:box.h-.6});
      slide.addImage({data:box.data.capture.data,x:placed.x,y:placed.y,w:placed.w,h:placed.h,altText:box.data.title});
    });
    return true;
  }


  function adrSelectedUnitForFullDeck(){
    if(document.querySelector('.section.active')?.id!=='adrs')return null;
    let rows=[];
    try{rows=adrFilteredRows({ignoreAdr:true}).filter(Boolean);}catch(_){rows=[];}
    const ctx=presentationContext();
    const explicit=cleanText(ctx.school||selectedSchoolForSection('adrs'));
    let candidates=rows;
    if(explicit)candidates=rows.filter(r=>slideNorm(r.escola)===slideNorm(explicit));
    const schools=unique(candidates.map(r=>cleanText(r.escola)));
    if(schools.length!==1)return null;
    const school=schools[0];
    const cres=unique(candidates.filter(r=>slideNorm(r.escola)===slideNorm(school)).map(r=>cleanText(r.regional)));
    const cre=cres.length===1?cres[0]:'';
    const all=(Array.isArray(ADR_ROWS)?ADR_ROWS:[]).filter(r=>slideNorm(r.escola)===slideNorm(school)&&(!cre||cleanText(r.regional)===cre));
    return all.length?{school,cre,rows:all}:null;
  }


  // v179 — implementação efetiva do PPT completo de ADR: sem 5º ano e sem % Avaliados.
  function v179CompOrder(comp){const order={LP:1,MT:2,CN:3,CH:4};return order[String(comp||'').toUpperCase()]||99;}
  function v179YearOrder(year){const m=String(year||'').match(/\d+/);return m?Number(m[0]):99;}
  function v179Color(comp){const map={LP:BLUE,MT:GREEN,CN:'D9861C',CH:'8B5CF6'};return map[String(comp||'').toUpperCase()]||'64748B';}
  function v179IndicatorDefs(){return [
    {key:'adequado',label:'% Adequado',color:GREEN},
    {key:'abaixo',label:'% Abaixo do Básico',color:'B23B3B'}
  ];}
  function v179GroupAdrUnitRowsByYear(rows){
    const years=unique((rows||[]).map(r=>cleanText(r.ano))).sort((a,b)=>v179YearOrder(a)-v179YearOrder(b));
    return years.map(ano=>{
      const yearRows=(rows||[]).filter(r=>cleanText(r.ano)===ano);
      const comps=unique(yearRows.map(r=>cleanText(r.componente))).sort((a,b)=>v179CompOrder(a)-v179CompOrder(b)||String(a).localeCompare(String(b),'pt-BR'));
      return {ano,rows:yearRows,components:comps.map(component=>({component,rows:yearRows.filter(r=>cleanText(r.componente)===component)}))};
    });
  }
  function v179AddAdrUnitYearIndicatorSlide(pptx,ctx,unit,yearBlock,metricDef,slideNumber){
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
  
  function v179AddAdrUnitSkillDeckSlide(pptx,ctx,unit,comp,ano,rows,slideNumber){
    const adrs=unique(rows.map(r=>cleanText(r.adr))).sort((a,b)=>adrOrder(a)-adrOrder(b));
    const latestAdr=adrs.at(-1);
    const adrRows=rows.filter(r=>cleanText(r.adr)===latestAdr);
    let skills=collectAdrSkillGroupsFromRows(adrRows,{limit:5,includeAdr:false}).slice(0,5).map(item=>{
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
  async function generateAdrUnitFullPresentationV179(){
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
      await pptYieldV190();
      const years=v179GroupAdrUnitRowsByYear(unit.rows);
      years.forEach(yearBlock=>{
        addBigDividerSlide(pptx,ctx,yearBlock.ano,`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
        v179IndicatorDefs().forEach(def=>{if(v179AddAdrUnitYearIndicatorSlide(pptx,ctx,unit,yearBlock,def,slideNumber))slideNumber++;});
        yearBlock.components.forEach(compBlock=>{
          addBigDividerSlide(pptx,ctx,componentFullName(compBlock.component),`${yearBlock.ano} · ${unit.school}`,slideNumber++);
          if(v179AddAdrUnitSkillDeckSlide(pptx,ctx,unit,compBlock.component,yearBlock.ano,compBlock.rows,slideNumber))slideNumber++;
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


  function resolvePresentationSchoolFocus(preferred=''){
    const candidates=[
      cleanText(preferred),
      selectedSchoolForSection('resultados'),
      selectedSchoolForSection('adrs'),
      selectedSchoolForSection('georreferenciamento'),
      cleanText(document.getElementById('detailDrawer')?.querySelector('h3')?.textContent)
    ].map(cleanText).filter(Boolean);
    return candidates[0]||'';
  }
  function somUnitMatchSchool(row,school,record){
    const rowName=cleanText(row?.escola);
    if(!rowName)return false;
    const focusName=cleanText(school||record?.unidade||'');
    if(focusName&&slideNorm(rowName)===slideNorm(focusName))return true;
    const rowRecord=typeof somFindRecord==='function'?somFindRecord(rowName):null;
    if(record&&rowRecord&&slideNorm(rowRecord.unidade||'')===slideNorm(record.unidade||''))return true;
    if(!record&&focusName&&rowRecord&&slideNorm(rowRecord.unidade||'')===slideNorm(focusName))return true;
    return false;
  }
  function pptSchoolAliasKeyV199(value){
    let s=slideNorm(cleanText(value||''));
    if(!s)return '';
    s=s.replace(/^\s*\d{5,}\s*[-–—]?\s*/,'');
    s=s.replace(/\([^)]*\)/g,' ');
    // Normalizações verificadas na varredura das 11 CREs.
    s=s.replace(/\bboa\s+ventura\b/g,'boaventura');
    s=s.replace(/\bcorrea\b/g,'correia');
    s=s.replace(/\bbenjamim\b/g,'benjamin');
    s=s.replace(/\bgallotti\b|\bgalotti\b/g,'galloti');
    s=s.replace(/\bmanuel\b/g,'manoel');
    s=s.replace(/\bbonfim\b/g,'bomfim');
    s=s.replace(/\bmeireles\b/g,'meirelles');
    s=s.replace(/\bluis\b/g,'luiz');
    s=s.replace(/\badalgisa\b/g,'adalgiza');
    s=s.replace(/\bnery\b/g,'neri');
    // v204 — equivalências nominais verificadas no teste exaustivo do PPT (sem priorizar códigos).
    s=s.replace(/\bdrumond\b/g,'drummond');
    s=s.replace(/\blombardy\b/g,'lombardi');
    s=s.replace(/\bo(?:['’]|\s)*higgins\b/g,'ohiggins');
    s=s.replace(/\bclara\s+lucia\s+de\s+sousa\b/g,'clara lucia de souza');
    s=s.replace(/\bd(?:['’]|\s)*avila\b/g,'davila');
    s=s.replace(/\b1o\b/g,'1');
    // Nome histórico na base somativa x nome estrutural atual da mesma unidade.
    s=s.replace(/\bprofessora\s+sandra\s+pires\b/g,'marieta da cunha da silva');
    const generic=new Set([
      'escola','municipal','em','e','m','get','geo','ginasio','primario','educacional','tecnologico',
      'ciep','centro','integrado','educacao','publica','creche','cm','espaco','desenvolvimento','infantil','edi',
      'jardim','infancia','ji','biblioteca','popular','bpm','nucleo','arte','municipio','clube','escolar',
      'professor','professora','prof','doutor','doutora','dr','dra','presidente','pres','senador','senadora','sen',
      'prefeito','prefeita','pref','medalhista','olimpico','olimpica','civico','militar',
      'de','da','do','das','dos','e','antiga','antigo','abrigando'
    ]);
    return s.replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(token=>token&&!generic.has(token)).join(' ');
  }
  function pptSchoolAliasTokensV199(value){
    return new Set(pptSchoolAliasKeyV199(value).split(/\s+/).filter(Boolean));
  }
  function pptUnitTypeV199(value){
    const s=slideNorm(cleanText(value||''));
    // Tipos exclusivos têm precedência porque seus nomes às vezes contêm o nome de uma escola/CIEP de referência.
    if(/\bbiblioteca\b/.test(s))return 'biblioteca';
    if(/\bnucleo\b/.test(s))return 'nucleo';
    if(/\bclube\s+escolar\b/.test(s))return 'clube';
    if(/\bcreche\b/.test(s)||/^\s*cm\b/.test(s))return 'creche';
    if(/\bedi\b/.test(s)||/espaco\s+de\s+desenvolvimento\s+infantil/.test(s))return 'edi';
    if(/\bciep\b/.test(s))return 'ciep';
    if(/\bescola\s+municipal\b/.test(s)||/^\s*em\b/.test(s)||/^\s*e\s*m\b/.test(s))return 'em';
    return '';
  }
  function pptCreNumberV199(value){
    const m=cleanText(value||'').match(/\d{1,2}/);
    return m?Number(m[0]):0;
  }
  function pptSmeCodeV201(value,creNumber=0){
    const digits=String(value||'').replace(/\D/g,'');
    if(!digits)return '';
    // Na 10ª CRE a base somativa usa 10 + código de 5 dígitos, enquanto o cadastro estrutural guarda 0 + 5 dígitos.
    if(Number(creNumber)===10&&digits.length===7&&digits.startsWith('10'))return digits.slice(2).padStart(6,'0');
    return digits;
  }
  function pptSomRowIdentityV199(row){
    const cre=pptCreNumberV199(row?.cre||row?.regional||'');
    // v204: o nome continua sendo a identidade principal, mas o TIPO da unidade faz parte da chave.
    // Isso impede colisões como CIEP Presidente João Goulart x EM Presidente João Goulart (2ª CRE)
    // sem recorrer ao código SME/INEP como critério de prioridade.
    const rawName=cleanText(row?.escola||'');
    const alias=pptSchoolAliasKeyV199(rawName);
    const normalized=slideNorm(rawName);
    const unitType=pptUnitTypeV199(rawName)||'untyped';
    const schoolKey=alias||normalized;
    return [cre,unitType,schoolKey,cleanText(row?.modalidade),cleanText(row?.edicao),cleanText(row?.anoEscolar),cleanText(row?.componente)].join('|');
  }
  function pptSomSourceV199(){
    let canonical=[];
    try{canonical=typeof somBuildInitialRows==='function'?somBuildInitialRows():[];}catch(_){canonical=[];}
    if(!canonical.length){
      try{canonical=(Array.isArray(SOM_INITIAL)?SOM_INITIAL:[]).slice();}catch(_){canonical=[];}
    }
    const live=Array.isArray(SOM_ROWS)?SOM_ROWS:[];
    const map=new Map();
    // A base definitiva embutida tem prioridade. A deduplicação usa o nome da unidade, não o código.
    canonical.forEach(row=>{const key=pptSomRowIdentityV199(row);if(key&&!map.has(key))map.set(key,row);});
    live.forEach(row=>{const key=pptSomRowIdentityV199(row);if(key&&!map.has(key))map.set(key,row);});
    return [...map.values()];
  }
  let PPT_SOM_ALIAS_CODE_CACHE_V201=null;
  function pptSomAliasCodeIndexV201(){
    let source=[];
    try{source=pptSomSourceV199();}catch(_){source=[];}
    const signature=`${source.length}|${Array.isArray(SOM_ROWS)?SOM_ROWS.length:0}`;
    if(PPT_SOM_ALIAS_CODE_CACHE_V201?.signature===signature)return PPT_SOM_ALIAS_CODE_CACHE_V201.map;
    const temp=new Map();
    source.forEach(row=>{
      const cre=pptCreNumberV199(row?.cre||row?.regional||'');
      const code=pptSmeCodeV201(row?.codigoSME,cre);
      const name=slideNorm(cleanText(row?.escola||''));
      if(!cre||!code||!name)return;
      const key=`${cre}|${name}`;
      if(!temp.has(key))temp.set(key,new Set());
      temp.get(key).add(code);
    });
    const map=new Map();
    temp.forEach((codes,key)=>{if(codes.size===1)map.set(key,[...codes][0]);});
    PPT_SOM_ALIAS_CODE_CACHE_V201={signature,map};
    return map;
  }
  function pptInferredSmeCodeV201(row,rowCre=0){
    const direct=pptSmeCodeV201(row?.codigoSME,rowCre);
    if(direct)return direct;
    const name=slideNorm(cleanText(row?.escola||''));
    if(!rowCre||!name)return '';
    try{return pptSomAliasCodeIndexV201().get(`${rowCre}|${name}`)||'';}catch(_){return '';}
  }
  function pptStructuralRecordsV201(){
    if(Array.isArray(window.__GRA_ALL_STRUCTURAL_RECORDS)&&window.__GRA_ALL_STRUCTURAL_RECORDS.length)return window.__GRA_ALL_STRUCTURAL_RECORDS;
    return (typeof DATA!=='undefined'&&Array.isArray(DATA.records))?DATA.records:[];
  }
  function pptDuplicateStructuralCodeV201(code,field='codigoSME'){
    const digits=String(code||'').replace(/\D/g,'');
    if(!digits)return false;
    let count=0;
    for(const rec of pptStructuralRecordsV201()){
      const value=String(rec?.[field]||'').replace(/\D/g,'');
      if(value&&value===digits){count++;if(count>1)return true;}
    }
    return false;
  }
  function unitRowMatchesV190(row,focusSchool,record){
    const rowName=cleanText(row?.escola);
    if(!rowName)return false;
    const canonical=cleanText(record?.unidade||focusSchool);
    const recordCre=Number(record?.cre||0);
    const rowCre=pptCreNumberV199(row?.regional||row?.cre||'');
    if(recordCre&&rowCre&&rowCre!==recordCre)return false;

    // 1) NOME — critério principal e soberano.
    const rowNorm=slideNorm(rowName),focusNorm=slideNorm(focusSchool),canonicalNorm=slideNorm(canonical);
    if(rowNorm===focusNorm||rowNorm===canonicalNorm)return true;

    const rowType=pptUnitTypeV199(rowName),recordType=pptUnitTypeV199(canonical);
    if(rowType&&recordType&&rowType!==recordType)return false;

    const rowKey=pptSchoolAliasKeyV199(rowName);
    const focusKey=pptSchoolAliasKeyV199(focusSchool);
    const canonicalKey=pptSchoolAliasKeyV199(canonical);
    if(rowKey&&(rowKey===focusKey||rowKey===canonicalKey))return true;

    const a=pptSchoolAliasTokensV199(rowName),b=pptSchoolAliasTokensV199(canonical);
    if(a.size&&b.size){
      const small=a.size<=b.size?a:b,large=a.size<=b.size?b:a;
      let contained=0;small.forEach(token=>{if(large.has(token))contained++;});
      const union=new Set([...a,...b]);
      // Nomes como "EM Atenas" x "Escola Municipal Primário Atenas" devem casar.
      if(small.size>=2&&contained===small.size)return true;
      if(union.size>0&&(contained/union.size)>=0.72)return true;
    }

    // 2) CÓDIGO — apenas apoio, nunca prioridade. Só é aceito se não estiver duplicado
    // e se houver alguma compatibilidade nominal mínima. Assim um código errado não vence o nome.
    const recCode=String(record?.codigoSME||'').replace(/\D/g,'');
    const rowCode=String(row?.codigoSME||'').replace(/\D/g,'');
    if(recCode&&rowCode&&recCode===rowCode&&!pptDuplicateStructuralCodeV201(recCode,'codigoSME')){
      if(rowKey&&canonicalKey){
        const ra=pptSchoolAliasTokensV199(rowName),rb=pptSchoolAliasTokensV199(canonical);
        let common=0;ra.forEach(t=>{if(rb.has(t))common++;});
        if(common>0)return true;
      }
    }
    const recInep=String(record?.codigoINEP||'').replace(/\D/g,'');
    const rowInep=String(row?.codigoINEP||'').replace(/\D/g,'');
    if(recInep&&rowInep&&recInep===rowInep&&!pptDuplicateStructuralCodeV201(recInep,'codigoINEP')){
      const ra=pptSchoolAliasTokensV199(rowName),rb=pptSchoolAliasTokensV199(canonical);
      let common=0;ra.forEach(t=>{if(rb.has(t))common++;});
      if(common>0)return true;
    }
    return false;
  }
  function pptFindStructuralRecordV201(value,preferredCre=0,preferredAgent=''){
    const query=cleanText(value||'');
    if(!query)return null;
    const qNorm=slideNorm(query),qKey=pptSchoolAliasKeyV199(query),qType=pptUnitTypeV199(query);
    const agent=cleanText(preferredAgent||'');
    const genericAgent=!agent||/^(todos|todas|todas as unidades|todas as escolas|todos os agentes|todas as cres)$/i.test(agent);
    const pool=pptStructuralRecordsV201().filter(rec=>{
      if(preferredCre&&Number(rec?.cre)!==Number(preferredCre))return false;
      // A associação Escola → Agente já validada na base estrutural é preservada.
      if(!genericAgent&&cleanText(rec?.agente)!==agent)return false;
      return true;
    });
    const exact=pool.filter(rec=>slideNorm(rec?.unidade||'')===qNorm);
    if(exact.length===1)return exact[0];
    const keyed=pool.filter(rec=>{
      const type=pptUnitTypeV199(rec?.unidade||'');
      if(qType&&type&&qType!==type)return false;
      return qKey&&pptSchoolAliasKeyV199(rec?.unidade||'')===qKey;
    });
    if(keyed.length===1)return keyed[0];
    const contains=pool.filter(rec=>slideNorm(rec?.unidade||'').includes(qNorm)||qNorm.includes(slideNorm(rec?.unidade||'')));
    if(contains.length===1)return contains[0];
    // Fallback por aproximação nominal. Nenhum código é usado para escolher a unidade.
    const faux={escola:query,cre:preferredCre?`CRE ${String(preferredCre).padStart(2,'0')}`:''};
    const fuzzy=pool.filter(rec=>unitRowMatchesV190(faux,query,rec));
    return fuzzy.length===1?fuzzy[0]:null;
  }
  function somUnitMetaFromRowsV190(focusSchool,record,rows){
    const schoolLabel=cleanText(record?.unidade||focusSchool);
    const plan=cleanText(record?.planoAcao||'');
    let hasAI=/AI/.test(plan), hasAF=/AF/.test(plan);
    rows=Array.isArray(rows)?rows:[];
    if(!rows.length)return {school:schoolLabel,record,plan,hasAI,hasAF,summary:[],allRows:[]};
    // A disponibilidade real também confirma o segmento. Assim, um cadastro estrutural desatualizado
    // não consegue ocultar uma avaliação que efetivamente existe para a unidade.
    hasAI=hasAI||rows.some(row=>row.modalidade==='Avalia RJ'||(row.modalidade==='Prova Rio'&&['1º ano','3º ano'].includes(cleanText(row.anoEscolar)))||(row.modalidade==='IDEB 2025'&&cleanText(row.anoEscolar)==='Anos Iniciais'));
    hasAF=hasAF||rows.some(row=>(row.modalidade==='Prova Rio'&&cleanText(row.anoEscolar)==='7º ano')||(row.modalidade==='IDEB 2025'&&cleanText(row.anoEscolar)==='Anos Finais'));
    const allowed=[];
    if(hasAI)allowed.push('Avalia RJ|2º ano','Prova Rio|1º ano','Prova Rio|3º ano','IDEB 2025|Anos Iniciais');
    if(hasAF)allowed.push('Prova Rio|7º ano','IDEB 2025|Anos Finais');
    const allowedSet=new Set(allowed);
    const filtered=rows.filter(row=>{
      const key=`${cleanText(row.modalidade)}|${cleanText(row.anoEscolar)}`;
      return !allowedSet.size||allowedSet.has(key);
    });
    const byKey=new Map();
    filtered.forEach(row=>{
      const key=`${cleanText(row.modalidade)}|${cleanText(row.anoEscolar)}`;
      if(!byKey.has(key))byKey.set(key,{modalidade:cleanText(row.modalidade),anoEscolar:cleanText(row.anoEscolar),rows:[]});
      byKey.get(key).rows.push(row);
    });
    const orderMap=new Map([
      ['Avalia RJ|2º ano',1],['Prova Rio|1º ano',2],['Prova Rio|3º ano',3],['Prova Rio|7º ano',4],['IDEB 2025|Anos Iniciais',5],['IDEB 2025|Anos Finais',6]
    ]);
    const summary=[...byKey.values()].sort((a,b)=>{
      const ka=`${a.modalidade}|${a.anoEscolar}`,kb=`${b.modalidade}|${b.anoEscolar}`;
      return (orderMap.get(ka)||99)-(orderMap.get(kb)||99)||ka.localeCompare(kb,'pt-BR');
    }).map(entry=>{
      const rs=entry.rows||[];
      const lp=rs.find(row=>cleanText(row.componente).toUpperCase()==='LP')||rs.find(row=>Number.isFinite(Number(row.lp)));
      const mt=rs.find(row=>cleanText(row.componente).toUpperCase()==='MT')||rs.find(row=>Number.isFinite(Number(row.mt)));
      const base=rs[0]||{};
      return {...entry,row:base,lpRow:lp||null,mtRow:mt||null};
    });
    return {school:schoolLabel,record,plan,hasAI,hasAF,summary,allRows:filtered};
  }
  function somUnitRelevantBundle(school){
    const focusSchool=cleanText(school);
    if(!focusSchool)return null;
    const cached=window.__somUnitMetaV190;
    if(cached&&slideNorm(cached.school)===slideNorm(focusSchool))return cached.meta;
    const scopeCre=Number(document.getElementById('regionalScopeSelect')?.value||0);
    const record=pptFindStructuralRecordV201(focusSchool,scopeCre)||((typeof somFindRecord==='function')?somFindRecord(focusSchool):null);
    const rows=[];
    const source=pptSomSourceV199();
    for(const row of source){if(unitRowMatchesV190(row,focusSchool,record))rows.push(row);}
    return somUnitMetaFromRowsV190(focusSchool,record,rows);
  }

  function somUnitSummaryIncluded(meta){
    const labels=meta.summary.map(entry=>entry.modalidade==='IDEB 2025'?`IDEB 2025 · ${entry.anoEscolar}`:`${entry.modalidade} · ${entry.anoEscolar}`);
    return labels.length?labels:['Nenhuma somativa encontrada para a unidade nesta base'];
  }
  function addSomUnitScopeSlide(pptx,ctx,meta,slideNumber){
    const slide=pptx.addSlide();
    const subtitle=meta.plan
      ? `A seleção corresponde à unidade ${meta.school}, com Plano de Ação ${meta.plan}. A seção de somativas inclui somente as avaliações compatíveis com esse perfil.`
      : `A seção de somativas foi reorganizada para mostrar apenas os resultados da unidade ${meta.school}.`;
    addHeader(slide,ctx,'Somativas da unidade',subtitle,slideNumber);
    slide.addShape('roundRect',{x:.72,y:1.55,w:3.22,h:1.18,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    slide.addText('UNIDADE',{x:.92,y:1.77,w:1.05,h:.14,fontFace:'Aptos',fontSize:8.2,bold:true,color:MUTED,margin:0});
    slide.addText(meta.school,{x:.92,y:2.03,w:2.78,h:.32,fontFace:'Aptos Display',fontSize:17,bold:true,color:NAVY,margin:0,fit:'shrink'});
    const infoLine=[cleanText(meta.record?.creLabel||meta.record?.cre||''),cleanText(meta.record?.agente||'')].filter(Boolean).join(' · ');
    if(infoLine)slide.addText(infoLine,{x:.92,y:2.35,w:2.78,h:.15,fontFace:'Aptos',fontSize:8.2,color:INK,margin:0,fit:'shrink'});
    slide.addShape('roundRect',{x:4.1,y:1.55,w:8.57,h:1.18,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:'F9FBFD'}});
    slide.addText('REGRAS DO RECORTE',{x:4.3,y:1.77,w:1.45,h:.14,fontFace:'Aptos',fontSize:8.2,bold:true,color:MUTED,margin:0});
    const rules=[];
    if(meta.hasAI&&meta.hasAF)rules.push('Unidade com Anos Iniciais e Anos Finais: mostra Avalia RJ, Prova Rio (1º, 3º e 7º anos) e IDEB 2025 dos dois segmentos.');
    else if(meta.hasAI)rules.push('Unidade apenas de Anos Iniciais: mostra Avalia RJ, Prova Rio (1º e 3º anos) e IDEB 2025 · Anos Iniciais.');
    else if(meta.hasAF)rules.push('Unidade apenas de Anos Finais: mostra Prova Rio (7º ano) e IDEB 2025 · Anos Finais.');
    else rules.push('O Plano de Ação não permitiu identificar o segmento; foram consideradas apenas as somativas efetivamente encontradas na base da unidade.');
    slide.addText(rules.join(' '),{x:4.3,y:2.0,w:8.14,h:.39,fontFace:'Aptos',fontSize:12,color:INK,margin:0,fit:'shrink'});
    slide.addText(meta.plan?`Plano de Ação: ${meta.plan}`:'Plano de Ação indisponível no banco bruto desta versão.',{x:4.3,y:2.38,w:8.0,h:.14,fontFace:'Aptos',fontSize:8.2,color:MUTED,margin:0,fit:'shrink'});
    slide.addShape('roundRect',{x:.72,y:3.08,w:11.95,h:3.1,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    slide.addText('Avaliações incluídas no PPT',{x:.95,y:3.3,w:3.0,h:.18,fontFace:'Aptos Display',fontSize:16,bold:true,color:NAVY,margin:0});
    const labels=somUnitSummaryIncluded(meta);
    labels.forEach((label,idx)=>{
      const col=idx<3?0:1,row=idx%3,x=.98+col*5.92,y=3.72+row*.72;
      slide.addShape('roundRect',{x,y,w:5.5,h:.5,rectRadius:.08,line:{color:GREEN,width:.8},fill:{color:'F7FBF9'}});
      slide.addText(label,{x:x+.18,y:y+.17,w:5.12,h:.14,fontFace:'Aptos',fontSize:10.2,bold:true,color:INK,margin:0,fit:'shrink'});
    });
    if(!labels.length||/^Nenhuma/.test(labels[0])){
      slide.addText('Nenhum registro somativo da unidade foi localizado para o recorte atual.',{x:1.02,y:4.22,w:10.9,h:.22,fontFace:'Aptos',fontSize:11.5,color:'9B2F2F',margin:0,fit:'shrink'});
    }
    return true;
  }
  function somUnitSkillGroups(row,limit=3){
    const items=(row?.habilidades||[]).map(skill=>{
      const code=somCanonicalSkillCode(skill.codigo,row?.componente);
      const value=Number(skill.valor);
      return {code,component:String(code).startsWith('MT ')?'MT':'LP',value,description:somSkillDescription(code,skill.descricao||skill.descricaoHabilidade||'')};
    }).filter(item=>item.code&&Number.isFinite(item.value));
    return {
      LP:items.filter(item=>item.component==='LP').sort((a,b)=>a.value-b.value||a.code.localeCompare(b.code,'pt-BR')).slice(0,limit),
      MT:items.filter(item=>item.component==='MT').sort((a,b)=>a.value-b.value||a.code.localeCompare(b.code,'pt-BR')).slice(0,limit)
    };
  }
  function addSomUnitAssessmentSlide(pptx,ctx,meta,entry,slideNumber){
    const slide=pptx.addSlide();
    const label=entry.modalidade==='IDEB 2025'?`IDEB 2025 · ${entry.anoEscolar}`:`${entry.modalidade} · ${entry.anoEscolar}`;
    addHeader(slide,ctx,label,`Esta leitura considera exclusivamente os dados da unidade ${meta.school}.`,slideNumber);
    slide.addShape('roundRect',{x:.72,y:1.52,w:11.95,h:4.72,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    slide.addText(meta.school,{x:.96,y:1.74,w:5.8,h:.22,fontFace:'Aptos Display',fontSize:15,bold:true,color:NAVY,margin:0,fit:'shrink'});
    slide.addText([cleanText(meta.record?.creLabel||meta.record?.cre||''),cleanText(meta.record?.agente||''),label].filter(Boolean).join(' · '),{x:.96,y:2.0,w:7.5,h:.14,fontFace:'Aptos',fontSize:8.3,color:MUTED,margin:0,fit:'shrink'});
    const card=(x,y,w,h,title,value,note='',accent=GREEN)=>{
      slide.addShape('roundRect',{x,y,w,h,rectRadius:.06,line:{color:BORDER,width:.9},fill:{color:'FBFDFE'}});
      slide.addShape('rect',{x,y,w:.09,h,line:{color:accent,transparency:100},fill:{color:accent}});
      slide.addText(String(title||'').toUpperCase(),{x:x+.2,y:y+.16,w:w-.32,h:.14,fontFace:'Aptos',fontSize:8.1,bold:true,color:MUTED,margin:0,fit:'shrink'});
      slide.addText(value,{x:x+.2,y:y+.45,w:w-.32,h:.3,fontFace:'Aptos Display',fontSize:20,bold:true,color:NAVY,margin:0,fit:'shrink'});
      if(note)slide.addText(note,{x:x+.2,y:y+.95,w:w-.32,h:.18,fontFace:'Aptos',fontSize:8.1,color:INK,margin:0,fit:'shrink'});
    };
    if(entry.modalidade==='Avalia RJ'){
      const row=entry.row||{};
      card(.95,2.38,2.7,1.35,'LP',slidePct(row.lp),Number.isFinite(Number(row.proficienciaLP))?`Proficiência: ${slideScore(row.proficienciaLP,0)}`:'',BLUE);
      card(3.83,2.38,2.7,1.35,'MT',slidePct(row.mt),Number.isFinite(Number(row.proficienciaMT))?`Proficiência: ${slideScore(row.proficienciaMT,0)}`:'',GREEN);
      card(6.71,2.38,2.7,1.35,'Resultado geral',slidePct(Number(row.principal ?? row.media ?? row.adqAv)),`ADQ + AVA da unidade`,NAVY);
      const partLP=Number.isFinite(Number(row.participacaoLP))?slidePct(row.participacaoLP):'—';
      const partMT=Number.isFinite(Number(row.participacaoMT))?slidePct(row.participacaoMT):'—';
      card(9.59,2.38,2.1,1.35,'Participação',`${partLP} / ${partMT}`,`LP / MT`, 'E29B24');
      const skills=somUnitSkillGroups(row,3);
      slide.addText('Habilidades mais desafiadoras (síntese)',{x:.98,y:4.08,w:3.8,h:.18,fontFace:'Aptos Display',fontSize:14,bold:true,color:NAVY,margin:0});
      ['LP','MT'].forEach((comp,idx)=>{
        const items=skills[comp]||[],x=.98+idx*5.9;
        slide.addShape('roundRect',{x,y:4.38,w:5.62,h:1.4,rectRadius:.06,line:{color:BORDER,width:.8},fill:{color:'F9FBFD'}});
        slide.addText(comp==='LP'?'Língua Portuguesa':'Matemática',{x:x+.18,y:4.55,w:2.0,h:.15,fontFace:'Aptos',fontSize:9.2,bold:true,color:comp==='LP'?BLUE:GREEN_DARK,margin:0});
        if(items.length){items.forEach((item,i)=>slide.addText(`${item.code} — ${slidePct(item.value)}`,{x:x+.18,y:4.8+i*.28,w:5.1,h:.13,fontFace:'Aptos',fontSize:8,color:INK,margin:0,fit:'shrink'}));}
        else slide.addText('Sem habilidades carregadas nesta base.',{x:x+.18,y:4.98,w:5.1,h:.13,fontFace:'Aptos',fontSize:8,color:MUTED,margin:0,fit:'shrink'});
      });
    }else if(entry.modalidade==='Prova Rio'){
      const lp=entry.lpRow||{}, mt=entry.mtRow||{};
      card(.95,2.38,2.7,1.35,'LP · Adequado + Avançado',slidePct(Number(lp.principal ?? lp.adqAv)),`Abaixo do Básico: ${slidePct(lp.abaixo)}`,BLUE);
      card(3.83,2.38,2.7,1.35,'LP · Participação',Number.isFinite(Number(lp.avaliados))&&Number.isFinite(Number(lp.previstos))?`${Math.round(lp.avaliados)}/${Math.round(lp.previstos)}`:'—',Number.isFinite(Number(lp.previstos))?`Avaliados / previstos`:'',BLUE);
      card(6.71,2.38,2.7,1.35,'MT · Adequado + Avançado',slidePct(Number(mt.principal ?? mt.adqAv)),`Abaixo do Básico: ${slidePct(mt.abaixo)}`,GREEN);
      card(9.59,2.38,2.1,1.35,'MT · Participação',Number.isFinite(Number(mt.avaliados))&&Number.isFinite(Number(mt.previstos))?`${Math.round(mt.avaliados)}/${Math.round(mt.previstos)}`:'—',Number.isFinite(Number(mt.previstos))?`Avaliados / previstos`:'',GREEN);
      slide.addShape('roundRect',{x:.98,y:4.14,w:10.86,h:1.52,rectRadius:.06,line:{color:BORDER,width:.8},fill:{color:'F9FBFD'}});
      slide.addText('Leitura da Prova Rio', {x:1.18,y:4.34,w:2.2,h:.18,fontFace:'Aptos Display',fontSize:14,bold:true,color:NAVY,margin:0});
      slide.addText('Neste PPT a Prova Rio da unidade é mostrada apenas para o(s) ano(s) compatíveis com seu Plano de Ação. Em cada componente, o foco está no percentual em Adequado + Avançado, na participação e no percentual Abaixo do Básico.',{x:1.18,y:4.67,w:10.3,h:.42,fontFace:'Aptos',fontSize:10.4,color:INK,margin:0,fit:'shrink'});
    }else if(entry.modalidade==='IDEB 2025'){
      const row=entry.row||{};
      const growth=Number(row.crescimento);
      card(.95,2.38,2.7,1.35,'IDEB 2025',slideScore(row.ideb2025 ?? row.principal,1),Number.isFinite(Number(row.np))?`Nota padronizada: ${slideScore(row.np,2)}`:'',BLUE);
      card(3.83,2.38,2.7,1.35,'IDEB 2023',slideScore(row.ideb2023,1),Number.isFinite(Number(row.lp))?`LP: ${slideScore(row.lp,2)}`:'',GREEN);
      card(6.71,2.38,2.7,1.35,'Crescimento',Number.isFinite(growth)?`${growth>=0?'+':''}${slideScore(growth,1)}`:'—',Number.isFinite(Number(row.mt))?`MT: ${slideScore(row.mt,2)}`:'',Number.isFinite(growth)?(growth>=0?GREEN:'B23B3B'):'7A8794');
      card(9.59,2.38,2.1,1.35,'IR',slideScore(row.ir,3),Number.isFinite(Number(row.ranking))?`Ranking na CRE: ${Math.round(Number(row.ranking))}`:'','E29B24');
      slide.addShape('roundRect',{x:.98,y:4.14,w:10.86,h:1.52,rectRadius:.06,line:{color:BORDER,width:.8},fill:{color:'F9FBFD'}});
      slide.addText('Leitura do IDEB', {x:1.18,y:4.34,w:2.0,h:.18,fontFace:'Aptos Display',fontSize:14,bold:true,color:NAVY,margin:0});
      slide.addText('O slide mostra apenas o IDEB 2025 do segmento aplicável à unidade. Quando disponíveis, também aparecem o IDEB 2023, o crescimento entre as duas edições, as proficiências médias de LP/MT, a nota padronizada e a taxa de rendimento.',{x:1.18,y:4.67,w:10.3,h:.42,fontFace:'Aptos',fontSize:10.4,color:INK,margin:0,fit:'shrink'});
    }
    return true;
  }
  function addSomUnitPresentationSlides(pptx,ctx,slideNumber){
    const focus=resolvePresentationSchoolFocus(ctx.school||ctx.scopeTitle||'');
    if(!focus)return slideNumber;
    const meta=somUnitRelevantBundle(focus);
    if(!meta||!meta.summary?.length){
      return slideNumber;
    }
    ctx.school=meta.school;ctx.scopeTitle=meta.school;ctx.scopeKind='Escola';
    if(addSomUnitScopeSlide(pptx,ctx,meta,slideNumber))slideNumber++;
    meta.summary.forEach(entry=>{if(addSomUnitAssessmentSlide(pptx,ctx,meta,entry,slideNumber))slideNumber++;});
    return slideNumber;
  }

  // v188 — apresentação integral da unidade: ignora os filtros de componente/indicador
  // usados na tela e reúne todas as somativas compatíveis + todos os dados ADR disponíveis.
  function quickPresentationUnitV188(){
    try{
      const activeId=document.querySelector('.section.active')?.id||'';
      const regional=Number(document.getElementById('regionalScopeSelect')?.value||0);
      const geoState=(typeof GEO_STATE!=='undefined'?GEO_STATE:window.GEO_STATE);
      const directGeo=cleanText(geoState?.focusedSchool||'');
      if(directGeo){
        const rec=pptFindStructuralRecordV201(directGeo,regional)||((typeof somFindRecord==='function')?somFindRecord(directGeo):null);
        return {school:cleanText(rec?.unidade||directGeo),record:rec};
      }
      const drawer=document.getElementById('detailDrawer');
      if(drawer?.classList.contains('open')){
        const title=cleanText(drawer.querySelector('h3')?.textContent||'');
        if(title){
          const rec=pptFindStructuralRecordV201(title,regional)||((typeof somFindRecord==='function')?somFindRecord(title):null);
          return {school:cleanText(rec?.unidade||title),record:rec};
        }
      }
      const searchId=activeId==='adrs'?'adrSearch':activeId==='resultados'?'somSearch':activeId==='georreferenciamento'?'geoSearch':'';
      const qRaw=cleanText(searchId?document.getElementById(searchId)?.value:'');
      if(!qRaw)return null;
      const agentId=activeId==='adrs'?'adrAgente':activeId==='resultados'?'somAgente':activeId==='georreferenciamento'?'geoAgent':'';
      const agent=cleanText(agentId?document.getElementById(agentId)?.value:'');
      const rec=pptFindStructuralRecordV201(qRaw,regional,agent);
      if(rec)return {school:cleanText(rec.unidade),record:rec};
      // Se o usuário pesquisou exatamente uma linha somativa/ADR com nomenclatura antiga, recupera a escola pelo universo filtrado.
      const candidates=[];
      try{
        if(activeId==='resultados'&&typeof somFilteredRows==='function'){
          unique(somFilteredRows().map(r=>cleanText(r.escola))).forEach(name=>name&&candidates.push(name));
        }else if(activeId==='adrs'&&typeof adrFilteredRows==='function'){
          unique(adrFilteredRows().map(r=>cleanText(r.escola))).forEach(name=>name&&candidates.push(name));
        }
      }catch(_){}
      if(candidates.length===1){
        const fallback=pptFindStructuralRecordV201(candidates[0],regional,agent);
        return {school:cleanText(fallback?.unidade||candidates[0]),record:fallback};
      }
      return null;
    }catch(_){return null;}
  }
  const pptYieldV190=()=>new Promise(resolve=>setTimeout(resolve,0));
  async function allEvaluationSelectedUnitV190(){
    const quick=window.__slideUnitCandidateV188||quickPresentationUnitV188();
    const focus=cleanText(quick?.school||'');
    if(!focus)return null;
    const record=quick?.record||pptFindStructuralRecordV201(focus,Number(document.getElementById('regionalScopeSelect')?.value||0))||((typeof somFindRecord==='function')?somFindRecord(focus):null);
    const canonical=cleanText(record?.unidade||focus);
    const adrRows=[],somRows=[];
    const adrSource=Array.isArray(ADR_ROWS)?ADR_ROWS:[];
    const somSource=pptSomSourceV199();
    const batch=450;
    for(let i=0;i<adrSource.length;i+=batch){
      const end=Math.min(i+batch,adrSource.length);
      for(let j=i;j<end;j++){if(unitRowMatchesV190(adrSource[j],canonical,record))adrRows.push(adrSource[j]);}
      if(i+batch<adrSource.length){
        const pct=Math.round(end/Math.max(adrSource.length,1)*70);
        setSlideBusy(true,`Localizando dados da unidade… ${pct}%`);
        await pptYieldV190();
      }
    }
    for(let i=0;i<somSource.length;i+=batch){
      const end=Math.min(i+batch,somSource.length);
      for(let j=i;j<end;j++){if(unitRowMatchesV190(somSource[j],canonical,record))somRows.push(somSource[j]);}
      if(i+batch<somSource.length){
        const pct=70+Math.round(end/Math.max(somSource.length,1)*25);
        setSlideBusy(true,`Localizando dados da unidade… ${Math.min(95,pct)}%`);
        await pptYieldV190();
      }
    }
    const somMeta=somUnitMetaFromRowsV190(canonical,record,somRows);
    window.__somUnitMetaV190={school:canonical,meta:somMeta};
    const cre=cleanText(record?.creLabel||unique(adrRows.map(r=>cleanText(r.regional)))[0]||'');
    return {school:canonical,record,cre,adrRows,somRows,somMeta};
  }
  function allEvaluationSelectedUnitV188(){
    const quick=window.__slideUnitCandidateV188||quickPresentationUnitV188();
    const focus=cleanText(quick?.school||'');
    if(!focus)return null;
    const record=quick?.record||pptFindStructuralRecordV201(focus,Number(document.getElementById('regionalScopeSelect')?.value||0))||((typeof somFindRecord==='function')?somFindRecord(focus):null);
    const canonical=cleanText(record?.unidade||focus);
    const focusNorm=slideNorm(focus),canonicalNorm=slideNorm(canonical);
    const focusKey=typeof schoolMatchKey==='function'?schoolMatchKey(focus):focusNorm;
    const canonicalKey=typeof schoolMatchKey==='function'?schoolMatchKey(canonical):canonicalNorm;
    const recordCre=Number(record?.cre||0);
    const matchesSchool=row=>{
      const rowName=cleanText(row?.escola);
      if(!rowName)return false;
      if(recordCre){
        const raw=cleanText(row?.regional||row?.cre||'');
        const m=raw.match(/\d{1,2}/);
        if(m&&Number(m[0])!==recordCre)return false;
      }
      const rowNorm=slideNorm(rowName);
      if(rowNorm===canonicalNorm||rowNorm===focusNorm)return true;
      const rowKey=typeof schoolMatchKey==='function'?schoolMatchKey(rowName):rowNorm;
      if(rowKey&&canonicalKey&&rowKey===canonicalKey)return true;
      if(rowKey&&focusKey&&rowKey===focusKey)return true;
      if(rowKey&&canonicalKey&&Math.min(rowKey.length,canonicalKey.length)>=10&&(rowKey.includes(canonicalKey)||canonicalKey.includes(rowKey)))return true;
      return false;
    };
    const adrRows=(Array.isArray(ADR_ROWS)?ADR_ROWS:[]).filter(matchesSchool);
    const cre=cleanText(record?.creLabel||unique(adrRows.map(r=>cleanText(r.regional)))[0]||'');
    return {school:canonical,record,cre,adrRows};
  }
  function allEvaluationSelectedUnitV187(){return allEvaluationSelectedUnitV188();}
  function addNoDataUnitSlideV187(pptx,ctx,title,text,slideNumber){
    const slide=pptx.addSlide();
    addHeader(slide,ctx,title,'Leitura integral da unidade selecionada.',slideNumber);
    slide.addShape('roundRect',{x:1.05,y:2.15,w:11.25,h:2.35,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:'F9FBFD'}});
    slide.addText(text,{x:1.45,y:2.82,w:10.45,h:.85,fontFace:'Aptos',fontSize:18,color:INK,align:'center',valign:'mid',margin:.08,fit:'shrink'});
    return true;
  }
  async function generateAllEvaluationUnitPresentationV188(){
    setSlideBusy(true,'Localizando todos os dados da unidade…');
    await pptYieldV190();
    const unit=await allEvaluationSelectedUnitV190();
    if(!unit){setSlideBusy(false);slideToast('Selecione uma única escola para gerar todos os dados de avaliação da unidade.',true);return;}
    const originalActive=document.querySelector('.section.active')?.id||'adrs';
    const originalNav=document.querySelector('.nav button[data-section].active')?.dataset?.section||originalActive;
    const originalScrollY=window.scrollY||0;
    const restore=()=>{
      document.querySelectorAll('.section').forEach(el=>el.classList.remove('active'));
      document.getElementById(originalActive)?.classList.add('active');
      document.querySelectorAll('.nav button[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===originalNav));
      if(originalActive==='resultados'&&typeof renderResultados==='function')renderResultados();
      if(originalActive==='adrs'&&typeof renderADRs==='function')renderADRs();
      window.scrollTo(0,originalScrollY);
    };
    const ctx=presentationContext();
    ctx.scopeTitle=unit.school;ctx.scopeKind='Escola';ctx.school=unit.school;ctx.sectionLabel='Todos os dados de avaliação';
    setSlideBusy(true,'Montando todos os dados de avaliação da unidade…');
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

      // SOMATIVAS — usa a base completa da unidade, e não os filtros atualmente visíveis.
      setSlideBusy(true,'Organizando todas as avaliações somativas da unidade…');
      addBigDividerSlide(pptx,ctx,'Avaliações Somativas',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
      const somMeta=somUnitRelevantBundle(unit.school);
      if(somMeta?.summary?.length){
        const somCtx={...ctx,sectionId:'resultados',sectionLabel:'Avaliações Somativas'};
        slideNumber=addSomUnitPresentationSlides(pptx,somCtx,slideNumber);
        await pptYieldV190();
      }else{
        addNoDataUnitSlideV187(pptx,ctx,'Avaliações Somativas','Não há resultados somativos disponíveis para esta unidade na base atual.',slideNumber++);
      }

      // ADRs — todos os anos/componentes/ADRs da unidade. O indicador selecionado na tela é ignorado.
      setSlideBusy(true,'Organizando todos os dados das ADRs…');
      addBigDividerSlide(pptx,ctx,'Avaliações Formativas · ADRs',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
      const years=v179GroupAdrUnitRowsByYear(unit.adrRows||[]);
      if(!years.length){
        addNoDataUnitSlideV187(pptx,ctx,'Avaliações Formativas · ADRs','Não há registros de ADR disponíveis para esta unidade na base atual.',slideNumber++);
      }else{
        for(const yearBlock of years){
          addBigDividerSlide(pptx,ctx,yearBlock.ano,`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
          await pptYieldV190();
          // Adequado e Abaixo do Básico: cada indicador usa um único gráfico com
          // linhas separadas por componente (LP, MT e demais componentes disponíveis).
          for(const def of v179IndicatorDefs()){
            if(v179AddAdrUnitYearIndicatorSlide(pptx,ctx,unit,yearBlock,def,slideNumber))slideNumber++;
            await pptYieldV190();
          }
          // Habilidades: inclui cada ADR disponível de cada componente, não apenas o filtro atual.
          for(const compBlock of yearBlock.components){
            const adrs=unique(compBlock.rows.map(r=>cleanText(r.adr))).sort((a,b)=>adrOrder(a)-adrOrder(b));
            for(const adr of adrs){
              if(addAdrUnitSkillDeckSlide(pptx,ctx,unit,compBlock.component,yearBlock.ano,compBlock.rows,adr,slideNumber))slideNumber++;
              await pptYieldV190();
            }
          }
        }
      }

      const date=new Date();
      const stamp=`${String(date.getFullYear())}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
      const filename=`Dashboard_GRA_${safeFile(unit.school)}_Todos_Dados_Avaliacao_${stamp}.pptx`;
      setSlideBusy(true,'Finalizando a apresentação completa…');
      await pptYieldV190();
      const output=await pptx.write({outputType:'blob',compression:false});
      const blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      forcePresentationDownload(blob,filename,null);
      slideToast(`Download iniciado: ${filename}`);
    }catch(err){
      console.error('Falha ao gerar todos os dados de avaliação da unidade',err);
      slideToast(`Não foi possível gerar a apresentação completa: ${cleanText(err?.message||'erro desconhecido')}`,true);
    }finally{
      restore();
      setSlideBusy(false);
    }
  }
  async function generateCombinedFormativeSummativePresentationV185(){
    const originalActive=document.querySelector('.section.active')?.id||'resultados';
    const originalNav=document.querySelector('.nav button[data-section].active')?.dataset?.section||originalActive;
    const originalScrollY=window.scrollY||0;
    const activateForExport=async(sectionId)=>{
      document.querySelectorAll('.section').forEach(el=>el.classList.remove('active'));
      const section=document.getElementById(sectionId);
      if(section)section.classList.add('active');
      if(sectionId==='resultados'&&typeof renderResultados==='function')renderResultados();
      if(sectionId==='adrs'&&typeof renderADRs==='function')renderADRs();
      await new Promise(resolve=>setTimeout(resolve,90));
      return presentationContext();
    };
    const restore=()=>{
      document.querySelectorAll('.section').forEach(el=>el.classList.remove('active'));
      document.getElementById(originalActive)?.classList.add('active');
      document.querySelectorAll('.nav button[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===originalNav));
      if(originalActive==='resultados'&&typeof renderResultados==='function')renderResultados();
      if(originalActive==='adrs'&&typeof renderADRs==='function')renderADRs();
      window.scrollTo(0,originalScrollY);
    };
    setSlideBusy(true,'Preparando apresentação integrada de Somativas + ADRs…');
    try{
      await ensureLibraries();
      const PptxCtor=window.PptxGenJS||window.pptxgen;
      const pptx=new PptxCtor();
      pptx.layout='LAYOUT_WIDE';
      pptx.author='GRA · SME-Rio';
      pptx.company='Secretaria Municipal de Educação do Rio de Janeiro';
      pptx.subject='Avaliações formativas e somativas';
      pptx.lang='pt-BR';
      pptx.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'pt-BR'};

      const firstCtx=await activateForExport('resultados');
      const schoolFocus=resolvePresentationSchoolFocus(firstCtx.school||'');
      const integratedCtx={...firstCtx,sectionLabel:'Avaliações Formativas e Somativas'};
      if(schoolFocus){integratedCtx.school=schoolFocus;integratedCtx.scopeTitle=schoolFocus;integratedCtx.scopeKind='Escola';}
      pptx.title=`${integratedCtx.scopeTitle} — Avaliações Formativas e Somativas`;
      addCoverSlide(pptx,integratedCtx);
      let slideNumber=2;

      // SOMATIVAS: quando houver uma unidade focal, o PPT mostra somente as somativas dessa unidade.
      setSlideBusy(true,'Organizando avaliações somativas…');
      let somCtx=presentationContext();
      if(schoolFocus){somCtx={...somCtx,school:schoolFocus,scopeTitle:schoolFocus,scopeKind:'Escola'};}
      addBigDividerSlide(pptx,somCtx,'Avaliações Somativas',`${somCtx.scopeTitle} · recorte configurado na aba Somativas`,slideNumber++);
      if(somCtx.school){
        const nextSlideNumber=addSomUnitPresentationSlides(pptx,somCtx,slideNumber);
        if(nextSlideNumber===slideNumber){
          if(addOverviewSlide(pptx,somCtx,slideNumber))slideNumber++;
          slideNumber=addNativeDataSlides(pptx,somCtx,slideNumber);
          if(addSkillInsightSlide(pptx,somCtx,slideNumber))slideNumber++;
        }else{
          slideNumber=nextSlideNumber;
        }
      }else{
        if(addOverviewSlide(pptx,somCtx,slideNumber))slideNumber++;
        slideNumber=addNativeDataSlides(pptx,somCtx,slideNumber);
        if(addSkillInsightSlide(pptx,somCtx,slideNumber))slideNumber++;
      }

      // FORMATIVAS / ADRs: usa exatamente os filtros que já estão configurados na aba ADRs.
      setSlideBusy(true,'Organizando avaliações formativas (ADRs)…');
      let adrCtx=await activateForExport('adrs');
      addBigDividerSlide(pptx,adrCtx,'Avaliações Formativas · ADRs',`${adrCtx.scopeTitle} · recorte configurado na aba ADRs`,slideNumber++);
      const adrProgressMode=document.getElementById('adrMode')?.value==='progressao';
      if(!adrProgressMode&&addOverviewSlide(pptx,adrCtx,slideNumber))slideNumber++;
      slideNumber=addNativeDataSlides(pptx,adrCtx,slideNumber);
      if(addSkillInsightSlide(pptx,adrCtx,slideNumber))slideNumber++;

      const date=new Date();
      const stamp=`${String(date.getFullYear())}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
      const filename=`Dashboard_GRA_${safeFile(integratedCtx.scopeTitle)}_Formativas_e_Somativas_${stamp}.pptx`;
      setSlideBusy(true,'Finalizando apresentação integrada e iniciando o download…');
      const output=await pptx.write({outputType:'blob',compression:true});
      const blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      forcePresentationDownload(blob,filename,null);
      slideToast(`Download iniciado: ${filename}`);
    }catch(err){
      console.error('Falha ao gerar PPTX integrado Formativas + Somativas',err);
      slideToast(`Não foi possível gerar a apresentação integrada: ${cleanText(err?.message||'erro desconhecido')}`,true);
    }finally{
      restore();
      setSlideBusy(false);
    }
  }

  function askSlideExportMode(){
    return new Promise(resolve=>{
      const unit=quickPresentationUnitV188();
      window.__slideUnitCandidateV188=unit||null;
      let overlay=document.getElementById('slideChoiceOverlay');
      if(overlay)overlay.remove();
      overlay=document.createElement('div');
      overlay.id='slideChoiceOverlay';
      overlay.className='slide-choice-backdrop';
      overlay.innerHTML=`<div class="slide-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="slideChoiceTitle"><h3 id="slideChoiceTitle">De quais dados deseja gerar apresentação?</h3><p>Escolha entre reproduzir apenas a leitura atual ou gerar uma apresentação completa da unidade, sem limitar os dados aos filtros de componente e indicador selecionados na tela.</p><div class="slide-choice-options"><button type="button" class="slide-choice-option" data-choice="current"><span class="slide-choice-radio"></span><span class="slide-choice-text"><strong>Somente o que está sendo visualizado</strong><span>Preserva exatamente o recorte, filtros, componente e indicador visíveis agora.</span></span></button><button type="button" class="slide-choice-option" data-choice="allEvaluation"><span class="slide-choice-radio"></span><span class="slide-choice-text"><strong>Todos os dados de avaliação</strong><span>Reúne todas as somativas compatíveis com a unidade e todos os dados disponíveis de ADR, incluindo componentes, indicadores e habilidades.</span></span></button></div><div class="slide-choice-actions"><button type="button" class="slide-choice-cancel">Cancelar</button></div></div>`;
      document.body.appendChild(overlay);
      const allBtn=overlay.querySelector('[data-choice="allEvaluation"]');
      allBtn.disabled=!unit;
      allBtn.querySelector('.slide-choice-text span').textContent=unit
        ? `Unidade identificada: ${unit.school}. Serão ignorados os filtros atuais de componente e indicador para reunir todo o histórico de avaliação disponível.`
        : 'Disponível quando uma única escola estiver selecionada.';
      const close=choice=>{overlay.classList.remove('open');overlay.onclick=null;overlay.querySelectorAll('button').forEach(btn=>btn.onclick=null);resolve(choice);};
      overlay.querySelector('[data-choice="current"]').onclick=()=>close('current');
      allBtn.onclick=()=>{if(!allBtn.disabled)close('allEvaluation');};
      overlay.querySelector('.slide-choice-cancel').onclick=()=>close(null);
      overlay.onclick=e=>{if(e.target===overlay)close(null);};
      overlay.classList.add('open');
    });
  }

  function componentFullName(c){
    const m={LP:'Língua Portuguesa',MT:'Matemática',CN:'Ciências da Natureza',CH:'Ciências Humanas','História':'História','Geografia':'Geografia'};
    return m[String(c||'').toUpperCase()]||String(c||'Componente');
  }
  function addBigDividerSlide(pptx,ctx,title,subtitle,slideNumber){
    const slide=pptx.addSlide();
    slide.background={color:NAVY};
    slide.addShape('rect',{x:0,y:0,w:13.333,h:7.5,line:{color:NAVY,transparency:100},fill:{color:NAVY}});
    slide.addShape('rect',{x:0,y:0,w:13.333,h:.14,line:{color:GREEN,transparency:100},fill:{color:GREEN}});
    slide.addText(title,{x:.8,y:2.35,w:11.75,h:.72,fontFace:'Aptos Display',fontSize:34,bold:true,color:WHITE,margin:0,fit:'shrink'});
    slide.addText(subtitle||ctx.scopeTitle,{x:.84,y:3.25,w:10.8,h:.34,fontFace:'Aptos',fontSize:16,color:'D6E9F5',margin:0,fit:'shrink'});
    slide.addShape('line',{x:.82,y:4.0,w:4.2,h:0,line:{color:GREEN,width:3}});
    slide.addText(String(slideNumber).padStart(2,'0'),{x:11.55,y:6.75,w:.8,h:.22,fontFace:'Aptos Display',fontSize:13,bold:true,color:'8ED4B8',align:'right',margin:0});
    return true;
  }

  function groupAdrUnitRows(rows){
    const compOrder={LP:1,MT:2,CN:3,'História':4,'Geografia':5,CH:6};
    const yearOrder=year=>{const n=Number(String(year||'').match(/\d+/)?.[0]||99);return n;};
    const comps=unique(rows.map(r=>cleanText(r.componente))).sort((a,b)=>(compOrder[a]||99)-(compOrder[b]||99)||a.localeCompare(b,'pt-BR'));
    return comps.map(comp=>({component:comp,years:unique(rows.filter(r=>r.componente===comp).map(r=>cleanText(r.ano))).sort((a,b)=>yearOrder(a)-yearOrder(b)).map(ano=>({ano,rows:rows.filter(r=>r.componente===comp&&r.ano===ano)}))}));
  }

  function addAdrUnitMetricDeckSlide(pptx,ctx,unit,comp,ano,rows,slideNumber){
    const adrs=unique(rows.map(r=>cleanText(r.adr))).sort((a,b)=>adrOrder(a)-adrOrder(b));
    if(!adrs.length)return false;
    const slide=pptx.addSlide();
    addHeader(slide,ctx,`${componentFullName(comp)} · ${ano}`,'Evolução da unidade por indicador disponível nas ADRs.',slideNumber);
    const metricDefs=[{key:'adequado',label:'% Adequado',color:GREEN},{key:'abaixo',label:'% Abaixo do Básico',color:'B23B3B'},{key:'avaliadosPct',label:'% Avaliados',color:BLUE}];
    const series=metricDefs.map(def=>({def,values:adrs.map(adr=>{const rs=rows.filter(r=>cleanText(r.adr)===adr);return rs.length?adrWeightAvg(rs,def.key):null;})})).filter(s=>s.values.some(v=>Number.isFinite(Number(v))));
    const chart={x:.78,y:1.45,w:11.78,h:3.85};
    slide.addShape('roundRect',{x:chart.x,y:chart.y,w:chart.w,h:chart.h,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
    const plot={x:chart.x+.72,y:chart.y+.42,w:chart.w-1.05,h:chart.h-.88};
    for(let t=0;t<=4;t++){const yy=plot.y+plot.h*t/4;slide.addShape('line',{x:plot.x,y:yy,w:plot.w,h:0,line:{color:'E6EDF3',width:.75}});slide.addText(`${100-t*25}%`,{x:chart.x+.1,y:yy-.07,w:.48,h:.12,fontFace:'Aptos',fontSize:7.2,color:MUTED,align:'right',margin:0});}
    const x=i=>plot.x+(adrs.length===1?plot.w/2:plot.w*i/(adrs.length-1));
    const y=v=>plot.y+plot.h*(1-Math.max(0,Math.min(100,Number(v)))/100);
    series.forEach(s=>{
      for(let i=0;i<adrs.length-1;i++){const a=s.values[i],b=s.values[i+1];if(!Number.isFinite(Number(a))||!Number.isFinite(Number(b)))continue;pptSafeLineSegmentV226(slide,x(i),y(a),x(i+1),y(b),{color:s.def.color,width:3});}
      s.values.forEach((v,i)=>{if(!Number.isFinite(Number(v)))return;slide.addShape('ellipse',{x:x(i)-.055,y:y(v)-.055,w:.11,h:.11,line:{color:WHITE,width:1},fill:{color:s.def.color}});slide.addText(slidePct(v),{x:x(i)-.42,y:y(v)-.32,w:.84,h:.12,fontFace:'Aptos',fontSize:7.8,bold:true,color:NAVY,align:'center',margin:0,fit:'shrink'});});
    });
    adrs.forEach((adr,i)=>slide.addText(adr,{x:x(i)-.45,y:chart.y+chart.h-.32,w:.9,h:.13,fontFace:'Aptos',fontSize:8.5,bold:true,color:MUTED,align:'center',margin:0}));
    series.forEach((s,idx)=>{const x0=1.05+idx*2.25;slide.addShape('ellipse',{x:x0,y:5.55,w:.1,h:.1,line:{color:s.def.color,transparency:100},fill:{color:s.def.color}});slide.addText(s.def.label,{x:x0+.15,y:5.535,w:1.9,h:.12,fontFace:'Aptos',fontSize:8.2,bold:true,color:INK,margin:0,fit:'shrink'});});
    const latest=adrs.at(-1);
    const latestRows=rows.filter(r=>cleanText(r.adr)===latest);
    const cards=metricDefs.map(def=>({label:def.label,value:slidePct(latestRows.length?adrWeightAvg(latestRows,def.key):NaN),color:def.color}));
    cards.forEach((card,idx)=>{const x0=.78+idx*4.03,y0=6.02;slide.addShape('roundRect',{x:x0,y:y0,w:3.79,h:.72,rectRadius:.06,line:{color:BORDER,width:1},fill:{color:'F9FBFD'}});slide.addShape('rect',{x:x0,y:y0,w:.07,h:.72,line:{color:card.color,transparency:100},fill:{color:card.color}});slide.addText(card.value,{x:x0+.2,y:y0+.16,w:1.2,h:.22,fontFace:'Aptos Display',fontSize:16,bold:true,color:NAVY,margin:0});slide.addText(`${card.label} · ${latest}`,{x:x0+1.42,y:y0+.21,w:2.08,h:.14,fontFace:'Aptos',fontSize:8.3,bold:true,color:MUTED,align:'right',margin:0,fit:'shrink'});});
    return true;
  }

  function addAdrUnitSkillDeckSlide(pptx,ctx,unit,comp,ano,rows,adr,slideNumber){
    const adrRows=rows.filter(r=>cleanText(r.adr)===adr);
    const skills=collectAdrSkillGroupsFromRows(adrRows,{limit:10,includeAdr:false});
    if(!skills.length)return false;
    const slide=pptx.addSlide();
    addHeader(slide,ctx,`${componentFullName(comp)} · ${ano} · ${adr}`,'Habilidades mais desafiadoras com descrições oficiais da matriz ADR.',slideNumber);
    skills.forEach((item,idx)=>{const col=idx<5?0:1,row=idx%5,x=.72+col*6.1,y=1.55+row*1.02,w=5.82;slide.addShape('roundRect',{x,y,w,h:.88,rectRadius:.06,line:{color:BORDER,width:.8},fill:{color:WHITE}});slide.addText(item.code,{x:x+.2,y:y+.12,w:2.05,h:.15,fontFace:'Aptos',fontSize:8.8,bold:true,color:GREEN_DARK,margin:0,fit:'shrink'});slide.addText(item.valueLabel,{x:x+w-1.05,y:y+.12,w:.82,h:.16,fontFace:'Aptos Display',fontSize:12,bold:true,color:NAVY,align:'right',margin:0,fit:'shrink'});slide.addText(item.description,{x:x+.2,y:y+.31,w:w-.42,h:.28,fontFace:'Aptos',fontSize:8.2,color:INK,margin:0,fit:'shrink'});drawMiniBar(slide,{x:x+.2,y:y+.69,w:w-.4,h:.09,value:item.value,max:100,color:v179Color(comp)});});
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
      const groups=groupAdrUnitRows(unit.rows);
      for(const group of groups){
        addBigDividerSlide(pptx,ctx,componentFullName(group.component),`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
        for(const yr of group.years){
          setSlideBusy(true,`Preparando ${componentFullName(group.component)} · ${yr.ano}…`);
          if(addAdrUnitMetricDeckSlide(pptx,ctx,unit,group.component,yr.ano,yr.rows,slideNumber))slideNumber++;
          const adrs=unique(yr.rows.map(r=>cleanText(r.adr))).sort((a,b)=>adrOrder(a)-adrOrder(b));
          for(const adr of adrs){
            if(addAdrUnitSkillDeckSlide(pptx,ctx,unit,group.component,yr.ano,yr.rows,adr,slideNumber))slideNumber++;
          }
        }
      }
      const date=new Date();const stamp=`${String(date.getFullYear())}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
      const filename=`Dashboard_GRA_${safeFile(unit.school)}_Todos_Dados_ADR_${stamp}.pptx`;
      setSlideBusy(true,'Finalizando e iniciando o download…');
      const output=await pptx.write({outputType:'blob',compression:true});
      const blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      forcePresentationDownload(blob,filename,null);slideToast(`Download iniciado: ${filename}`);
    }catch(err){console.error('Falha ao gerar PPTX completo de ADR',err);slideToast(`Não foi possível gerar os slides: ${cleanText(err?.message||'erro desconhecido')}`,true);}finally{setSlideBusy(false);}
  }

  function openMobileDownloadBridge(){
    // v172: evita a tela about:blank no Android. O download é disparado pela própria aba da dashboard.
    return null;
  }

  function forcePresentationDownload(blob,filename,bridge){
    const mime='application/vnd.openxmlformats-officedocument.presentationml.presentation';
    const file=typeof File==='function'?new File([blob],filename,{type:mime}):blob;
    const url=URL.createObjectURL(file);
    const link=document.createElement('a');
    link.href=url;
    link.download=filename;
    link.rel='noopener';
    link.dataset.interception='off';
    link.style.cssText='position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(link);
    // Um único disparo evita que Chrome interprete o PPT como vários downloads simultâneos.
    link.click();
    setTimeout(()=>link.remove(),1800);
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }


  async function generatePresentationFromCurrentView(choice){
    if(!choice){
      choice=await askSlideExportMode();
      if(!choice)return;
    }
    if(choice==='allEvaluation')return (window.generateAllEvaluationUnitPresentationV188||generateAllEvaluationUnitPresentationV188)();
    if(choice==='adrUnitAll')return (window.generateAllEvaluationUnitPresentationV188||generateAllEvaluationUnitPresentationV188)();
    if(choice==='combined')return (window.generateAllEvaluationUnitPresentationV188||generateAllEvaluationUnitPresentationV188)();
    const downloadBridge=null;
    const ctx=presentationContext();
    if(!ctx.active){
      slideToast('Não foi possível identificar a aba atual.',true);
      return;
    }
    setSlideBusy(true,'Montando slides a partir dos dados da página…');
    try{
      await ensureLibraries();
      const PptxCtor=window.PptxGenJS||window.pptxgen;
      const pptx=new PptxCtor();
      pptx.layout='LAYOUT_WIDE';
      pptx.author='GRA · SME-Rio';
      pptx.company='Secretaria Municipal de Educação do Rio de Janeiro';
      pptx.subject=`${ctx.sectionLabel} · ${ctx.scopeTitle}`;
      pptx.title=`${ctx.scopeTitle} — ${ctx.sectionLabel}`;
      pptx.lang='pt-BR';
      pptx.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'pt-BR'};

      const resolvedSchool=resolvePresentationSchoolFocus(ctx.school||'');
      if(ctx.sectionId==='resultados'&&resolvedSchool){ctx.school=resolvedSchool;ctx.scopeTitle=resolvedSchool;ctx.scopeKind='Escola';}
      addCoverSlide(pptx,ctx);
      let slideNumber=2;
      const adrProgressMode=ctx.sectionId==='adrs'&&document.getElementById('adrMode')?.value==='progressao';
      const useSomUnitSlides=ctx.sectionId==='resultados'&&!!ctx.school;
      setSlideBusy(true,useSomUnitSlides?'Organizando somativas da unidade…':(adrProgressMode?'Preparando a curva de progressão…':'Organizando indicadores principais…'));
      if(useSomUnitSlides){
        const nextSlideNumber=addSomUnitPresentationSlides(pptx,ctx,slideNumber);
        if(nextSlideNumber===slideNumber){
          if(!adrProgressMode&&addOverviewSlide(pptx,ctx,slideNumber))slideNumber++;
          setSlideBusy(true,'Redesenhando gráficos e rankings…');
          slideNumber=addNativeDataSlides(pptx,ctx,slideNumber);
          setSlideBusy(true,'Organizando habilidades e leitura pedagógica…');
          if(addSkillInsightSlide(pptx,ctx,slideNumber))slideNumber++;
        }else{
          slideNumber=nextSlideNumber;
        }
      }else{
        if(!adrProgressMode&&addOverviewSlide(pptx,ctx,slideNumber))slideNumber++;
        setSlideBusy(true,'Redesenhando gráficos e rankings…');
        slideNumber=addNativeDataSlides(pptx,ctx,slideNumber);
        setSlideBusy(true,'Organizando habilidades e leitura pedagógica…');
        if(addSkillInsightSlide(pptx,ctx,slideNumber))slideNumber++;
      }

      if(slideNumber===2){
        const slide=pptx.addSlide();
        addHeader(slide,ctx,'Síntese do recorte','A aba não apresentava dados estruturados suficientes para gerar gráficos.',slideNumber++);
        slide.addText('A apresentação preserva o título e o recorte selecionado. Retorne à dashboard, aplique filtros e gere novamente para incluir gráficos, cartões e habilidades.',{x:1.45,y:2.55,w:10.4,h:1.3,fontFace:'Aptos',fontSize:20,color:INK,align:'center',valign:'mid',margin:.12,fit:'shrink'});
      }
      const date=new Date();
      const stamp=`${String(date.getFullYear())}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
      const filename=`Dashboard_GRA_${safeFile(ctx.scopeTitle)}_${safeFile(ctx.sectionLabel)}_${stamp}.pptx`;
      setSlideBusy(true,'Finalizando e iniciando o download…');
      const output=await pptx.write({outputType:'blob',compression:true});
      const blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      forcePresentationDownload(blob,filename,downloadBridge);
      slideToast(`Download iniciado: ${filename}`);
    }catch(err){
      console.error('Falha ao gerar PPTX',err);
      const detail=cleanText(err?.message||'');
      slideToast(detail?`Não foi possível gerar os slides: ${detail}`:'Não foi possível gerar os slides neste navegador.',true);
    }finally{
      setSlideBusy(false);
    }
  }



  /* v260 — gerador completo reconstruído DENTRO do escopo original do motor de apresentações.
     Assim ele acessa diretamente as rotinas privadas de seleção, Somativas, habilidades e download,
     sem aliases entre IIFEs que quebraram as versões 258/259. */
  function v260Norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();}
  function v260Finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));}
  function v260Uniq(arr){return [...new Set((arr||[]).filter(v=>v!==null&&v!==undefined&&String(v).trim()!==''))];}
  function v260IsExtra(comp){return ['cn','ciencias da natureza','ciencia da natureza','ciencias','ciencia','historia','his','geografia','geo'].includes(v260Norm(comp));}
  function v260CompOrder(comp){return ({lp:1,'lingua portuguesa':1,mt:2,matematica:2,cn:3,'ciencias da natureza':3,historia:4,his:4,geografia:5,geo:5}[v260Norm(comp)]||99);}
  function v260CompName(comp){
    const n=v260Norm(comp);
    if(n==='lp'||n==='lingua portuguesa')return 'Língua Portuguesa';
    if(n==='mt'||n==='matematica')return 'Matemática';
    if(n==='cn'||n.includes('ciencia'))return 'Ciências da Natureza';
    if(n==='historia'||n==='his')return 'História';
    if(n==='geografia'||n==='geo')return 'Geografia';
    return String(comp||'Componente');
  }
  function v260CompColor(comp){
    const n=v260Norm(comp);
    if(n==='lp'||n==='lingua portuguesa')return BLUE;
    if(n==='mt'||n==='matematica')return GREEN;
    if(n==='cn'||n.includes('ciencia'))return 'D9861C';
    if(n==='historia'||n==='his')return '8B5CF6';
    if(n==='geografia'||n==='geo')return '0EA5A4';
    return '64748B';
  }
  function v260AdrOrder(v){const n=Number(String(v||'').match(/\d+/)?.[0]||0);return Number.isFinite(n)?n:0;}
  function v260YearOrder(v){const n=Number(String(v||'').match(/\d+/)?.[0]||99);return Number.isFinite(n)?n:99;}
  function v260Join(items){const a=(items||[]).filter(Boolean);return a.length<2?(a[0]||''):a.length===2?`${a[0]} e ${a[1]}`:`${a.slice(0,-1).join(', ')} e ${a[a.length-1]}`;}
  function v260Avg(rows,key){
    const vals=(rows||[]).map(r=>Number(r?.[key])).filter(Number.isFinite);
    return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  }
  function v260GroupYears(rows){
    return v260Uniq((rows||[]).map(r=>String(r?.ano||'').trim())).sort((a,b)=>v260YearOrder(a)-v260YearOrder(b)).map(ano=>{
      const yr=(rows||[]).filter(r=>String(r?.ano||'').trim()===ano);
      const components=v260Uniq(yr.map(r=>String(r?.componente||'').trim())).sort((a,b)=>v260CompOrder(a)-v260CompOrder(b)||String(a).localeCompare(String(b),'pt-BR'));
      return {ano,rows:yr,components};
    });
  }
  function v260BuildSeries(rows,kind){
    const adrs=v260Uniq((rows||[]).map(r=>String(r?.adr||'').trim())).sort((a,b)=>v260AdrOrder(a)-v260AdrOrder(b));
    const comps=v260Uniq((rows||[]).map(r=>String(r?.componente||'').trim())).sort((a,b)=>v260CompOrder(a)-v260CompOrder(b)||String(a).localeCompare(String(b),'pt-BR'));
    const series=[];
    for(const comp of comps){
      const extra=v260IsExtra(comp);
      if(kind==='abaixo'&&extra)continue;
      const key=extra?'acerto':kind;
      const values=adrs.map(adr=>v260Avg((rows||[]).filter(r=>String(r?.componente||'').trim()===comp&&String(r?.adr||'').trim()===adr),key));
      if(values.some(v260Finite))series.push({component:comp,metricKey:key,color:v260CompColor(comp),values});
    }
    return {adrs,series};
  }
  function v260SafeLine(slide,x1,y1,x2,y2,line){
    const ax=Number(x1),ay=Number(y1),bx=Number(x2),by=Number(y2);
    if(![ax,ay,bx,by].every(Number.isFinite))return;
    const opts={x:Math.min(ax,bx),y:Math.min(ay,by),w:Math.abs(bx-ax),h:Math.abs(by-ay),line:line||{}};
    if(ax>bx)opts.flipH=true;
    if((ax<=bx&&ay>by)||(ax>bx&&ay<=by))opts.flipV=true;
    slide.addShape('line',opts);
  }
  function v260AddEvolutionSlide(pptx,ctx,yearBlock,kind,slideNumber){
    const built=v260BuildSeries(yearBlock.rows,kind),adrs=built.adrs,series=built.series;
    if(adrs.length<2||!series.length)return false;
    const extras=series.filter(s=>s.metricKey==='acerto');
    const mixed=kind==='adequado'&&extras.length>0;
    const title=mixed
      ? `${yearBlock.ano} · % Adequado e ${v260Join(extras.map(s=>`% de Acerto Total em ${v260CompName(s.component)}`))}`
      : `${yearBlock.ano} · ${kind==='adequado'?'% Adequado':'% Abaixo do Básico'}`;
    const subtitle=mixed
      ? `Evolução entre ${adrs[0]} e ${adrs[adrs.length-1]}: Língua Portuguesa e Matemática em % Adequado; ${v260Join(extras.map(s=>v260CompName(s.component)))} em % de Acerto Total.`
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
    series.forEach(item=>{
      for(let i=0;i<adrs.length-1;i++){
        const a=item.values[i],b=item.values[i+1];
        if(!v260Finite(a)||!v260Finite(b))continue;
        v260SafeLine(slide,x(i),y(a),x(i+1),y(b),{color:item.color,width:3.1,beginArrowType:'none',endArrowType:'none'});
      }
      item.values.forEach((v,i)=>{
        if(!v260Finite(v))return;
        slide.addShape('ellipse',{x:x(i)-.07,y:y(v)-.07,w:.14,h:.14,line:{color:WHITE,width:1.1},fill:{color:item.color}});
        slide.addText(slidePct(v),{x:x(i)-.48,y:y(v)-.34,w:.96,h:.14,fontFace:'Aptos Display',fontSize:9.1,bold:true,color:NAVY,align:'center',margin:0,fit:'shrink'});
      });
    });
    adrs.forEach((adr,i)=>slide.addText(adr,{x:x(i)-.52,y:chart.y+chart.h-.34,w:1.04,h:.14,fontFace:'Aptos',fontSize:9,bold:true,color:MUTED,align:'center',margin:0,fit:'shrink'}));
    series.slice(0,5).forEach((item,idx)=>{
      const col=idx%3,row=Math.floor(idx/3),x0=.95+col*4.05,y0=6.0+row*.43;
      slide.addShape('ellipse',{x:x0,y:y0+.04,w:.11,h:.11,line:{color:item.color,transparency:100},fill:{color:item.color}});
      const metric=item.metricKey==='acerto'?'Acerto Total':item.metricKey==='adequado'?'Adequado':'Abaixo do Básico';
      slide.addText(`${v260CompName(item.component)} · ${metric}`,{x:x0+.16,y:y0,w:3.55,h:.14,fontFace:'Aptos',fontSize:8.1,bold:true,color:INK,margin:0,fit:'shrink'});
      const first=item.values[0],last=item.values[item.values.length-1];
      if(v260Finite(first)&&v260Finite(last)){
        const delta=Number(last)-Number(first),favorable=item.metricKey==='abaixo'?delta<=0:delta>=0;
        slide.addText(`${slidePct(first)} → ${slidePct(last)} · ${delta>=0?'+':''}${slidePct(delta)}`,{x:x0+.16,y:y0+.18,w:3.55,h:.14,fontFace:'Aptos',fontSize:7.6,color:favorable?GREEN_DARK:'9B2F2F',margin:0,fit:'shrink'});
      }
    });
    return true;
  }
  async function generateAllEvaluationUnitPresentationV260(){
    setSlideBusy(true,'Localizando todos os dados da unidade…');
    try{
      const unit=await allEvaluationSelectedUnitV190();
      if(!unit){slideToast('Selecione uma única escola para gerar todos os dados de avaliação da unidade.',true);return;}
      const ctx=presentationContext();ctx.scopeTitle=unit.school;ctx.scopeKind='Escola';ctx.school=unit.school;ctx.sectionLabel='Todos os dados de avaliação';
      setSlideBusy(true,'Montando todos os dados de avaliação da unidade…');
      await ensureLibraries();
      const PptxCtor=window.PptxGenJS||window.pptxgen;
      if(typeof PptxCtor!=='function')throw new Error('Biblioteca PowerPoint não foi carregada.');
      const pptx=new PptxCtor();
      pptx.layout='LAYOUT_WIDE';pptx.author='GRA · SME-Rio';pptx.company='Secretaria Municipal de Educação do Rio de Janeiro';pptx.subject=`Todos os dados de avaliação · ${unit.school}`;pptx.title=`${unit.school} — Todos os dados de avaliação`;pptx.lang='pt-BR';pptx.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'pt-BR'};
      addCoverSlide(pptx,ctx);let slideNumber=2;
      addBigDividerSlide(pptx,ctx,'Avaliações Somativas',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
      try{
        const somMeta=somUnitRelevantBundle(unit.school);
        if(somMeta?.summary?.length){
          const next=addSomUnitPresentationSlides(pptx,{...ctx,sectionId:'resultados',sectionLabel:'Avaliações Somativas'},slideNumber);
          slideNumber=Number.isFinite(Number(next))?Number(next):slideNumber;
        }else addNoDataUnitSlideV187(pptx,ctx,'Avaliações Somativas','Não há resultados somativos disponíveis para esta unidade na base atual.',slideNumber++);
      }catch(err){console.warn('Somativas omitidas no PPT v260',err);addNoDataUnitSlideV187(pptx,ctx,'Avaliações Somativas','Os dados somativos não puderam ser incluídos nesta geração. As ADRs foram preservadas.',slideNumber++);}
      addBigDividerSlide(pptx,ctx,'Avaliações Formativas · ADRs',`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
      if(typeof window.GRA_EXP_ENSURE_DATA==='function')await window.GRA_EXP_ENSURE_DATA(true);
      const years=v260GroupYears(unit.adrRows||[]);
      if(!years.length)addNoDataUnitSlideV187(pptx,ctx,'Avaliações Formativas · ADRs','Não há registros de ADR disponíveis para esta unidade na base atual.',slideNumber++);
      for(const yearBlock of years){
        addBigDividerSlide(pptx,ctx,yearBlock.ano,`${unit.school}${unit.cre?' · '+unit.cre:''}`,slideNumber++);
        if(v260AddEvolutionSlide(pptx,ctx,yearBlock,'adequado',slideNumber))slideNumber++;
        if(v260AddEvolutionSlide(pptx,ctx,yearBlock,'abaixo',slideNumber))slideNumber++;
        for(const component of yearBlock.components){
          const compRows=yearBlock.rows.filter(r=>String(r?.componente||'').trim()===component);
          const adrs=v260Uniq(compRows.map(r=>String(r?.adr||'').trim())).sort((a,b)=>v260AdrOrder(a)-v260AdrOrder(b));
          for(const adr of adrs){
            try{if(addAdrUnitSkillDeckSlide(pptx,ctx,unit,component,yearBlock.ano,compRows,adr,slideNumber))slideNumber++;}catch(err){console.warn('Habilidade omitida no PPT v260',component,yearBlock.ano,adr,err);}
            try{if(typeof window.GRA_EXP_ADD_STUDENT_SLIDES==='function')slideNumber=window.GRA_EXP_ADD_STUDENT_SLIDES(pptx,ctx,unit,slideNumber,{year:yearBlock.ano,component,adr});}catch(err){console.warn('Detalhamento individual omitido no PPT experimental',component,yearBlock.ano,adr,err);}
          }
        }
      }
      const d=new Date(),stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,filename=`Dashboard_GRA_${safeFile(unit.school)}_Todos_Dados_Avaliacao_${stamp}.pptx`;
      setSlideBusy(true,'Finalizando a apresentação completa…');
      const output=await pptx.write({outputType:'blob',compression:false});
      const blob=output instanceof Blob?output:new Blob([output],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
      if(!blob||!blob.size)throw new Error('O PowerPoint foi criado sem conteúdo.');
      forcePresentationDownload(blob,filename,null);
      slideToast(`Download iniciado: ${filename}`);
    }catch(err){
      console.error('Falha ao gerar PPTX v260',err);
      slideToast(`Não foi possível gerar a apresentação: ${cleanText(err?.message||'erro desconhecido')}`,true);
    }finally{setSlideBusy(false);}
  }
  window.GRA_PPT_V260=async function(){
    const choice=await askSlideExportMode();
    if(!choice)return;
    if(choice==='allEvaluation'||choice==='adrUnitAll'||choice==='combined')return generateAllEvaluationUnitPresentationV260();
    return generatePresentationFromCurrentView('current');
  };
  window.generateAllEvaluationUnitPresentationV260=generateAllEvaluationUnitPresentationV260;
  window.__GRA_V260_SERIES=function(school){
    const all=(typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS))?ADR_ROWS:(Array.isArray(window.ADR_ROWS)?window.ADR_ROWS:[]);
    const rows=all.filter(r=>v260Norm(r?.escola)===v260Norm(school));
    return v260GroupYears(rows).map(y=>({ano:y.ano,primary:v260BuildSeries(y.rows,'adequado'),below:v260BuildSeries(y.rows,'abaixo')}));
  };
  window.__GRA_V260_SELFTEST=async function(school){
    const audit=window.__GRA_V260_SERIES(school);
    const all=(typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS))?ADR_ROWS:(Array.isArray(window.ADR_ROWS)?window.ADR_ROWS:[]);
    const rows=all.filter(r=>v260Norm(r?.escola)===v260Norm(school));
    if(!rows.length)throw new Error('Escola não encontrada no ADR_ROWS: '+school);
    await ensureLibraries();
    const PptxCtor=window.PptxGenJS||window.pptxgen;if(typeof PptxCtor!=='function')throw new Error('PptxGenJS indisponível');
    const pptx=new PptxCtor();pptx.layout='LAYOUT_WIDE';pptx.author='Teste GRA v260';
    const ctx=presentationContext();ctx.scopeTitle=school;ctx.scopeKind='Escola';ctx.school=school;ctx.sectionLabel='Teste v260';
    addCoverSlide(pptx,ctx);let n=2;
    for(const y of v260GroupYears(rows)){addBigDividerSlide(pptx,ctx,y.ano,school,n++);if(v260AddEvolutionSlide(pptx,ctx,y,'adequado',n))n++;if(v260AddEvolutionSlide(pptx,ctx,y,'abaixo',n))n++;}
    const output=await pptx.write({outputType:'blob',compression:false});
    const blob=output instanceof Blob?output:new Blob([output]);
    return {school,size:blob.size,slides:n-1,audit};
  };

  window.generatePresentationFromCurrentView=generatePresentationFromCurrentView;
})();
