
(function(){
  'use strict';
  const modal=()=>document.getElementById('somModalidade');
  const year=()=>document.getElementById('somAnoEscolar');
  const metric=()=>document.getElementById('somMetric');
  const comp=()=>document.getElementById('somComponente');
  const isSim=()=>modal()?.value==='Simulado 2026';
  const isStandardized=()=>isSim()&&(year()?.value==='4º ano'||year()?.value==='8º ano')&&metric()?.value==='notaPadronizada';

  function ensureSimComponent(){
    const el=comp(); if(!el) return;
    if(!isSim()){
      el.classList.remove('v300-simulado-component');
      return;
    }
    const previous=['LP','MT'].includes(el.value)?el.value:(['LP','MT'].includes(el.dataset.v300LastComponent)?el.dataset.v300LastComponent:'LP');
    const labels={LP:'Língua Portuguesa',MT:'Matemática'};
    const current=[...el.options].filter(o=>['LP','MT'].includes(o.value));
    if(current.length!==2 || current.some(o=>o.textContent!==labels[o.value])){
      el.innerHTML='<option value="LP">Língua Portuguesa</option><option value="MT">Matemática</option>';
    }
    el.disabled=false;
    el.removeAttribute('disabled');
    el.removeAttribute('aria-disabled');
    el.classList.remove('v299-standardized-disabled');
    el.classList.add('v300-simulado-component');
    el.value=previous;
    el.dataset.v300LastComponent=el.value;
    el.title=isStandardized()
      ? 'A escolha LP/MT define habilidades e níveis exibidos. O ranking de Nota Padronizada continua calculado pela combinação de Língua Portuguesa e Matemática.'
      : 'Selecione o componente curricular para a leitura pedagógica do Simulado 2026.';
  }

  function updateSkillSubtitle(){
    if(!isStandardized()) return;
    const sub=document.getElementById('somSkillSubtitle');
    if(!sub) return;
    const c=comp()?.value==='MT'?'Matemática':'Língua Portuguesa';
    const scope=Number(document.getElementById('regionalScopeSelect')?.value||0);
    const agent=document.getElementById('somAgente')?.value||'';
    const q=String(document.getElementById('somSearch')?.value||'').trim();
    const scopeLabel=q?`Busca: ${q}`:(typeof window.somIsSpecificAgent==='function'&&window.somIsSpecificAgent(agent))?`Agente: ${agent}`:scope?`CRE ${String(scope).padStart(2,'0')}`:'Toda a SME';
    sub.textContent=`${scopeLabel}. Habilidades de ${c}; o ranking de Nota Padronizada acima permanece combinado entre LP e MT.`;
  }

  // A lógica-base da v299 já calcula Nota Padronizada com somFilteredRows({ignoreComp:true}).
  // Aqui apenas preservamos o seletor LP/MT para a leitura pedagógica.
  const previousRender=window.renderResultados;
  if(typeof previousRender==='function'){
    window.renderResultados=function(){
      ensureSimComponent();
      const result=previousRender.apply(this,arguments);
      ensureSimComponent();
      updateSkillSubtitle();
      return result;
    };
    try{renderResultados=window.renderResultados}catch(_){ }
  }

  const previousRefresh=window.somRefreshSelectors;
  if(typeof previousRefresh==='function'){
    window.somRefreshSelectors=function(){
      const remembered=isSim()&&['LP','MT'].includes(comp()?.value)?comp().value:'';
      const result=previousRefresh.apply(this,arguments);
      if(isSim()){
        if(remembered) comp().dataset.v300LastComponent=remembered;
        ensureSimComponent();
      }
      return result;
    };
    try{somRefreshSelectors=window.somRefreshSelectors}catch(_){ }
  }

  const previousAdjust=window.somAdjustMetricOptions;
  if(typeof previousAdjust==='function'){
    window.somAdjustMetricOptions=function(){
      const result=previousAdjust.apply(this,arguments);
      ensureSimComponent();
      return result;
    };
    try{somAdjustMetricOptions=window.somAdjustMetricOptions}catch(_){ }
  }

  document.addEventListener('change',event=>{
    const id=event.target?.id;
    if(id==='somComponente'&&isSim()){
      if(['LP','MT'].includes(event.target.value)) event.target.dataset.v300LastComponent=event.target.value;
      // O listener nativo carrega o bloco escolhido; o indicador padronizado permanece combinado.
      setTimeout(()=>{ensureSimComponent();updateSkillSubtitle();},0);
      return;
    }
    if(['somModalidade','somAnoEscolar','somMetric'].includes(id)){
      setTimeout(()=>{ensureSimComponent();updateSkillSubtitle();},0);
    }
  },true);

  function install(){
    ensureSimComponent();
    updateSkillSubtitle();
    const badge=document.getElementById('dashboardVersionBadge');if(badge)badge.textContent='v366';
    document.querySelectorAll('.gra-start-version,.exp-badge').forEach(el=>{if(/^v?\d+/i.test(el.textContent||''))el.textContent='v366'});
    window.__GRA_V300_SIM_COMPONENT__={
      version:'v363',
      behavior:'Simulado 2026: LP/MT seleciona habilidades e níveis; Nota Padronizada mantém cálculo LP+MT.',
      get component(){return comp()?.value||'';},
      get standardized(){return isStandardized();}
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
