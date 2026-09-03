
(function(){
  'use strict';
  const NAME='Ferramenta GRA de análise de dados';
  const VERSION='v366';
  const scope=()=>document.getElementById('regionalScopeSelect')?.selectedOptions?.[0]?.textContent?.trim()||'Toda a SME';
  function syncIdentity(){
    const brand=document.querySelector('.brand-title h1');
    if(brand&&brand.textContent.trim()!==NAME)brand.textContent=NAME;
    const small=document.querySelector('.brand-title small');
    if(small&&small.textContent.trim()!==scope())small.textContent=scope();
    const badge=document.getElementById('dashboardVersionBadge');
    if(badge&&badge.textContent.trim()!==VERSION)badge.textContent=VERSION;
    document.querySelectorAll('.exp-badge').forEach(item=>{if(item.textContent.trim()!==VERSION)item.textContent=VERSION;});
    document.title=NAME+' — '+scope();
  }
  function install(){
    syncIdentity();
    document.getElementById('regionalScopeSelect')?.addEventListener('change',()=>setTimeout(syncIdentity,0));
    const brand=document.querySelector('.brand-title');
    if(brand)new MutationObserver(syncIdentity).observe(brand,{childList:true,characterData:true,subtree:true});
    const topbar=document.querySelector('.topbar .title');
    if(topbar)new MutationObserver(()=>setTimeout(syncIdentity,0)).observe(topbar,{childList:true,characterData:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
