
(function(){
  const GC_BLUE='#0a66d9';
  const GC_GREEN='#1d8f68';
  const GC_YELLOW='#e0b400';
  const GC_RED='#c84b4b';
  const GC_STATE={som:false,adr:false,somMode:'get',adrMode:'get',somPrevCre:'',adrPrevCre:''};

  function gcEsc(v){
    if(typeof esc==='function') return esc(v);
    return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function gcNorm(v){ return typeof norm==='function'?norm(v):String(v||'').toLowerCase(); }
  function gcNum(v){ const n=Number(v); return Number.isFinite(n)?n:null; }
  function gcFmt(v,mode='pct'){
    if(!Number.isFinite(Number(v))) return '—';
    const n=Number(v);
    return mode==='score' ? n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) : n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
  }
  function gcCre2Value(select){
    if(!select) return '';
    const options=[...select.options];
    const found=options.find(o=>{ const nums=String(o.value||o.textContent||'').match(/\d+/g)||[]; return nums.some(n=>Number(n)===2); });
    return found?.value || '';
  }
  function gcScopeLabel(){return document.getElementById('regionalScopeSelect')?.selectedOptions?.[0]?.textContent||'Toda a SME';}
  function gcForceCre(kind,on){
    const select=document.getElementById(kind==='som'?'somCre':'adrCre');
    if(select){select.disabled=false;select.title='';}
  }
  function gcShowToast(){return;}
  function gcResolveMode(kind){
    const getToggle=document.getElementById(kind==='som'?'somGetCompareToggle':'adrGetCompareToggle');
    const turnoToggle=document.getElementById(kind==='som'?'somTurnoCompareToggle':'adrTurnoCompareToggle');
    const getOn=Boolean(getToggle?.checked);
    const turnoOn=Boolean(turnoToggle?.checked);
    // v218: GET e Turno podem coexistir tanto em Somativas quanto em ADR.
    if(getOn&&turnoOn)return 'both';
    if(turnoOn)return 'turno';
    if(getOn)return 'get';
    return GC_STATE[kind+'Mode']||'get';
  }
  function gcResetFocusForMode(card,mode){
    if(!card)return;
    if(card.dataset.gcMode!==mode){
      card.dataset.gcMode=mode;
      card._gcFocus={type:'',value:'',label:''};
    }
  }
  function gcTurnoGroup(v){
    const t=gcNorm(v);if(!t)return '';
    if(t.includes('integral')) return 'integral';
    if(t.includes('hibr')) return 'hibrido';
    return 'parcial';
  }
  function gcSchoolMeta(row){
    const school=String(row?.escola||'').trim(); if(!school)return null;
    const point=typeof window.geoFindPointForSchool==='function'?window.geoFindPointForSchool(school,row?.cre||row?.regional||''):null;
    if(point&&(String(point.segment||'').trim()||String(point.turnoEF||'').trim()||typeof point.isGET==='boolean'))return {name:point.name||school,isGET:Boolean(point.isGET),turnoGroup:gcTurnoGroup(point.turnoEF||''),agent:point.agent||'',territory:point.territory||''};
    if(typeof somFindRecord!=='function')return null;
    const rec=somFindRecord(school);if(!rec||Number(rec.pesoEF||0)<=0)return null;
    const vocational=gcNorm(rec.vocacionada||'');
    return {name:rec.unidade||school,isGET:vocational.includes('get')||vocational.includes('geo'),turnoGroup:gcTurnoGroup(rec.turnoEF||''),agent:rec.agente||'',territory:rec.territorio||''};
  }
  function gcWeighted(rows,valueFn){
    let sw=0,sv=0;
    rows.forEach(r=>{ const v=gcNum(valueFn(r)); if(v===null)return; const w=Math.max(1,Number(r.avaliados)||1); sw+=w; sv+=v*w; });
    return sw?sv/sw:null;
  }
  function gcQuantile(values,p){
    const a=values.map(Number).filter(Number.isFinite).sort((x,y)=>x-y); if(!a.length)return null;
    const i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i); return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(i-lo);
  }
  function gcSchoolGroups(rows,keyExtra=''){
    const map=new Map();
    rows.forEach(r=>{
      const meta=gcSchoolMeta(r); if(!meta)return;
      const extra=typeof keyExtra==='function'?keyExtra(r):'';
      const key=gcNorm(meta.name+'|'+extra);
      if(!map.has(key)) map.set(key,{...meta,key,extra,rows:[]});
      map.get(key).rows.push(r);
    });
    return [...map.values()];
  }
  function gcLineChart(targetId,{dims,series,mode='pct',empty='Não há dados suficientes para esta comparação.',note=''}={}){
    const target=document.getElementById(targetId); if(!target)return;
    const validSeries=(series||[]).filter(s=>(s.values||[]).some(v=>Number.isFinite(Number(v))));
    if(!dims?.length || !validSeries.length){ target.innerHTML=`<div class="gc-empty">${gcEsc(empty)}</div>`; target._gcSetFocus=null; return; }
    const flat=validSeries.flatMap(s=>s.values||[]).map(Number).filter(Number.isFinite);
    if(!flat.length){ target.innerHTML=`<div class="gc-empty">${gcEsc(empty)}</div>`; target._gcSetFocus=null; return; }
    let min,max;
    if(mode==='pct'){ min=0;max=100; }
    else if(mode==='score'){ min=Math.max(0,Math.min(...flat)-.6);max=Math.min(10,Math.max(...flat)+.6); if(max-min<2){min=Math.max(0,min-.6);max=Math.min(10,max+.6);} }
    else { min=Math.min(...flat);max=Math.max(...flat);const p=(max-min||1)*.12;min-=p;max+=p; }
    const w=780,h=330,padL=56,padR=24,padT=24,padB=dims.length>4?72:50;
    const x=i=>dims.length===1?(padL+(w-padL-padR)/2):padL+(w-padL-padR)*(i/(dims.length-1));
    const y=v=>h-padB-(h-padT-padB)*((v-min)/(max-min||1));
    const ticks=[0,.25,.5,.75,1].map(t=>min+(max-min)*t);
    const grid=ticks.map(v=>`<g><line x1="${padL}" y1="${y(v)}" x2="${w-padR}" y2="${y(v)}" stroke="#e4edf5"/><text x="${padL-9}" y="${y(v)+4}" text-anchor="end" fill="#74879a" font-size="10.5">${gcEsc(mode==='score'?Number(v).toLocaleString('pt-BR',{maximumFractionDigits:1}):Math.round(v)+'%')}</text></g>`).join('');
    const labels=dims.map((d,i)=>{ const rot=dims.length>4?` transform="rotate(-28 ${x(i)} ${h-18})"`:''; const anchor=dims.length>4?'end':'middle'; return `<text x="${x(i)}" y="${h-18}" text-anchor="${anchor}" fill="#607487" font-size="11" font-weight="700"${rot}>${gcEsc(d.label)}</text>`; }).join('');
    const schoolSeries=validSeries.filter(s=>s.kind==='school');
    const meanSeries=validSeries.filter(s=>s.kind!=='school');
    const renderSeries=[...schoolSeries,...meanSeries];
    const draw=(s,idx)=>{
      const parts=[]; let current=[];
      (s.values||[]).forEach((v,i)=>{ if(Number.isFinite(Number(v))) current.push(`${x(i)},${y(Number(v))}`); else if(current.length){parts.push(current);current=[];} }); if(current.length)parts.push(current);
      const group=s.group || 'other';
      const kind=s.kind==='school'?'school':'mean';
      const seriesId=`${targetId}-series-${idx}`;
      const lines=parts.map(pts=>`<polyline class="gc-line-hit" points="${pts.join(' ')}" fill="none"></polyline><polyline class="gc-line-main" points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.width||2.5}" stroke-linecap="round" stroke-linejoin="round" opacity="${s.opacity??1}" ${s.dash?`stroke-dasharray="${s.dash}"`:''}></polyline>`).join('');
      const circles=(s.values||[]).map((v,i)=>Number.isFinite(Number(v))?`<circle cx="${x(i)}" cy="${y(Number(v))}" r="${s.kind==='school'?2.2:4.6}" fill="${s.color}" opacity="${s.opacity??1}" stroke="${s.kind==='school'?'none':'#fff'}" stroke-width="1.3"><title>${gcEsc(s.name)} · ${gcEsc(dims[i].label)}: ${gcEsc(gcFmt(Number(v),mode))}</title></circle>`:'').join('');
      const valueLabels=s.kind==='school'?'':(s.values||[]).map((v,i)=>Number.isFinite(Number(v))?`<text x="${x(i)}" y="${y(Number(v))-10}" text-anchor="middle" fill="${s.color}" font-size="10.5" font-weight="900">${gcEsc(gcFmt(Number(v),mode))}</text>`:'').join('');
      return `<g class="gc-series gc-${kind}" data-series-id="${seriesId}" data-group="${group}" data-label="${gcEsc(s.name)}" tabindex="0" role="button" aria-label="Destacar ${gcEsc(s.name)}">${lines}${circles}${valueLabels}</g>`;
    };
    const groupMeta=meanSeries.map(s=>({group:s.group||'other',label:s.legendLabel||s.name,color:s.color}));
    const legendHtml=groupMeta.map(g=>`<button type="button" data-group="${gcEsc(g.group)}" aria-pressed="false"><i style="background:${g.color}"></i>${gcEsc(g.label)}</button>`).join('');
    const labelMap={}; groupMeta.forEach(g=>labelMap[g.group]=g.label);
    const interactionHint=schoolSeries.length?'Toque em um grupo para realçar somente a média correspondente. Toque em uma linha para destacar uma escola.':'Toque em um grupo para realçar a respectiva linha de média.';
    target.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img"><g class="gc-chart-background">${grid}<line x1="${padL}" y1="${h-padB}" x2="${w-padR}" y2="${h-padB}" stroke="#c7d8e6"/><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h-padB}" stroke="#c7d8e6"/>${labels}</g>${renderSeries.map(draw).join('')}</svg><div class="gc-chart-legend" aria-label="Escolha o grupo que deseja destacar">${legendHtml}</div><div class="gc-focus-label" aria-live="polite"></div><div class="gc-chart-interaction-hint">${interactionHint}</div>${note?`<div class="gc-chart-note">${gcEsc(note)}</div>`:''}`;

    const svg=target.querySelector('svg');
    const scope=target.closest('.gc-compare-card') || target.parentElement;
    const seriesNodes=[...target.querySelectorAll('.gc-series')];
    const legendButtons=[...target.querySelectorAll('.gc-chart-legend button')];
    const focusLabel=target.querySelector('.gc-focus-label');

    const applyFocus=(type,value,label='')=>{
      seriesNodes.forEach(node=>{
        const isMean=node.classList.contains('gc-mean');
        const groupMeanMatch=type==='group'&&isMean&&node.dataset.group===value;
        const labelMatch=type==='label'&&node.dataset.label===value;
        const match=groupMeanMatch||labelMatch;
        const dim=type==='group'?(isMean&&!groupMeanMatch):(type==='label'&&!labelMatch);
        node.classList.toggle('gc-highlighted',Boolean(type)&&match);
        node.classList.toggle('gc-dimmed',Boolean(type)&&dim);
        node.setAttribute('aria-pressed',String(Boolean(type)&&match));
      });
      legendButtons.forEach(btn=>{
        const active=type==='group'&&btn.dataset.group===value;
        btn.classList.toggle('active',active);
        btn.classList.toggle('muted',type==='group'&&!active || type==='label');
        btn.setAttribute('aria-pressed',String(active));
      });
      if(focusLabel){
        const text=!type?'':type==='group'?`${labelMap[value]||label||value} em destaque`:(label||value);
        focusLabel.textContent=text;
        focusLabel.classList.toggle('show',Boolean(text));
      }
    };
    target._gcSetFocus=applyFocus;

    const broadcastFocus=(type,value,label='')=>{
      const current=scope?._gcFocus||{};
      const next=(current.type===type&&current.value===value)?{type:'',value:'',label:''}:{type,value,label};
      if(scope) scope._gcFocus=next;
      const charts=scope?[...scope.querySelectorAll('.gc-chart')]:[target];
      charts.forEach(chart=>{ if(typeof chart._gcSetFocus==='function') chart._gcSetFocus(next.type,next.value,next.label); });
    };

    legendButtons.forEach(btn=>btn.addEventListener('click',()=>broadcastFocus('group',btn.dataset.group,btn.textContent.trim())));
    seriesNodes.forEach(node=>{
      const activate=()=>broadcastFocus('label',node.dataset.label,node.dataset.label);
      node.addEventListener('click',event=>{event.stopPropagation();activate();});
      node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
    });
    svg?.addEventListener('click',event=>{ if(!event.target.closest('.gc-series')) broadcastFocus('','',''); });
    if(scope?._gcFocus?.type) applyFocus(scope._gcFocus.type,scope._gcFocus.value,scope._gcFocus.label);
  }
  function gcSeriesForDimensions(rows,dims,valueFn,{mode='pct',keyExtra='',includeSchools=true,groupMode='get'}={}){
    const schools=gcSchoolGroups(rows,keyExtra);
    const groupDefs=groupMode==='turno'
      ? [{key:'integral',label:'Integrais',color:GC_YELLOW,match:s=>s.turnoGroup==='integral'},{key:'hibrido',label:'Híbridas',color:GC_GREEN,match:s=>s.turnoGroup==='hibrido'},{key:'parcial',label:'Parciais',color:GC_RED,match:s=>s.turnoGroup==='parcial'}]
      : [{key:'get',label:'GETs',color:GC_BLUE,match:s=>s.isGET},{key:'nao-get',label:'Não GETs',color:GC_GREEN,match:s=>!s.isGET}];
    const colorFor=s=> groupMode==='turno' ? (s.turnoGroup==='integral'?GC_YELLOW:s.turnoGroup==='hibrido'?GC_GREEN:GC_RED) : (s.isGET?GC_BLUE:GC_GREEN);
    const groupKey=s=> groupMode==='turno' ? (s.turnoGroup||'parcial') : (s.isGET?'get':'nao-get');
    const schoolSeries=includeSchools?schools.map(s=>({name:s.name+(s.extra?` · ${s.extra}`:''),kind:'school',group:groupKey(s),color:colorFor(s),width:1.35,opacity:.23,values:dims.map(d=>gcWeighted(s.rows.filter(d.match),valueFn))})).filter(s=>s.values.filter(Number.isFinite).length>=Math.min(2,dims.length)):[];
    const groupSeries=groupDefs.map(def=>{ const groupRows=schools.filter(def.match).flatMap(s=>s.rows); return {name:def.label,legendLabel:def.label,group:def.key,kind:'mean',color:def.color,width:4.2,opacity:1,values:dims.map(d=>gcWeighted(groupRows.filter(d.match),valueFn))}; }).filter(s=>s.values.some(Number.isFinite));
    return {mode,series:[...schoolSeries,...groupSeries]};
  }
  function gcRenderAdrCompare(){
    const card=document.getElementById('adrGetCompareCard'); if(!card)return;
    const getToggle=document.getElementById('adrGetCompareToggle');
    const turnoToggle=document.getElementById('adrTurnoCompareToggle');
    const getOn=Boolean(getToggle?.checked),turnoOn=Boolean(turnoToggle?.checked);
    GC_STATE.adr=getOn||turnoOn;
    GC_STATE.adrMode=getOn&&turnoOn?'both':turnoOn?'turno':'get';
    if(!GC_STATE.adr){
      card.classList.remove('open');
      document.getElementById('adrs')?.classList.remove('gc-compare-active');
      return;
    }
    const activeMode=GC_STATE.adrMode;
    gcResetFocusForMode(card,activeMode);
    card.classList.add('open');
    document.getElementById('adrs')?.classList.add('gc-compare-active');
    const chip=card.querySelector('.status-chip'); if(chip) chip.textContent=gcScopeLabel();
    const metric=document.getElementById('adrMetric')?.value||'adequado';
    const metricName=typeof adrMetricLabel==='function'?adrMetricLabel(metric):metric;
    const mode=document.getElementById('adrMode')?.value||'individual';
    // v220 — comparações GET/Turno preservam sempre a trajetória ADR 1 → ADR 2.
    // A ADR escolhida na leitura principal não reduz o gráfico comparativo a um único ponto.
    const rows=(typeof adrFilteredRows==='function'?adrFilteredRows({ignoreAdr:true}):[]).filter(r=>gcSchoolMeta(r));
    let adrs=[...new Set(rows.map(r=>r.adr).filter(Boolean))].sort((a,b)=>(typeof adrOrder==='function'?adrOrder(a):0)-(typeof adrOrder==='function'?adrOrder(b):0));
    const desired=['ADR 1','ADR 2'].filter(a=>adrs.includes(a));
    if(desired.length)adrs=desired;
    const dims=adrs.map(a=>({label:a,match:r=>r.adr===a}));
    const boxes=[...card.querySelectorAll('.gc-chart-box')];
    const grid=card.querySelector('.gc-compare-grid');
    if(grid)grid.classList.toggle('gc-single',!(getOn&&turnoOn));
    const head=card.querySelector('.panel-title h3');
    const sub=card.querySelector('.panel-title p');
    if(head)head.textContent=getOn&&turnoOn?'GETs e turnos — comparação ADR':getOn?'Comparação GETs x não GETs':'Comparação por turnos';
    if(sub)sub.textContent=`${metricName} · ADR 1 → ADR 2; os gráficos preservam o universo geral do filtro Master.`;
    const note=metric==='abaixo'?'Em Abaixo do Básico, a redução do percentual representa evolução positiva.':'Médias ponderadas pelo número de avaliados.';
    let slot=0;
    const renderOne=(groupMode,title)=>{
      const targetId=slot===0?'adrGetChart1':'adrGetChart2';
      const titleId=slot===0?'adrGetChartTitle1':'adrGetChartTitle2';
      if(boxes[slot])boxes[slot].style.display='';
      const series=gcSeriesForDimensions(rows,dims,r=>r?.[metric],{mode:'pct',groupMode,includeSchools:false});
      const titleEl=document.getElementById(titleId); if(titleEl)titleEl.textContent=title;
      gcLineChart(targetId,{dims,series:series.series,mode:'pct',note});
      slot++;
    };
    if(getOn)renderOne('get',`GETs x não GETs · ${metricName}`);
    if(turnoOn)renderOne('turno',`Turnos · ${metricName}`);
    for(let i=slot;i<boxes.length;i++)boxes[i].style.display='none';
  }
  function gcSomRows({ignoreAno=false,ignoreComp=false,ignoreEdicao=false}={}){
    const modalidade=document.getElementById('somModalidade')?.value||'';
    const ano=document.getElementById('somAnoEscolar')?.value||'';
    const comp=document.getElementById('somComponente')?.value||'';
    const ed=document.getElementById('somEdicao')?.value||'';
    const agente=document.getElementById('somAgente')?.value||'';
    const q=gcNorm(document.getElementById('somSearch')?.value||'');
    const priorityOnly=document.getElementById('somPriority')?.value==='sim';
    return (SOM_ROWS||[]).filter(r=>{
      if(modalidade&&r.modalidade!==modalidade)return false;
      if(!ignoreAno&&ano&&r.anoEscolar!==ano)return false;
      if(!ignoreComp&&comp&&typeof somComponentMatches==='function'&&!somComponentMatches(r.componente,comp,r.modalidade))return false;
      if(!ignoreEdicao&&ed&&r.edicao!==ed)return false;
      if(typeof geoIsCre2Row==='function'&&!geoIsCre2Row(r))return false;
      if(typeof somIsSpecificAgent==='function'&&somIsSpecificAgent(agente)&&typeof somRowAgent==='function'&&somRowAgent(r)!==agente)return false;
      if(priorityOnly&&!priorityMatchesContext(r.escola,ano,modalidade,r.cre))return false;
      if(q&&typeof somRecordText==='function'&&!somRecordText(r).includes(q))return false;
      return !!gcSchoolMeta(r);
    });
  }
  function gcRenderDistribution(targetId,rows,valueFn,titleId,title,mode='pct'){
    const dims=[{label:'Mínimo'},{label:'P25'},{label:'Mediana'},{label:'P75'},{label:'Máximo'}];
    const schools=gcSchoolGroups(rows);
    const series=[true,false].map(isGET=>{
      const values=schools.filter(s=>s.isGET===isGET).map(s=>gcWeighted(s.rows,valueFn)).filter(Number.isFinite);
      const qs=[0,.25,.5,.75,1].map(p=>gcQuantile(values,p));
      return {name:isGET?'GETs':'Não GETs',kind:'mean',color:isGET?GC_BLUE:GC_GREEN,width:4.2,opacity:1,values:qs};
    }).filter(s=>s.values.some(Number.isFinite));
    document.getElementById(titleId).textContent=title;
    gcLineChart(targetId,{dims,series,mode,note:'As linhas mostram a distribuição dos resultados escolares, do menor valor ao maior.'});
  }

  function gcSetSomCompareLayout(single,title='',subtitle=''){
    const card=document.getElementById('somGetCompareCard'); if(!card)return;
    const grid=card.querySelector('.gc-compare-grid');
    const boxes=[...card.querySelectorAll('.gc-chart-box')];
    grid?.classList.toggle('gc-single',Boolean(single));
    if(boxes[1]) boxes[1].style.display=single?'none':'';
    if(boxes[0]){
      const h=boxes[0].querySelector('h4'),p=boxes[0].querySelector('p');
      if(h&&title)h.textContent=title;
      if(p&&subtitle)p.textContent=subtitle;
    }
  }
  function gcRenderScatterCompare(targetId,rows,groupMode='get'){
    const target=document.getElementById(targetId); if(!target)return;
    const valid=(rows||[]).map(r=>({row:r,meta:gcSchoolMeta(r),lp:gcNum(r.lp),mt:gcNum(r.mt)})).filter(x=>x.meta&&x.lp!==null&&x.mt!==null);
    if(!valid.length){target.innerHTML='<div class="gc-empty">Não há pares LP x MT neste recorte.</div>';return;}
    const w=1120,h=470,L=70,R=32,T=26,B=62,pw=w-L-R,ph=h-T-B;
    const x=v=>L+Math.max(0,Math.min(100,Number(v)))/100*pw;
    const y=v=>T+(100-Math.max(0,Math.min(100,Number(v))))/100*ph;
    const ticks=[0,20,40,60,80,100];
    const grid=ticks.map(t=>`<line x1="${x(t)}" x2="${x(t)}" y1="${T}" y2="${T+ph}" stroke="#e4edf5"/><line x1="${L}" x2="${L+pw}" y1="${y(t)}" y2="${y(t)}" stroke="#e4edf5"/><text x="${x(t)}" y="${T+ph+24}" text-anchor="middle" fill="#74879a" font-size="10.5">${t}%</text><text x="${L-10}" y="${y(t)+4}" text-anchor="end" fill="#74879a" font-size="10.5">${t}%</text>`).join('');
    const avgLP=gcWeighted(valid.map(x=>x.row),r=>r.lp),avgMT=gcWeighted(valid.map(x=>x.row),r=>r.mt);
    const defs=groupMode==='turno' ? [{key:'integral',label:'Integrais',color:GC_YELLOW,match:m=>m.turnoGroup==='integral'},{key:'hibrido',label:'Híbridas',color:GC_GREEN,match:m=>m.turnoGroup==='hibrido'},{key:'parcial',label:'Parciais',color:GC_RED,match:m=>m.turnoGroup==='parcial'}] : [{key:'get',label:'GETs',color:GC_BLUE,match:m=>m.isGET},{key:'nao-get',label:'Não GETs',color:GC_GREEN,match:m=>!m.isGET}];
    const colorFor=m=>defs.find(d=>d.match(m))?.color||'#8a9baa';
    const labelFor=m=>defs.find(d=>d.match(m))?.label||'Grupo';
    const points=valid.map(({meta,lp,mt})=>{const color=colorFor(meta);const label=labelFor(meta);return `<circle cx="${x(lp).toFixed(1)}" cy="${y(mt).toFixed(1)}" r="5.7" fill="${color}" opacity=".78" stroke="#fff" stroke-width="1.7"><title>${gcEsc(meta.name)} · ${label}
LP: ${gcEsc(gcFmt(lp,'pct'))}
MT: ${gcEsc(gcFmt(mt,'pct'))}</title></circle>`;}).join('');
    const means=defs.map(def=>{ const rs=valid.filter(x=>def.match(x.meta)).map(x=>x.row); if(!rs.length)return ''; const lp=gcWeighted(rs,r=>r.lp),mt=gcWeighted(rs,r=>r.mt),color=def.color,name=`Média ${def.label}`; if(!Number.isFinite(lp)||!Number.isFinite(mt))return ''; const tx=Math.min(w-R-110,x(lp)+13),ty=Math.max(T+14,y(mt)-12); return `<g><circle cx="${x(lp)}" cy="${y(mt)}" r="10" fill="${color}" stroke="#fff" stroke-width="3"><title>${gcEsc(name)} · LP ${gcEsc(gcFmt(lp,'pct'))} · MT ${gcEsc(gcFmt(mt,'pct'))}</title></circle><circle cx="${x(lp)}" cy="${y(mt)}" r="13" fill="none" stroke="${color}" stroke-width="2" opacity=".55"/><text class="gc-scatter-mean-label" x="${tx}" y="${ty}" fill="${color}">${gcEsc(name)}</text></g>`; }).join('');
    const legend=defs.map(def=>`<span><i class="dot" style="background:${def.color}"></i>${gcEsc(def.label)}</span>`).join('');
    target.innerHTML=`<div class="gc-scatter-compare"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Dispersão Avalia RJ: Língua Portuguesa no eixo horizontal e Matemática no eixo vertical"><rect x="${L}" y="${T}" width="${pw}" height="${ph}" rx="12" fill="#fff" stroke="#d9e5ef"/>${grid}<line x1="${L}" y1="${T+ph}" x2="${L+pw}" y2="${T+ph}" stroke="#b7c9d8"/><line x1="${L}" y1="${T}" x2="${L}" y2="${T+ph}" stroke="#b7c9d8"/><line x1="${x(avgLP)}" y1="${T}" x2="${x(avgLP)}" y2="${T+ph}" stroke="#9bbad0" stroke-dasharray="5 5" opacity=".75"/><line x1="${L}" y1="${y(avgMT)}" x2="${L+pw}" y2="${y(avgMT)}" stroke="#9bbad0" stroke-dasharray="5 5" opacity=".75"/>${points}${means}<text x="${L+pw/2}" y="${h-12}" text-anchor="middle" fill="#526779" font-size="12" font-weight="900">Língua Portuguesa (Leitura + Escrita) — % Adequado + Avançado</text><text transform="translate(18 ${T+ph/2}) rotate(-90)" text-anchor="middle" fill="#526779" font-size="12" font-weight="900">Matemática — % Adequado + Avançado</text></svg><div class="gc-compare-simple-legend">${legend}</div><div class="gc-chart-note">Cada ponto representa uma escola. Os círculos maiores indicam a média de cada grupo.</div></div>`;
  }
  function gcRenderGroupedBars(targetId,{categories,series,mode='pct',note=''}={}){
    const target=document.getElementById(targetId); if(!target)return;
    const activeSeries=(series||[]).filter(s=>(s.values||[]).some(v=>Number.isFinite(Number(v))));
    const all=activeSeries.flatMap(s=>s.values||[]).map(Number).filter(Number.isFinite);
    if(!categories?.length||!all.length){target.innerHTML='<div class="gc-empty">Não há dados suficientes para esta comparação.</div>';return;}
    let min=0,max;
    if(mode==='pct')max=100; else if(mode==='score')max=10; else{min=Math.min(0,...all);max=Math.max(0,...all);const p=(max-min||1)*.12;min-=min<0?p:0;max+=p;}
    const w=1000,h=310,L=58,R=22,T=20,B=52,pw=w-L-R,ph=h-T-B;
    const y=v=>T+ph-ph*((Number(v)-min)/(max-min||1));
    const ticks=[0,.25,.5,.75,1].map(t=>min+(max-min)*t);
    const grid=ticks.map(v=>`<line x1="${L}" x2="${L+pw}" y1="${y(v)}" y2="${y(v)}" stroke="#e4edf5"/><text x="${L-10}" y="${y(v)+4}" text-anchor="end" fill="#74879a" font-size="10.5">${gcEsc(mode==='pct'?Math.round(v)+'%':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:1}))}</text>`).join('');
    const groupW=pw/categories.length, n=activeSeries.length, gap=Math.min(12,groupW*.05), barW=Math.min(64,(groupW-(n-1)*gap)*.9/n), baseY=y(0);
    const rect=(v,x0,color,name,category)=>{ if(!Number.isFinite(Number(v)))return ''; const yy=y(v),top=Math.min(yy,baseY),height=Math.max(1,Math.abs(baseY-yy)); const labelY=Number(v)>=0?Math.max(T+12,top-8):Math.min(T+ph-4,top+height+16); return `<g><rect x="${x0}" y="${top}" width="${barW}" height="${height}" rx="8" fill="${color}" opacity=".92"><title>${gcEsc(category)} · ${gcEsc(name)}: ${gcEsc(gcFmt(v,mode))}</title></rect><text class="gc-bar-value" x="${x0+barW/2}" y="${labelY}" text-anchor="middle" fill="${color}">${gcEsc(gcFmt(v,mode))}</text></g>`; };
    const bars=categories.map((cat,i)=>{ const center=L+groupW*(i+.5); const total=n*barW+(n-1)*gap; const startX=center-total/2; const inner=activeSeries.map((s,j)=>rect(s.values[i],startX+j*(barW+gap),s.color,s.name,cat)).join(''); return `${inner}<text class="gc-bar-category" x="${center}" y="${h-24}" text-anchor="middle">${gcEsc(cat)}</text>`; }).join('');
    const legend=activeSeries.map(s=>`<span><i style="background:${s.color}"></i>${gcEsc(s.name)}</span>`).join('');
    target.innerHTML=`<div class="gc-bar-compare"><svg viewBox="0 0 ${w} ${h}" role="img"><rect x="${L}" y="${T}" width="${pw}" height="${ph}" rx="12" fill="#fff" stroke="#d9e5ef"/>${grid}<line x1="${L}" y1="${baseY}" x2="${L+pw}" y2="${baseY}" stroke="#b7c9d8"/>${bars}</svg><div class="gc-compare-simple-legend">${legend}</div>${note?`<div class="gc-chart-note">${gcEsc(note)}</div>`:''}</div>`;
  }

  function gcRenderSomCompare(){
    const card=document.getElementById('somGetCompareCard'); if(!card)return;
    if(!GC_STATE.som){
      card.classList.remove('open');
      document.getElementById('resultados')?.classList.remove('gc-compare-active');
      return;
    }

    const activeMode=gcResolveMode('som');
    GC_STATE.somMode=activeMode;
    gcResetFocusForMode(card,activeMode);
    const isBoth=activeMode==='both';
    const isTurno=activeMode==='turno';
    card.classList.add('open');
    document.getElementById('resultados')?.classList.add('gc-compare-active');

    const chip=card.querySelector('.status-chip');
    if(chip) chip.textContent=gcScopeLabel();
    const head=card.querySelector('.panel-title h3');
    if(head) head.textContent=isBoth?'Comparações GETs e turnos':(isTurno?'Comparação por turnos':'Comparação GETs x não GETs');
    const sub=card.querySelector('.panel-title p');
    if(sub) sub.textContent=isBoth
      ?'As duas leituras estão ativas simultaneamente; nenhuma delas restringe o universo de escolas.'
      :(isTurno?'Análise por jornada oficial da rede: Integrais em amarelo, Híbridas em verde e Parciais em vermelho.':'Análise no recorte regional selecionado, com GETs em azul e não GETs em verde.');

    const modal=String(document.getElementById('somModalidade')?.value||'').trim();
    const modalNorm=gcNorm(modal);
    const title1=document.getElementById('somGetChartTitle1');
    const title2=document.getElementById('somGetChartTitle2');
    const defs=isTurno
      ?[
        {name:'Integrais',color:GC_YELLOW,match:m=>m.turnoGroup==='integral'},
        {name:'Híbridas',color:GC_GREEN,match:m=>m.turnoGroup==='hibrido'},
        {name:'Parciais',color:GC_RED,match:m=>m.turnoGroup==='parcial'}
      ]
      :[
        {name:'GETs',color:GC_BLUE,match:m=>m.isGET},
        {name:'Não GETs',color:GC_GREEN,match:m=>!m.isGET}
      ];

    // Regra absoluta: dispersão apenas no Avalia RJ.
    if(modalNorm==='avalia rj'){
      const rows=gcSomRows({ignoreComp:true,ignoreAno:true,ignoreEdicao:true});
      gcSetSomCompareLayout(
        true,
        `Avalia RJ · ${isTurno?'Integrais, Híbridas e Parciais':'GETs x não GETs'}`,
        'Gráfico de dispersão com as escolas e as médias dos grupos.'
      );
      gcRenderScatterCompare('somGetChart1',rows,isTurno?'turno':'get');
      return;
    }

    // Prova Rio e Simulado Prova Rio: três grupos de barras por ano escolar.
    if(modalNorm.includes('prova rio')){
      const rows=gcSomRows({ignoreAno:true,ignoreEdicao:true});
      const comp=document.getElementById('somComponente')?.value||'';
      const metric=document.getElementById('somMetric')?.value||'principal';
      const categories=['1º ano','3º ano','7º ano'];
      const mode=(typeof somIsIDEBDisplay==='function'&&somIsIDEBDisplay(metric))?'score':'pct';
      const builtSeries=defs.map(def=>({
        name:def.name,
        color:def.color,
        values:categories.map(category=>{
          const subset=rows.filter(r=>r.anoEscolar===category).filter(r=>{
            const meta=gcSchoolMeta(r);
            return meta&&def.match(meta);
          });
          return gcWeighted(subset,r=>typeof somMetricValue==='function'?somMetricValue(r,metric):r[metric]);
        })
      }));
      gcSetSomCompareLayout(
        true,
        `${modal}${comp?` · ${comp}`:''}`,
        'Barras verticais agrupadas por ano escolar.'
      );
      gcRenderGroupedBars('somGetChart1',{
        categories,
        series:builtSeries,
        mode,
        note:'1º, 3º e 7º anos são comparados pelas médias das categorias selecionadas.'
      });
      return;
    }

    // IDEB e IDEB 2025: dois grupos de barras, 2023 e 2025.
    if(modalNorm.includes('ideb')){
      // Mantém o segmento/ano atualmente selecionado e ignora somente edição/componente.
      const rows=gcSomRows({ignoreEdicao:true,ignoreComp:true});
      const segment=document.getElementById('somAnoEscolar')?.value||'';
      const categories=['2023','2025'];
      if(isBoth){
        const getDefs=[
          {name:'GETs',color:GC_BLUE,match:m=>m.isGET},
          {name:'Não GETs',color:GC_GREEN,match:m=>!m.isGET}
        ];
        const turnoDefs=[
          {name:'Integrais',color:GC_YELLOW,match:m=>m.turnoGroup==='integral'},
          {name:'Híbridas',color:GC_GREEN,match:m=>m.turnoGroup==='hibrido'},
          {name:'Parciais',color:GC_RED,match:m=>m.turnoGroup==='parcial'}
        ];
        const makeSeries=defsLocal=>defsLocal.map(def=>({
          name:def.name,
          color:def.color,
          values:categories.map(year=>{
            const subset=rows.filter(r=>{const meta=gcSchoolMeta(r);return meta&&def.match(meta);});
            return gcWeighted(subset,r=>year==='2023'?r.ideb2023:(r.ideb2025??r.principal));
          })
        }));
        gcSetSomCompareLayout(false);
        const boxes=[...card.querySelectorAll('.gc-chart-box')];
        if(boxes[0]){const h=boxes[0].querySelector('h4'),p=boxes[0].querySelector('p');if(h)h.textContent=`GETs x não GETs${segment?` · ${segment}`:''}`;if(p)p.textContent='IDEB 2023 e 2025 por condição GET.';}
        if(boxes[1]){const h=boxes[1].querySelector('h4'),p=boxes[1].querySelector('p');if(h)h.textContent=`Turnos${segment?` · ${segment}`:''}`;if(p)p.textContent='IDEB 2023 e 2025 por jornada da escola.';}
        gcRenderGroupedBars('somGetChart1',{categories,series:makeSeries(getDefs),mode:'score',note:'A condição GET não filtra a lista de escolas; apenas compara as médias dos grupos.'});
        gcRenderGroupedBars('somGetChart2',{categories,series:makeSeries(turnoDefs),mode:'score',note:'A jornada não filtra a lista de escolas; apenas compara as médias de Integral, Híbrido e Parcial.'});
        return;
      }
      const builtSeries=defs.map(def=>({
        name:def.name,
        color:def.color,
        values:categories.map(year=>{
          const subset=rows.filter(r=>{
            const meta=gcSchoolMeta(r);
            return meta&&def.match(meta);
          });
          return gcWeighted(subset,r=>year==='2023'?r.ideb2023:(r.ideb2025??r.principal));
        })
      }));
      gcSetSomCompareLayout(
        true,
        `IDEB 2023 x 2025${segment?` · ${segment}`:''}`,
        'Barras verticais agrupadas por ano.'
      );
      gcRenderGroupedBars('somGetChart1',{
        categories,
        series:builtSeries,
        mode:'score',
        note:'A seleção de Anos Iniciais ou Anos Finais é respeitada.'
      });
      return;
    }

    // Qualquer outra avaliação somativa também usa barras verticais, nunca dispersão.
    const rows=gcSomRows({ignoreEdicao:true});
    const metric=document.getElementById('somMetric')?.value||'principal';
    const mode=(typeof somIsIDEBDisplay==='function'&&somIsIDEBDisplay(metric))?'score':'pct';
    let categories=[...new Set(rows.map(r=>String(r.edicao||'').trim()).filter(Boolean))]
      .sort((a,b)=>(typeof somOrderEdicao==='function'?somOrderEdicao(a):0)-(typeof somOrderEdicao==='function'?somOrderEdicao(b):0));
    let categoryField='edicao';
    if(categories.length<2){
      const years=[...new Set(rows.map(r=>String(r.anoEscolar||'').trim()).filter(Boolean))];
      if(years.length){ categories=years; categoryField='anoEscolar'; }
    }
    if(!categories.length) categories=['Resultado'];

    const builtSeries=defs.map(def=>({
      name:def.name,
      color:def.color,
      values:categories.map(category=>{
        const subset=rows.filter(r=>{
          const categoryMatch=category==='Resultado'||String(r[categoryField]||'')===category;
          const meta=gcSchoolMeta(r);
          return categoryMatch&&meta&&def.match(meta);
        });
        return gcWeighted(subset,r=>typeof somMetricValue==='function'?somMetricValue(r,metric):r[metric]);
      })
    }));

    gcSetSomCompareLayout(
      true,
      `${modal||'Avaliação'} · comparação por categorias`,
      'Barras verticais agrupadas pelas categorias da chave ativada.'
    );
    if(title1) title1.textContent=`${modal||'Avaliação'} · médias`;
    if(title2) title2.textContent='';
    gcRenderGroupedBars('somGetChart1',{
      categories,
      series:builtSeries,
      mode,
      note:'Somente o Avalia RJ utiliza gráfico de dispersão.'
    });
  }
  function gcInsertUI(kind){
    const filterId=kind==='som'?'somFiltersCard':'adrFiltersCard';
    const filter=document.getElementById(filterId);
    if(!filter)return;
    filter.querySelectorAll('.gc-toggle-grid').forEach(el=>el.remove());
    const cardId=kind==='som'?'somGetCompareCard':'adrGetCompareCard';
    document.getElementById(cardId)?.remove();
  }
  function gcToggle(kind,on,mode='get'){
    const getToggle=document.getElementById(kind==='som'?'somGetCompareToggle':'adrGetCompareToggle');
    const turnoToggle=document.getElementById(kind==='som'?'somTurnoCompareToggle':'adrTurnoCompareToggle');
    const active=Boolean(on);
    if(kind==='som'){
      // v213: cada chave de Somativas é independente; nenhuma desliga a outra.
      if(mode==='get'&&getToggle)getToggle.checked=active;
      if(mode==='turno'&&turnoToggle)turnoToggle.checked=active;
      if(mode==='both'&&!active){if(getToggle)getToggle.checked=false;if(turnoToggle)turnoToggle.checked=false;}
      const getOn=Boolean(getToggle?.checked),turnoOn=Boolean(turnoToggle?.checked);
      GC_STATE.som=getOn||turnoOn;
      GC_STATE.somMode=getOn&&turnoOn?'both':turnoOn?'turno':'get';
      gcForceCre('som',GC_STATE.som);
      if(active)gcShowToast();
      if(typeof renderResultados==='function')renderResultados();
      const rerender=()=>gcRenderSomCompare();
      if(typeof requestAnimationFrame==='function')requestAnimationFrame(rerender);else setTimeout(rerender,0);
      return;
    }
    // v218: cada chave da ADR é independente, espelhando Somativas.
    if(mode==='get'&&getToggle)getToggle.checked=active;
    if(mode==='turno'&&turnoToggle)turnoToggle.checked=active;
    if(mode==='both'&&!active){if(getToggle)getToggle.checked=false;if(turnoToggle)turnoToggle.checked=false;}
    const getOn=Boolean(getToggle?.checked),turnoOn=Boolean(turnoToggle?.checked);
    GC_STATE.adr=getOn||turnoOn;
    GC_STATE.adrMode=getOn&&turnoOn?'both':turnoOn?'turno':'get';
    gcForceCre(kind,GC_STATE.adr);
    if(active)gcShowToast();
    if(typeof renderADRs==='function')renderADRs();
    const rerender=()=>gcRenderAdrCompare();
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(rerender);else setTimeout(rerender,0);
  }
  function gcInstall(){
    gcInsertUI('som');gcInsertUI('adr');
    const somToggle=document.getElementById('somGetCompareToggle'),adrToggle=document.getElementById('adrGetCompareToggle');
    const somTurno=document.getElementById('somTurnoCompareToggle'),adrTurno=document.getElementById('adrTurnoCompareToggle');
    somToggle?.addEventListener('change',()=>gcToggle('som',somToggle.checked,'get'));
    adrToggle?.addEventListener('change',()=>gcToggle('adr',adrToggle.checked,'get'));
    somTurno?.addEventListener('change',()=>gcToggle('som',somTurno.checked,'turno'));
    adrTurno?.addEventListener('change',()=>gcToggle('adr',adrTurno.checked,'turno'));

    if(typeof renderResultados==='function'&&!renderResultados._gcWrapped){
      const original=renderResultados;
      const wrapped=function(){ if(GC_STATE.som)gcForceCre('som',true); const result=original.apply(this,arguments); if(GC_STATE.som)gcForceCre('som',true); gcRenderSomCompare(); return result; };
      wrapped._gcWrapped=true; renderResultados=wrapped;
    }
    if(typeof renderADRs==='function'&&!renderADRs._gcWrapped){
      const original=renderADRs;
      const wrapped=function(){ if(GC_STATE.adr)gcForceCre('adr',true); const result=original.apply(this,arguments); if(GC_STATE.adr)gcForceCre('adr',true); gcRenderAdrCompare(); return result; };
      wrapped._gcWrapped=true; renderADRs=wrapped;
    }
    setTimeout(()=>{
      document.getElementById('clearSomFilters')?.addEventListener('click',()=>{ if(GC_STATE.som)gcToggle('som',false,GC_STATE.somMode||'get'); });
      document.getElementById('clearAdrFilters')?.addEventListener('click',()=>{ if(GC_STATE.adr)gcToggle('adr',false,GC_STATE.adrMode||'get'); });
    },80);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(gcInstall,0));else setTimeout(gcInstall,0);
})();
