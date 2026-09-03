
(function(){
  const state={categoria:'',rows:[],items:[],query:'',lastFocus:null};
  const keyByCategory={'Abaixo do Básico':'abaixo','Básico':'basico','Adequado':'adequado'};
  const classByCategory={'Abaixo do Básico':'level-abaixo','Básico':'level-basico','Adequado':'level-adequado'};
  const drawer=document.getElementById('adrLevelDrawer');
  const backdrop=document.getElementById('adrLevelBackdrop');
  const closeBtn=document.getElementById('adrLevelClose');
  const search=document.getElementById('adrLevelSearch');
  const list=document.getElementById('adrLevelList');
  const summary=document.getElementById('adrLevelSummary');
  const context=document.getElementById('adrLevelContext');
  const title=document.getElementById('adrLevelDrawerTitle');
  const note=document.getElementById('adrLevelDrawerNote');

  function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
  function categoryKey(category){return keyByCategory[category]||'';}
  function schoolKey(row){return `${norm(row.regional||'')}|${norm(row.escola||'')}`;}
  function contextText(){
    const mode=document.getElementById('adrMode')?.value==='progressao'?'Progressão ADR 1 → ADR 2':(document.getElementById('adrSelect')?.value||'ADR');
    const year=document.getElementById('adrAno')?.value||'Ano';
    const comp=document.getElementById('adrComp')?.value||'Componente';
    const cre=document.getElementById('adrCre')?.value||'Todas as CREs';
    const ag=document.getElementById('adrAgente')?.value||'';
    return [mode,`${year} · ${comp}`,cre,adrAgentScopeLabel(ag)];
  }
  function buildItems(rows,category){
    const metric=categoryKey(category);
    const grouped=new Map();
    rows.forEach(row=>{
      const value=finite(row?.[metric]);
      if(value===null||!row?.escola)return;
      const key=schoolKey(row);
      if(!grouped.has(key))grouped.set(key,{key,escola:row.escola,regional:row.regional||'',agente:adrRowAgent(row)||'',values:[]});
      grouped.get(key).values.push({adr:row.adr||'',value,row});
    });
    const mode=document.getElementById('adrMode')?.value||'individual';
    return [...grouped.values()].map(item=>{
      item.values.sort((a,b)=>adrOrder(a.adr)-adrOrder(b.adr));
      const first=item.values[0],last=item.values[item.values.length-1];
      return {...item,value:last.value,adr:last.adr,previous:mode==='progressao'&&item.values.length>1?first.value:null,previousAdr:mode==='progressao'&&item.values.length>1?first.adr:''};
    }).sort((a,b)=>b.value-a.value||a.escola.localeCompare(b.escola,'pt-BR'));
  }
  function highlight(category){
    document.querySelectorAll('#adrPie path[data-cat],#adrPieLegend .legend-row[data-cat]').forEach(el=>{
      const active=el.dataset.cat===category;
      el.classList.toggle('adr-level-active',active);
      el.classList.toggle('adr-level-muted',!active);
    });
  }
  function clearHighlight(){
    document.querySelectorAll('#adrPie .adr-level-active,#adrPie .adr-level-muted,#adrPieLegend .adr-level-active,#adrPieLegend .adr-level-muted').forEach(el=>el.classList.remove('adr-level-active','adr-level-muted'));
  }
  function render(){
    const q=norm(state.query||'');
    const items=q?state.items.filter(x=>norm(`${x.escola} ${x.regional} ${x.agente}`).includes(q)):state.items;
    const key=categoryKey(state.categoria);
    const average=adrWeightAvg(state.rows,key);
    summary.innerHTML=`<div class="adr-level-summary-card"><small>Escolas no recorte</small><strong>${state.items.length}</strong></div><div class="adr-level-summary-card"><small>Média do estrato</small><strong>${fmtPctValue(average,1)}</strong></div>`;
    if(!items.length){list.innerHTML='<div class="adr-level-empty">Nenhuma escola encontrada para a busca.</div>';return;}
    list.innerHTML=items.map(item=>{
      const width=Math.max(2,Math.min(100,item.value));
      let evolution='';
      if(item.previous!==null){
        const delta=item.value-item.previous;
        const cls=delta>0.05?'up':delta<-0.05?'down':'';
        evolution=`<span>${esc(item.previousAdr)} ${fmtPctValue(item.previous,1)} → ${esc(item.adr)} ${fmtPctValue(item.value,1)}</span><span class="delta ${cls}">${delta>0?'+':''}${delta.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} p.p.</span>`;
      }else evolution=`<span>${esc(item.adr||'ADR selecionada')}</span><button class="adr-level-apply" type="button" data-school="${esc(item.escola)}">Ver na dashboard</button>`;
      return `<article class="adr-level-school"><div class="adr-level-school-main"><strong title="${esc(item.escola)}">${esc(item.escola)}</strong><span>${esc(item.regional||'CRE não informada')} · ${esc(item.agente||'Sem agente')}</span></div><div class="adr-level-school-value">${fmtPctValue(item.value,1)}</div><div class="adr-level-school-track"><i style="width:${width}%"></i></div><div class="adr-level-school-footer">${evolution}</div>${item.previous!==null?`<button class="adr-level-apply" type="button" data-school="${esc(item.escola)}" style="position:absolute;right:10px;bottom:9px">Ver</button>`:''}</article>`;
    }).join('');
  }
  window.adrOpenLevelDrawer=function(category,rows){
    const metric=categoryKey(category);if(!metric||!drawer)return;
    state.lastFocus=document.activeElement;
    state.categoria=category;state.rows=Array.isArray(rows)?rows.slice():[];state.items=buildItems(state.rows,category);state.query='';
    search.value='';
    drawer.classList.remove('level-abaixo','level-basico','level-adequado');drawer.classList.add(classByCategory[category]||'');
    title.textContent=`${category} — escolas`;
    note.textContent='A rosca mostra a distribuição média dos estudantes. Cada escola participa dos três níveis; a lista abaixo está ordenada pelo percentual do nível selecionado.';
    context.innerHTML=contextText().map(x=>`<span>${esc(x)}</span>`).join('');
    render();highlight(category);
    drawer.classList.add('open');backdrop.classList.add('open');drawer.setAttribute('aria-hidden','false');backdrop.setAttribute('aria-hidden','false');document.body.classList.add('adr-level-drawer-open');
    setTimeout(()=>search.focus({preventScroll:true}),330);
  };
  window.adrCloseLevelDrawer=function(){
    if(!drawer?.classList.contains('open'))return;
    drawer.classList.remove('open');backdrop.classList.remove('open');drawer.setAttribute('aria-hidden','true');backdrop.setAttribute('aria-hidden','true');document.body.classList.remove('adr-level-drawer-open');clearHighlight();
    const focus=state.lastFocus;setTimeout(()=>focus?.focus?.({preventScroll:true}),260);
  };
  search?.addEventListener('input',()=>{state.query=search.value;render();});
  list?.addEventListener('click',event=>{
    const button=event.target.closest('[data-school]');if(!button)return;
    const input=document.getElementById('adrSearch');if(!input)return;
    input.value=button.dataset.school||'';input.dispatchEvent(new Event('input',{bubbles:true}));adrCloseLevelDrawer();
    setTimeout(()=>document.getElementById('adrFiltersCard')?.scrollIntoView({behavior:'smooth',block:'start'}),260);
  });
  closeBtn?.addEventListener('click',adrCloseLevelDrawer);backdrop?.addEventListener('click',adrCloseLevelDrawer);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drawer?.classList.contains('open'))adrCloseLevelDrawer();});
  ['adrMode','adrAno','adrComp','adrSelect','adrMetric','adrEvolucao','adrCre','adrAgente'].forEach(id=>document.getElementById(id)?.addEventListener('change',adrCloseLevelDrawer));
})();
