
(function(){
  'use strict';
  const escText=v=>String(v??'').trim();
  function uniqueSchool(rows){
    const map=new Map();
    (rows||[]).forEach(r=>{
      if(!r||r._afCreAggregate) return;
      const name=escText(r.escola||r.unidade||r.school);
      if(!name) return;
      const key=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
      if(!map.has(key)) map.set(key,{name,row:r});
    });
    return map.size===1 ? [...map.values()][0] : null;
  }
  function regionLabel(row){
    const raw=escText(row?.regional||row?.cre||row?.CRE);
    if(!raw) return '';
    const m=raw.match(/(\d{1,2})/);
    return m ? `${Number(m[1])}ª CRE` : raw;
  }
  function ensureBanner(anchorId,bannerId){
    let banner=document.getElementById(bannerId);
    if(banner) return banner;
    const anchor=document.getElementById(anchorId);
    if(!anchor) return null;
    banner=document.createElement('div');
    banner.id=bannerId;
    banner.className='school-focus-banner';
    banner.hidden=true;
    banner.setAttribute('role','status');
    banner.setAttribute('aria-live','polite');
    banner.innerHTML='<span class="school-focus-kicker">Escola selecionada</span><div class="school-focus-copy"><div class="school-focus-mainline"><strong class="school-focus-name"></strong><span class="v363-priority-badge" hidden>Priorizada no segmento</span></div><span class="school-focus-meta"></span></div>';
    anchor.insertAdjacentElement('afterend',banner);
    return banner;
  }
  function paint(banner,item){
    if(!banner) return;
    const name=banner.querySelector('.school-focus-name');
    const meta=banner.querySelector('.school-focus-meta');
    const priorityBadge=banner.querySelector('.v363-priority-badge');
    if(!item){
      banner.hidden=true;
      if(name) name.textContent='';
      if(meta) meta.textContent='';
      if(priorityBadge) priorityBadge.hidden=true;
      return;
    }
    const region=regionLabel(item.row);
    if(name) name.textContent=item.name;
    if(meta) meta.textContent=(region?region+' · ':'')+'Todos os indicadores e gráficos abaixo respeitam o recorte desta escola.';
    if(priorityBadge){
      let prioritized=false;
      if(banner.id==='somSelectedSchoolBanner'&&(document.getElementById('somModalidade')?.value||'')==='Simulado 2026'){
        const schoolYear=document.getElementById('somAnoEscolar')?.value||'';
        const cre=item.row?.cre||item.row?.regional||'';
        try{prioritized=typeof window.priorityMatchesContext==='function'&&window.priorityMatchesContext(item.name,schoolYear,'Simulado 2026',cre);}catch(_){prioritized=false;}
      }
      priorityBadge.hidden=!prioritized;
    }
    banner.hidden=false;
  }
  function somRows(){
    try{
      if(typeof window.somFilteredRows==='function') return window.somFilteredRows()||[];
      if(typeof somFilteredRows==='function') return somFilteredRows()||[];
    }catch(_){ }
    return [];
  }
  function adrRows(){
    try{
      const mode=document.getElementById('adrMode')?.value||'individual';
      if(typeof window.adrFilteredRows==='function') return window.adrFilteredRows({ignoreAdr:mode==='progressao'})||[];
      if(typeof adrFilteredRows==='function') return adrFilteredRows({ignoreAdr:mode==='progressao'})||[];
    }catch(_){ }
    return [];
  }
  function updateSom(){ paint(ensureBanner('somKpis','somSelectedSchoolBanner'),uniqueSchool(somRows())); }
  function updateAdr(){ paint(ensureBanner('adrKpis','adrSelectedSchoolBanner'),uniqueSchool(adrRows())); }
  function updateAll(){ updateSom(); updateAdr(); }
  function install(){
    ensureBanner('somKpis','somSelectedSchoolBanner');
    ensureBanner('adrKpis','adrSelectedSchoolBanner');
    const watchIds=['somPieLegend','somMainChart','somTable','adrPieLegend','adrSchoolBars','adrTable'];
    const observer=new MutationObserver(()=>queueMicrotask(updateAll));
    watchIds.forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,subtree:true,characterData:true});});
    document.addEventListener('input',e=>{
      if(['somSearch','adrSearch'].includes(e.target?.id)) setTimeout(updateAll,0);
    },true);
    document.addEventListener('change',e=>{
      const id=e.target?.id||'';
      if(id.startsWith('som')||id.startsWith('adr')||id==='regionalScopeSelect') setTimeout(updateAll,0);
    },true);
    setTimeout(updateAll,0);
    setTimeout(updateAll,350);
    window.__GRA_V304_SCHOOL_CONTEXT__={version:'v363',update:updateAll};
  }
  function stamp(){
    const badge=document.getElementById('dashboardVersionBadge');if(badge)badge.textContent='v366';
    document.querySelectorAll('.gra-start-version,.exp-badge').forEach(el=>{if(/^v?\d+/i.test(el.textContent||''))el.textContent='v366';});
    document.title=document.title.replace(/\bv30[234]\b/ig,'v318');
  }
  function boot(){
    stamp();install();
    setTimeout(stamp,0);setTimeout(stamp,500);setTimeout(stamp,1800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
