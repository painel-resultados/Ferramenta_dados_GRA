
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const isSim=()=>byId('somModalidade')?.value==='Simulado 2026';
  const year=()=>byId('somAnoEscolar')?.value||'';
  const isDual=()=>isSim()&&(year()==='4º ano'||year()==='8º ano');
  const fmtNum=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
  const fmtPct=v=>Number.isFinite(Number(v))?`${fmtNum(v,1)}%`:'—';
  const safe=s=>typeof window.esc==='function'?window.esc(String(s??'')):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function syncSimMode(){
    const mode=byId('somMode'); if(!mode)return;
    if(isSim()){
      if(mode.value!=='individual')mode.value='individual';
      mode.hidden=true;
      mode.style.display='none';
      mode.setAttribute('aria-hidden','true');
      const card=byId('somProgressCard');if(card)card.classList.remove('open');
    }else{
      mode.hidden=false;
      mode.style.removeProperty('display');
      mode.removeAttribute('aria-hidden');
    }
  }

  function allScopeRows(){
    try{return typeof window.somFilteredRows==='function'?window.somFilteredRows({ignoreComp:true}):somFilteredRows({ignoreComp:true});}
    catch(_){return [];}
  }

  function componentRows(rows,component){return (rows||[]).filter(r=>r?.modalidade==='Simulado 2026'&&r.anoEscolar===year()&&r.componente===component);}

  function weighted(rows,key){
    let sv=0,sw=0;
    for(const r of rows||[]){
      const v=Number(r?.[key]),w=Number(r?.avaliados)||0;
      if(Number.isFinite(v)&&w>0){sv+=v*w;sw+=w;}
    }
    return sw?sv/sw:null;
  }

  function componentMetric(rows,component,key){
    try{
      if(typeof window.sim2026ScopeIsUnfiltered==='function'&&window.sim2026ScopeIsUnfiltered()&&typeof window.sim2026OfficialRows==='function'){
        const official=window.sim2026OfficialRows(year(),component);
        const fn=typeof window.sim2026Weighted==='function'?window.sim2026Weighted:weighted;
        const v=fn(official,key); if(Number.isFinite(Number(v)))return Number(v);
      }
    }catch(_){ }
    return weighted(componentRows(rows,component),key);
  }

  function combinedNp(rows){
    try{
      if(typeof window.sim2026ScopeIsUnfiltered==='function'&&window.sim2026ScopeIsUnfiltered()&&typeof window.sim2026OfficialMetric==='function'){
        const v=window.sim2026OfficialMetric('notaPadronizada',year(),'');
        if(Number.isFinite(Number(v)))return Number(v);
      }
    }catch(_){ }
    const map=new Map();
    for(const r of rows||[]){
      if(!r?.escola||!['LP','MT'].includes(r.componente))continue;
      const key=`${r.cre||''}|${r.escola}`.toLocaleLowerCase('pt-BR');
      if(!map.has(key))map.set(key,{});
      map.get(key)[r.componente]=r;
    }
    const values=[];
    map.forEach(g=>{
      const a=Number(g.LP?.notaPadronizadaComponente??g.LP?.notaPadronizada);
      const b=Number(g.MT?.notaPadronizadaComponente??g.MT?.notaPadronizada);
      if(Number.isFinite(a)&&Number.isFinite(b))values.push((a+b)/2);
    });
    return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
  }

  function scopeLabel(rows){
    const q=String(byId('somSearch')?.value||'').trim();
    const agent=byId('somAgente')?.value||'';
    const scope=Number(byId('regionalScopeSelect')?.value||0);
    let specificAgent=false;
    try{specificAgent=typeof window.somIsSpecificAgent==='function'&&window.somIsSpecificAgent(agent);}catch(_){ }
    if(q)return `Busca: ${q}`;
    if(specificAgent)return `Agente: ${agent}`;
    if(scope)return `CRE ${String(scope).padStart(2,'0')}`;
    return 'Toda a SME';
  }

  function skillData(rows,component){
    let current=[],network=[];
    try{
      if(typeof window.sim2026ScopeSkills==='function')current=window.sim2026ScopeSkills(rows||[],year(),component)||[];
      if(typeof window.sim2026NetworkSkills==='function')network=window.sim2026NetworkSkills(year(),component)||[];
    }catch(_){ }
    current=current.slice().sort((a,b)=>a.value-b.value||String(a.h).localeCompare(String(b.h),'pt-BR')).slice(0,5);
    const networkMap=new Map(network.map(x=>[x.h,Number(x.value)]));
    return current.map(item=>{
      const ref=networkMap.get(item.h);
      const delta=Number.isFinite(ref)?Number(item.value)-ref:null;
      let meta={};
      try{meta=(typeof SIMULADO2026_SKILL_META!=='undefined'?SIMULADO2026_SKILL_META:{})[`${year()}|${component}|${item.h}`]||{};}catch(_){ }
      return {...item,ref,delta,meta};
    });
  }

  function skillHtml(item){
    const code=item.meta?.codigo?`${item.h} · ${item.meta.codigo}`:item.h;
    const desc=item.meta?.descricao||item.description||'';
    const value=Number(item.value);
    const width=Math.max(3,Math.min(100,Number.isFinite(value)?value:0));
    const delta=Number(item.delta);
    const deltaText=Number.isFinite(delta)?`${delta>0?'+':''}${fmtNum(delta,1)} p.p.`:'—';
    const cls=Number.isFinite(delta)?(delta<0?'neg':'pos'):'';
    return `<div class="v301-skill" title="${safe(`${code} — ${desc}`)}"><div class="v301-skill-top"><span class="v301-skill-code">${safe(code)}</span><span class="v301-skill-value">${safe(fmtPct(value))}</span></div><div class="v301-skill-desc">${safe(desc)}</div><div class="v301-skill-meter" aria-hidden="true"><i style="width:${width.toFixed(1)}%"></i></div><div class="v301-skill-ref">Rede: <b>${safe(Number.isFinite(item.ref)?fmtPct(item.ref):'—')}</b> · Dif.: <b class="${cls}">${safe(deltaText)}</b></div></div>`;
  }

  function componentColumn(rows,component,label){
    const note=componentMetric(rows,component,'notaPadronizadaComponente');
    const prof=componentMetric(rows,component,'proficiencia');
    const skills=skillData(rows,component);
    return `<section class="v301-comp-column" data-v301-component="${component}"><div class="v301-comp-head"><h4>${safe(label)}</h4><div class="v301-comp-metrics"><div class="v301-comp-metric"><span>Nota padronizada</span><b>${safe(fmtNum(note,1))}</b></div><div class="v301-comp-metric"><span>Proficiência média</span><b>${safe(fmtNum(prof,1))}</b></div></div></div><div class="v301-skill-list">${skills.length?skills.map(skillHtml).join(''):'<div class="v301-empty">Sem habilidades disponíveis neste recorte.</div>'}</div></section>`;
  }

  function renderDual(){
    const card=byId('somSkillCard'),target=byId('somSkillBars'),title=byId('somSkillTitle'),subtitle=byId('somSkillSubtitle');
    if(!card||!target)return false;
    const outer=card.parentElement;
    if(!isDual()){
      card.classList.remove('v301-sim-dual-card');
      outer?.classList.remove('v301-sim-dual-outer');
      return false;
    }
    const rows=allScopeRows();
    const np=combinedNp(rows);
    const schools=new Set(rows.filter(r=>r?.escola).map(r=>`${r.cre||''}|${r.escola}`)).size;
    const label=scopeLabel(rows);
    card.classList.remove('is-hidden');
    card.classList.add('v301-sim-dual-card');
    outer?.classList.add('v301-sim-dual-outer');
    if(title)title.textContent='Simulado 2026 — Língua Portuguesa × Matemática';
    if(subtitle)subtitle.textContent=`${label}. Nota Padronizada combinada acima; notas, proficiências e 5 habilidades mais desafiadoras de cada componente abaixo.`;
    target.innerHTML=`<div class="v301-sim-summary"><div class="v301-np-hero"><div><small>${safe(label)} · ${schools.toLocaleString('pt-BR')} escola${schools===1?'':'s'} no recorte</small><strong>Nota Padronizada — LP + MT</strong></div><div class="v301-np-value">${safe(fmtNum(np,1))}</div></div><div class="v301-dual-grid">${componentColumn(rows,'LP','Língua Portuguesa')}${componentColumn(rows,'MT','Matemática')}</div></div>`;
    return true;
  }

  const oldSkills=window.renderSomSkills;
  if(typeof oldSkills==='function'&&!oldSkills.__v301){
    const wrapped=function(rows){if(isDual())return renderDual();return oldSkills.apply(this,arguments);};
    wrapped.__v301=true;wrapped.__native=oldSkills;window.renderSomSkills=wrapped;
    try{renderSomSkills=wrapped}catch(_){ }
  }

  function restoreDualHeader(){
    if(!isDual())return;
    const title=byId('somSkillTitle'),subtitle=byId('somSkillSubtitle');
    const rows=allScopeRows();
    if(title)title.textContent='Simulado 2026 — Língua Portuguesa × Matemática';
    if(subtitle)subtitle.textContent=`${scopeLabel(rows)}. Nota Padronizada combinada acima; notas, proficiências e 5 habilidades mais desafiadoras de cada componente abaixo.`;
  }

  const oldRender=window.renderResultados;
  if(typeof oldRender==='function'&&!oldRender.__v301){
    const wrapped=function(){
      syncSimMode();
      const result=oldRender.apply(this,arguments);
      syncSimMode();
      restoreDualHeader();
      return result;
    };
    wrapped.__v301=true;wrapped.__native=oldRender;window.renderResultados=wrapped;
    try{renderResultados=wrapped}catch(_){ }
  }

  const oldProgress=window.renderSomProgress;
  if(typeof oldProgress==='function'&&!oldProgress.__v301){
    const wrapped=function(){if(isSim()){const card=byId('somProgressCard');if(card)card.classList.remove('open');return;}return oldProgress.apply(this,arguments);};
    wrapped.__v301=true;wrapped.__native=oldProgress;window.renderSomProgress=wrapped;
    try{renderSomProgress=wrapped}catch(_){ }
  }

  const oldRefresh=window.somRefreshSelectors;
  if(typeof oldRefresh==='function'&&!oldRefresh.__v301){
    const wrapped=function(){const r=oldRefresh.apply(this,arguments);syncSimMode();return r;};
    wrapped.__v301=true;wrapped.__native=oldRefresh;window.somRefreshSelectors=wrapped;
    try{somRefreshSelectors=wrapped}catch(_){ }
  }

  document.addEventListener('change',event=>{
    if(event.target?.id==='somModalidade')syncSimMode();
    if(isSim()&&event.target?.id==='somMode'&&event.target.value==='progressao'){
      event.target.value='individual';event.stopImmediatePropagation();
    }
    if(['somModalidade','somAnoEscolar','somMetric','somComponente','somAgente','somPriority','regionalScopeSelect'].includes(event.target?.id))setTimeout(()=>{syncSimMode();if(isDual())renderDual();},0);
  },true);
  document.addEventListener('input',event=>{if(event.target?.id==='somSearch'&&isDual())setTimeout(renderDual,80);},true);

  function install(){
    syncSimMode();
    if(isDual())renderDual();
    const badge=byId('dashboardVersionBadge');if(badge)badge.textContent='v366';
    document.querySelectorAll('.gra-start-version,.exp-badge').forEach(el=>{if(/^v?\d+/i.test(el.textContent||''))el.textContent='v366'});
    window.__GRA_V301_SIM_DUAL__={version:'v363',behavior:'Simulado 2026 4º/8º: Nota Padronizada combinada + LP/MT lado a lado; Progressão removida do filtro.'};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
