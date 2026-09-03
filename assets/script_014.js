
(function(){
  'use strict';

  /* v172 — contrato regional executado no documento principal.
     Vale igualmente para IDEB Anos Iniciais e Anos Finais e para os demais
     recortes analíticos: Toda a SME = todas as CREs disponíveis; CRE específica
     = somente registros pertencentes àquela CRE. */
  const scopeSelect=()=>document.getElementById('regionalScopeSelect');
  const scopeNumber=()=>Number(scopeSelect()?.value||0);
  const scopeCreValue=()=>scopeNumber()?`CRE ${String(scopeNumber()).padStart(2,'0')}`:'';
  const rowCreNumber=row=>{
    const raw=row?.cre??row?.regional??row?.creLabel??'';
    if(typeof window.creNumber==='function'){
      const parsed=Number(window.creNumber(raw));
      if(Number.isFinite(parsed)&&parsed>0)return parsed;
    }
    const match=String(raw).match(/\d{1,2}/);
    return match?Number(match[0]):0;
  };
  const rowInUniverse=row=>{
    const region=scopeNumber();
    return !region||rowCreNumber(row)===region;
  };
  const ensureOption=(select,value,label=value)=>{
    if(!select||!value)return;
    if(![...select.options].some(option=>option.value===value)){
      const option=document.createElement('option');
      option.value=value;option.textContent=label;select.appendChild(option);
    }
  };
  const forceHiddenCreSelectors=()=>{
    const value=scopeCreValue();
    ['somCre','adrCre'].forEach(id=>{
      const select=document.getElementById(id);
      if(!select)return;
      if(value)ensureOption(select,value,value);
      select.value=value;
      select.dataset.scopeManaged='true';
    });
  };

  if(typeof window.somRowsForSelector==='function'){
    window.somRowsForSelector=function(modalidade='',ano='',comp='',ed='',cre=''){
      return (typeof SOM_ROWS!=='undefined'&&Array.isArray(SOM_ROWS)?SOM_ROWS:[]).filter(row=>{
        if(!rowInUniverse(row))return false;
        if(modalidade&&row.modalidade!==modalidade)return false;
        if(ano&&row.anoEscolar!==ano)return false;
        if(comp&&typeof window.somComponentMatches==='function'&&!window.somComponentMatches(row.componente,comp,row.modalidade))return false;
        if(ed&&row.edicao!==ed)return false;
        if(cre&&row.cre!==cre)return false;
        return true;
      });
    };
  }

  if(typeof window.somFilteredRows==='function'){
    window.somFilteredRows=function({ignoreEdicao=false,ignoreCre=false,ignoreSearch=false,ignoreComp=false}={}){
      const modalidade=document.getElementById('somModalidade')?.value||'';
      const ano=document.getElementById('somAnoEscolar')?.value||'';
      const comp=document.getElementById('somComponente')?.value||'';
      const ed=document.getElementById('somEdicao')?.value||'';
      const agente=document.getElementById('somAgente')?.value||'';
      const q=typeof window.norm==='function'?window.norm(document.getElementById('somSearch')?.value||''):String(document.getElementById('somSearch')?.value||'').toLowerCase();
      const priorityOnly=document.getElementById('somPriority')?.value==='sim';
      return (typeof SOM_ROWS!=='undefined'&&Array.isArray(SOM_ROWS)?SOM_ROWS:[]).filter(row=>{
        if(!rowInUniverse(row))return false;
        if(modalidade&&row.modalidade!==modalidade)return false;
        if(ano&&row.anoEscolar!==ano)return false;
        if(!ignoreComp&&comp&&typeof window.somComponentMatches==='function'&&!window.somComponentMatches(row.componente,comp,row.modalidade))return false;
        if(!ignoreEdicao&&ed&&row.edicao!==ed)return false;
        if(typeof window.somIsSpecificAgent==='function'&&window.somIsSpecificAgent(agente)&&window.somRowAgent(row)!==agente)return false;
        if(priorityOnly&&typeof window.priorityMatchesContext==='function'&&!window.priorityMatchesContext(row.escola,ano,modalidade,row.cre))return false;
        if(!ignoreSearch&&q&&typeof window.somRecordText==='function'&&!window.somRecordText(row).includes(q))return false;
        return true;
      });
    };
  }

  if(typeof window.adrFilteredRows==='function'){
    window.adrFilteredRows=function({ignoreAdr=false,ignoreCre=false,onlyCurrentBase=false}={}){
      const mode=document.getElementById('adrMode')?.value||'individual';
      const ano=document.getElementById('adrAno')?.value||'';
      const comp=document.getElementById('adrComp')?.value||'';
      const adr=document.getElementById('adrSelect')?.value||'';
      const agente=document.getElementById('adrAgente')?.value||'';
      const q=typeof window.norm==='function'?window.norm(document.getElementById('adrSearch')?.value||''):String(document.getElementById('adrSearch')?.value||'').toLowerCase();
      const priorityOnly=document.getElementById('adrPriority')?.value==='sim';
      return (typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS)?ADR_ROWS:[]).filter(row=>{
        if(!rowInUniverse(row))return false;
        if(ano&&row.ano!==ano)return false;
        if(comp&&row.componente!==comp)return false;
        if(!ignoreAdr&&mode==='individual'&&adr&&row.adr!==adr)return false;
        if(typeof window.adrIsSpecificAgent==='function'&&window.adrIsSpecificAgent(agente)&&window.adrRowAgent(row)!==agente)return false;
        if(priorityOnly&&typeof window.priorityMatchesContext==='function'&&!window.priorityMatchesContext(row.escola,ano,'ADR',row.regional))return false;
        if(q){
          const text=typeof window.norm==='function'?window.norm(`${row.escola} ${row.regional} ${window.adrRowAgent(row)} ${window.adrRowTerritorio(row)} ${row.adr} ${row.ano} ${row.componente} ${row.fonte} ${typeof window.prioritySearchText==='function'?window.prioritySearchText(row.escola,row.regional):''}`):'';
          if(!text.includes(q))return false;
        }
        if(typeof window.adrMatchesEvolution==='function'&&!window.adrMatchesEvolution(row))return false;
        return true;
      });
    };
  }

  const previousSomRefresh=typeof window.somRefreshSelectors==='function'?window.somRefreshSelectors:null;
  if(previousSomRefresh){
    window.somRefreshSelectors=function(){
      forceHiddenCreSelectors();
      previousSomRefresh();
      forceHiddenCreSelectors();
    };
  }
  const previousAdrRefresh=typeof window.adrRefreshSelectors==='function'?window.adrRefreshSelectors:null;
  if(previousAdrRefresh){
    window.adrRefreshSelectors=function(){
      forceHiddenCreSelectors();
      previousAdrRefresh();
      forceHiddenCreSelectors();
    };
  }

  function updateIdebScopeMessage(){
    const modality=document.getElementById('somModalidade')?.value;
    if(modality!=='IDEB 2025')return;
    const segment=document.getElementById('somAnoEscolar')?.value||'IDEB';
    const scopeLabel=scopeSelect()?.selectedOptions?.[0]?.textContent||'Toda a SME';
    const subtitle=document.getElementById('somCreSubtitle');
    if(subtitle)subtitle.textContent=`${segment} · universo: ${scopeLabel}. Todos os demais filtros atuam somente dentro deste recorte.`;
  }

  function refreshUniverse(){
    forceHiddenCreSelectors();
    if(typeof window.somRefreshSelectors==='function')window.somRefreshSelectors();
    if(typeof window.adrRefreshSelectors==='function')window.adrRefreshSelectors();
    forceHiddenCreSelectors();
    if(typeof window.renderResultados==='function')window.renderResultados();
    if(typeof window.renderADRs==='function')window.renderADRs();
    updateIdebScopeMessage();
  }

  function install(){
    const select=scopeSelect();
    if(!select)return;
    select.addEventListener('change',()=>setTimeout(refreshUniverse,70));
    ['somModalidade','somAnoEscolar','somComponente','somEdicao','somAgente','somMetric','somPriority'].forEach(id=>{
      document.getElementById(id)?.addEventListener('change',()=>setTimeout(updateIdebScopeMessage,30));
    });
    setTimeout(refreshUniverse,220);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
