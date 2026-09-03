
(function(){
  'use strict';

  const RX_NAME='Ferramenta GRA de análise de dados';
  const RX_VERSION='v324';
  const COLORS={navy:'#12385d',blue:'#1c79b8',cyan:'#4fa8d1',green:'#16865f',gold:'#e3a52b',orange:'#e67e32',red:'#c84d5a',purple:'#7656a8',ink:'#243b50',muted:'#65758b',pale:'#eef5fa',line:'#d7e4ed',white:'#ffffff'};
  const REPORT_STATE={context:null,kind:null,previousTitle:'',lastReport:null,generationId:0,progress:[]};

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num=value=>{if(value===null||value===undefined||value==='')return NaN;const n=Number(value);return Number.isFinite(n)?n:NaN;};
  const finite=value=>Number.isFinite(num(value));
  const mean=values=>{const valid=values.map(num).filter(Number.isFinite);return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;};
  const median=values=>{const valid=values.map(num).filter(Number.isFinite).sort((a,b)=>a-b);if(!valid.length)return null;const mid=Math.floor(valid.length/2);return valid.length%2?valid[mid]:(valid[mid-1]+valid[mid])/2;};
  const weighted=(rows,key)=>{let sum=0,weight=0;rows.forEach(row=>{const value=num(typeof key==='function'?key(row):row?.[key]);if(!Number.isFinite(value))return;const w=Math.max(1,num(row?.avaliados)||1);sum+=value*w;weight+=w;});return weight?sum/weight:null;};
  const fmt=(value,digits=1)=>Number.isFinite(num(value))?num(value).toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits}):'—';
  const pct=(value,digits=1)=>Number.isFinite(num(value))?`${fmt(value,digits)}%`:'—';
  const pp=(value,digits=1)=>Number.isFinite(num(value))?`${num(value)>0?'+':''}${fmt(value,digits)} p.p.`:'—';
  const ideb=(value,digits=1)=>fmt(value,digits);
  const unique=values=>[...new Set(values.filter(value=>value!==null&&value!==undefined&&String(value).trim()!==''))];
  const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const short=(value,max=30)=>{const text=String(value??'').replace(/^Escola Municipal\s+/i,'E.M. ').replace(/^Ginásio Educacional Tecnológico\s+/i,'GET ').trim();return text.length>max?text.slice(0,max-1).trimEnd()+'…':text;};
  const dateLabel=()=>new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  const creCode=value=>{const match=String(value??'').match(/(\d{1,2})/);return match?`CRE ${String(Number(match[1])).padStart(2,'0')}`:'';};
  const creDisplay=value=>{const code=creCode(value);return code?`${Number(code.match(/\d+/)[0])}ª CRE`:String(value||'');};
  const schoolKey=value=>{try{if(typeof window.schoolMatchKey==='function')return window.schoolMatchKey(value);}catch(_){}return norm(value).replace(/\b(escola|municipal|em|ciep|get|ginasio|educacional|tecnologico)\b/g,'').replace(/\s+/g,' ').trim();};
  const sameSchool=(a,b)=>{const ak=schoolKey(a),bk=schoolKey(b);return !!ak&&!!bk&&(ak===bk||((ak.includes(bk)||bk.includes(ak))&&Math.min(ak.length,bk.length)>7));};
  const rowCre=row=>creCode(row?.regional||row?.cre||'');
  const adrAgent=row=>{try{return typeof window.adrRowAgent==='function'?window.adrRowAgent(row):(row?.agente||'');}catch(_){return row?.agente||'';}};
  const somAgent=row=>{try{return typeof window.somRowAgent==='function'?window.somRowAgent(row):(row?.agente||'');}catch(_){return row?.agente||'';}};
  const adrRows=()=>Array.isArray(window.ADR_ROWS)?window.ADR_ROWS:(typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS)?ADR_ROWS:[]);
  const somRows=()=>Array.isArray(window.SOM_ROWS)?window.SOM_ROWS:(typeof SOM_ROWS!=='undefined'&&Array.isArray(SOM_ROWS)?SOM_ROWS:[]);

  function skillDescription(skill,row){
    const direct=String(skill?.descricao||skill?.descricaoHabilidade||skill?.nome||skill?.habilidade||'').trim();
    let official='';
    try{
      if(row?.modalidade==='Avalia RJ'&&typeof window.somSkillDescription==='function')official=window.somSkillDescription(String(skill?.codigo||'').trim(),direct);
      else if(row?.adr&&typeof window.adrSkillDisplay==='function')official=window.adrSkillDisplay(skill?.codigo,row?.ano,row?.componente,row?.adr,false)?.desc||'';
    }catch(_){}
    const description=String(official||direct).split(/\s*\|\s*Faixa rede:/i)[0].trim();
    return /^(?:habilidade\s+)?(?:sem descri|descri.*indispon|matriz oficial n[aã]o carregada)/i.test(description)?'':description;
  }

  function skillIdentity(skill,row){
    const code=String(skill?.codigo||'').trim();
    const description=skillDescription(skill,row);
    return {code,description,label:code&&description?`${code} — ${description}`:''};
  }

  function selectedAgent(activeId){
    const order=activeId==='adrs'?['adrAgente','somAgente','geoAgent']:activeId==='georreferenciamento'?['geoAgent','somAgente','adrAgente']:['somAgente','adrAgente','geoAgent'];
    for(const id of order){
      const value=document.getElementById(id)?.value||'';
      if(value&&!/^__(?:todas|all)/i.test(value)&&value!=='__all_schools__')return value;
    }
    return '';
  }

  function selectedSchool(region,agent,activeId){
    if(window.__GRA_REPORT_SCHOOL)return String(window.__GRA_REPORT_SCHOOL);
    const drawerTitles=[
      document.querySelector('#detailDrawer.open h3')?.textContent,
      document.querySelector('#geoDetail.open .geo-detail-title h3')?.textContent,
      !document.getElementById('adrSchoolContext')?.hidden?document.querySelector('#adrSchoolContext strong')?.textContent:''
    ].map(v=>String(v||'').trim()).filter(Boolean);
    if(drawerTitles.length)return drawerTitles[0];
    const order=activeId==='adrs'?['adrSearch','somSearch','geoSearch']:activeId==='georreferenciamento'?['geoSearch','somSearch','adrSearch']:['somSearch','adrSearch','geoSearch'];
    let query='';for(const id of order){const value=document.getElementById(id)?.value?.trim();if(value){query=value;break;}}
    if(!query)return '';
    const names=unique([
      ...adrRows().filter(row=>(!region||rowCre(row)===region)&&(!agent||adrAgent(row)===agent)).map(row=>row.escola),
      ...somRows().filter(row=>(!region||rowCre(row)===region)&&(!agent||somAgent(row)===agent)).map(row=>row.escola)
    ]);
    const q=norm(query);
    const exact=names.find(name=>norm(name)===q||schoolKey(name)===schoolKey(query));
    if(exact)return exact;
    const matches=names.filter(name=>norm(name).includes(q));
    return matches.length===1?matches[0]:'';
  }

  function stateContext(){
    const activeId=document.querySelector('.section.active')?.id||'resultados';
    const regional=document.getElementById('regionalScopeSelect');
    const region=regional?.value?creCode(regional.value):'';
    const regionLabel=region?creDisplay(region):'Toda a SME';
    const agent=selectedAgent(activeId);
    const school=selectedSchool(region,agent,activeId);
    return {activeId,region,regionLabel,agent,school};
  }

  function contextFor(kind,state=stateContext()){
    // v233 — relatório gerencial existe somente para agente, CRE e SME.
    if(kind==='school')return null;
    if(kind==='agent'&&!state.agent)return null;
    if(kind==='cre'&&!state.region)return null;
    if(kind==='sme'&&state.region)return null;
    const title=kind==='school'?state.school:kind==='agent'?state.agent:kind==='cre'?state.regionLabel:'SME-Rio';
    const subtitle=kind==='school'?`${state.regionLabel}${state.agent?` · conjunto de ${state.agent}`:''}`:kind==='agent'?`Conjunto acompanhado · ${state.regionLabel}`:kind==='cre'?'Gestão regional':'Gestão central · visão da rede';
    return {...state,kind,title,subtitle};
  }

  function inScope(row,ctx,type){
    if(ctx.region&&rowCre(row)!==ctx.region)return false;
    if(ctx.kind==='school'&&!sameSchool(row?.escola,ctx.school))return false;
    if(ctx.kind==='agent'){
      const agent=type==='adr'?adrAgent(row):somAgent(row);
      if(norm(agent)!==norm(ctx.agent))return false;
    }
    return true;
  }

  function referenceRows(source,ctx,type){
    if(ctx.kind==='school'||ctx.kind==='agent')return source.filter(row=>rowCre(row)===ctx.region);
    return source.slice();
  }

  function peerKind(ctx){return ctx.kind==='school'?'school':ctx.kind==='agent'?'agent':'cre';}
  function entityName(row,ctx,type){
    const kind=peerKind(ctx);
    if(kind==='school')return row?.escola||'Sem escola';
    if(kind==='agent')return type==='adr'?adrAgent(row):somAgent(row);
    return creDisplay(rowCre(row));
  }
  function focusName(ctx){return ctx.kind==='school'?ctx.school:ctx.kind==='agent'?ctx.agent:ctx.kind==='cre'?ctx.regionLabel:'';}
  function isFocus(name,ctx){const focus=focusName(ctx);return ctx.kind==='school'?sameSchool(name,focus):norm(name)===norm(focus);}
  function groupRows(rows,ctx,type){
    const map=new Map();
    rows.forEach(row=>{const name=entityName(row,ctx,type);if(!name)return;const key=peerKind(ctx)==='school'?schoolKey(name):norm(name);if(!map.has(key))map.set(key,{name,rows:[]});map.get(key).rows.push(row);});
    return [...map.values()];
  }

  function svgWrap(content,width,height,label){return `<svg class="rx-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">${content}</svg>`;}
  function emptyVisual(message){return `<div class="rx-empty"><span>◇</span><p>${esc(message)}</p></div>`;}

  function horizontalBars(items,{label='',maxItems=11,unit='%',lowerBetter=false,highlight='',valueDigits=1,zeroFloor=true}={}){
    const valid=items.filter(item=>Number.isFinite(num(item.value))).slice(0,maxItems);
    if(!valid.length)return emptyVisual('Não há resultados comparáveis neste recorte.');
    const width=820,left=310,right=85,top=24,rowH=Math.max(30,Math.min(43,350/valid.length)),height=top+valid.length*rowH+18;
    const values=valid.map(item=>num(item.value));
    let min=zeroFloor?Math.min(0,...values):Math.min(...values);let max=Math.max(...values);
    if(min===max){min-=1;max+=1;} const span=max-min;
    const x=value=>left+(width-left-right)*(value-min)/span;
    const zero=x(Math.max(min,Math.min(max,0)));
    let body=`<line x1="${zero}" y1="12" x2="${zero}" y2="${height-10}" stroke="${COLORS.line}" stroke-width="1.3"/>`;
    valid.forEach((item,index)=>{
      const y=top+index*rowH;const value=num(item.value);const start=Math.min(zero,x(value));const barWidth=Math.max(3,Math.abs(x(value)-zero));const color=item.color||((item.focus||norm(item.name)===norm(highlight))?COLORS.orange:(lowerBetter?COLORS.cyan:COLORS.blue));
      body+=`<text x="${left-12}" y="${y+14}" text-anchor="end" class="rx-svg-label">${esc(short(item.name,30))}</text><rect x="${start}" y="${y}" width="${barWidth}" height="18" rx="7" fill="${color}" opacity="${item.muted ? .75 : 1}"/><text x="${x(value)+8}" y="${y+14}" text-anchor="start" class="rx-svg-value">${esc(`${value>0&&unit==='p.p.'?'+':''}${fmt(value,valueDigits)}${unit==='%'?'%':unit==='p.p.'?' p.p.':''}`)}</text>`;
    });
    return svgWrap(body,width,height,label||'Gráfico de barras horizontais');
  }

  function verticalBars(items,{label='',maxItems=11,unit='IDEB',highlight='',valueDigits=1}={}){
    const valid=items.filter(item=>Number.isFinite(num(item.value))).slice(0,maxItems);
    if(!valid.length)return emptyVisual('Não há resultados comparáveis neste recorte.');
    const width=900,height=330,left=55,right=24,top=34,bottom=66;
    const values=valid.map(item=>num(item.value));
    let min=Math.max(0,Math.floor((Math.min(...values)-.4)*2)/2),max=Math.min(10,Math.ceil((Math.max(...values)+.4)*2)/2);
    if(max-min<1){min=Math.max(0,min-.5);max=Math.min(10,max+.5);}
    const plotW=width-left-right,slot=plotW/valid.length,barW=Math.min(48,slot*.62);
    const x=index=>left+slot*index+slot/2;
    const y=value=>top+(height-top-bottom)*(1-(value-min)/(max-min||1));
    let body='';
    for(let i=0;i<5;i++){
      const value=min+(max-min)*i/4,yy=y(value);
      body+=`<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" stroke="${COLORS.line}" stroke-width="1"/><text x="${left-9}" y="${yy+4}" text-anchor="end" class="rx-svg-tick">${esc(fmt(value,1))}</text>`;
    }
    valid.forEach((item,index)=>{
      const value=num(item.value),cx=x(index),yy=y(value),focused=item.focus||norm(item.name)===norm(highlight),color=item.color||(focused?COLORS.orange:COLORS.blue);
      body+=`<rect x="${cx-barW/2}" y="${yy}" width="${barW}" height="${Math.max(3,y(min)-yy)}" rx="8" fill="${color}"/><text x="${cx}" y="${yy-8}" text-anchor="middle" class="rx-svg-value">${esc(`${fmt(value,valueDigits)}${unit==='%'?'%':''}`)}</text><text x="${cx}" y="${height-38}" text-anchor="middle" class="rx-svg-label">${esc(short(item.name,12))}</text>`;
    });
    return svgWrap(body,width,height,label||'Gráfico de barras verticais');
  }

  function skillCards(items,{maxItems=4}={}){
    const valid=items.filter(item=>item.code&&item.description&&Number.isFinite(num(item.value))).slice(0,maxItems);
    if(!valid.length)return emptyVisual('Não há habilidades com nome pedagógico disponível neste recorte.');
    return `<div class="rx-skill-cards">${valid.map(item=>{const value=Math.max(0,Math.min(100,num(item.value)));return `<article class="rx-skill-card" data-skill-code="${esc(item.code)}" aria-label="${esc(`${item.code}: ${item.description}; ${pct(value)}`)}"><header><b>${esc(item.code)}</b><span>${esc(pct(value))}</span></header><p>${esc(item.description)}</p><i aria-hidden="true"><b style="width:${value}%"></b></i></article>`;}).join('')}</div>`;
  }

  function comparisonBars(items,{label='',unit='%',digits=1,focusLabel='Recorte',referenceLabel='Referência'}={}){
    const valid=items.filter(item=>Number.isFinite(num(item.focus))||Number.isFinite(num(item.reference))).slice(0,8);
    if(!valid.length)return emptyVisual('Não há dados equivalentes para comparação.');
    const width=860,left=245,right=70,top=28,rowH=50,height=top+valid.length*rowH+42;
    const values=valid.flatMap(item=>[num(item.focus),num(item.reference)]).filter(Number.isFinite);let max=Math.max(...values,1),min=Math.min(0,...values);if(unit==='IDEB'){min=Math.max(0,Math.min(...values)-.5);max=Math.min(10,Math.max(...values)+.5);}const x=value=>left+(width-left-right)*(value-min)/(max-min||1);
    let body='';
    valid.forEach((item,index)=>{const y=top+index*rowH;body+=`<text x="${left-12}" y="${y+19}" text-anchor="end" class="rx-svg-label">${esc(short(item.name,32))}</text>`;[['focus',COLORS.blue,5],['reference',COLORS.gold,26]].forEach(([key,color,off])=>{const value=num(item[key]);if(!Number.isFinite(value))return;const w=Math.max(3,x(value)-left);body+=`<rect x="${left}" y="${y+Number(off)}" width="${w}" height="14" rx="6" fill="${color}"/><text x="${x(value)+7}" y="${y+Number(off)+11}" class="rx-svg-value">${esc(`${fmt(value,digits)}${unit==='%'?'%':unit==='p.p.'?' p.p.':''}`)}</text>`;});});
    body+=`<circle cx="${left}" cy="${height-17}" r="6" fill="${COLORS.blue}"/><text x="${left+12}" y="${height-13}" class="rx-svg-legend">${esc(short(focusLabel,30))}</text><circle cx="${left+310}" cy="${height-17}" r="6" fill="${COLORS.gold}"/><text x="${left+322}" y="${height-13}" class="rx-svg-legend">${esc(short(referenceLabel,26))}</text>`;
    return svgWrap(body,width,height,label||'Comparativo em barras');
  }

  function lineChart(series,{label='',unit='%',minValue=null,maxValue=null}={}){
    const points=series.flatMap(s=>s.values||[]).map(num).filter(Number.isFinite);if(!points.length)return emptyVisual('Sem série histórica suficiente.');
    const width=500,height=190,left=48,right=24,top=25,bottom=38;let min=minValue??Math.max(0,Math.min(...points)-5),max=maxValue??Math.min(unit==='%'?100:10,Math.max(...points)+5);if(min===max){min-=1;max+=1;}const labels=series[0]?.labels||[];const x=index=>left+(width-left-right)*(labels.length===1?.5:index/(labels.length-1||1));const y=value=>top+(height-top-bottom)*(1-(value-min)/(max-min||1));
    let body='';for(let i=0;i<4;i++){const value=min+(max-min)*i/3;const yy=y(value);body+=`<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" stroke="${COLORS.line}" stroke-width="1"/><text x="${left-8}" y="${yy+4}" text-anchor="end" class="rx-svg-tick">${esc(fmt(value,0))}</text>`;}
    labels.forEach((text,index)=>{body+=`<text x="${x(index)}" y="${height-13}" text-anchor="middle" class="rx-svg-tick">${esc(text)}</text>`;});
    series.forEach((s,seriesIndex)=>{const color=s.color||COLORS.blue;const coords=s.values.map((value,index)=>Number.isFinite(num(value))?`${x(index)},${y(num(value))}`:null).filter(Boolean);if(coords.length>1)body+=`<polyline points="${coords.join(' ')}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;s.values.forEach((value,index)=>{if(!Number.isFinite(num(value)))return;const px=x(index),py=y(num(value)),collision=series.some((other,otherIndex)=>otherIndex!==seriesIndex&&Number.isFinite(num(other.values?.[index]))&&Math.abs(py-y(num(other.values[index])))<22),labelY=py+(collision&&seriesIndex%2?22:-13),edge=index===0?'start':index===labels.length-1?'end':'middle',labelX=index===0?px+10:index===labels.length-1?px-10:px;body+=`<circle cx="${px}" cy="${py}" r="5" fill="${COLORS.white}" stroke="${color}" stroke-width="3"/><text x="${labelX}" y="${labelY}" text-anchor="${edge}" class="rx-svg-value">${esc(fmt(value,1))}</text>`;});});
    const legend=series.map((s,index)=>`<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('');
    return `<div class="rx-line-visual">${svgWrap(body,width,height,label||'Gráfico de linhas')}<div class="rx-chart-legend">${legend}</div></div>`;
  }

  function scatter(points,{label='',highlight='',overallPoint=null}={}){
    const valid=points.filter(point=>Number.isFinite(num(point.x))&&Number.isFinite(num(point.y)));if(!valid.length)return emptyVisual('Não há pares de Língua Portuguesa e Matemática para a dispersão.');
    const all=overallPoint&&Number.isFinite(num(overallPoint.x))&&Number.isFinite(num(overallPoint.y))?[...valid,overallPoint]:valid;const width=780,height=500,left=66,right=30,top=30,bottom=62;const xs=all.map(p=>num(p.x)),ys=all.map(p=>num(p.y));let minX=Math.max(0,Math.min(...xs)-5),maxX=Math.min(100,Math.max(...xs)+5),minY=Math.max(0,Math.min(...ys)-5),maxY=Math.min(100,Math.max(...ys)+5);if(maxX-minX<10){minX=Math.max(0,minX-5);maxX=Math.min(100,maxX+5);}if(maxY-minY<10){minY=Math.max(0,minY-5);maxY=Math.min(100,maxY+5);}const x=value=>left+(width-left-right)*(value-minX)/(maxX-minX||1),y=value=>height-bottom-(height-top-bottom)*(value-minY)/(maxY-minY||1);const medX=median(valid.map(p=>p.x)),medY=median(valid.map(p=>p.y));
    let body=`<rect x="${left}" y="${top}" width="${width-left-right}" height="${height-top-bottom}" rx="14" fill="#f8fbfd" stroke="${COLORS.line}"/>`;
    for(let i=0;i<5;i++){const vx=minX+(maxX-minX)*i/4,vy=minY+(maxY-minY)*i/4;body+=`<text x="${x(vx)}" y="${height-38}" text-anchor="middle" class="rx-svg-tick">${esc(fmt(vx,0))}</text><text x="${left-10}" y="${y(vy)+4}" text-anchor="end" class="rx-svg-tick">${esc(fmt(vy,0))}</text>`;}
    valid.forEach(point=>{const focused=point.focus||norm(point.name)===norm(highlight),px=x(point.x),py=y(point.y),placeLeft=px>width-right-175;body+=`<circle cx="${px}" cy="${py}" r="${focused?10:6}" fill="${focused?COLORS.orange:COLORS.blue}" opacity="${focused?1:.68}" stroke="${COLORS.white}" stroke-width="2"><title>${esc(point.name)} · LP ${fmt(point.x,1)} · MT ${fmt(point.y,1)}</title></circle>${focused?`<text x="${px+(placeLeft?-13:13)}" y="${py-11}" text-anchor="${placeLeft?'end':'start'}" class="rx-svg-focus">${esc(short(point.name,22))}</text>`:''}`;});
    if(overallPoint&&Number.isFinite(num(overallPoint.x))&&Number.isFinite(num(overallPoint.y))){const px=x(overallPoint.x),py=y(overallPoint.y),placeLeft=px>width-right-175;body+=`<path d="M ${px} ${py-12} L ${px+4} ${py-4} L ${px+13} ${py-3} L ${px+6} ${py+3} L ${px+8} ${py+12} L ${px} ${py+7} L ${px-8} ${py+12} L ${px-6} ${py+3} L ${px-13} ${py-3} L ${px-4} ${py-4} Z" fill="${COLORS.green}" stroke="${COLORS.white}" stroke-width="2"/><text x="${px+(placeLeft?-15:15)}" y="${py+4}" text-anchor="${placeLeft?'end':'start'}" class="rx-svg-focus">${esc(short(overallPoint.name,22))}</text>`;}
    body+=`<text x="${(left+width-right)/2}" y="${height-8}" text-anchor="middle" class="rx-svg-axis">Língua Portuguesa — % Adequado + Avançado</text><text x="18" y="${(top+height-bottom)/2}" text-anchor="middle" transform="rotate(-90 18 ${(top+height-bottom)/2})" class="rx-svg-axis">Matemática — % Adequado + Avançado</text>`;
    return svgWrap(body,width,height,label||'Dispersão Avalia RJ: Língua Portuguesa por Matemática');
  }

  function adrComboData(ctx){
    const rows=adrRows().filter(row=>inScope(row,ctx,'adr')&&['2º ano','4º ano','5º ano','8º ano','9º ano'].includes(row.ano)&&['LP','MT'].includes(row.componente));
    const combos=[];['2º ano','4º ano','5º ano','8º ano','9º ano'].forEach(year=>['LP','MT'].forEach(component=>{const subset=rows.filter(row=>row.ano===year&&row.componente===component);if(!subset.length)return;const editions=unique(subset.map(row=>row.adr)).sort((a,b)=>(Number(String(a).match(/\d+/)?.[0])||0)-(Number(String(b).match(/\d+/)?.[0])||0));const adequate=editions.map(ed=>weighted(subset.filter(row=>row.adr===ed),'adequado'));const below=editions.map(ed=>weighted(subset.filter(row=>row.adr===ed),'abaixo'));const deltaAdequate=adequate.length>1&&Number.isFinite(adequate[0])&&Number.isFinite(adequate.at(-1))?adequate.at(-1)-adequate[0]:null;const deltaBelow=below.length>1&&Number.isFinite(below[0])&&Number.isFinite(below.at(-1))?below.at(-1)-below[0]:null;combos.push({year,component,rows:subset,editions,adequate,below,deltaAdequate,deltaBelow,schools:unique(subset.map(row=>row.escola)).length});}));return combos;
  }

  function adrAdditionalData(ctx){
    const years=['4º ano','5º ano','8º ano','9º ano'],components=['CN','História','Geografia'];
    const rows=adrRows().filter(row=>inScope(row,ctx,'adr')&&years.includes(row.ano)&&components.includes(row.componente));
    const order={CN:1,'História':2,'Geografia':3};
    const items=[];
    years.forEach(year=>components.forEach(component=>{
      const subset=rows.filter(row=>row.ano===year&&row.componente===component);if(!subset.length)return;
      const editions=unique(subset.map(row=>row.adr)).sort((a,b)=>(Number(String(a).match(/\d+/)?.[0])||0)-(Number(String(b).match(/\d+/)?.[0])||0));
      const values=editions.map(ed=>weighted(subset.filter(row=>row.adr===ed),'acerto'));
      const delta=values.length>1&&Number.isFinite(values[0])&&Number.isFinite(values.at(-1))?values.at(-1)-values[0]:null;
      items.push({year,component,rows:subset,editions,values,delta,schools:unique(subset.map(row=>row.escola)).length});
    }));
    return items.sort((a,b)=>(Number(a.year.match(/\d+/)?.[0])||99)-(Number(b.year.match(/\d+/)?.[0])||99)||(order[a.component]||99)-(order[b.component]||99));
  }

  function adrPeerData(ctx){
    const base=referenceRows(adrRows(),ctx,'adr').filter(row=>['2º ano','4º ano','5º ano','8º ano','9º ano'].includes(row.ano)&&['LP','MT'].includes(row.componente));const groups=groupRows(base,ctx,'adr');
    return groups.map(group=>{const latest=group.rows.filter(row=>row.adr==='ADR 2');const first=group.rows.filter(row=>row.adr==='ADR 1');const value=weighted(latest,'adequado');const start=weighted(first,'adequado');return {name:group.name,value,delta:Number.isFinite(value)&&Number.isFinite(start)?value-start:null,focus:isFocus(group.name,ctx),rows:group.rows};}).filter(item=>Number.isFinite(item.value));
  }

  function adrPriorityEntity(row,ctx){
    return ctx.kind==='sme'?creDisplay(rowCre(row)):row?.escola||'';
  }

  function adrPriorityItems(rows,ctx){
    const groups=new Map();
    rows.forEach(row=>{const name=adrPriorityEntity(row,ctx),key=ctx.kind==='sme'?norm(name):schoolKey(name);if(!name||!key)return;if(!groups.has(key))groups.set(key,{name,rows:[]});groups.get(key).rows.push(row);});
    const all=[...groups.values()].map(group=>({name:group.name,adequate:weighted(group.rows,'adequado'),below:weighted(group.rows,'abaixo'),schools:unique(group.rows.map(row=>row.escola)).length})).filter(item=>Number.isFinite(item.adequate)||Number.isFinite(item.below));
    const worstAdequate=Math.min(...all.map(item=>num(item.adequate)).filter(Number.isFinite));
    const worstBelow=Math.max(...all.map(item=>num(item.below)).filter(Number.isFinite));
    let items=all.slice();
    if(ctx.kind==='sme')items.sort((a,b)=>(Number(String(a.name).match(/\d+/)?.[0])||99)-(Number(String(b.name).match(/\d+/)?.[0])||99));
    else if(ctx.kind==='cre'&&items.length>10){const selected=new Map();items.filter(item=>Number.isFinite(item.adequate)).sort((a,b)=>a.adequate-b.adequate).slice(0,5).forEach(item=>selected.set(schoolKey(item.name),item));items.filter(item=>Number.isFinite(item.below)).sort((a,b)=>b.below-a.below).slice(0,5).forEach(item=>selected.set(schoolKey(item.name),item));items=[...selected.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));}
    else items.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    return {items,worstAdequate:Number.isFinite(worstAdequate)?worstAdequate:null,worstBelow:Number.isFinite(worstBelow)?worstBelow:null,total:all.length};
  }

  function adrPriorityData(ctx){
    const scope=adrRows().filter(row=>inScope(row,ctx,'adr')&&['2º ano','4º ano','5º ano','8º ano','9º ano'].includes(row.ano)&&['LP','MT'].includes(row.componente));
    return ['ADR 1','ADR 2'].map(edition=>({edition,panels:['2º ano','4º ano','5º ano','8º ano','9º ano'].flatMap(year=>['LP','MT'].map(component=>{const rows=scope.filter(row=>row.adr===edition&&row.ano===year&&row.componente===component);return {year,component,rows,...adrPriorityItems(rows,ctx)};})).filter(panel=>panel.items.length)}));
  }

  function avaliaData(ctx){
    const all=somRows().filter(row=>row.modalidade==='Avalia RJ');const editions=unique(all.map(row=>row.edicao)).sort((a,b)=>String(b).localeCompare(String(a),'pt-BR'));const latest=editions[0]||'';const source=all.filter(row=>!latest||row.edicao===latest);const scope=source.filter(row=>inScope(row,ctx,'som'));const peerBase=referenceRows(source,ctx,'som');const groups=groupRows(peerBase,ctx,'som');
    const points=groups.map(group=>({name:group.name,x:mean(group.rows.map(row=>row.lp)),y:mean(group.rows.map(row=>row.mt)),focus:isFocus(group.name,ctx),n:unique(group.rows.map(row=>row.escola)).length})).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y));
    const overall={name:ctx.kind==='sme'?'SME-Rio':ctx.title,x:mean(scope.map(row=>row.lp)),y:mean(scope.map(row=>row.mt))};
    const skills=new Map();scope.forEach(row=>(row.habilidades||[]).forEach(skill=>{const identity=skillIdentity(skill,row),value=num(skill.valor);if(!identity.code||!identity.description||!Number.isFinite(value))return;const key=`${identity.code}|${norm(identity.description)}`;if(!skills.has(key))skills.set(key,{...identity,values:[]});skills.get(key).values.push(value);}));
    const skillItems=[...skills.values()].map(item=>({...item,name:item.label,value:mean(item.values),color:/^MT/i.test(item.code)?COLORS.purple:COLORS.blue})).sort((a,b)=>a.value-b.value).slice(0,8);
    const medX=median(points.map(point=>point.x)),medY=median(points.map(point=>point.y));const focusPoint=ctx.kind==='sme'?overall:points.find(point=>point.focus)||overall;
    return {latest,scope,points,overall,focusPoint,medX,medY,skills:skillItems};
  }

  function provaValue(row){const adq=num(row.adqAv);if(Number.isFinite(adq))return adq;let value=num(row.principal);if(!Number.isFinite(value))value=num(row.media);if(Number.isFinite(value)&&Math.abs(value)>10&&Math.abs(value)<=100)value/=10;return value;}
  function provaData(ctx){
    const all=somRows().filter(row=>row.modalidade==='Prova Rio');const editions=unique(all.map(row=>row.edicao)).sort((a,b)=>String(b).localeCompare(String(a),'pt-BR'));const latest=editions[0]||'';const source=all.filter(row=>!latest||row.edicao===latest);const scope=source.filter(row=>inScope(row,ctx,'som'));const reference=referenceRows(source,ctx,'som');
    const items=unique(scope.map(row=>`${row.anoEscolar}|||${row.componente}`)).sort().map(key=>{const [year,component]=key.split('|||');const a=scope.filter(row=>row.anoEscolar===year&&row.componente===component),b=reference.filter(row=>row.anoEscolar===year&&row.componente===component);return {name:`${year} · ${component}`,focus:weighted(a,provaValue),reference:ctx.kind==='sme'?null:weighted(b,provaValue)};}).filter(item=>Number.isFinite(item.focus));
    const percentScale=items.some(item=>Math.max(num(item.focus)||0,num(item.reference)||0)>10);return {latest,scope,reference,items,unit:percentScale?'%':'IDEB'};
  }

  function idebSegment(rows,segment){
    const source=rows.filter(row=>row.anoEscolar===segment);
    const valid23=source.filter(row=>Number.isFinite(num(row.ideb2023)));
    const finalRows=source.filter(row=>Number.isFinite(num(row.ideb2025)));
    const paired=source.filter(row=>Number.isFinite(num(row.ideb2023))&&Number.isFinite(num(row.ideb2025)));
    const final=mean(finalRows.map(row=>row.ideb2025));
    const startPaired=mean(paired.map(row=>row.ideb2023));
    const endPaired=mean(paired.map(row=>row.ideb2025));
    const delta=Number.isFinite(startPaired)&&Number.isFinite(endPaired)?endPaired-startPaired:null;
    return {segment,source,finalRows,paired,final,startPaired,endPaired,delta,count2023:valid23.length,count2025:finalRows.length,method:'paired',np:mean(finalRows.map(row=>row.np)),ir:mean(finalRows.map(row=>row.ir))};
  }
  function idebOfficialAggregate(base,segment,regionLike){
    const table=window.V235_IDEB_AGGREGATES?.[segment];
    if(!table)return base;
    const m=String(regionLike||'').match(/\d{1,2}/),key=m?Number(m[0]):0,d=table[key];
    if(!d)return base;
    return {...base,final:d.v25,startPaired:d.v23,endPaired:d.v25,delta:d.delta,count2023:d.c23,count2025:d.c25,method:key>0?'official-cre':'independent',aggregateSource:key>0?'SME-Rio · IDEB 2025 oficial':'cálculo interno'};
  }
  function idebData(ctx){
    const all=somRows().filter(row=>row.modalidade==='IDEB 2025'||row.modalidade==='IDEB'||row.resultadoTipo==='idebOficial');
    const scope=all.filter(row=>inScope(row,ctx,'som')),reference=referenceRows(all,ctx,'som');
    const segments=['Anos Iniciais','Anos Finais'].map(segment=>{
      const focusBase=idebSegment(scope,segment);
      const focus=ctx.kind==='sme'?idebOfficialAggregate(focusBase,segment,''):ctx.kind==='cre'?idebOfficialAggregate(focusBase,segment,ctx.region):focusBase;
      const refBase=ctx.kind==='sme'?{final:null,delta:null,paired:[],finalRows:[],count2023:0,count2025:0,method:'none'}:idebSegment(reference,segment);
      const ref=ctx.kind==='cre'?idebOfficialAggregate(refBase,segment,''):ctx.kind==='agent'?idebOfficialAggregate(refBase,segment,ctx.region):refBase;
      return {segment,focus,reference:ref};
    });
    const peerGroups=groupRows(reference,ctx,'som');
    const peers=peerGroups.map(group=>{
      let ai=idebSegment(group.rows,'Anos Iniciais'),af=idebSegment(group.rows,'Anos Finais');
      if(peerKind(ctx)==='cre'){ai=idebOfficialAggregate(ai,'Anos Iniciais',group.name);af=idebOfficialAggregate(af,'Anos Finais',group.name);}
      return {name:group.name,focus:isFocus(group.name,ctx),ai,af};
    });
    return {scope,reference,segments,peers};
  }

  function schoolMetrics(adrSource,somSource){
    const groups=new Map();
    const add=(row,type)=>{const name=String(row?.escola||'').trim(),key=schoolKey(name);if(!name||!key)return;if(!groups.has(key))groups.set(key,{name,adr:[],som:[],meta:row});const group=groups.get(key);group[type].push(row);if(name.length>group.name.length)group.name=name;};
    adrSource.forEach(row=>add(row,'adr'));somSource.forEach(row=>add(row,'som'));
    return [...groups.values()].map(group=>{const a=group.adr.filter(row=>row.adr==='ADR 2'),id=group.som.filter(row=>row.modalidade==='IDEB 2025'||row.modalidade==='IDEB'||row.resultadoTipo==='idebOficial'),av=group.som.filter(row=>row.modalidade==='Avalia RJ');const meta=a[0]||id[0]||av[0]||group.meta;return {name:group.name,adequate:weighted(a,'adequado'),below:weighted(a,'abaixo'),final:mean(id.map(row=>row.ideb2025)),delta:mean(id.filter(row=>finite(row.ideb2023)&&finite(row.ideb2025)).map(row=>num(row.ideb2025)-num(row.ideb2023))),avalia:null,agent:adrAgent(a[0])||somAgent(id[0]||av[0])||(meta?somAgent(meta):''),cre:rowCre(meta)};});
  }

  function priorityData(ctx){
    const allAdr=adrRows(),allSom=somRows();const candidateAdr=allAdr.filter(row=>inScope(row,ctx,'adr')&&['LP','MT'].includes(row.componente)),candidateSom=allSom.filter(row=>inScope(row,ctx,'som'));const adrRef=referenceRows(allAdr,ctx,'adr').filter(row=>['LP','MT'].includes(row.componente)),somRef=referenceRows(allSom,ctx,'som');const metrics=schoolMetrics(candidateAdr,candidateSom);const referenceMetrics=schoolMetrics(adrRef,somRef);
    const med={adequate:median(referenceMetrics.map(item=>item.adequate)),below:median(referenceMetrics.map(item=>item.below)),final:median(referenceMetrics.map(item=>item.final)),delta:median(referenceMetrics.map(item=>item.delta)),avalia:median(referenceMetrics.map(item=>item.avalia))};
    metrics.forEach(item=>{const evidence=[];if(Number.isFinite(item.adequate)&&Number.isFinite(med.adequate)&&item.adequate<med.adequate-2)evidence.push(`Adequado ${fmt(item.adequate,1)}%`);if(Number.isFinite(item.below)&&Number.isFinite(med.below)&&item.below>med.below+2)evidence.push(`Abaixo ${fmt(item.below,1)}%`);if(Number.isFinite(item.final)&&Number.isFinite(med.final)&&item.final<med.final-.1)evidence.push(`IDEB ${fmt(item.final,1)}`);if(Number.isFinite(item.delta)&&item.delta<-.05)evidence.push(`IDEB ${item.delta>0?'+':''}${fmt(item.delta,1)}`);if(Number.isFinite(item.avalia)&&Number.isFinite(med.avalia)&&item.avalia<med.avalia-3)evidence.push(`Avalia RJ ${fmt(item.avalia,1)}%`);item.evidence=evidence;item.score=evidence.length;});
    return {items:metrics.sort((a,b)=>b.score-a.score||(num(a.final)||99)-(num(b.final)||99)).slice(0,12),med};
  }

  function diagnosticFindings(ctx,data){
    const findings=[];const combos=data.adr;
    const risks=combos.filter(item=>Number.isFinite(item.deltaAdequate)||Number.isFinite(item.deltaBelow)).map(item=>({...item,risk:Math.max(0,-(item.deltaAdequate||0))+Math.max(0,item.deltaBelow||0)})).sort((a,b)=>b.risk-a.risk);
    const advances=combos.filter(item=>Number.isFinite(item.deltaAdequate)||Number.isFinite(item.deltaBelow)).map(item=>({...item,gain:Math.max(0,item.deltaAdequate||0)+Math.max(0,-(item.deltaBelow||0))})).sort((a,b)=>b.gain-a.gain);
    if(risks[0]?.risk>=2){const item=risks[0];findings.push({tone:'attention',title:`ADR: atenção em ${item.year} · ${item.component}`,summary:`Adequado variou ${pp(item.deltaAdequate)} e Abaixo do Básico ${pp(item.deltaBelow)} entre a primeira e a última ADR.`,evidence:`${item.schools} escola(s) com resultado válido no recorte.`,action:`Começar pelas habilidades e escolas que explicam a mudança em ${item.component}.`,confidence:item.schools>=5?'Alta':'Moderada'});}else if(advances[0]){const item=advances[0];findings.push({tone:'positive',title:`ADR: avanço mais nítido em ${item.year} · ${item.component}`,summary:`Adequado variou ${pp(item.deltaAdequate)} e Abaixo do Básico ${pp(item.deltaBelow)}.`,evidence:`Leitura pareada por edição no mesmo ano e componente.`,action:'Preservar a estratégia e verificar se o avanço se confirma nas somativas.',confidence:item.schools>=5?'Alta':'Moderada'});}
    // v241: Avalia RJ is descriptive-only; no ranking/median-relative diagnostic is generated.
    data.ideb.segments.forEach(segment=>{const focus=segment.focus,reference=segment.reference;if(!Number.isFinite(focus.final))return;const diff=Number.isFinite(reference.final)?focus.final-reference.final:null;const tone=(Number.isFinite(focus.delta)&&focus.delta<-.05)||(Number.isFinite(diff)&&diff<-.2)?'attention':(Number.isFinite(focus.delta)&&focus.delta>.1&&(!Number.isFinite(diff)||diff>=0))?'positive':'mixed';const independent=focus.method==='independent',officialCre=focus.method==='official-cre';findings.push({tone,title:`IDEB 2025 — ${segment.segment}`,summary:`Resultado final ${ideb(focus.final)}${Number.isFinite(diff)?` (${diff>=0?'+':''}${fmt(diff,1)} ante a referência)`:''}; evolução ${Number.isFinite(focus.delta)?`${focus.delta>=0?'+':''}${fmt(focus.delta,2)}`:'não calculável'}.`,evidence:officialCre?`Resultado oficial da SME-Rio para a CRE: ${ideb(focus.startPaired)} em 2023 e ${ideb(focus.endPaired)} em 2025; evolução ${focus.delta>=0?'+':''}${fmt(focus.delta,1)}.`:independent?`2023: ${focus.count2023} escola(s) válidas; 2025: ${focus.count2025} escola(s) válidas. A evolução é a diferença entre as médias de cada edição.`:`Evolução individual/conjunto: ${focus.paired.length} escola(s) com resultado nos dois anos; ausências não viram zero.`,action:tone==='attention'?'Separar a contribuição da proficiência e do indicador de rendimento antes de pactuar o foco.':officialCre?'Usar o resultado oficial da CRE como referência agregada e abrir as escolas apenas para diagnóstico.':independent?'Manter a leitura por edição e observar também a composição das escolas com resultado válido.':'Manter a leitura separada entre nível final e trajetória das escolas comparáveis.',confidence:focus.finalRows.length>=5?'Alta':'Moderada'});});
    const p=data.priorities.items[0];if(ctx.kind==='school'&&p&&p.score>0){findings.push({tone:'attention',title:`Convergência de sinais: ${short(p.name,44)}`,summary:`A unidade reúne ${p.score} evidência(s) de atenção em fontes diferentes.`,evidence:p.evidence.join(' · '),action:'Confirmar se o desafio se concentra em um ano, componente ou fluxo.',confidence:p.score>=3?'Alta':'Moderada'});}
    if(!findings.length)findings.push({tone:'neutral',title:'Evidência insuficiente para diagnóstico conclusivo',summary:'O recorte não reúne resultados equivalentes em quantidade suficiente.',evidence:'O sistema preservou as lacunas em vez de completar ausências com zero.',action:'Revisar a seleção ou a cobertura das bases antes de tomar decisão.',confidence:'Baixa'});
    const order={attention:0,mixed:1,positive:2,neutral:3};return findings.sort((a,b)=>order[a.tone]-order[b.tone]).slice(0,5);
  }

  function reportData(ctx){const data={adr:adrComboData(ctx),adrPeers:adrPeerData(ctx),adrPriorities:adrPriorityData(ctx),avalia:avaliaData(ctx),prova:provaData(ctx),ideb:idebData(ctx),priorities:priorityData(ctx)};data.findings=diagnosticFindings(ctx,data);return data;}

  function pageShell(number,total,title,kicker,body){return `<article class="rx-page" data-rx-page="${number}"><header class="rx-page-head"><div><span>${esc(kicker)}</span><h1>${esc(title)}</h1></div><div class="rx-page-brand"><b>GRA</b><small>${esc(RX_VERSION)}</small></div></header><main class="rx-page-body">${body}</main><footer class="rx-page-foot"><span>${esc(RX_NAME)}</span><b>${number}/${total}</b></footer></article>`;}
  function pageShellGerencial(number,total,ctx,body){
    return `<article class="rx-page rx-page-gerencial" data-rx-page="${number}">
      <header class="rx-page-head rx-page-head-gerencial">
        <div class="rx-gerencial-copy">
          <span>RELATÓRIO GERENCIAL</span>
          <h1>${esc(ctx.title)}</h1>
          <p>${esc(ctx.subtitle)} · ${esc(dateLabel())}</p>
        </div>
        <div class="rx-gerencial-side">
          <div class="rx-gerencial-mark">DIAGNÓSTICO <b>VISUAL</b></div>
          <div class="rx-page-brand rx-page-brand-gerencial"><b>GRA</b><small>${esc(RX_VERSION)}</small></div>
        </div>
      </header>
      <main class="rx-page-body">${body}</main>
      <footer class="rx-page-foot"><span>${esc(RX_NAME)}</span><b>${number}/${total}</b></footer>
    </article>`;
  }
  function visualCard(title,subtitle,content,extra=''){return `<section class="rx-visual-card ${extra}"><div class="rx-visual-head"><div><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div></div><div class="rx-visual-body">${content}</div></section>`;}
  function kpi(label,value,sub,color='blue'){return `<div class="rx-kpi ${color}"><span>${esc(label)}</span><b>${esc(value)}</b><small>${esc(sub)}</small></div>`;}

  function summaryPage(ctx,data,number,total){
    const scopeAdr=adrRows().filter(row=>inScope(row,ctx,'adr')),scopeSom=somRows().filter(row=>inScope(row,ctx,'som'));const schools=unique([...scopeAdr.map(r=>r.escola),...scopeSom.map(r=>r.escola)]).length;const evaluations=unique(scopeSom.map(r=>r.modalidade).concat(scopeAdr.length?'ADR':[])).length;
    const findings=data.findings.map((finding,index)=>`<article class="rx-finding ${finding.tone}"><div class="rx-finding-rank">${index+1}</div><div><h3>${esc(finding.title)}</h3><p>${esc(finding.summary)}</p><small><b>Evidência:</b> ${esc(finding.evidence)}</small><small><b>Foco sugerido:</b> ${esc(finding.action)}</small></div><span class="rx-confidence">${esc(finding.confidence)}</span></article>`).join('');
    const body=`<section class="rx-cover-band"><div><span>RELATÓRIO GERENCIAL</span><h2>${esc(ctx.title)}</h2><p>${esc(ctx.subtitle)} · ${esc(dateLabel())}</p></div><div class="rx-cover-mark">DIAGNÓSTICO<br><b>VISUAL</b></div></section><div class="rx-kpi-grid">${kpi('Unidades com dados',String(schools),'em pelo menos uma avaliação','blue')}${kpi('Registros ADR',scopeAdr.length.toLocaleString('pt-BR'),'recorte completo','green')}${kpi('Registros somativos',scopeSom.length.toLocaleString('pt-BR'),'Avalia RJ, Prova Rio e IDEB','purple')}${kpi('Fontes analisadas',String(evaluations),'cruzadas por regras explícitas','orange')}</div><div class="rx-section-title"><div><span>O QUE REQUER ATENÇÃO AGORA</span><h2>Conclusões priorizadas pelo motor lógico</h2></div><p>Fatos, comparação e encaminhamento em uma única leitura.</p></div><div class="rx-findings">${findings}</div><div class="rx-method-note"><b>Leitura responsável:</b> as conclusões são determinísticas e auditáveis; diferenças pequenas, baixa cobertura e ausência de pareamento bloqueiam afirmações fortes. O relatório não atribui causalidade.</div>`;
    return pageShell(number,total,ctx.title,'Síntese executiva',body);
  }

  function adrPage(ctx,data,number,total){
    const cards=data.adr.map(item=>{const status=(num(item.deltaAdequate)>=2&&num(item.deltaBelow)<=-2)?'Avanço consistente':(num(item.deltaAdequate)<=-2||num(item.deltaBelow)>=2)?'Ponto de atenção':'Resultado misto / estável';const tone=status==='Avanço consistente'?'positive':status==='Ponto de atenção'?'attention':'mixed';const chart=lineChart([{name:'Adequado',color:COLORS.green,labels:item.editions,values:item.adequate},{name:'Abaixo do Básico',color:COLORS.red,labels:item.editions,values:item.below}],{label:`${item.year} ${item.component}: evolução ADR`,unit:'%',minValue:0,maxValue:100});return `<section class="rx-adr-small"><header><div><span>${esc(item.year)}</span><h3>${esc(item.component==='LP'?'Língua Portuguesa':'Matemática')}</h3></div><b class="${tone}">${esc(status)}</b></header>${chart}<footer><span>Adequado <b>${esc(pp(item.deltaAdequate))}</b></span><span>Abaixo <b>${esc(pp(item.deltaBelow))}</b></span><span>${item.schools} escola(s)</span></footer></section>`;}).join('');
    const body=`<div class="rx-section-title compact"><div><span>ADRs</span><h2>Trajetória formativa por ano e componente</h2></div><p>Adequado e Abaixo do Básico preservam polaridades opostas.</p></div><div class="rx-adr-grid">${cards||emptyVisual('Não há séries ADR no recorte selecionado.')}</div><div class="rx-method-note"><b>Regra:</b> Abaixo do Básico melhora quando cai. Os valores são médias ponderadas pelo número de avaliados; as linhas mostram somente edições equivalentes.</div>`;
    return pageShellGerencial(number,total,ctx,body);
  }

  function adrAdditionalPage(ctx,data,number,total,part=0){
    const labels={CN:'Ciências da Natureza','História':'História','Geografia':'Geografia'};
    const items=(data.adrAdditional||[]).slice(part*6,part*6+6);
    const cards=items.map(item=>{
      const chart=lineChart([{name:'Acerto Total',color:COLORS.blue,labels:item.editions,values:item.values}],{label:`${item.year} ${labels[item.component]||item.component}: Acerto Total`,unit:'%',minValue:0,maxValue:100});
      const values=item.editions.map((ed,i)=>`${esc(ed)} <b>${esc(pct(item.values[i]))}</b>`).join('<span> · </span>');
      const delta=Number.isFinite(num(item.delta))?`<span>Variação <b>${esc(pp(item.delta))}</b></span>`:'';
      return `<section class="rx-adr-small"><header><div><span>${esc(item.year)}</span><h3>${esc(labels[item.component]||item.component)}</h3></div><b class="mixed">Acerto total</b></header>${chart}<footer><span>${values}</span>${delta}<span>${item.schools} escola(s)</span></footer></section>`;
    }).join('');
    const body=`<div class="rx-section-title compact"><div><span>ADRs · OUTROS COMPONENTES</span><h2>Acerto total por ano e componente</h2></div><p>Leitura descritiva; estes componentes não alimentam alertas ou prioridades gerenciais.</p></div><div class="rx-adr-grid">${cards||emptyVisual('Não há resultados adicionais de ADR neste recorte.')}</div><div class="rx-method-note"><b>Regra:</b> Ciências da Natureza, História e Geografia são apresentadas por <b>Acerto Total</b>. Nenhum valor é convertido em “Adequado”, e esses componentes não entram no motor de priorização.</div>`;
    return pageShell(number,total,'ADRs — outros componentes',ctx.title,body);
  }

  function adrPriorityPage(ctx,data,number,total,edition){
    const editionData=data.adrPriorities.find(item=>item.edition===edition);const scopeTitle=ctx.kind==='sme'?'Por CRE':ctx.kind==='agent'?'Por escola do conjunto':ctx.kind==='cre'?'Por escola da CRE':'Resultado da escola';
    const panels=(editionData?.panels||[]).map(panel=>{const rows=panel.items.map(item=>{const adequateWorst=Number.isFinite(num(panel.worstAdequate))&&Math.abs(num(item.adequate)-num(panel.worstAdequate))<.05,belowWorst=Number.isFinite(num(panel.worstBelow))&&Math.abs(num(item.below)-num(panel.worstBelow))<.05;return `<tr><td title="${esc(item.name)}">${esc(short(item.name,24))}</td><td class="${adequateWorst&&panel.total>1?'rx-worst-value':''}">${esc(pct(item.adequate))}</td><td class="${belowWorst&&panel.total>1?'rx-worst-value':''}">${esc(pct(item.below))}</td></tr>`;}).join('');const reduced=panel.total>panel.items.length?`<small>${panel.items.length} de ${panel.total} escolas com resultados mais desafiadores no recorte</small>`:`<small>${panel.total} ${ctx.kind==='sme'?'CRE(s)':'unidade(s)'} com resultado</small>`;return `<section class="rx-adr-priority-panel"><header><div><span>${esc(panel.year)}</span><h3>${esc(panel.component==='LP'?'Língua Portuguesa':'Matemática')}</h3></div>${reduced}</header><table><thead><tr><th>${esc(ctx.kind==='sme'?'CRE':'Unidade')}</th><th>Adequado</th><th>Abaixo</th></tr></thead><tbody>${rows}</tbody></table></section>`;}).join('');
    const body=`<div class="rx-section-title compact"><div><span>PRIORIDADES · ${esc(edition)}</span><h2>${esc(scopeTitle)}</h2></div><p>Ano e componente analisados separadamente.</p></div><div class="rx-priority-legend"><i></i><span>O vermelho marca, em cada quadro, o menor Adequado ou o maior Abaixo do Básico. Nenhuma classificação nominal é produzida.</span></div><div class="rx-adr-priority-grid">${panels||emptyVisual(`Não há resultados da ${edition} neste escopo.`)}</div><div class="rx-method-note"><b>Regra:</b> os resultados são agregados pelo número de avaliados. Reduzir Abaixo do Básico é favorável; aumentar é desfavorável. Só aparecem unidades que realizaram aquele ano, componente e ADR.</div>`;
    return pageShell(number,total,`${edition} — resultados prioritários`,ctx.title,body);
  }

  function avaliaPage(ctx,data,number,total){
    const av=data.avalia;
    const body=`<div class="rx-section-title compact"><div><span>AVALIA RJ · ${esc(av.latest||'ÚLTIMA EDIÇÃO')}</span><h2>Distribuição das escolas em Língua Portuguesa e Matemática</h2></div><p>Leitura descritiva, sem ranking.</p></div><div class="rx-scatter-card rx-avalia-scatter-only">${scatter(av.points,{label:'Avalia RJ — escolas em LP por Matemática',highlight:focusName(ctx)})}</div><div class="rx-method-note"><b>Indicador:</b> os eixos utilizam exclusivamente % Adequado + % Avançado em Língua Portuguesa e Matemática. Nenhuma posição, classificação ou ranking é produzido nesta página.</div>`;
    return pageShell(number,total,'Avalia RJ — dispersão LP × Matemática',ctx.title,body);
  }

  function provaPage(ctx,data,number,total){
    const prova=data.prova;
    if(ctx.kind==='sme'){
      const results=prova.items.map((item,index)=>({name:item.name,value:item.focus,color:index%2?COLORS.purple:COLORS.blue}));const cards=prova.items.slice(0,8).map((item,index)=>`<article class="rx-prova-result-card ${index%2?'purple':'blue'}"><span>${esc(item.name)}</span><b>${esc(`${fmt(item.focus,1)}${prova.unit==='%'?'%':''}`)}</b></article>`).join('');
      const body=`<div class="rx-section-title compact"><div><span>PROVA RIO · ${esc(prova.latest||'ÚLTIMA EDIÇÃO')}</span><h2>Resultados da SME por ano e componente</h2></div><p>Leitura direta dos resultados consolidados da rede.</p></div>${visualCard('Resultado da rede','Cada barra preserva seu ano e componente',horizontalBars(results,{label:'Resultados da SME na Prova Rio',unit:prova.unit==='%'?'%':'IDEB',maxItems:8,zeroFloor:true}),'rx-prova-main')}<div class="rx-prova-results-grid">${cards}</div><div class="rx-method-note"><b>Interpretação:</b> esta visão apresenta somente os resultados consolidados da SME, mantendo cada ano e componente em uma barra própria.</div>`;
      return pageShell(number,total,'Prova Rio — resultados da SME',ctx.title,body);
    }
    const label=ctx.kind==='school'||ctx.kind==='agent'?ctx.regionLabel:'SME-Rio';const differences=prova.items.map(item=>({...item,diff:Number.isFinite(num(item.focus))&&Number.isFinite(num(item.reference))?item.focus-item.reference:null})).filter(item=>Number.isFinite(item.diff)).sort((a,b)=>a.diff-b.diff);const weakest=differences.slice(0,3),strongest=differences.slice(-3).reverse();const cards=[...weakest.map(item=>({tone:'attention',tag:'MAIOR DISTÂNCIA NEGATIVA',...item})),...strongest.map(item=>({tone:'positive',tag:'MAIOR DISTÂNCIA POSITIVA',...item}))].slice(0,6).map(item=>`<article class="rx-gap-card ${item.tone}"><span>${esc(item.tag)}</span><h3>${esc(item.name)}</h3><b>${esc(`${item.diff>=0?'+':''}${fmt(item.diff,1)}${prova.unit==='%'?' p.p.':''}`)}</b><small>${esc(ctx.title)} ante ${esc(label)}</small></article>`).join('');
    const body=`<div class="rx-section-title compact"><div><span>PROVA RIO · ${esc(prova.latest||'ÚLTIMA EDIÇÃO')}</span><h2>Resultados por ano e componente</h2></div><p>Barras comparáveis; sem uso de dispersão.</p></div>${visualCard('Recorte × referência',`${ctx.title} comparado a ${label}`,comparisonBars(prova.items,{label:'Comparativo Prova Rio',unit:prova.unit==='%'?'%':'IDEB',digits:1,focusLabel:ctx.title,referenceLabel:label}),'rx-prova-main')}<div class="rx-gap-grid">${cards||emptyVisual('Não há pares comparáveis na Prova Rio.')}</div><div class="rx-method-note"><b>Interpretação:</b> o relatório mantém os resultados por ano e componente separados. Diferenças são descritivas e não significam, isoladamente, mudança estatisticamente significativa.</div>`;
    return pageShell(number,total,'Prova Rio — comparação por resultado',ctx.title,body);
  }

  function idebPage(ctx,data,number,total){
    const available=data.ideb.segments.filter(item=>item.focus.finalRows.length>0);
    const segments=available.map(item=>{
      const f=item.focus,r=item.reference,independent=f.method==='independent',officialCre=f.method==='official-cre';
      const reference=ctx.kind==='sme'?'':`<div><small>REFERÊNCIA FINAL</small><b>${esc(ideb(r.final))}</b><span>${esc(ctx.kind==='school'||ctx.kind==='agent'?ctx.regionLabel:'SME-Rio')}</span></div>`;
      const methodLabel=(independent||officialCre)?'EVOLUÇÃO AGREGADA':'EVOLUÇÃO PAREADA';
      const universe=officialCre?'Resultado oficial SME-Rio':independent?`${f.count2023} escola(s) em 2023 · ${f.count2025} em 2025`:`${f.paired.length} escola(s) com 2023 e 2025`;
      return `<section class="rx-ideb-segment"><header><span>${esc(item.segment)}</span><h3>IDEB 2025 e evolução</h3></header><div class="rx-ideb-hero ${ctx.kind==='sme'?'two':''}"><div><small>RESULTADO FINAL</small><b>${esc(ideb(f.final))}</b><span>${officialCre?'Resultado oficial SME-Rio':`${f.count2025||f.finalRows.length} escola(s) com 2025`}</span></div><div><small>${methodLabel}</small><b class="${num(f.delta)>=0?'positive':'attention'}">${Number.isFinite(num(f.delta))?`${f.delta>=0?'+':''}${fmt(f.delta,2)}`:'—'}</b><span>${universe}</span></div>${reference}</div><div class="rx-ideb-mini"><span>Nota padronizada <b>${esc(fmt(f.np,2))}</b></span><span>Indicador de rendimento <b>${esc(fmt(f.ir,3))}</b></span><span>Evolução de ${esc(ideb(f.startPaired))} para ${esc(ideb(f.endPaired))}</span></div></section>`;
    }).join('');
    const compareCres=peerKind(ctx)==='cre';
    const charts=available.map(item=>{const key=item.segment==='Anos Iniciais'?'ai':'af',color=item.segment==='Anos Iniciais'?COLORS.blue:COLORS.purple;const peers=data.ideb.peers.map(peer=>({name:peer.name,value:peer[key].final,focus:peer.focus,color:peer.focus?COLORS.orange:color})).filter(peer=>Number.isFinite(peer.value)).sort((a,b)=>b.value-a.value).slice(0,11);const chart=compareCres?verticalBars(peers,{label:`IDEB ${item.segment} por CRE`,unit:'IDEB',maxItems:11,highlight:focusName(ctx),valueDigits:1}):horizontalBars(peers,{label:`IDEB ${item.segment}`,unit:'IDEB',maxItems:11,highlight:focusName(ctx),valueDigits:1,zeroFloor:true});return visualCard(`${item.segment} — posição em 2025`,compareCres?'Comparação vertical entre as CREs':'Unidades válidas de 2025',chart);}).join('');
    const single=available.length===1?' single':'';
    const officialCre=available.length&&available.every(item=>item.focus.method==='official-cre');
    const independent=available.length&&available.every(item=>item.focus.method==='independent');
    const methodNote=officialCre?'<b>Fonte oficial:</b> os resultados agregados de 2023 e 2025 e sua evolução são os valores oficiais publicados pela SME-Rio para cada CRE. Os dados escolares permanecem apenas para detalhamento.':independent?'<b>Integridade metodológica:</b> 2023 e 2025 são calculados separadamente com todas as escolas que possuem IDEB válido em cada edição. A evolução agregada é média 2025 menos média 2023; não há pareamento e ausências nunca viram zero.':'<b>Integridade metodológica:</b> para agente, a trajetória detalhada usa apenas escolas com resultado nos dois anos. Ausências nunca viram zero.';
    const body=`<div class="rx-ideb-top${single}">${segments}</div><div class="rx-two-charts ideb${single}">${charts}</div><div class="rx-method-note strong">${methodNote}</div>`;
    return pageShell(number,total,'IDEB 2025 — nível final e trajetória',ctx.title,body);
  }

  function prioritiesPage(ctx,data,number,total){
    const items=data.priorities.items.slice(0,9);const bars=items.map(item=>({name:item.name,value:item.score,color:item.score>=3?COLORS.red:item.score===2?COLORS.orange:item.score===1?COLORS.gold:COLORS.green}));const rows=items.map((item,index)=>`<tr><td><b>${index+1}</b></td><td><strong>${esc(item.name)}</strong><small>${esc([item.agent,item.cre?creDisplay(item.cre):''].filter(Boolean).join(' · '))}</small></td><td><span class="rx-evidence-count s${Math.min(4,item.score)}">${item.score}</span></td><td>${item.evidence.length?item.evidence.map(value=>`<i>${esc(value)}</i>`).join(''):'<i class="ok">Sem convergência negativa</i>'}</td></tr>`).join('');const focus=data.findings.slice(0,3).map((finding,index)=>`<article class="rx-action-card ${finding.tone}"><span>FOCO ${index+1}</span><h3>${esc(finding.title)}</h3><p>${esc(finding.action)}</p><small>${esc(finding.evidence)}</small></article>`).join('');
    const title=ctx.kind==='school'?'Matriz de evidências da unidade':'Escolas com sinais convergentes de atenção';const body=`<div class="rx-section-title compact"><div><span>PRIORIZAÇÃO TRANSPARENTE</span><h2>${esc(title)}</h2></div><p>Sem nota opaca: cada marca corresponde a uma evidência observável.</p></div><div class="rx-priority-layout">${visualCard('Quantidade de evidências','ADR e IDEB combinados sem misturar escalas',horizontalBars(bars,{label:'Convergência de evidências',unit:'',valueDigits:0,maxItems:12}),'rx-priority-chart')}<div class="rx-priority-table-wrap"><table class="rx-priority-table"><thead><tr><th>#</th><th>Unidade</th><th>Sinais</th><th>Evidências observadas</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Sem evidências suficientes.</td></tr>'}</tbody></table></div></div><div class="rx-section-title compact actions"><div><span>ONDE COMEÇAR</span><h2>Três focos sugeridos para a gestão</h2></div></div><div class="rx-action-grid">${focus}</div><div class="rx-method-note"><b>Próximo passo:</b> use as prioridades como ponto de partida para investigação. O motor indica convergência, não substitui a leitura pedagógica e o conhecimento do território.</div>`;
    return pageShell(number,total,'Prioridades e encaminhamentos',ctx.title,body);
  }

  function reportSections(ctx,data){
    const prioritiesAllowed=['sme','cre','agent'].includes(ctx.kind),adr1=data.adrPriorities?.find(item=>item.edition==='ADR 1'),adr2=data.adrPriorities?.find(item=>item.edition==='ADR 2');
    const extra=data.adrAdditional||[];const sections=[{show:data.adr.length>0,render:adrPage},{show:extra.length>0,render:(c,d,n,t)=>adrAdditionalPage(c,d,n,t,0)},{show:extra.length>6,render:(c,d,n,t)=>adrAdditionalPage(c,d,n,t,1)},{show:prioritiesAllowed&&adr1?.panels.length>0,render:(c,d,n,t)=>adrPriorityPage(c,d,n,t,'ADR 1')},{show:prioritiesAllowed&&adr2?.panels.length>0,render:(c,d,n,t)=>adrPriorityPage(c,d,n,t,'ADR 2')},{show:data.avalia.scope.length>0&&Number.isFinite(num(data.avalia.focusPoint?.x))&&Number.isFinite(num(data.avalia.focusPoint?.y)),render:avaliaPage},{show:data.prova.items.length>0,render:provaPage},{show:data.ideb.segments.some(item=>item.focus.finalRows.length>0),render:idebPage}];
    return sections.filter(section=>section.show);
  }
  function buildReport(ctx,data){const sections=reportSections(ctx,data),total=sections.length;const html=sections.map((section,index)=>section.render(ctx,data,index+1,total)).join('');REPORT_STATE.context=ctx;REPORT_STATE.kind=ctx.kind;REPORT_STATE.lastReport={ctx,data,html,pageCount:total,progress:REPORT_STATE.progress.slice()};return html;}

  function ensureChoice(){
    let overlay=document.getElementById('rxChoiceOverlay');if(overlay)return overlay;
    overlay=document.createElement('div');overlay.id='rxChoiceOverlay';overlay.className='rx-overlay rx-choice-overlay';overlay.setAttribute('aria-hidden','true');overlay.innerHTML=`<section class="rx-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="rxChoiceTitle"><header><div><span>MOTOR DE DIAGNÓSTICO</span><h2 id="rxChoiceTitle">Qual relatório você quer gerar?</h2><p>O sistema usa a seleção atual para liberar somente os níveis compatíveis.</p></div><button type="button" class="rx-close" aria-label="Fechar">×</button></header><div class="rx-choice-context" id="rxChoiceContext"></div><div class="rx-choice-grid" id="rxChoiceGrid"></div><footer><span>Cálculos determinísticos · páginas visuais definidas pelos dados disponíveis</span></footer></section>`;document.body.appendChild(overlay);overlay.querySelector('.rx-close').addEventListener('click',closeChoice);overlay.addEventListener('click',event=>{if(event.target===overlay)closeChoice();});return overlay;
  }
  function ensureReport(){
    let overlay=document.getElementById('rxReportOverlay');if(overlay)return overlay;
    overlay=document.createElement('div');overlay.id='rxReportOverlay';overlay.className='rx-report-overlay';overlay.setAttribute('aria-hidden','true');overlay.innerHTML=`<header class="rx-preview-head"><div><span>RELATÓRIO GERENCIAL</span><h2 id="rxPreviewTitle">Pré-visualização</h2><p id="rxPreviewSubtitle"></p></div><div><button type="button" class="rx-preview-secondary" id="rxBackToChoice">Trocar cliente</button><button type="button" class="rx-preview-primary" id="rxPrintReport">PDF / imprimir</button><button type="button" class="rx-close" aria-label="Fechar">×</button></div></header><div class="rx-preview-scroll"><div id="rxReportHost"></div></div>`;document.body.appendChild(overlay);overlay.querySelector('.rx-close').addEventListener('click',closeReport);overlay.querySelector('#rxBackToChoice').addEventListener('click',()=>{closeReport();openChoice();});overlay.querySelector('#rxPrintReport').addEventListener('click',printReport);return overlay;
  }
  function closeChoice(){const overlay=document.getElementById('rxChoiceOverlay');overlay?.classList.remove('open');overlay?.setAttribute('aria-hidden','true');document.body.classList.remove('rx-modal-open');}
  function closeReport(){REPORT_STATE.generationId++;const overlay=document.getElementById('rxReportOverlay');overlay?.classList.remove('open');overlay?.setAttribute('aria-hidden','true');document.body.classList.remove('rx-modal-open');}
  function openChoice(){
    const state=stateContext(),overlay=ensureChoice();const options=[
      {kind:'agent',title:'Relatório do conjunto do agente',description:state.agent?`${state.agent} · ${state.regionLabel}`:'Selecione um agente no filtro de abrangência.',enabled:!!state.agent,icon:'◉'},
      {kind:'cre',title:'Relatório da CRE selecionada',description:state.region?`${state.regionLabel} em relação às demais CREs`:'Selecione uma CRE no filtro regional.',enabled:!!state.region,icon:'▦'},
      {kind:'sme',title:'Relatório da SME',description:!state.region?'Visão de rede para a gestão central':'Retorne o filtro regional para “Toda a SME”.',enabled:!state.region,icon:'◆'}
    ];
    document.getElementById('rxChoiceContext').innerHTML=`<span>Contexto atual</span><b>${esc(state.agent||state.regionLabel)}</b><small>${esc(state.regionLabel)}</small>`;
    document.getElementById('rxChoiceGrid').innerHTML=options.map(option=>`<button type="button" class="rx-choice-card" data-kind="${option.kind}" ${option.enabled?'':'disabled'}><i>${option.icon}</i><div><h3>${esc(option.title)}</h3><p>${esc(option.description)}</p></div><span>${option.enabled?'Gerar →':'Indisponível'}</span></button>`).join('');
    document.getElementById('rxChoiceGrid').querySelectorAll('button:not([disabled])').forEach(button=>button.addEventListener('click',()=>generate(button.dataset.kind,state)));overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.body.classList.add('rx-modal-open');setTimeout(()=>overlay.querySelector('button:not([disabled])')?.focus(),30);
  }
  const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  function showProgress(host){
    host.innerHTML=`<div class="rx-building"><section class="rx-progress-card"><div class="rx-progress-head"><div><span>CONFECÇÃO DO RELATÓRIO</span><h3 id="rxProgressLabel">Preparando o universo selecionado…</h3></div><b id="rxProgressPercent">0%</b></div><div class="rx-progress-track" id="rxProgressTrack" role="progressbar" aria-label="Progresso real da confecção do relatório" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="rxProgressFill"></i></div><p id="rxProgressDetail">Cada avanço corresponde a uma etapa de cálculo efetivamente concluída.</p></section></div>`;
  }
  function updateProgress(host,percent,label,detail,completed=false){
    const progress=Math.max(0,Math.min(100,Number(percent)||0)),track=host.querySelector('#rxProgressTrack'),fill=host.querySelector('#rxProgressFill'),value=host.querySelector('#rxProgressPercent'),title=host.querySelector('#rxProgressLabel'),text=host.querySelector('#rxProgressDetail');
    if(track)track.setAttribute('aria-valuenow',String(progress));if(fill)fill.style.width=`${progress}%`;if(value)value.textContent=`${progress}%`;if(title)title.textContent=label;if(text)text.textContent=detail;
    if(completed)REPORT_STATE.progress.push({percent:progress,label,completedAt:Math.round(performance.now())});
  }
  async function stagedReportData(ctx,host,token){
    const data={};REPORT_STATE.progress=[];
    const stage=async(startLabel,doneLabel,percent,task)=>{if(token!==REPORT_STATE.generationId)throw new DOMException('Geração cancelada','AbortError');const current=REPORT_STATE.progress.at(-1)?.percent||0;updateProgress(host,current,startLabel,'Processando os registros válidos deste recorte.');await nextPaint();const result=task();updateProgress(host,percent,doneLabel,'Etapa concluída com os dados disponíveis.',true);await nextPaint();return result;};
    data.adr=await stage('Calculando as trajetórias das ADRs…','Trajetórias das ADRs concluídas',12,()=>adrComboData(ctx));
    data.adrAdditional=await stage('Organizando Ciências, História e Geografia…','Outros componentes das ADRs concluídos',20,()=>adrAdditionalData(ctx));
    data.adrPriorities=await stage('Separando prioridades de LP e MT por ADR…','Quadros prioritários de LP e MT concluídos',30,()=>adrPriorityData(ctx));
    data.avalia=await stage('Construindo a leitura do Avalia RJ…','Avalia RJ concluído',40,()=>avaliaData(ctx));
    data.prova=await stage('Organizando os resultados da Prova Rio…','Prova Rio concluída',53,()=>provaData(ctx));
    data.ideb=await stage('Calculando IDEB final e evolução por edição…','IDEB concluído',67,()=>idebData(ctx));
    data.priorities=await stage('Cruzando evidências do recorte…','Evidências do recorte concluídas',84,()=>priorityData(ctx));
    data.findings=await stage('Redigindo conclusões verificáveis…','Diagnóstico lógico concluído',94,()=>diagnosticFindings(ctx,data));
    return data;
  }
  async function generate(kind,state=stateContext()){
    const ctx=contextFor(kind,state);if(!ctx)return;closeChoice();const token=++REPORT_STATE.generationId,overlay=ensureReport(),host=document.getElementById('rxReportHost');showProgress(host);document.getElementById('rxPreviewTitle').textContent=ctx.title;document.getElementById('rxPreviewSubtitle').textContent=`${ctx.subtitle} · páginas definidas pelos dados disponíveis`;overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.body.classList.add('rx-modal-open');
    try{await nextPaint();const data=await stagedReportData(ctx,host,token);if(token!==REPORT_STATE.generationId)return;updateProgress(host,94,'Diagramando as páginas aplicáveis…','Blocos sem avaliação ou segmento foram excluídos.');await nextPaint();const html=buildReport(ctx,data),pageCount=REPORT_STATE.lastReport.pageCount;updateProgress(host,100,'Relatório concluído',`${pageCount} página(s) gerada(s) com dados válidos.`,true);REPORT_STATE.lastReport.progress=REPORT_STATE.progress.slice();document.getElementById('rxPreviewSubtitle').textContent=`${ctx.subtitle} · ${pageCount} página(s)`;await nextPaint();if(token!==REPORT_STATE.generationId)return;host.innerHTML=html;host.scrollIntoView({block:'start'});}catch(error){if(token!==REPORT_STATE.generationId||error?.name==='AbortError')return;console.error(error);host.innerHTML=`<div class="rx-report-error"><b>Não foi possível gerar o relatório.</b><span>${esc(error.message||error)}</span></div>`;}
  }
  function printReport(){
    if(!REPORT_STATE.lastReport)return;REPORT_STATE.previousTitle=document.title;document.title=`Relatório GRA - ${REPORT_STATE.context.title}`;document.body.classList.add('rx-printing');const restore=()=>{document.body.classList.remove('rx-printing');document.title=REPORT_STATE.previousTitle||RX_NAME;window.removeEventListener('afterprint',restore);};window.addEventListener('afterprint',restore,{once:true});setTimeout(()=>{window.print();setTimeout(()=>{if(document.body.classList.contains('rx-printing'))restore();},1800);},100);
  }

  function installStyles(){
    if(document.getElementById('rxExperimentalStyles'))return;const style=document.createElement('style');style.id='rxExperimentalStyles';style.textContent=`
      :root{--rx-navy:${COLORS.navy};--rx-blue:${COLORS.blue};--rx-green:${COLORS.green};--rx-gold:${COLORS.gold};--rx-orange:${COLORS.orange};--rx-red:${COLORS.red};--rx-purple:${COLORS.purple};--rx-ink:${COLORS.ink};--rx-muted:${COLORS.muted};--rx-line:${COLORS.line};--rx-pale:${COLORS.pale}}
      #reportExperimentalBtn{border:1px solid #68408f!important;background:linear-gradient(135deg,#5d367f 0%,#8150a7 100%)!important;color:#fff!important;box-shadow:0 8px 20px rgba(93,54,127,.28)!important}
      #reportExperimentalBtn .export-action-label{color:#fff!important;text-shadow:0 1px 1px rgba(28,12,43,.24)}
      #reportExperimentalBtn .export-action-icon{background:rgba(255,255,255,.18);color:#fff!important;border-radius:7px;padding:3px 6px;font-size:10px}
      #reportExperimentalBtn:hover{background:linear-gradient(135deg,#67408b 0%,#8b58b1 100%)!important;transform:translateY(-1px);box-shadow:0 10px 25px rgba(93,54,127,.34)!important;filter:none}
      #reportExperimentalBtn:focus-visible{outline:3px solid #e2c9f4;outline-offset:2px}
      .rx-overlay,.rx-report-overlay{position:fixed;inset:0;z-index:9800;background:rgba(8,31,52,.72);backdrop-filter:blur(7px);display:none;color:var(--rx-ink)}
      .rx-overlay.open,.rx-report-overlay.open{display:flex}.rx-modal-open{overflow:hidden}
      .rx-choice-overlay{align-items:center;justify-content:center;padding:24px}
      .rx-choice-dialog{width:min(920px,96vw);max-height:94vh;overflow:auto;border:1px solid rgba(255,255,255,.7);border-radius:28px;background:linear-gradient(150deg,#fff 0%,#f2f8fc 100%);box-shadow:0 32px 90px rgba(5,24,40,.38)}
      .rx-choice-dialog>header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:28px 30px 19px;border-bottom:1px solid var(--rx-line)}
      .rx-choice-dialog>header span,.rx-preview-head span{display:block;color:var(--rx-blue);font-size:10px;font-weight:950;letter-spacing:.11em}.rx-choice-dialog h2,.rx-preview-head h2{margin:5px 0 4px;color:var(--rx-navy);font-size:26px;line-height:1.1}.rx-choice-dialog p,.rx-preview-head p{margin:0;color:var(--rx-muted);font-size:12.5px}
      .rx-close{flex:0 0 42px;width:42px;height:42px;border:1px solid #d5e2ea;border-radius:14px;background:#fff;color:var(--rx-navy);font-size:25px;line-height:1;cursor:pointer}.rx-close:hover{background:#edf6fb}
      .rx-choice-context{display:flex;align-items:center;gap:10px;margin:18px 30px 0;padding:12px 15px;border:1px solid #d8e6ef;border-radius:15px;background:#fff}.rx-choice-context span{font-size:10px;font-weight:900;color:var(--rx-muted);text-transform:uppercase}.rx-choice-context b{color:var(--rx-navy);font-size:13px}.rx-choice-context small{margin-left:auto;color:var(--rx-muted)}
      .rx-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;padding:18px 30px 28px}.rx-choice-card{display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:13px;min-height:112px;padding:16px;border:1px solid #d4e2ec;border-radius:19px;background:#fff;text-align:left;color:var(--rx-ink);cursor:pointer;box-shadow:0 7px 20px rgba(17,56,93,.06);transition:.17s}.rx-choice-card:not([disabled]):hover{border-color:#7db5d5;transform:translateY(-2px);box-shadow:0 12px 26px rgba(17,56,93,.12)}.rx-choice-card:disabled{opacity:.52;cursor:not-allowed;background:#f3f6f8}.rx-choice-card i{display:grid;place-items:center;width:48px;height:48px;border-radius:15px;background:#e8f4fb;color:var(--rx-blue);font-style:normal;font-size:23px}.rx-choice-card h3{margin:0 0 5px;color:var(--rx-navy);font-size:15px}.rx-choice-card p{margin:0;color:var(--rx-muted);font-size:11px;line-height:1.38}.rx-choice-card>span{color:var(--rx-blue);font-size:10.5px;font-weight:900;white-space:nowrap}.rx-choice-dialog>footer{padding:12px 30px 17px;color:var(--rx-muted);font-size:10px;text-align:center}
      .rx-report-overlay{flex-direction:column;background:#eaf1f6}.rx-preview-head{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 22px;border-bottom:1px solid #c8dae6;background:rgba(255,255,255,.98);box-shadow:0 5px 18px rgba(17,56,93,.12)}.rx-preview-head h2{font-size:20px}.rx-preview-head>div:last-child{display:flex;align-items:center;gap:8px}.rx-preview-primary,.rx-preview-secondary{min-height:40px;padding:0 15px;border-radius:12px;font-size:11px;font-weight:900;cursor:pointer}.rx-preview-primary{border:0;background:var(--rx-green);color:#fff}.rx-preview-secondary{border:1px solid #cfdee8;background:#fff;color:var(--rx-navy)}
      .rx-preview-scroll{flex:1;overflow:auto;padding:28px 18px 80px;overscroll-behavior:contain}.rx-preview-scroll::-webkit-scrollbar{width:10px;height:10px}.rx-preview-scroll::-webkit-scrollbar-thumb{background:#b7ccd9;border-radius:999px}#rxReportHost{display:grid;gap:22px;justify-items:center;min-width:1120px}
      .rx-page{position:relative;width:1120px;height:790px;box-sizing:border-box;overflow:hidden;padding:34px 42px 29px;border:1px solid #d5e3ec;border-radius:3px;background:#fff;box-shadow:0 16px 46px rgba(17,56,93,.16);font-family:Inter,Segoe UI,Arial,sans-serif;color:var(--rx-ink);print-color-adjust:exact;-webkit-print-color-adjust:exact}
      .rx-page:before{content:"";position:absolute;left:0;top:0;bottom:0;width:9px;background:linear-gradient(180deg,var(--rx-blue),var(--rx-green))}.rx-page-head{height:54px;display:flex;align-items:flex-start;justify-content:space-between;gap:20px;border-bottom:1px solid var(--rx-line);padding-bottom:9px;box-sizing:border-box}.rx-page-head span{display:block;color:var(--rx-blue);font-size:9px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.rx-page-head h1{margin:3px 0 0;color:var(--rx-navy);font-size:22px;line-height:1.05}.rx-page-brand{display:flex;align-items:center;gap:9px}.rx-page-brand b{display:grid;place-items:center;width:46px;height:34px;border-radius:10px;background:var(--rx-navy);color:#fff;font-size:15px}.rx-page-brand small{color:var(--rx-muted);font-size:9px;font-weight:800}.rx-page-body{height:661px;padding-top:15px;box-sizing:border-box;overflow:hidden}.rx-page-foot{position:absolute;left:42px;right:42px;bottom:12px;display:flex;align-items:center;justify-content:space-between;color:#8293a3;font-size:8.5px}.rx-page-foot b{display:grid;place-items:center;width:22px;height:22px;border-radius:8px;background:var(--rx-pale);color:var(--rx-navy)}
      .rx-cover-band{display:flex;align-items:center;justify-content:space-between;min-height:104px;padding:18px 23px;border-radius:20px;background:linear-gradient(125deg,var(--rx-navy),#185b87 63%,#228c6a);color:#fff}.rx-cover-band span{font-size:9px;font-weight:950;letter-spacing:.14em;color:#a9d8ef}.rx-cover-band h2{margin:6px 0 5px;font-size:29px;line-height:1}.rx-cover-band p{margin:0;color:#dcecf5;font-size:11px}.rx-cover-mark{text-align:right;font-size:11px;line-height:1.05;letter-spacing:.14em;color:#c6e1ef}.rx-cover-mark b{font-size:27px;color:#fff}
      .rx-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:11px}.rx-kpi{min-height:73px;padding:10px 12px;border:1px solid var(--rx-line);border-radius:15px;background:#fff;box-sizing:border-box}.rx-kpi span{display:block;color:var(--rx-muted);font-size:8.5px;font-weight:900;text-transform:uppercase}.rx-kpi b{display:block;margin-top:4px;color:var(--rx-navy);font-size:21px;line-height:1}.rx-kpi small{display:block;margin-top:4px;color:var(--rx-muted);font-size:8.5px;line-height:1.2}.rx-kpi.blue{border-top:4px solid var(--rx-blue)}.rx-kpi.green{border-top:4px solid var(--rx-green)}.rx-kpi.purple{border-top:4px solid var(--rx-purple)}.rx-kpi.orange{border-top:4px solid var(--rx-orange)}
      .rx-section-title{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:14px 0 9px}.rx-section-title.compact{margin:2px 0 9px}.rx-section-title span{display:block;color:var(--rx-blue);font-size:8.5px;font-weight:950;letter-spacing:.11em}.rx-section-title h2{margin:3px 0 0;color:var(--rx-navy);font-size:17px;line-height:1.05}.rx-section-title>p{max-width:380px;margin:0;color:var(--rx-muted);font-size:9px;text-align:right}.rx-findings{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rx-finding{position:relative;display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:10px;min-height:96px;padding:11px 12px;border:1px solid var(--rx-line);border-radius:15px;background:#fff;box-sizing:border-box}.rx-finding:nth-child(5){grid-column:1/-1}.rx-finding-rank{display:grid;place-items:center;width:27px;height:27px;border-radius:9px;background:var(--rx-pale);color:var(--rx-navy);font-size:12px;font-weight:950}.rx-finding h3{margin:0 0 4px;color:var(--rx-navy);font-size:11.5px}.rx-finding p{margin:0 0 4px;color:var(--rx-ink);font-size:9.5px;line-height:1.3}.rx-finding small{display:block;color:var(--rx-muted);font-size:8.2px;line-height:1.25}.rx-finding small+small{margin-top:2px}.rx-finding.attention{border-left:5px solid var(--rx-red)}.rx-finding.positive{border-left:5px solid var(--rx-green)}.rx-finding.mixed{border-left:5px solid var(--rx-gold)}.rx-finding.neutral{border-left:5px solid #8293a3}.rx-confidence{align-self:start;padding:4px 7px;border-radius:999px;background:#eef4f8;color:var(--rx-muted);font-size:7.5px;font-weight:950;text-transform:uppercase}.rx-method-note{margin-top:9px;padding:8px 11px;border-radius:11px;background:#eff6fa;color:#536b7e;font-size:8.5px;line-height:1.35}.rx-method-note.strong{border-left:5px solid var(--rx-green);background:#eaf7f1;color:#32614e}
      .rx-adr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.rx-adr-small{height:276px;padding:10px 11px 8px;border:1px solid var(--rx-line);border-radius:16px;background:#fff;box-sizing:border-box;overflow:hidden}.rx-adr-small>header{display:flex;align-items:center;justify-content:space-between;gap:8px}.rx-adr-small>header span{font-size:8px;font-weight:950;color:var(--rx-blue)}.rx-adr-small h3{margin:2px 0 0;color:var(--rx-navy);font-size:12px}.rx-adr-small>header>b{padding:4px 7px;border-radius:999px;font-size:7.5px;white-space:nowrap}.rx-adr-small>header>b.positive{background:#e5f5ee;color:var(--rx-green)}.rx-adr-small>header>b.attention{background:#fcebed;color:var(--rx-red)}.rx-adr-small>header>b.mixed{background:#fff4dd;color:#946200}.rx-adr-small footer{display:flex;align-items:center;justify-content:space-between;gap:5px;padding-top:6px;border-top:1px solid #e9eff3;color:var(--rx-muted);font-size:7.5px}.rx-adr-small footer b{color:var(--rx-navy)}
      .rx-priority-legend{display:flex;align-items:center;gap:8px;margin:0 0 8px;padding:7px 10px;border-radius:11px;background:#fff5f6;color:#714952;font-size:8px}.rx-priority-legend i{flex:0 0 10px;width:10px;height:10px;border-radius:50%;background:var(--rx-red)}.rx-adr-priority-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,minmax(0,1fr));gap:9px;height:516px}.rx-adr-priority-panel{min-width:0;overflow:hidden;border:1px solid var(--rx-line);border-radius:14px;background:#fff}.rx-adr-priority-panel>header{display:flex;align-items:flex-start;justify-content:space-between;gap:7px;min-height:37px;padding:7px 9px 6px;border-bottom:1px solid var(--rx-line);background:#f6fafc;box-sizing:border-box}.rx-adr-priority-panel>header span{display:block;color:var(--rx-blue);font-size:7px;font-weight:950}.rx-adr-priority-panel>header h3{margin:2px 0 0;color:var(--rx-navy);font-size:9.5px}.rx-adr-priority-panel>header small{max-width:155px;color:var(--rx-muted);font-size:6px;line-height:1.2;text-align:right}.rx-adr-priority-panel table{width:100%;border-collapse:collapse;table-layout:fixed}body.exp-ui .rx-adr-priority-panel th{height:19px!important;min-width:0!important;padding:0 5px!important;background:#eef5f8;color:var(--rx-muted);font-size:7.2px!important;line-height:1!important;text-align:right;text-transform:uppercase}body.exp-ui .rx-adr-priority-panel th:first-child{width:55%;text-align:left}body.exp-ui .rx-adr-priority-panel td{height:17px!important;min-width:0!important;padding:1px 5px!important;border-top:1px solid #edf2f5;color:var(--rx-ink);font-size:8.1px!important;line-height:1!important;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}body.exp-ui .rx-adr-priority-panel td:first-child{text-align:left;color:var(--rx-navy);font-weight:750}body.exp-ui .rx-adr-priority-panel td.rx-worst-value{color:var(--rx-red);font-weight:950;background:#fff1f2}
      .rx-line-visual{height:205px}.rx-line-visual .rx-svg{width:100%;height:180px}.rx-chart-legend{display:flex;justify-content:center;gap:16px;margin-top:-2px;color:var(--rx-muted);font-size:7.5px}.rx-chart-legend span{display:inline-flex;align-items:center;gap:5px}.rx-chart-legend i{width:14px;height:4px;border-radius:999px}
      .rx-two-charts{display:grid;grid-template-columns:1fr 1fr;gap:12px;height:410px}.rx-two-charts.ideb{height:350px;margin-top:10px}.rx-visual-card{display:flex;flex-direction:column;min-width:0;border:1px solid var(--rx-line);border-radius:17px;background:#fff;overflow:hidden}.rx-visual-head{padding:11px 13px 8px;border-bottom:1px solid #e6eef3;background:#f8fbfd}.rx-visual-head h3{margin:0;color:var(--rx-navy);font-size:12px}.rx-visual-head p{margin:3px 0 0;color:var(--rx-muted);font-size:8.5px}.rx-visual-body{flex:1;display:grid;align-items:center;padding:7px;overflow:hidden}.rx-visual-body .rx-svg{width:100%;height:100%;max-height:340px}.rx-delta-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:7px}.rx-delta-chip{min-height:116px;padding:9px;border:1px solid var(--rx-line);border-radius:13px;background:#fff;box-sizing:border-box}.rx-delta-chip span{display:block;color:var(--rx-navy);font-size:9px;font-weight:950}.rx-delta-chip b{display:block;margin-top:7px;font-size:14px;color:var(--rx-ink)}.rx-delta-chip small{display:block;color:var(--rx-muted);font-size:7.5px}.rx-delta-chip.attention{border-top:5px solid var(--rx-red)}.rx-delta-chip.positive{border-top:5px solid var(--rx-green)}.rx-delta-chip.mixed{border-top:5px solid var(--rx-gold)}
      .rx-scatter-layout{display:grid;grid-template-columns:minmax(0,2.1fr) minmax(250px,.9fr);gap:12px;height:329px}.rx-scatter-layout>*{min-height:0;height:100%;box-sizing:border-box}.rx-scatter-card{display:grid;align-items:center;padding:8px;border:1px solid var(--rx-line);border-radius:17px;background:#fff;overflow:hidden}.rx-scatter-card .rx-svg{min-height:0;width:100%;height:100%}.rx-scatter-insight{min-height:0;height:100%;padding:13px 15px;border-radius:17px;background:linear-gradient(155deg,var(--rx-navy),#1a648f);color:#fff;overflow:hidden;box-sizing:border-box}.rx-scatter-insight>span{font-size:8px;font-weight:950;letter-spacing:.12em;color:#a8dbef}.rx-scatter-insight h3{margin:5px 0 6px;font-size:15px;line-height:1.1}.rx-scatter-insight .rx-kpi{min-height:57px;margin-top:5px;padding:7px 10px;background:rgba(255,255,255,.96)}.rx-distance{display:grid;gap:3px;margin-top:6px;padding:6px 7px;border-radius:11px;background:rgba(255,255,255,.1);font-size:7.7px}.rx-distance span{display:flex;justify-content:space-between}.rx-scatter-insight>p{margin:6px 0 0;color:#d8eaf3;font-size:7.4px;line-height:1.25}.rx-skills-band{display:grid;grid-template-columns:185px 1fr;align-items:center;gap:11px;height:246px;margin-top:8px;padding:9px 12px;border:1px solid var(--rx-line);border-radius:16px;background:#fff;box-sizing:border-box;overflow:hidden}.rx-skills-band>div:first-child>span{color:var(--rx-blue);font-size:8px;font-weight:950}.rx-skills-band h3{margin:5px 0 0;color:var(--rx-navy);font-size:13px;line-height:1.14}.rx-skills-band>div:first-child>p{margin:7px 0 0;color:var(--rx-muted);font-size:8px;line-height:1.3}.rx-skill-cards{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:7px;height:224px;min-width:0}.rx-skill-card{display:flex;flex-direction:column;min-width:0;min-height:0;padding:6px 9px;border:1px solid var(--rx-line);border-radius:12px;background:#f8fbfd;box-sizing:border-box;overflow:hidden}.rx-skill-card:nth-child(odd){border-left:4px solid var(--rx-blue)}.rx-skill-card:nth-child(even){border-left:4px solid var(--rx-purple)}.rx-skill-card header{display:flex;align-items:center;justify-content:space-between;gap:7px}.rx-skill-card header b{color:var(--rx-navy);font-size:7.8px;line-height:1;white-space:nowrap}.rx-skill-card header span{flex:0 0 auto;color:var(--rx-blue);font-size:9px;font-weight:950}.rx-skill-card p{flex:1;min-height:0;margin:4px 0 4px;color:var(--rx-ink);font-size:7px;font-weight:650;line-height:1.1;overflow:hidden}.rx-skill-card>i{display:block;flex:0 0 4px;height:4px;overflow:hidden;border-radius:999px;background:#dce8ef}.rx-skill-card>i>b{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--rx-blue),var(--rx-purple))}
      .rx-prova-main{height:430px}.rx-prova-main .rx-svg{max-height:390px}.rx-gap-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:10px}.rx-gap-card{min-height:106px;padding:10px;border:1px solid var(--rx-line);border-radius:14px;background:#fff;box-sizing:border-box}.rx-gap-card span{display:block;font-size:7px;font-weight:950;color:var(--rx-muted)}.rx-gap-card h3{margin:7px 0 4px;color:var(--rx-navy);font-size:9.5px}.rx-gap-card>b{display:block;font-size:17px}.rx-gap-card small{display:block;margin-top:4px;color:var(--rx-muted);font-size:7.5px;line-height:1.25}.rx-gap-card.attention{border-top:5px solid var(--rx-red)}.rx-gap-card.attention>b{color:var(--rx-red)}.rx-gap-card.positive{border-top:5px solid var(--rx-green)}.rx-gap-card.positive>b{color:var(--rx-green)}
      .rx-prova-results-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.rx-prova-result-card{min-height:62px;padding:9px 11px;border:1px solid var(--rx-line);border-radius:13px;background:#fff}.rx-prova-result-card span{display:block;color:var(--rx-muted);font-size:7px;font-weight:850}.rx-prova-result-card b{display:block;margin-top:6px;color:var(--rx-blue);font-size:17px}.rx-prova-result-card.purple{border-top:4px solid var(--rx-purple)}.rx-prova-result-card.purple b{color:var(--rx-purple)}.rx-prova-result-card.blue{border-top:4px solid var(--rx-blue)}
      .rx-ideb-top{display:grid;grid-template-columns:1fr 1fr;gap:12px}.rx-ideb-top.single,.rx-two-charts.single{grid-template-columns:1fr}.rx-ideb-segment{padding:13px 14px 10px;border:1px solid var(--rx-line);border-radius:17px;background:#fff}.rx-ideb-segment header span{color:var(--rx-blue);font-size:8px;font-weight:950}.rx-ideb-segment header h3{margin:3px 0 9px;color:var(--rx-navy);font-size:13px}.rx-ideb-hero{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.rx-ideb-hero.two{grid-template-columns:repeat(2,1fr)}.rx-ideb-hero>div{padding:9px;border-radius:12px;background:#f3f8fb}.rx-ideb-hero small{display:block;color:var(--rx-muted);font-size:7px;font-weight:950}.rx-ideb-hero b{display:block;margin-top:4px;color:var(--rx-navy);font-size:23px}.rx-ideb-hero b.positive{color:var(--rx-green)}.rx-ideb-hero b.attention{color:var(--rx-red)}.rx-ideb-hero span{display:block;margin-top:2px;color:var(--rx-muted);font-size:7px;line-height:1.2}.rx-ideb-mini{display:flex;justify-content:space-between;gap:8px;margin-top:8px;color:var(--rx-muted);font-size:7.5px}.rx-ideb-mini b{color:var(--rx-navy)}
      .rx-priority-layout{display:grid;grid-template-columns:.78fr 1.22fr;gap:12px;height:340px}.rx-priority-chart .rx-svg{max-height:290px}.rx-priority-table-wrap{overflow:hidden;border:1px solid var(--rx-line);border-radius:16px;background:#fff}.rx-priority-table{width:100%;border-collapse:collapse;table-layout:fixed}.rx-priority-table th{height:27px;padding:0 7px;background:#f1f7fa;color:var(--rx-muted);font-size:7.2px;text-align:left;text-transform:uppercase}.rx-priority-table th:nth-child(1){width:24px}.rx-priority-table th:nth-child(2){width:175px}.rx-priority-table th:nth-child(3){width:42px;text-align:center}.rx-priority-table td{height:27px;padding:3px 7px;border-top:1px solid #e8eef2;vertical-align:middle;font-size:7.3px;overflow:hidden}.rx-priority-table td:first-child b{display:grid;place-items:center;width:18px;height:18px;border-radius:6px;background:#edf4f8;color:var(--rx-navy)}.rx-priority-table strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--rx-navy);font-size:8px}.rx-priority-table small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--rx-muted);font-size:6.5px}.rx-priority-table td:nth-child(3){text-align:center}.rx-evidence-count{display:inline-grid;place-items:center;width:21px;height:21px;border-radius:8px;background:#e9f5ef;color:var(--rx-green);font-weight:950}.rx-evidence-count.s2{background:#fff2df;color:#a36600}.rx-evidence-count.s3,.rx-evidence-count.s4{background:#fbe8ea;color:var(--rx-red)}.rx-priority-table td:last-child{white-space:nowrap}.rx-priority-table i{display:inline-block;max-width:92px;margin:1px 2px;padding:3px 5px;border-radius:999px;background:#f9ecee;color:#a3434d;font-style:normal;font-size:6.2px;overflow:hidden;text-overflow:ellipsis;vertical-align:middle}.rx-priority-table i.ok{background:#e8f5ef;color:var(--rx-green)}.rx-section-title.actions{margin-top:8px}.rx-action-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.rx-action-card{min-height:98px;padding:9px 11px;border:1px solid var(--rx-line);border-radius:14px;background:#fff;box-sizing:border-box}.rx-action-card span{color:var(--rx-muted);font-size:6.8px;font-weight:950}.rx-action-card h3{margin:5px 0 4px;color:var(--rx-navy);font-size:9.5px}.rx-action-card p{margin:0;color:var(--rx-ink);font-size:7.6px;line-height:1.28}.rx-action-card small{display:block;margin-top:4px;color:var(--rx-muted);font-size:6.7px;line-height:1.2}.rx-action-card.attention{border-top:5px solid var(--rx-red)}.rx-action-card.positive{border-top:5px solid var(--rx-green)}.rx-action-card.mixed{border-top:5px solid var(--rx-gold)}
      .rx-empty{display:grid;place-items:center;align-content:center;min-height:90px;color:var(--rx-muted);text-align:center}.rx-empty span{font-size:24px;color:#a7bcc9}.rx-empty p{margin:6px 0 0;font-size:9px}.rx-building{display:grid;place-items:center;align-content:center;width:1120px;height:500px;color:var(--rx-navy)}.rx-progress-card{width:min(720px,82vw);padding:25px 27px 23px;border:1px solid #cfdee8;border-radius:22px;background:#fff;box-shadow:0 18px 48px rgba(17,56,93,.13)}.rx-progress-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}.rx-progress-head span{display:block;color:var(--rx-blue);font-size:9px;font-weight:950;letter-spacing:.12em}.rx-progress-head h3{margin:6px 0 0;color:var(--rx-navy);font-size:18px}.rx-progress-head>b{color:var(--rx-purple);font-size:24px}.rx-progress-track{height:14px;margin-top:19px;overflow:hidden;border-radius:999px;background:#e7eef3;box-shadow:inset 0 1px 2px rgba(17,56,93,.1)}.rx-progress-track i{display:block;width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--rx-blue),var(--rx-purple),var(--rx-green));transition:width .22s ease}.rx-progress-card>p{margin:10px 0 0;color:var(--rx-muted);font-size:10px}.rx-report-error{width:700px;padding:40px;border-radius:20px;background:#fff;color:var(--rx-red);text-align:center}.rx-report-error span{display:block;margin-top:8px;color:var(--rx-muted)}
      .rx-svg text{font-family:Inter,Segoe UI,Arial,sans-serif}.rx-svg-label{fill:#425b70;font-size:12px;font-weight:700}.rx-svg-value{fill:var(--rx-navy);font-size:11px;font-weight:900}.rx-svg-tick{fill:#74879a;font-size:10px;font-weight:700}.rx-svg-legend{fill:#607487;font-size:10px;font-weight:800}.rx-svg-axis{fill:#486277;font-size:12px;font-weight:900}.rx-svg-focus{fill:var(--rx-navy);font-size:11px;font-weight:950}.positive{color:var(--rx-green)}.attention{color:var(--rx-red)}
      @keyframes rxSpin{to{transform:rotate(360deg)}}
      @media(max-width:760px){.rx-choice-overlay{padding:10px}.rx-choice-dialog>header{padding:20px 18px 15px}.rx-choice-context{margin:13px 18px 0;align-items:flex-start;flex-wrap:wrap}.rx-choice-context small{width:100%;margin-left:0}.rx-choice-grid{grid-template-columns:1fr;padding:14px 18px 20px}.rx-choice-card{min-height:95px}.rx-preview-head{align-items:flex-start;padding:10px 12px}.rx-preview-head p{display:none}.rx-preview-head>div:last-child{flex-wrap:wrap;justify-content:flex-end}.rx-preview-secondary{display:none}.rx-preview-scroll{padding:14px 8px 50px}#rxReportHost{justify-items:start}.rx-page{border-radius:0}}
      @media print{@page{size:A4 landscape;margin:0}html,body{width:auto!important;height:auto!important;background:#fff!important;overflow:visible!important}.rx-printing>*:not(#rxReportOverlay){display:none!important}.rx-printing #rxReportOverlay{position:static!important;display:block!important;inset:auto!important;background:#fff!important;overflow:visible!important}.rx-printing .rx-preview-head{display:none!important}.rx-printing .rx-preview-scroll{display:block!important;overflow:visible!important;padding:0!important}.rx-printing #rxReportHost{display:block!important;min-width:0!important}.rx-printing .rx-page{width:297mm!important;height:210mm!important;margin:0!important;padding:9mm 11mm 8mm!important;border:0!important;border-radius:0!important;box-shadow:none!important;page-break-after:always;break-after:page}.rx-printing .rx-page:last-child{page-break-after:auto}.rx-printing .rx-page-head{height:14mm}.rx-printing .rx-page-body{height:176mm;padding-top:4mm}.rx-printing .rx-page-foot{left:11mm;right:11mm;bottom:3mm}}
    `;document.head.appendChild(style);
  }

  function installButton(){
    if(document.getElementById('reportExperimentalBtn'))return;const actions=document.querySelector('.topbar .actions');if(!actions)return;const button=document.createElement('button');button.id='reportExperimentalBtn';button.type='button';button.className='btn export-action-btn report-experimental-btn';button.setAttribute('aria-label','Gerar relatório gerencial');button.innerHTML='<span class="export-action-icon">◆</span><span class="export-action-label">Relatório</span>';button.addEventListener('click',openChoice);actions.appendChild(button);
  }
  function syncIdentity(){
    const brand=document.querySelector('.brand-title h1');if(brand&&brand.textContent.trim()!==RX_NAME)brand.textContent=RX_NAME;const badge=document.getElementById('dashboardVersionBadge');if(badge&&badge.textContent.trim()!==RX_VERSION)badge.textContent=RX_VERSION;document.querySelectorAll('.exp-badge').forEach(item=>{if(item.textContent.trim()!==RX_VERSION)item.textContent=RX_VERSION;});if(!document.body.classList.contains('rx-printing')){const scope=document.getElementById('regionalScopeSelect')?.selectedOptions?.[0]?.textContent?.trim()||'Toda a SME';document.title=`${RX_NAME} — ${scope}`;}
  }
  function audit(){
    const state=stateContext();const contexts=['sme','cre','agent'].map(kind=>contextFor(kind,state)).filter(Boolean);return {version:RX_VERSION,name:RX_NAME,button:!!document.getElementById('reportExperimentalBtn'),contexts:contexts.map(ctx=>ctx.kind),adrRows:adrRows().length,somRows:somRows().length,lastPages:document.querySelectorAll('#rxReportHost .rx-page').length,lastOverflows:[...document.querySelectorAll('#rxReportHost .rx-page')].filter(page=>page.scrollHeight>page.clientHeight+2||page.scrollWidth>page.clientWidth+2).length};
  }
  function install(){installStyles();installButton();ensureChoice();ensureReport();syncIdentity();document.getElementById('regionalScopeSelect')?.addEventListener('change',()=>setTimeout(syncIdentity,20));const observer=new MutationObserver(()=>{installButton();syncIdentity();});const header=document.querySelector('.topbar');if(header)observer.observe(header,{childList:true,subtree:true});document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(document.getElementById('rxReportOverlay')?.classList.contains('open'))closeReport();else if(document.getElementById('rxChoiceOverlay')?.classList.contains('open'))closeChoice();});window.GRAExperimentalReport={open:openChoice,generate:kind=>kind==='school'?null:generate(kind,stateContext()),buildContext:contextFor,audit,get state(){return stateContext();},get lastReport(){return REPORT_STATE.lastReport;}};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,260),{once:true});else setTimeout(install,260);
})();

