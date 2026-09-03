
(function(){'use strict';
  const VERSION='v367';
  function stamp(){
    document.documentElement.dataset.graVersion=VERSION;
    const badge=document.getElementById('dashboardVersionBadge');
    if(badge && badge.textContent!==VERSION) badge.textContent=VERSION;
    document.querySelectorAll('.gra-start-version,.exp-badge,.gra-access-version').forEach(el=>{
      if(/^v?\d+/i.test(el.textContent||'') && el.textContent!==VERSION) el.textContent=VERSION;
    });
  }
  function applySomMainGridLayout(){
    const mainChart=document.getElementById('somMainChart');
    if(!mainChart) return;
    const grid=mainChart.closest('.grid.two-col');
    if(!grid) return;
    grid.classList.add('v367-som-main-grid');
    const skillCard=document.getElementById('somSkillCard');
    const hidden=!!skillCard && (skillCard.classList.contains('is-hidden') || getComputedStyle(skillCard).display==='none' || skillCard.hidden);
    grid.classList.toggle('v367-skill-hidden', hidden);
  }
  function boot(){
    stamp();
    applySomMainGridLayout();
    const results=document.getElementById('resultados');
    if(results){
      new MutationObserver(()=>setTimeout(applySomMainGridLayout,0)).observe(results,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
    }
    document.addEventListener('change',e=>{const id=e.target&&e.target.id||''; if(id.startsWith('som')||id==='regionalScopeSelect') setTimeout(applySomMainGridLayout,0);},true);
    [0,250,900,1800,2800].forEach(ms=>setTimeout(()=>{stamp();applySomMainGridLayout();},ms));
    window.__GRA_V367__={version:VERSION,feature:'Expande horizontalmente o ranking somativo e elimina a coluna vazia quando o cartão de habilidades está oculto.'};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
