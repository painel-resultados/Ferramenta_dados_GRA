
(function(){
  function firstOrEmpty(el){
    if(!el) return;
    if(el.tagName==='SELECT'){
      const empty=[...el.options].find(o=>o.value==='');
      if(empty) el.value=''; else el.selectedIndex=0;
    }else if(el.type==='search'||el.type==='text'||el.tagName==='INPUT') el.value='';
  }
  function fire(el,type){ if(el) el.dispatchEvent(new Event(type,{bubbles:true})); }
  function addButton(container,id,handler){
    if(!container||document.getElementById(id)) return;
    const b=document.createElement('button');
    b.type='button'; b.id=id; b.className='filter-reset-btn'; b.textContent='Limpar Filtros';
    b.addEventListener('click',handler); container.appendChild(b);
  }
  function install(){
    addButton(document.getElementById('creDetailSearch')?.closest('.toolbar'),'clearCreFilters',()=>{
      const q=document.getElementById('creDetailSearch'); q.value='';
      try{ state.creDetailType='exclusiva'; state.creDetailCategory='Todas'; setActivePills('creQuickPills','Todas'); renderCREDetailed(); }
      catch(e){ fire(q,'input'); }
    });

    addButton(document.getElementById('territorySearch')?.closest('.toolbar'),'clearAgentFilters',()=>{
      const sel=document.getElementById('territorySelect'), q=document.getElementById('territorySearch');
      if(sel) sel.selectedIndex=0; if(q) q.value=''; fire(sel,'change'); fire(q,'input');
    });

    addButton(document.getElementById('bankSearch')?.closest('.toolbar'),'clearBankFilters',()=>{
      ['bankSearch','filterTerritorio','filterAgente','filterPA','filterPD','filterExclusiva'].forEach(id=>firstOrEmpty(document.getElementById(id)));
      if(typeof renderBanco==='function') renderBanco();
    });

    addButton(document.querySelector('#georreferenciamento .geo-toolbar-v91'),'clearGeoFilters',()=>{
      ['geoPriority','geoGet','geoAgent','geoSearch'].forEach(id=>firstOrEmpty(document.getElementById(id)));
      if(typeof geoSelectEvaluation==='function') geoSelectEvaluation('ADR');
      else if(typeof geoScheduleFilters==='function') geoScheduleFilters(0);
    });

    addButton(document.getElementById('exclusiveSearch')?.closest('.toolbar'),'clearExclusiveFilters',()=>{
      const q=document.getElementById('exclusiveSearch'); q.value='';
      try{ state.exclusiveCategory='Todas'; setActivePills('exclusivePills','Todas'); renderExclusivas(); }
      catch(e){ fire(q,'input'); }
    });

    addButton(document.getElementById('efpdSearch')?.closest('.toolbar'),'clearEfpdFilters',()=>{
      const q=document.getElementById('efpdSearch'); q.value='';
      try{ state.efpdCategory='Todas'; setActivePills('efpdPills','Todas'); renderEfpd(); }
      catch(e){ fire(q,'input'); }
    });

    addButton(document.getElementById('somSearch')?.closest('.toolbar'),'clearSomFilters',()=>{
      const ids=['somMode','somModalidade','somAnoEscolar','somComponente','somEdicao','somMetric','somCre','somAgente','somPriority','somSearch'];
      ids.forEach(id=>firstOrEmpty(document.getElementById(id)));
      const mode=document.getElementById('somMode'); if(mode) mode.value='individual';
      const metric=document.getElementById('somMetric'); if(metric) metric.value='principal';
      try{ somRefreshSelectors();
        ['somAnoEscolar','somComponente','somEdicao','somCre','somAgente','somPriority'].forEach(id=>firstOrEmpty(document.getElementById(id)));
        renderResultados();
      }catch(e){ ids.forEach(id=>fire(document.getElementById(id),id==='somSearch'?'input':'change')); }
    });

    addButton(document.getElementById('adrSearch')?.closest('.toolbar'),'clearAdrFilters',()=>{
      const ids=['adrMode','adrAno','adrComp','adrSelect','adrMetric','adrEvolucao','adrCre','adrAgente','adrPriority','adrSearch'];
      ids.forEach(id=>firstOrEmpty(document.getElementById(id)));
      const mode=document.getElementById('adrMode'); if(mode) mode.value='individual';
      const metric=document.getElementById('adrMetric'); if(metric) metric.value='adequado';
      try{ adrRefreshSelectors();
        const evo=document.getElementById('adrEvolucao'); if(evo) evo.value='';
        const search=document.getElementById('adrSearch'); if(search) search.value='';
        renderADRs();
      }catch(e){ ids.forEach(id=>fire(document.getElementById(id),id==='adrSearch'?'input':'change')); }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
  else setTimeout(install,0);
})();
