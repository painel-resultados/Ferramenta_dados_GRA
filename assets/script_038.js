
(function(){
  'use strict';
  const YEARS=['2º ano','4º ano','8º ano'];
  const yearEl=()=>document.getElementById('somAnoEscolar');
  const modalEl=()=>document.getElementById('somModalidade');
  const editionEl=()=>document.getElementById('somEdicao');
  const compEl=()=>document.getElementById('somComponente');
  const metricEl=()=>document.getElementById('somMetric');
  const isSim=()=>modalEl()?.value==='Simulado 2026';

  function ensureYearOptions(preferred=''){
    const el=yearEl(); if(!el||!isSim()) return;
    const wanted=YEARS.includes(preferred)?preferred:(YEARS.includes(el.value)?el.value:'2º ano');
    const signature=[...el.options].map(o=>o.value).filter(Boolean).join('|');
    if(signature!==YEARS.join('|')){
      el.innerHTML=YEARS.map(y=>`<option value="${y}">${y}</option>`).join('');
    }
    el.value=YEARS.includes(wanted)?wanted:'2º ano';
  }

  function syncEditionVisibility(){
    const ed=editionEl(); if(!ed) return;
    const wrapper=ed.closest('.v222-field-label')||ed.parentElement;
    if(isSim()){
      if([...ed.options].some(o=>o.value==='2026')) ed.value='2026';
      ed.hidden=true; ed.setAttribute('aria-hidden','true'); ed.tabIndex=-1;
      wrapper?.classList.add('v293-simulado-edition-hidden');
    }else{
      ed.hidden=false; ed.removeAttribute('aria-hidden'); ed.removeAttribute('tabindex');
      wrapper?.classList.remove('v293-simulado-edition-hidden');
    }
    if(typeof window.syncFieldVisibility==='function') try{window.syncFieldVisibility();}catch(_){ }
  }

  function syncMetricForYear(){
    if(!isSim()) return;
    const year=yearEl()?.value||'2º ano';
    if(year==='4º ano'||year==='8º ano'){
      if(typeof window.somAdjustMetricOptions==='function') window.somAdjustMetricOptions();
      const metric=metricEl(); if(metric&&[...metric.options].some(o=>o.value==='notaPadronizada')) metric.value='notaPadronizada';
    }
  }

  // Preserve the user's 4º/8º choice through the legacy selector refresh. The prior
  // refresh could fall back to 2º while the lazy block was still being materialized.
  const previousRefresh=window.somRefreshSelectors;
  if(typeof previousRefresh==='function'){
    window.somRefreshSelectors=function(){
      const requested=isSim()&&YEARS.includes(yearEl()?.value)?yearEl().value:'';
      const result=previousRefresh.apply(this,arguments);
      if(isSim()) ensureYearOptions(requested);
      syncEditionVisibility();
      syncMetricForYear();
      return result;
    };
    try{somRefreshSelectors=window.somRefreshSelectors;}catch(_){ }
  }

  async function loadSelectedYearAndRender(){
    if(!isSim()) { syncEditionVisibility(); return; }
    const year=YEARS.includes(yearEl()?.value)?yearEl().value:'2º ano';
    ensureYearOptions(year); syncEditionVisibility();
    const host=document.getElementById('somMainChart');
    if((year==='4º ano'||year==='8º ano')&&host) host.innerHTML='<div class="sim2026-loading">Carregando Língua Portuguesa e Matemática para calcular a Nota Padronizada…</div>';
    try{
      if(typeof window.sim2026EnsureYearForIndicator==='function'){
        const comp=['LP','MT'].includes(compEl()?.value)?compEl().value:'LP';
        await window.sim2026EnsureYearForIndicator(year,comp);
      }
      ensureYearOptions(year);
      if(typeof window.somAdjustMetricOptions==='function') window.somAdjustMetricOptions();
      syncMetricForYear(); syncEditionVisibility();
      if(typeof window.renderResultados==='function') window.renderResultados();
    }catch(err){
      console.error('Falha ao carregar o ano selecionado do Simulado 2026',err);
      if(host) host.innerHTML=`<div class="sim2026-loading">Não foi possível abrir ${year}.<br>${String(err?.message||err)}</div>`;
    }
  }

  function install(){
    ensureYearOptions(); syncEditionVisibility(); syncMetricForYear();
    modalEl()?.addEventListener('change',()=>setTimeout(()=>{ensureYearOptions();syncEditionVisibility();syncMetricForYear();},0));
    yearEl()?.addEventListener('change',()=>{const chosen=yearEl().value;setTimeout(()=>{ensureYearOptions(chosen);loadSelectedYearAndRender();},0);});
    // Also repair the selector after delayed/async legacy refreshes.
    const observer=new MutationObserver(()=>{if(isSim()) ensureYearOptions(yearEl()?.value||'');syncEditionVisibility();});
    if(yearEl()) observer.observe(yearEl(),{childList:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  window.v293EnsureSimuladoYears=ensureYearOptions;
  window.v293LoadSelectedSimuladoYear=loadSelectedYearAndRender;
})();
