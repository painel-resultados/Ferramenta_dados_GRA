
(function(){
  'use strict';
  const nonComparable=new Set(['CH']);
  const clean=v=>String(v||'').trim();
  const canProgress=function(comp,ano){
    comp=clean(comp);ano=clean(ano);
    if(nonComparable.has(comp))return false;
    try{
      const rows=(typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS))?ADR_ROWS:(Array.isArray(window.ADR_ROWS)?window.ADR_ROWS:[]);
      const editions=new Set(rows.filter(r=>(!ano||clean(r.ano)===ano)&&clean(r.componente)===comp).map(r=>clean(r.adr)).filter(Boolean));
      return editions.size>=2;
    }catch(_){return false;}
  };
  window.v246AdrCanProgress=canProgress;
  function sync(){
    const mode=document.getElementById('adrMode'),comp=document.getElementById('adrComp'),ano=document.getElementById('adrAno');
    if(!mode||!comp)return;
    const ok=canProgress(comp.value,ano?.value||'');
    const opt=[...mode.options].find(o=>o.value==='progressao');
    if(opt){opt.disabled=!ok;opt.hidden=!ok;}
    if(!ok&&mode.value==='progressao'){
      mode.value='individual';
      const adrSel=document.getElementById('adrSelect');if(adrSel)adrSel.disabled=false;
    }
    mode.title=ok?'':'Progressão indisponível: este componente não possui duas ADRs diretamente comparáveis.';
  }
  const oldRefresh=window.adrRefreshSelectors;
  if(typeof oldRefresh==='function'){
    window.adrRefreshSelectors=function(){const r=oldRefresh.apply(this,arguments);sync();return r;};
    try{adrRefreshSelectors=window.adrRefreshSelectors;}catch(_){}
  }
  const oldRender=window.renderADRs;
  if(typeof oldRender==='function'){
    window.renderADRs=function(){sync();return oldRender.apply(this,arguments);};
    try{renderADRs=window.renderADRs;}catch(_){}
  }
  ['adrAno','adrComp'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(sync,0)));
  setTimeout(()=>{sync();try{window.adrRefreshSelectors?.();window.renderADRs?.();}catch(e){console.warn('v246 ADR guard',e);}},0);
})();
