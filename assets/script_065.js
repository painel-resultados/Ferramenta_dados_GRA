
(function(){
  'use strict';
  const EXTRA=new Set(['CN','História','Geografia']);
  const LEVELS={
    'Muito Baixo':{key:'muitoBaixo',label:'Muito Baixo'},
    'Baixo':{key:'baixo',label:'Baixo'},
    'Médio':{key:'medio',label:'Médio'},
    'Alto':{key:'alto',label:'Alto'}
  };
  const isExtra=v=>EXTRA.has(String(v||'').trim())||['HISTÓRIA','GEOGRAFIA'].includes(String(v||'').trim().toUpperCase());
  const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const escHtml=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normText=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const pct=v=>finite(v)?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%':'—';
  const delta=v=>`${Number(v)>0?'+':''}${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} p.p.`;
  const orderAdr=v=>{try{return typeof window.adrOrder==='function'?window.adrOrder(v):Number(String(v||'').match(/\d+/)?.[0]||0);}catch(_){return 0;}};
  const rowAgent=r=>{try{return typeof window.adrRowAgent==='function'?window.adrRowAgent(r):(r?.agente||'');}catch(_){return r?.agente||'';}};
  const schoolKey=r=>`${normText(r?.regional||'')}|${normText(r?.escola||'')}`;
  const selectedComp=()=>document.getElementById('adrComp')?.value||'';
  const selectedMode=()=>document.getElementById('adrMode')?.value||'individual';

  function latestRows(rows){
    if(selectedMode()!=='progressao')return Array.isArray(rows)?rows:[];
    const editions=[...new Set((rows||[]).map(r=>r?.adr).filter(Boolean))].sort((a,b)=>orderAdr(a)-orderAdr(b));
    const latest=editions.at(-1);
    return latest?(rows||[]).filter(r=>r?.adr===latest):(rows||[]);
  }
  function uniqueSchoolCount(rows){return new Set((rows||[]).filter(r=>r?.escola).map(schoolKey)).size;}
  function weighted(rows,key){
    let sw=0,sv=0;
    (rows||[]).forEach(r=>{
      if(!finite(r?.[key]))return;
      const w=finite(r?.avaliados)&&Number(r.avaliados)>0?Number(r.avaliados):1;
      sw+=w;sv+=Number(r[key])*w;
    });
    return sw?sv/sw:null;
  }
  function levelValues(rows){
    return Object.values(LEVELS).map(def=>({...def,value:weighted(rows,def.key)})).filter(x=>finite(x.value));
  }

  function ensureExtraDrawer(){
    let drawer=document.getElementById('v249ExtraDrawer');
    if(drawer)return drawer;
    document.body.insertAdjacentHTML('beforeend',`
      <div class="adr-level-backdrop" id="v249ExtraBackdrop" aria-hidden="true"></div>
      <aside class="adr-level-drawer" id="v249ExtraDrawer" role="dialog" aria-modal="true" aria-labelledby="v249ExtraTitle" aria-hidden="true">
        <div class="adr-level-drawer-head">
          <div class="v249-extra-kicker">Detalhamento por faixa de desempenho</div>
          <h3 id="v249ExtraTitle">Escolas por faixa</h3>
          <p id="v249ExtraNote" class="v249-extra-subnote">Escolas ordenadas pelo percentual da faixa selecionada.</p>
          <div class="adr-level-context" id="v249ExtraContext"></div>
          <button class="adr-level-close" id="v249ExtraClose" type="button" aria-label="Fechar detalhamento">×</button>
        </div>
        <div class="adr-level-summary" id="v249ExtraSummary"></div>
        <div class="adr-level-search-wrap"><input class="adr-level-search" id="v249ExtraSearch" type="search" placeholder="Buscar escola, CRE ou agente..." autocomplete="off"></div>
        <div class="adr-level-list" id="v249ExtraList"></div>
      </aside>`);
    drawer=document.getElementById('v249ExtraDrawer');
    document.getElementById('v249ExtraClose')?.addEventListener('click',closeExtraDrawer);
    document.getElementById('v249ExtraBackdrop')?.addEventListener('click',closeExtraDrawer);
    document.getElementById('v249ExtraSearch')?.addEventListener('input',renderExtraList);
    document.getElementById('v249ExtraList')?.addEventListener('click',ev=>{
      const btn=ev.target.closest('[data-v249-school]');if(!btn)return;
      const input=document.getElementById('adrSearch');if(!input)return;
      input.value=btn.dataset.v249School||'';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      closeExtraDrawer();
      setTimeout(()=>document.getElementById('adrFiltersCard')?.scrollIntoView({behavior:'smooth',block:'start'}),180);
    });
    document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&drawer?.classList.contains('open'))closeExtraDrawer();});
    ['adrMode','adrAno','adrComp','adrSelect','adrMetric','adrEvolucao','adrCre','adrAgente'].forEach(id=>document.getElementById(id)?.addEventListener('change',closeExtraDrawer));
    return drawer;
  }

  const state={category:'',key:'',rows:[],items:[],query:'',lastFocus:null,latestAdr:'',previousAdr:''};
  function contextParts(){
    const mode=selectedMode()==='progressao'?`Progressão · faixa exibida em ${state.latestAdr||'ADR final'}`:(document.getElementById('adrSelect')?.value||state.latestAdr||'ADR');
    const year=document.getElementById('adrAno')?.value||'Ano';
    const comp=(typeof window.adrComponentLabel==='function'?window.adrComponentLabel(selectedComp()):selectedComp())||'Componente';
    const cre=document.getElementById('adrCre')?.value||'Todas as CREs';
    const ag=document.getElementById('adrAgente')?.value||'';
    let agLabel='Todas as escolas';
    try{agLabel=typeof window.adrAgentScopeLabel==='function'?window.adrAgentScopeLabel(ag):(ag||'Todas as escolas');}catch(_){agLabel=ag||'Todas as escolas';}
    return [mode,`${year} · ${comp}`,cre,agLabel];
  }
  function buildExtraItems(rows,key){
    const grouped=new Map();
    (rows||[]).forEach(r=>{
      if(!r?.escola||!finite(r?.[key]))return;
      const k=schoolKey(r);
      if(!grouped.has(k))grouped.set(k,{key:k,escola:r.escola,regional:r.regional||'',agente:rowAgent(r)||'',values:[]});
      grouped.get(k).values.push({adr:r.adr||'',value:Number(r[key])});
    });
    return [...grouped.values()].map(item=>{
      item.values.sort((a,b)=>orderAdr(a.adr)-orderAdr(b.adr));
      const current=item.values.at(-1),previous=item.values.length>1?item.values.at(-2):null;
      return {...item,value:current.value,adr:current.adr,previous:previous?.value??null,previousAdr:previous?.adr||''};
    }).sort((a,b)=>b.value-a.value||String(a.escola).localeCompare(String(b.escola),'pt-BR'));
  }
  function clearHighlight(){
    document.querySelectorAll('#adrPie .v249-slice-active,#adrPie .v249-slice-muted,#adrPieLegend .v249-slice-active,#adrPieLegend .v249-slice-muted').forEach(el=>el.classList.remove('v249-slice-active','v249-slice-muted'));
  }
  function highlight(category){
    document.querySelectorAll('#adrPie path[data-cat],#adrPieLegend .legend-row[data-cat]').forEach(el=>{
      const active=el.dataset.cat===category;
      el.classList.toggle('v249-slice-active',active);el.classList.toggle('v249-slice-muted',!active);
    });
  }
  function closeExtraDrawer(){
    const drawer=document.getElementById('v249ExtraDrawer'),back=document.getElementById('v249ExtraBackdrop');
    if(!drawer)return;
    drawer.classList.remove('open');back?.classList.remove('open');drawer.setAttribute('aria-hidden','true');back?.setAttribute('aria-hidden','true');
    document.body.classList.remove('adr-level-drawer-open');clearHighlight();
    const f=state.lastFocus;setTimeout(()=>f?.focus?.({preventScroll:true}),120);
  }
  function renderExtraList(){
    const list=document.getElementById('v249ExtraList'),summary=document.getElementById('v249ExtraSummary'),search=document.getElementById('v249ExtraSearch');if(!list||!summary)return;
    state.query=search?.value||'';const q=normText(state.query);
    const visible=q?state.items.filter(x=>normText(`${x.escola} ${x.regional} ${x.agente}`).includes(q)):state.items;
    const avg=weighted(latestRows(state.rows),state.key);
    summary.innerHTML=`<div class="adr-level-summary-card"><small>Escolas no recorte</small><strong>${state.items.length.toLocaleString('pt-BR')}</strong></div><div class="adr-level-summary-card"><small>Média da faixa</small><strong>${pct(avg)}</strong></div>`;
    if(!visible.length){list.innerHTML='<div class="adr-level-empty">Nenhuma escola encontrada para a busca.</div>';return;}
    list.innerHTML=visible.map((item,index)=>{
      const width=Math.max(1,Math.min(100,item.value));
      let evo=`<span>${escHtml(item.adr||state.latestAdr||'ADR selecionada')}</span>`;
      if(selectedMode()==='progressao'&&item.previous!==null){
        const d=item.value-item.previous,cls=d>0.05?'up':d<-0.05?'down':'';
        evo=`<span>${escHtml(item.previousAdr)} ${pct(item.previous)} → ${escHtml(item.adr)} ${pct(item.value)}</span><span class="v249-extra-delta ${cls}">${delta(d)}</span>`;
      }
      return `<article class="v249-extra-school"><span class="v249-extra-rank">${index+1}</span><div class="v249-extra-main"><strong>${escHtml(item.escola)}</strong><span>${escHtml(item.regional||'CRE não informada')} · ${escHtml(item.agente||'Sem agente')}</span></div><div class="v249-extra-value">${pct(item.value)}</div><div class="v249-extra-track"><i style="width:${width}%"></i></div><div class="v249-extra-footer">${evo}<button class="v249-extra-open" type="button" data-v249-school="${escHtml(item.escola)}">Ver na dashboard</button></div></article>`;
    }).join('');
  }
  function openExtraDrawer(category,rows){
    const def=LEVELS[category];if(!def)return;
    const currentRows=latestRows(rows);
    if(uniqueSchoolCount(currentRows)<=1)return;
    const drawer=ensureExtraDrawer(),back=document.getElementById('v249ExtraBackdrop');if(!drawer)return;
    const editions=[...new Set((rows||[]).map(r=>r?.adr).filter(Boolean))].sort((a,b)=>orderAdr(a)-orderAdr(b));
    state.category=category;state.key=def.key;state.rows=Array.isArray(rows)?rows.slice():[];state.items=buildExtraItems(state.rows,def.key);state.query='';state.lastFocus=document.activeElement;state.latestAdr=editions.at(-1)||'';state.previousAdr=editions.length>1?editions.at(-2):'';
    const search=document.getElementById('v249ExtraSearch');if(search)search.value='';
    document.getElementById('v249ExtraTitle').textContent=`${category} — escolas com maior percentual`;
    document.getElementById('v249ExtraNote').textContent=selectedMode()==='progressao'?`Ranking pelo percentual em ${state.latestAdr||'ADR final'}; a evolução da faixa aparece como informação complementar.`:'Escolas ordenadas do maior para o menor percentual de estudantes nesta faixa.';
    document.getElementById('v249ExtraContext').innerHTML=contextParts().map(x=>`<span>${escHtml(x)}</span>`).join('');
    renderExtraList();highlight(category);
    drawer.classList.add('open');back?.classList.add('open');drawer.setAttribute('aria-hidden','false');back?.setAttribute('aria-hidden','false');document.body.classList.add('adr-level-drawer-open');
    setTimeout(()=>search?.focus?.({preventScroll:true}),180);
  }
  window.v249OpenExtraLevelDrawer=openExtraDrawer;
  window.v249CloseExtraLevelDrawer=closeExtraDrawer;

  // Substitui somente a rosca ADR; demais motores continuam os da v247.
  window.renderADRPie=function(rows){
    const pie=document.getElementById('adrPie'),legend=document.getElementById('adrPieLegend'),card=pie?.closest('.card');
    if(!pie||!legend)return;
    const extra=isExtra(selectedComp());
    pie.classList.remove('v249-drill-enabled');legend.classList.remove('v249-drill-enabled');clearHighlight();
    if(extra){
      const displayRows=latestRows(rows),vals=levelValues(displayRows),total=vals.reduce((a,x)=>a+Number(x.value||0),0);
      if(!vals.length||!(total>0)){if(card)card.style.display='none';pie.innerHTML='';legend.innerHTML='';return;}
      if(card)card.style.display='';
      const editions=[...new Set((rows||[]).map(r=>r?.adr).filter(Boolean))].sort((a,b)=>orderAdr(a)-orderAdr(b));
      const latest=editions.at(-1)||'';
      const title=card?.querySelector('.panel-title h3'),sub=card?.querySelector('.panel-title p');
      if(title)title.textContent='Distribuição por faixa de desempenho';
      if(sub)sub.textContent=selectedMode()==='progressao'&&latest?`Muito Baixo, Baixo, Médio e Alto em ${latest}. Clique em uma faixa para ver as escolas com maior percentual.`:'Muito Baixo, Baixo, Médio e Alto no recorte filtrado. Clique em uma faixa para ver as escolas com maior percentual.';
      const items=vals.map(x=>({categoria:x.label,total:Number(Number(x.value).toFixed(1)),percentual:Number(x.value)/total}));
      pie.innerHTML='<div class="donut-center"><b>100%</b><span>ESTUDANTES</span></div>';
      const canDrill=uniqueSchoolCount(displayRows)>1;
      renderDonut('adrPie','adrPieLegend',items,total,canDrill?(category)=>openExtraDrawer(category,rows):null);
      [...legend.querySelectorAll('.legend-row')].forEach((row,i)=>{const span=row.querySelector('span');if(span&&items[i])span.textContent=pct(items[i].total);});
      if(canDrill){pie.classList.add('v249-drill-enabled');legend.classList.add('v249-drill-enabled');}
      return;
    }
    if(card)card.style.display='';
    const defs=[['abaixo','Abaixo do Básico'],['basico','Básico'],['adequado','Adequado']];
    const vals=defs.map(([key,label])=>({categoria:label,total:(typeof window.adrWeightAvg==='function'?window.adrWeightAvg(rows,key):0)||0}));
    const total=vals.reduce((a,b)=>a+Number(b.total||0),0)||100;
    const items=vals.map(v=>({categoria:v.categoria,total:Number(Number(v.total||0).toFixed(1)),percentual:Number(v.total||0)/total}));
    const title=card?.querySelector('.panel-title h3'),sub=card?.querySelector('.panel-title p');
    if(title)title.textContent='Distribuição por nível';if(sub)sub.textContent='Abaixo do básico, Básico e Adequado no recorte filtrado.';
    pie.innerHTML='<div class="donut-center"><b>100%</b><span>NÍVEIS</span></div>';
    renderDonut('adrPie','adrPieLegend',items,total,(categoria)=>{try{window.adrOpenLevelDrawer?.(categoria,rows);}catch(_){}});
  };
  try{renderADRPie=window.renderADRPie;}catch(_){ }

  function stamp(){
    const b=document.getElementById('dashboardVersionBadge');if(b)b.textContent='v366';
    document.querySelectorAll('.exp-badge').forEach(x=>x.textContent='v366');
  }
  const init=()=>{stamp();try{window.renderADRs?.();}catch(e){console.warn('v249 ADR drill-down init',e);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,40),{once:true});else setTimeout(init,40);
})();
