
(function(){
  'use strict';

  const VERSION='v366';
  const byId=id=>document.getElementById(id);
  const qs=(selector,root=document)=>root.querySelector(selector);
  const qsa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const mobileQuery=window.matchMedia('(max-width:900px)');
  const escapeHtml=value=>typeof window.esc==='function'
    ? window.esc(value)
    : String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalize=value=>typeof window.norm==='function'
    ? window.norm(value)
    : String(value??'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const visible=element=>Boolean(element&&(element.offsetWidth||element.offsetHeight||element.getClientRects().length));
  const nextPaint=callback=>requestAnimationFrame(()=>requestAnimationFrame(callback));

  const FIELD_LABELS={
    territorySelect:'Território',
    bankSearch:'Busca',filterPrioridade:'Prioridade',filterTerritorio:'Território',filterAgente:'Agente',filterPA:'Plano de Ação',filterPD:'Plano de Dimensão',filterExclusiva:'Exclusividade',
    creDetailSearch:'Busca',territorySearch:'Busca',exclusiveSearch:'Busca',efpdSearch:'Busca',
    somMode:'Análise',somModalidade:'Avaliação',somAnoEscolar:'Ano/segmento',somComponente:'Componente',somEdicao:'Edição',somMetric:'Indicador',somAgente:'Abrangência',somPriority:'Prioridade',somSearch:'Busca',
    adrMode:'Análise',adrAno:'Ano escolar',adrComp:'Componente',adrSelect:'ADR',adrMetric:'Indicador',adrEvolucao:'Evolução',adrAgente:'Abrangência',adrPriority:'Prioridade',adrSearch:'Busca',
    drawerSearch:'Busca no detalhamento',
    geoPriority:'Prioridade',geoGet:'Tipo de unidade',geoAgent:'Escola/Agente',geoSearch:'Busca no mapa',
    resultTipo:'Resultado',resultAgente:'Agente',resultTerritorio:'Território',resultSearch:'Busca'
  };

  function installVersion(){
    const badge=byId('dashboardVersionBadge');
    if(badge)badge.textContent=VERSION;
    qsa('.exp-badge').forEach(item=>item.textContent=VERSION);
    const scope=byId('regionalScopeSelect')?.selectedOptions?.[0]?.textContent?.trim()||'Toda a SME';
    document.title=`Ferramenta GRA de análise de dados — ${scope}`;
  }

  function labelControls(){
    Object.entries(FIELD_LABELS).forEach(([id,labelText])=>{
      const control=byId(id);
      if(!control||control.closest('.v222-field-label')||control.closest('label'))return;
      const label=document.createElement('label');
      label.className='v222-field-label'+(control.matches('input.search,input[type="search"],input[type="text"]')?' v222-search-field':'');
      label.htmlFor=id;
      const text=document.createElement('span');
      text.textContent=labelText;
      control.parentNode.insertBefore(label,control);
      label.append(text,control);
    });
    qsa('select,input,textarea').forEach(control=>{
      if(control.type==='hidden'||control.getAttribute('aria-hidden')==='true')return;
      if(!control.getAttribute('aria-label')&&!control.labels?.length){
        const fallback=FIELD_LABELS[control.id]||control.placeholder||control.id||control.type||'Controle';
        control.setAttribute('aria-label',fallback);
      }
    });
    syncFieldVisibility();
  }

  function syncFieldVisibility(){
    qsa('.v222-field-label').forEach(label=>{
      const control=label.querySelector('select,input,textarea');
      if(!control)return;
      const hidden=control.hidden||control.getAttribute('aria-hidden')==='true'||getComputedStyle(control).display==='none';
      label.classList.toggle('is-control-hidden',hidden);
    });
  }
  /* v363 — disponibiliza a sincronização para módulos posteriores, inclusive o
     seletor contextual do Simulado 2026 (v293), que já tenta chamá-la. */
  window.syncFieldVisibility=syncFieldVisibility;

  let shellBackdrop;
  let mobileHeader;
  let searchOverlay;
  let actionMenu;
  let searchWrap;
  let searchHome;
  const filterDefaults=new Map();

  function sectionLabel(){
    const section=qs('.section.active');
    const button=section?qs(`.nav button[data-section="${section.id}"]`):null;
    return button?.textContent?.replace(/[◆⌖★≡⌄]/g,'').replace(/\s+/g,' ').trim()||section?.id||'Dashboard';
  }

  function shellIsOpen(){
    return document.body.classList.contains('v222-menu-open')||document.body.classList.contains('v222-filter-open')||document.body.classList.contains('v222-search-open')||document.body.classList.contains('v222-actions-open');
  }

  function syncShell(){
    const any=shellIsOpen();
    shellBackdrop?.classList.toggle('open',any);
    document.body.classList.toggle('v222-shell-locked',any);
    byId('v222MobileMenuButton')?.setAttribute('aria-expanded',String(document.body.classList.contains('v222-menu-open')));
    byId('v222MobileFilterButton')?.setAttribute('aria-expanded',String(document.body.classList.contains('v222-filter-open')));
    byId('v222MobileSearchButton')?.setAttribute('aria-expanded',String(document.body.classList.contains('v222-search-open')));
    byId('v222MobileActionsButton')?.setAttribute('aria-expanded',String(document.body.classList.contains('v222-actions-open')));
  }

  function closeShell(except=''){
    if(except!=='menu')document.body.classList.remove('v222-menu-open');
    if(except!=='filters')document.body.classList.remove('v222-filter-open');
    if(except!=='search')document.body.classList.remove('v222-search-open');
    if(except!=='actions')document.body.classList.remove('v222-actions-open');
    qs('.sidebar')?.classList.toggle('v222-open',document.body.classList.contains('v222-menu-open'));
    syncShell();
  }

  function toggleShell(kind){
    const className=`v222-${kind==='filters'?'filter':kind}-open`;
    const next=!document.body.classList.contains(className);
    closeShell(kind);
    document.body.classList.toggle(className,next);
    qs('.sidebar')?.classList.toggle('v222-open',kind==='menu'&&next);
    syncShell();
    if(kind==='filters'&&next)requestAnimationFrame(()=>{const card=activeFilterCard();if(card)card.scrollTop=0;});
    if(kind==='search'&&next)setTimeout(()=>byId('globalSearch')?.focus(),40);
  }

  function activeFilterCard(){
    const section=qs('.section.active')?.id;
    return section==='resultados'?byId('somFiltersCard'):section==='adrs'?byId('adrFiltersCard'):section==='banco'?byId('v222BankFilterPanel'):null;
  }

  function filterIdsForActiveSection(){
    const section=qs('.section.active')?.id;
    const ids=section==='resultados'
      ? ['somMode','somModalidade','somAnoEscolar','somComponente','somEdicao','somMetric','somAgente','somPriority','somSearch','somGetCompareToggle','somTurnoCompareToggle']
      : section==='adrs'
        ? ['adrMode','adrAno','adrComp','adrSelect','adrMetric','adrEvolucao','adrAgente','adrPriority','adrSearch','adrGetCompareToggle','adrTurnoCompareToggle']
        : section==='banco'
          ? ['filterPrioridade','filterTerritorio','filterAgente','filterPA','filterPD','filterExclusiva','bankSearch']
          : [];
    return ids.length?['regionalScopeSelect',...ids]:[];
  }

  function rememberFilterDefaults(){
    ['regionalScopeSelect','somMode','somModalidade','somAnoEscolar','somComponente','somEdicao','somMetric','somAgente','somPriority','somSearch','adrMode','adrAno','adrComp','adrSelect','adrMetric','adrEvolucao','adrAgente','adrPriority','adrSearch','filterPrioridade','filterTerritorio','filterAgente','filterPA','filterPD','filterExclusiva','bankSearch'].forEach(id=>{
      const control=byId(id);
      if(control&&!filterDefaults.has(id))filterDefaults.set(id,String(control.value??''));
    });
  }

  function activeFilterCount(){
    return filterIdsForActiveSection().reduce((count,id)=>{
      const control=byId(id);
      if(!control||control.disabled||control.hidden||control.getAttribute('aria-hidden')==='true')return count;
      if(control.type==='checkbox')return count+(control.checked?1:0);
      const baseline=filterDefaults.get(id)??'';
      return count+(String(control.value??'')!==baseline?1:0);
    },0);
  }

  function updateMobileHeader(){
    if(!mobileHeader)return;
    byId('v222MobileSection').textContent=sectionLabel();
    const filterButton=byId('v222MobileFilterButton');
    const ids=filterIdsForActiveSection();
    filterButton.hidden=!ids.length;
    const count=activeFilterCount();
    const badge=qs('.v222-filter-count',filterButton);
    if(badge){badge.textContent=String(count);badge.hidden=count===0;}
    filterButton.setAttribute('aria-label',count?`Abrir filtros; ${count} alterado${count===1?'':'s'}`:'Abrir filtros');
  }

  function installFilterFooter(card,kind){
    if(!card||card.querySelector('.v222-filter-footer'))return;
    const footer=document.createElement('div');
    footer.className='v222-filter-footer';
    footer.innerHTML='<button type="button" class="v222-filter-clear">Limpar todos</button><button type="button" class="primary v222-filter-apply">Aplicar e fechar</button>';
    footer.querySelector('.v222-filter-clear').addEventListener('click',()=>{
      const reset=byId(kind==='som'?'clearSomFilters':kind==='adr'?'clearAdrFilters':'clearBankFilters');
      if(reset)reset.click();
      setTimeout(()=>{rememberFilterDefaults();updateMobileHeader();syncFieldVisibility();},80);
    });
    footer.querySelector('.v222-filter-apply').addEventListener('click',()=>{document.body.classList.remove('v222-filter-open');syncShell();});
    card.appendChild(footer);
  }

  function buildBankFilterPanel(){
    if(byId('v222BankFilterPanel'))return byId('v222BankFilterPanel');
    const toolbar=byId('bankSearch')?.closest('.toolbar');
    if(!toolbar)return null;
    const panel=document.createElement('div');
    panel.id='v222BankFilterPanel';
    panel.className='v222-bank-filter-panel';
    panel.innerHTML='<div class="v222-bank-filter-head"><div><strong>Filtros do banco</strong><span>Refine a lista por prioridade, território, agente, planos e exclusividade.</span></div></div>';
    toolbar.parentNode.insertBefore(panel,toolbar);
    panel.appendChild(toolbar);
    installFilterFooter(panel,'bank');
    return panel;
  }

  function placeSearchForViewport(){
    if(!searchWrap||!searchHome)return;
    if(mobileQuery.matches){
      const host=qs('.v222-mobile-search-body',searchOverlay);
      if(host&&searchWrap.parentNode!==host)host.appendChild(searchWrap);
    }else if(searchWrap.parentNode!==searchHome.parentNode){
      searchHome.parentNode.insertBefore(searchWrap,searchHome.nextSibling);
      closeShell();
    }
  }

  function buildMobileShell(){
    const main=qs('.main');
    const sidebar=qs('.sidebar');
    if(!main||!sidebar||byId('v222MobileHeader'))return;
    mobileHeader=document.createElement('header');
    mobileHeader.id='v222MobileHeader';
    mobileHeader.className='v222-mobile-header';
    mobileHeader.innerHTML=`
      <button type="button" id="v222MobileMenuButton" aria-label="Abrir menu" aria-controls="nav" aria-expanded="false">☰</button>
      <strong id="v222MobileSection">${escapeHtml(sectionLabel())}</strong>
      <button type="button" id="v222MobileFilterButton" class="v222-filter-toggle" aria-expanded="false">Filtros <span class="v222-filter-count" hidden>0</span></button>
      <button type="button" id="v222MobileSearchButton" aria-label="Buscar escola" aria-expanded="false">⌕</button>
      <button type="button" id="v222MobileActionsButton" aria-label="Abrir ações" aria-expanded="false">⋮</button>`;
    main.prepend(mobileHeader);

    shellBackdrop=document.createElement('div');
    shellBackdrop.id='v222ShellBackdrop';
    shellBackdrop.className='v222-shell-backdrop';
    document.body.appendChild(shellBackdrop);

    searchOverlay=document.createElement('section');
    searchOverlay.className='v222-mobile-search-overlay';
    searchOverlay.setAttribute('aria-label','Busca global');
    searchOverlay.innerHTML='<div class="v222-mobile-search-head"><strong>Buscar na dashboard</strong><button type="button" aria-label="Fechar busca">×</button></div><div class="v222-mobile-search-body"></div>';
    document.body.appendChild(searchOverlay);

    actionMenu=document.createElement('section');
    actionMenu.className='v222-mobile-actions';
    actionMenu.setAttribute('aria-label','Ações da dashboard');
    actionMenu.innerHTML='<div class="v222-mobile-actions-head"><span>Ações</span><button type="button" class="v222-mobile-actions-close" aria-label="Fechar ações">×</button></div><button type="button" data-action="pdf">Gerar PDF da seção atual</button><button type="button" data-action="slides">Gerar apresentação em Slides</button>';
    document.body.appendChild(actionMenu);

    const topActions=qs('.topbar .actions');
    searchWrap=qs('.global-search-wrap',topActions||document);
    if(searchWrap&&topActions){
      searchHome=document.createElement('span');
      searchHome.hidden=true;
      searchHome.id='v222SearchHome';
      topActions.insertBefore(searchHome,searchWrap);
    }

    byId('v222MobileMenuButton').addEventListener('click',()=>toggleShell('menu'));
    byId('v222MobileFilterButton').addEventListener('click',()=>toggleShell('filters'));
    byId('v222MobileSearchButton').addEventListener('click',()=>toggleShell('search'));
    byId('v222MobileActionsButton').addEventListener('click',()=>{
      if(actionMenu&&!qs('[data-action="report"]',actionMenu)){
        const reportAction=document.createElement('button');
        reportAction.type='button';
        reportAction.dataset.action='report';
        reportAction.textContent='Gerar relatório';
        reportAction.addEventListener('click',()=>{closeShell();const reportButton=byId('reportExperimentalBtn');if(reportButton)reportButton.click();else window.GRAExperimentalReport?.open?.();});
        actionMenu.appendChild(reportAction);
      }
      toggleShell('actions');
    });
    shellBackdrop.addEventListener('click',()=>closeShell());
    qs('.v222-mobile-search-head button',searchOverlay).addEventListener('click',()=>closeShell());
    qs('.v222-mobile-actions-close',actionMenu).addEventListener('click',()=>closeShell());
    qs('[data-action="pdf"]',actionMenu).addEventListener('click',()=>{closeShell();byId('pdfExportBtn')?.click();});
    qs('[data-action="slides"]',actionMenu).addEventListener('click',()=>{closeShell();byId('slideExportBtn')?.click();});
    qsa('.nav button[data-section]').forEach(button=>button.addEventListener('click',()=>{
      closeShell();
      setTimeout(()=>{updateMobileHeader();syncShortcuts();},30);
    }));
    installFilterFooter(byId('somFiltersCard'),'som');
    installFilterFooter(byId('adrFiltersCard'),'adr');
    buildBankFilterPanel();
    mobileQuery.addEventListener?.('change',placeSearchForViewport);
    placeSearchForViewport();
    rememberFilterDefaults();
    updateMobileHeader();
  }

  function activateSection(id){
    const button=qs(`.nav button[data-section="${id}"]`);
    if(button)button.click();
  }

  function routeSchool(school,target='current'){
    const current=qs('.section.active')?.id||'resultados';
    const destination=target==='current'?current:target;
    const canonicalSchool=(kind)=>{
      const raw=String(school||'').trim();
      const stripped=raw.replace(/^(?:GET|GEO)\s+/i,'').trim();
      if(kind==='map'){
        try{
          const point=typeof window.geoFindPointForSchool==='function'?(window.geoFindPointForSchool(raw)||window.geoFindPointForSchool(stripped)):null;
          if(point?.name)return point.name;
        }catch(_){ }
        const direct=(typeof GEO_POINTS!=='undefined'?GEO_POINTS:[]).find(point=>[point.name,point.dataRioName,...(point.aliases||[]),...(point.somAliases||[]),...(point.adrAliases||[])].some(alias=>normalize(alias)===normalize(stripped)));
        return direct?.name||stripped;
      }
      if(kind==='som'){
        const rows=typeof SOM_ROWS!=='undefined'?SOM_ROWS:[];
        const match=rows.find(row=>{
          if(!row?.escola)return false;
          if(normalize(row.escola)===normalize(stripped))return true;
          try{const record=typeof window.somFindRecord==='function'?window.somFindRecord(row.escola):null;return normalize(record?.unidade)===normalize(raw)||normalize(record?.unidade)===normalize(stripped);}catch(_){return false;}
        });
        return match?.escola||stripped;
      }
      if(kind==='adr'){
        const rows=typeof ADR_ROWS!=='undefined'?ADR_ROWS:[];
        const match=rows.find(row=>normalize(row?.escola)===normalize(stripped)||normalize(row?.escola).includes(normalize(stripped).replace(/^escola municipal\s+/,'')));
        return match?.escola||stripped;
      }
      return raw;
    };
    const applyText=(sectionId,inputId,eventType,renderName)=>{
      activateSection(sectionId);
      const input=byId(inputId);
      if(input){input.value=school;input.dispatchEvent(new Event(eventType,{bubbles:true}));}
      if(typeof window[renderName]==='function')window[renderName]();
    };
    if(destination==='resultados'){
      school=canonicalSchool('som');applyText('resultados','somSearch','input','renderResultados');
    }
    else if(destination==='adrs'){
      school=canonicalSchool('adr');applyText('adrs','adrSearch','input','renderADRs');
    }
    else if(destination==='georreferenciamento'||destination==='map'){
      school=canonicalSchool('map');
      activateSection('georreferenciamento');
      setTimeout(()=>{if(typeof window.geoFocusSchoolByName==='function')window.geoFocusSchoolByName(school);},80);
    }else if(destination==='exclusivas')applyText('exclusivas','exclusiveSearch','input','renderExclusivas');
    else if(destination==='efpd')applyText('efpd','efpdSearch','input','renderEfpd');
    else if(destination==='cre')applyText('cre','creDetailSearch','input','renderCREDetailed');
    else if(destination==='agentes')applyText('agentes','territorySearch','input','renderTerr');
    else applyText('banco','bankSearch','input','renderBanco');
    const global=byId('globalSearch');if(global)global.value=school;
    byId('globalSearchPanel')?.classList.remove('open');
    closeShell();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function decorateSearchResults(){
    const input=byId('globalSearch');
    const panel=byId('globalSearchPanel');
    if(!input||!panel)return;
    input.setAttribute('role','combobox');
    input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-controls','globalSearchPanel');
    input.setAttribute('aria-expanded',String(panel.classList.contains('open')));
    panel.setAttribute('role','list');
    qsa('.search-result[data-unidade]',panel).forEach((item,index)=>{
      item.setAttribute('role','listitem');
      item.tabIndex=index===0?0:-1;
      if(!item.querySelector('.v222-search-actions')){
        const actions=document.createElement('div');
        actions.className='v222-search-actions';
        const current=sectionLabel();
        actions.innerHTML=`<button type="button" data-v222-target="current">Aplicar em ${escapeHtml(current)}</button><button type="button" data-v222-target="map">Abrir no mapa</button><button type="button" data-v222-target="bank">Ver no banco</button>`;
        item.appendChild(actions);
      }
    });
  }

  function installSearchUX(){
    const input=byId('globalSearch');
    const panel=byId('globalSearchPanel');
    if(!input||!panel)return;
    const observer=new MutationObserver(()=>setTimeout(decorateSearchResults,0));
    observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    input.addEventListener('input',()=>setTimeout(decorateSearchResults,0));
    input.addEventListener('focus',()=>setTimeout(decorateSearchResults,0));
    panel.addEventListener('click',event=>{
      const item=event.target.closest('.search-result[data-unidade]');
      if(!item)return;
      event.preventDefault();
      event.stopPropagation();
      const requested=event.target.closest('[data-v222-target]')?.dataset.v222Target||'current';
      routeSchool(item.dataset.unidade,requested);
    },true);
    input.addEventListener('keydown',event=>{
      const items=qsa('.search-result[data-unidade]',panel);
      if(event.key==='ArrowDown'&&items.length){event.preventDefault();items[0].focus();}
      if(event.key==='Escape'){panel.classList.remove('open');input.setAttribute('aria-expanded','false');}
    });
    panel.addEventListener('keydown',event=>{
      const items=qsa('.search-result[data-unidade]',panel);
      const index=items.indexOf(document.activeElement);
      if(event.key==='ArrowDown'&&items.length){event.preventDefault();items[(index+1+items.length)%items.length].focus();}
      else if(event.key==='ArrowUp'&&items.length){event.preventDefault();items[(index-1+items.length)%items.length].focus();}
      else if((event.key==='Enter'||event.key===' ')&&index>=0){event.preventDefault();items[index].click();}
      else if(event.key==='Escape'){event.preventDefault();panel.classList.remove('open');input.focus();}
    });
    decorateSearchResults();
  }

  const MODAL_SELECTOR=['#detailDrawer','#adrProgressModal','#adrLevelDrawer','#slideChoiceOverlay','#slideExportOverlay','#v172IdebStrataDrawer','#v181IdebSchoolDrawer','#v222MobileRowOverlay'].join(',');
  let lastExternalFocus=null;
  let activeModal=null;
  const triggerForModal=new WeakMap();

  function modalIsOpen(root){
    if(!root||!root.isConnected)return false;
    return root.classList.contains('open')&&getComputedStyle(root).display!=='none';
  }

  function focusables(root){
    return qsa('button:not([disabled]),[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',root).filter(visible);
  }

  function syncModals(){
    const roots=qsa(MODAL_SELECTOR);
    const openRoots=roots.filter(modalIsOpen);
    roots.forEach(root=>{
      const open=openRoots.includes(root);
      if(root.inert===open)root.inert=!open;
      const hiddenValue=String(!open);
      if(root.getAttribute('aria-hidden')!==hiddenValue)root.setAttribute('aria-hidden',hiddenValue);
      if(open){
        if(!root.getAttribute('role'))root.setAttribute('role','dialog');
        root.setAttribute('aria-modal','true');
        if(root.dataset.v222ModalOpen!=='true'){
          root.dataset.v222ModalOpen='true';
          triggerForModal.set(root,lastExternalFocus||document.activeElement);
          setTimeout(()=>{
            if(modalIsOpen(root)&&!root.contains(document.activeElement)){
              const first=focusables(root)[0];
              if(first)first.focus();else{root.tabIndex=-1;root.focus();}
            }
          },40);
        }
      }else if(root.dataset.v222ModalOpen==='true'){
        root.dataset.v222ModalOpen='false';
      }
    });
    const previous=activeModal;
    activeModal=openRoots.at(-1)||null;
    const app=qs('.app');
    if(app&&app.inert!==Boolean(activeModal))app.inert=Boolean(activeModal);
    if(previous&&!activeModal){
      const trigger=triggerForModal.get(previous);
      if(trigger?.isConnected)setTimeout(()=>trigger.focus(),0);
    }
  }

  function closeActiveModal(){
    if(!activeModal)return false;
    if(activeModal.id==='slideExportOverlay')return false;
    const close=qs('[aria-label^="Fechar"],.slide-choice-cancel,.v222-dialog-close,.drawer-close,.adr-progress-modal-close,.v172-strata-close,.v181-school-close',activeModal);
    if(close){close.click();return true;}
    return false;
  }

  function installModalA11y(){
    document.addEventListener('pointerdown',event=>{
      if(!event.target.closest(MODAL_SELECTOR))lastExternalFocus=event.target.closest('button,[href],input,select,[tabindex]')||document.activeElement;
    },true);
    document.addEventListener('keydown',event=>{
      if(!activeModal)return;
      if(event.key==='Escape'){
        if(closeActiveModal()){event.preventDefault();event.stopPropagation();}
        return;
      }
      if(event.key!=='Tab')return;
      const items=focusables(activeModal);
      if(!items.length){event.preventDefault();activeModal.focus();return;}
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    },true);
    const observer=new MutationObserver(()=>setTimeout(syncModals,0));
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-hidden']});
    syncModals();
  }

  function fixedADRPie(rows){
    const average=(key)=>{
      const value=typeof window.adrWeightAvg==='function'?window.adrWeightAvg(rows,key):NaN;
      return Number.isFinite(Number(value))?Number(value):0;
    };
    const values=[
      {categoria:'Abaixo do Básico',total:average('abaixo')},
      {categoria:'Básico',total:average('basico')},
      {categoria:'Adequado',total:average('adequado')}
    ];
    const total=values.reduce((sum,item)=>sum+item.total,0)||100;
    const items=values.map(item=>({...item,total:Number(item.total.toFixed(1)),percentual:item.total/total*100}));
    const donut=byId('adrPie');
    if(!donut||typeof window.renderDonut!=='function')return;
    donut.innerHTML='<div class="donut-center"><b>100%</b><span>níveis</span></div>';
    window.renderDonut('adrPie','adrPieLegend',items,total,category=>{
      if(typeof window.adrOpenLevelDrawer==='function')window.adrOpenLevelDrawer(category,rows);
    });
    qsa('#adrPieLegend .legend-row').forEach((row,index)=>{
      const item=items[index];if(!item)return;
      const label=item.total.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
      const value=qs('span',row);if(value)value.textContent=label;
      row.setAttribute('aria-label',`${item.categoria}: ${label}. Abrir escolas deste nível.`);
      const path=qsa('#adrPie path')[index];
      const title=path?.querySelector('title');if(title)title.textContent=`${item.categoria}: ${label}`;
    });
  }

  function idebCreRowsFromCurrentChart(){
    return qsa('#somCreChart .v181-cre-bar').map(group=>{
      const title=group.querySelector('title')?.textContent||'';
      const label=title.split('·')[0]?.trim()||group.querySelectorAll('text')[1]?.textContent?.trim()||'';
      const valueMatch=title.match(/IDEB\s+(-?\d+(?:[.,]\d+)?)/i);
      const countMatch=title.match(/(\d+)\s+escolas?/i);
      const value=valueMatch?Number(valueMatch[1].replace(',','.')):NaN;
      return {label,value,count:countMatch?Number(countMatch[1]):0};
    }).filter(item=>item.label&&Number.isFinite(item.value));
  }

  function renderIdebCreLollipop(){
    const modality=byId('somModalidade')?.value||'';
    const metric=byId('somMetric')?.value||'';
    const chart=byId('somCreChart');
    const card=byId('somCreCompareCard');
    if(!/IDEB/i.test(modality)||!['ideb2023','ideb2025'].includes(metric)||!chart||!card||card.style.display==='none')return;
    const rows=idebCreRowsFromCurrentChart();
    if(rows.length<2){
      if(chart.classList.contains('v222-lollipop')){
        const subtitle=byId('somCreSubtitle');
        if(subtitle&&!/0\s*a\s*10/i.test(subtitle.textContent))subtitle.textContent=`${subtitle.textContent.replace(/[.\s]+$/,'')} · escala completa de 0 a 10.`;
      }
      return;
    }
    const width=980,rowHeight=36,top=72,bottom=42,left=92,right=104,height=top+bottom+rows.length*rowHeight;
    const plotWidth=width-left-right;
    const x=value=>left+plotWidth*Math.max(0,Math.min(10,Number(value)))/10;
    const ticks=[0,2,4,6,8,10];
    const grid=ticks.map(value=>`<g><line x1="${x(value)}" x2="${x(value)}" y1="${top-18}" y2="${height-bottom+4}" stroke="#e1eaf1"/><text class="v222-lollipop-axis" x="${x(value)}" y="${top-27}" text-anchor="middle">${value}</text></g>`).join('');
    const marks=rows.map((item,index)=>{
      const y=top+index*rowHeight+rowHeight/2;
      const shade=index%2===0?`<rect x="${left-82}" y="${y-rowHeight/2}" width="${plotWidth+174}" height="${rowHeight}" rx="8" fill="#f8fbfd"/>`:'';
      return `${shade}<text class="v222-lollipop-label" x="${left-12}" y="${y+4}" text-anchor="end">${escapeHtml(item.label)}</text><line x1="${x(0)}" x2="${x(item.value)}" y1="${y}" y2="${y}" stroke="#9fc3da" stroke-width="4" stroke-linecap="round"/><circle cx="${x(item.value)}" cy="${y}" r="7" fill="#1c79b8" stroke="#fff" stroke-width="2"><title>${escapeHtml(item.label)} · IDEB ${item.value.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} · ${item.count} escolas válidas</title></circle><text class="v222-lollipop-value" x="${x(item.value)+14}" y="${y+4}">${item.value.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}</text>`;
    }).join('');
    chart.className='bars adr-cre-list v222-lollipop';
    chart.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="IDEB das CREs em escala completa de zero a dez"><desc>Cada linha mostra a posição de uma CRE na escala oficial do IDEB, de zero a dez.</desc><text class="v222-lollipop-axis" x="${(left+width-right)/2}" y="20" text-anchor="middle">Escala oficial do IDEB: 0 a 10</text>${grid}${marks}<line x1="${x(0)}" x2="${x(10)}" y1="${height-bottom+5}" y2="${height-bottom+5}" stroke="#aebfcb"/></svg>`;
    const high=rows.reduce((best,item)=>item.value>best.value?item:best,rows[0]);
    const low=rows.reduce((worst,item)=>item.value<worst.value?item:worst,rows[0]);
    const insight=document.createElement('div');
    insight.className='v222-chart-insight';
    insight.innerHTML=`<span><strong>Maior:</strong> ${escapeHtml(high.label)} · ${high.value.toLocaleString('pt-BR',{minimumFractionDigits:1})}</span><span><strong>Menor:</strong> ${escapeHtml(low.label)} · ${low.value.toLocaleString('pt-BR',{minimumFractionDigits:1})}</span><span><strong>Distância:</strong> ${(high.value-low.value).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} ponto</span>`;
    chart.appendChild(insight);
    const subtitle=byId('somCreSubtitle');
    if(subtitle)subtitle.textContent=`Toda a SME · ${byId('somAnoEscolar')?.value||'segmento selecionado'} · escala completa e explícita de 0 a 10.`;
  }

  function parseChartNumber(text){
    const matches=String(text||'').match(/-?\d+(?:[.,]\d+)?/g)||[];
    return matches.length?Number(matches.at(-1).replace(',','.')):NaN;
  }

  function adjustComparisonLabels(target){
    const texts=qsa('.gc-series.gc-mean > text',target).filter(node=>node.hasAttribute('x')&&node.hasAttribute('y'));
    const groups=new Map();
    texts.forEach(node=>{const key=Number(node.getAttribute('x')).toFixed(1);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(node);});
    groups.forEach(nodes=>{
      nodes.sort((a,b)=>Number(a.getAttribute('y'))-Number(b.getAttribute('y')));
      for(let index=1;index<nodes.length;index++){
        const previous=Number(nodes[index-1].getAttribute('y'));
        const current=Number(nodes[index].getAttribute('y'));
        if(current-previous<14)nodes[index].setAttribute('y',String(previous+14));
      }
    });
  }

  function addComparisonInsight(target){
    if(!target)return;
    const series=qsa('.gc-series.gc-mean',target).map(node=>{
      const values=qsa('circle title',node).map(title=>parseChartNumber(title.textContent)).filter(Number.isFinite);
      return {name:node.dataset.label||'',values};
    }).filter(item=>item.name&&item.values.length>=2);
    let insight=qs('.v222-chart-insight',target);
    if(!series.length){insight?.remove();return;}
    if(!insight){insight=document.createElement('div');insight.className='v222-chart-insight';target.appendChild(insight);}
    insight.innerHTML=series.map(item=>{
      const first=item.values[0],last=item.values.at(-1),delta=last-first;
      return `<span><strong>${escapeHtml(item.name)}:</strong> ${first.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}% → ${last.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}% (${delta>0?'+':''}${delta.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} p.p.)</span>`;
    }).join('');
  }

  function enhanceChartSemantics(){
    qsa('.donut svg,.gc-chart svg,.result-chart svg,.adr-line-chart svg,#somCreChart svg,#adrCreChart svg').forEach(svg=>{
      if(!svg.getAttribute('role'))svg.setAttribute('role','img');
      if(!svg.getAttribute('aria-label')){
        const card=svg.closest('.card');
        const title=card?.querySelector('.panel-title h3,h3')?.textContent?.trim()||'Gráfico da dashboard';
        const subtitle=card?.querySelector('.panel-title p')?.textContent?.trim()||'';
        svg.setAttribute('aria-label',[title,subtitle].filter(Boolean).join('. '));
      }
    });
    qsa('.donut path').forEach(path=>{
      if(path.dataset.v222Keyboard)return;
      path.dataset.v222Keyboard='true';
      path.tabIndex=0;
      path.setAttribute('role',path.hasAttribute('data-cat')?'button':'img');
      path.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();path.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
    });
    ['adrGetChart1','adrGetChart2'].forEach(id=>{
      const target=byId(id);if(!target)return;
      adjustComparisonLabels(target);
      addComparisonInsight(target);
    });
  }

  function installChartSafetyLayer(){
    const previousPie=window.renderADRPie;
    window.renderADRPie=function(rows){
      try{return fixedADRPie(rows);}catch(error){console.warn('v222: fallback da rosca ADR',error);return typeof previousPie==='function'?previousPie(rows):undefined;}
    };
    const previousSomCre=window.renderSomCreChart;
    window.renderSomCreChart=function(){
      const result=typeof previousSomCre==='function'?previousSomCre.apply(this,arguments):undefined;
      try{renderIdebCreLollipop();}catch(error){console.warn('v222: lollipop IDEB não aplicado',error);}
      return result;
    };
    const previousSom=window.renderResultados;
    if(typeof previousSom==='function')window.renderResultados=function(){
      const result=previousSom.apply(this,arguments);
      setTimeout(()=>{renderIdebCreLollipop();enhanceChartSemantics();afterRender();},0);
      return result;
    };
    const previousAdr=window.renderADRs;
    if(typeof previousAdr==='function')window.renderADRs=function(){
      const result=previousAdr.apply(this,arguments);
      setTimeout(()=>{enhanceChartSemantics();afterRender();},0);
      return result;
    };
    try{if(window.__GRA_SECTION_INIT?.adrs===true&&typeof window.adrFilteredRows==='function')fixedADRPie(window.adrFilteredRows());}catch(_){ }
    try{renderIdebCreLollipop();}catch(_){ }
    enhanceChartSemantics();
  }

  function disclosureForTable(table){
    if(!table||!['somTable','adrTable'].includes(table.id))return;
    const card=table.closest('.card');
    const wrap=table.closest('.table-wrap');
    const rows=table.tBodies?.[0]?.rows?.length||0;
    if(!card||!wrap)return;
    const panel=card.querySelector('.panel-title');
    let button=card.querySelector('.v222-disclosure-toggle');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='v222-disclosure-toggle';
      button.addEventListener('click',()=>{
        const expanded=card.dataset.v222Expanded!=='true';
        card.dataset.v222Expanded=String(expanded);
        card.classList.toggle('v222-collapsed',!expanded);
        disclosureForTable(table);
        if(expanded)wrap.scrollIntoView({behavior:'smooth',block:'start'});
      });
      panel?.appendChild(button);
    }
    if(rows<=20){
      card.classList.remove('v222-collapsed');
      button.hidden=true;
      button.setAttribute('aria-expanded','true');
      return;
    }
    button.hidden=false;
    const expanded=card.dataset.v222Expanded==='true';
    card.classList.toggle('v222-collapsed',!expanded);
    button.textContent=expanded?'Recolher lista completa':`Ver todas as ${rows.toLocaleString('pt-BR')} escolas`;
    button.setAttribute('aria-expanded',String(expanded));
    button.setAttribute('aria-controls',table.id);
  }

  function buildSectionJumps(sectionId,items){
    const section=byId(sectionId);if(!section||section.querySelector('.v222-section-jumps'))return;
    const nav=document.createElement('nav');
    nav.className='v222-section-jumps';
    nav.setAttribute('aria-label','Atalhos desta análise');
    items.forEach(item=>{
      const button=document.createElement('button');
      button.type='button';button.textContent=item.label;button.dataset.targets=item.targets.join(',');
      button.addEventListener('click',()=>{
        const target=item.targets.map(selector=>qs(selector)).find(node=>node&&(!node.closest('.card')||visible(node.closest('.card'))))||qs(item.targets[0]);
        if(!target)return;
        if(target.id==='somTable'||target.id==='adrTable'){
          const card=target.closest('.card');card.dataset.v222Expanded='true';card.classList.remove('v222-collapsed');disclosureForTable(target);
        }
        target.scrollIntoView({behavior:'smooth',block:'start'});
      });
      nav.appendChild(button);
    });
    const filter=sectionId==='resultados'?byId('somFiltersCard'):byId('adrFiltersCard');
    if(filter)filter.insertAdjacentElement('afterend',nav);else section.prepend(nav);
  }

  function syncShortcuts(){
    qsa('.v222-section-jumps button').forEach(button=>{
      const available=button.dataset.targets.split(',').some(selector=>{const node=qs(selector);return node&&(!node.closest('.card')||getComputedStyle(node.closest('.card')).display!=='none');});
      button.hidden=!available;
    });
  }

  function essentialColumns(table,headers){
    const normalized=headers.map(normalize);
    const patterns=table.id==='bankTable'
      ? ['unidade','cre','agente','prioritaria','plano de acao']
      : table.id==='somTable'
        ? ['escola','cre','agente','valor','ideb 2025','progressao','crescimento','ano']
        : table.id==='adrTable'
          ? ['escola','cre','agente','pos','adr 2','variacao','adequado','abaixo','acerto']
          : ['unidade','escola','agente','cre','territorio','resultado'];
    const result=[];
    patterns.forEach(pattern=>{
      const index=normalized.findIndex((header,idx)=>!result.includes(idx)&&header.includes(normalize(pattern)));
      if(index>=0&&result.length<5)result.push(index);
    });
    for(let index=0;index<headers.length&&result.length<Math.min(5,headers.length);index++)if(!result.includes(index))result.push(index);
    return result;
  }

  function processTable(table){
    if(!table?.tHead?.rows?.[0])return;
    const headers=[...table.tHead.rows[0].cells].map(cell=>cell.textContent.trim());
    const keep=essentialColumns(table,headers);
    [...table.tHead.rows[0].cells].forEach((cell,index)=>{
      cell.classList.toggle('v222-mobile-hidden',!keep.includes(index));
      cell.classList.toggle('v222-mobile-sticky',index===keep[0]);
    });
    qsa('tbody tr',table).forEach(row=>{
      [...row.cells].forEach((cell,index)=>{
        cell.dataset.label=headers[index]||`Campo ${index+1}`;
        cell.classList.toggle('v222-mobile-hidden',!keep.includes(index));
        cell.classList.toggle('v222-mobile-sticky',index===keep[0]);
      });
      row.dataset.v222RowDetail='true';
      if(mobileQuery.matches)row.tabIndex=0;else row.removeAttribute('tabindex');
      row.setAttribute('aria-label','Abrir todos os detalhes desta linha');
    });
    const wrap=table.closest('.table-wrap');
    if(wrap&&headers.length>5&&!wrap.previousElementSibling?.classList.contains('v222-table-hint')){
      const hint=document.createElement('div');hint.className='v222-table-hint';hint.textContent='Toque em uma linha para ver todos os campos. As colunas essenciais permanecem visíveis.';wrap.parentNode.insertBefore(hint,wrap);
    }
    disclosureForTable(table);
  }

  function ensureRowDialog(){
    let overlay=byId('v222MobileRowOverlay');if(overlay)return overlay;
    overlay=document.createElement('div');overlay.id='v222MobileRowOverlay';overlay.className='v222-mobile-row-overlay';overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<section class="v222-mobile-row-dialog" role="document"><div class="v222-mobile-row-head"><h3 id="v222MobileRowTitle">Detalhes</h3><button type="button" class="v222-dialog-close" aria-label="Fechar detalhes">×</button></div><dl class="v222-mobile-row-body"></dl></section>';
    document.body.appendChild(overlay);
    const close=()=>{overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');syncModals();};
    overlay.querySelector('.v222-dialog-close').addEventListener('click',close);
    overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
    return overlay;
  }

  function openRowDialog(row){
    if(!mobileQuery.matches)return;
    const table=row.closest('table');
    const headers=[...(table?.tHead?.rows?.[0]?.cells||[])].map(cell=>cell.textContent.trim());
    const cells=[...row.cells];
    const overlay=ensureRowDialog();
    const titleHeader=headers.findIndex(header=>/escola|unidade/i.test(header));
    const title=(titleHeader>=0?cells[titleHeader]?.textContent:cells[0]?.textContent)?.trim()||'Detalhes do registro';
    byId('v222MobileRowTitle').textContent=title;
    qs('.v222-mobile-row-body',overlay).innerHTML=cells.map((cell,index)=>`<div class="v222-mobile-row-field"><dt>${escapeHtml(headers[index]||`Campo ${index+1}`)}</dt><dd>${escapeHtml(cell.textContent.trim()||'—')}</dd></div>`).join('');
    lastExternalFocus=row;
    overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');syncModals();
  }

  function installTableUX(){
    const processAll=()=>qsa('table').forEach(processTable);
    let timer=0;
    const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{processAll();syncShortcuts();},90);});
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',event=>{
      const row=event.target.closest('tbody tr[data-v222-row-detail]');
      if(row&&mobileQuery.matches&&!event.target.closest('button,a,input,select,[role="button"]'))openRowDialog(row);
    });
    document.addEventListener('keydown',event=>{
      const row=event.target.closest?.('tbody tr[data-v222-row-detail]');
      if(row&&mobileQuery.matches&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openRowDialog(row);}
    });
    mobileQuery.addEventListener?.('change',processAll);
    processAll();
  }

  let busyToken=0;
  function beginBusy(){
    const token=++busyToken;
    document.body.setAttribute('aria-busy','true');
    const section=qs('.section.active');if(section)section.setAttribute('aria-busy','true');
    const indicator=byId('dashLoadingIndicator');
    indicator?.classList.add('is-active');indicator?.setAttribute('aria-hidden','false');
    nextPaint(()=>setTimeout(()=>finishBusy(token),120));
    return token;
  }
  function finishBusy(token){
    if(token!==busyToken)return;
    document.body.setAttribute('aria-busy','false');
    qsa('.section[aria-busy="true"]').forEach(section=>section.setAttribute('aria-busy','false'));
    const indicator=byId('dashLoadingIndicator');indicator?.classList.remove('is-active');indicator?.setAttribute('aria-hidden','true');
  }
  function installBusyState(){
    const selector='select,input.search,input[type="search"],.nav button[data-section],.pill,.gc-switch input,.geo-eval-picker button';
    document.addEventListener('change',event=>{if(event.target.closest?.(selector))beginBusy();},true);
    document.addEventListener('click',event=>{if(event.target.closest?.('.nav button[data-section],.pill,.geo-eval-picker button'))beginBusy();},true);
    let inputTimer=0;
    document.addEventListener('input',event=>{if(!event.target.matches?.('input.search,input[type="search"]'))return;clearTimeout(inputTimer);inputTimer=setTimeout(beginBusy,100);},true);
    document.body.setAttribute('aria-busy','false');
  }

  function afterRender(){
    syncFieldVisibility();
    rememberFilterDefaults();
    updateMobileHeader();
    qsa('table').forEach(processTable);
    ['somTable','adrTable'].forEach(id=>disclosureForTable(byId(id)));
    syncShortcuts();
  }

  function installLazyAssets(){
    qsa('img').forEach((image,index)=>{
      image.decoding='async';
      if(!image.classList.contains('brand-logo')&&index>1){image.loading='lazy';image.dataset.v222Lazy='true';}
    });
  }

  function installKeyboardShellClose(){
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&shellIsOpen()&&!activeModal){event.preventDefault();closeShell();}
    });
  }

  function install(){
    installVersion();
    labelControls();
    buildMobileShell();
    installSearchUX();
    installModalA11y();
    installBusyState();
    installLazyAssets();
    buildSectionJumps('resultados',[
      {label:'Resumo',targets:['#somKpis']},
      {label:'Comparativos',targets:['#somGetCompareCard','#somCreCompareCard']},
      {label:'Ranking',targets:['#somMainChart']},
      {label:'Habilidades',targets:['#somSkillCard']},
      {label:'Lista completa',targets:['#somTable']}
    ]);
    buildSectionJumps('adrs',[
      {label:'Resumo',targets:['#adrKpis']},
      {label:'Comparativos',targets:['#adrGetCompareCard','#adrCreCompareCard']},
      {label:'Ranking',targets:['#adrSchoolBars']},
      {label:'Habilidades',targets:['#adrSkillBars']},
      {label:'Lista completa',targets:['#adrTable']}
    ]);
    installTableUX();
    installChartSafetyLayer();
    installKeyboardShellClose();
    byId('regionalScopeSelect')?.addEventListener('change',()=>setTimeout(()=>{installVersion();updateMobileHeader();afterRender();},30));
    document.addEventListener('change',()=>setTimeout(()=>{updateMobileHeader();syncFieldVisibility();},20),true);
    document.addEventListener('input',()=>setTimeout(updateMobileHeader,30),true);
    const versionObserver=new MutationObserver(()=>{
      const badge=byId('dashboardVersionBadge');if(badge&&badge.textContent.trim()!==VERSION)badge.textContent=VERSION;
    });
    const badge=byId('dashboardVersionBadge');if(badge)versionObserver.observe(badge,{childList:true,characterData:true,subtree:true});
    setTimeout(afterRender,160);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,180),{once:true});
  else setTimeout(install,180);
})();

