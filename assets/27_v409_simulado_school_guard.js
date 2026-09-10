/*
 * GRA v409 — HARD REGRESSION GUARD: direct school search -> Simulado skills.
 *
 * CONTRACT (do not remove in future versions):
 * 1) Searching a school directly must resolve E.M. / EM / Escola Municipal aliases.
 * 2) For Simulado 2026, 4º/8º, a valid single-school search must keep the LP+MT
 *    skills card rendered even after later renderers, lazy loads, or navigation.
 * 3) This file is deliberately versioned in its filename so a deployment cannot
 *    silently reuse an older cached implementation of this regression fix.
 */
(function(){
  'use strict';

  const VERSION='v409';
  const $=id=>document.getElementById(id);
  const delay=(fn,ms=0)=>setTimeout(fn,ms);
  let scheduled=0, epoch=0;

  function fold(value){
    return String(value??'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().trim();
  }

  function schoolKey(value){
    return fold(value)
      .replace(/^\s*\d{5,}\s*[-–—:]?\s*/,'')
      .replace(/[._\-/]+/g,' ')
      .replace(/\bescola\s+municipal\b/g,' em ')
      .replace(/\be\s+m\b/g,' em ')
      .replace(/\bcreche\s+municipal\b/g,' cm ')
      .replace(/\bc\s+m\b/g,' cm ')
      .replace(/\bespaco\s+de\s+desenvolvimento\s+infantil\b/g,' edi ')
      .replace(/\bginasio\s+educacional\s+tecnologico\b/g,' get ')
      .replace(/[^a-z0-9]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function schoolNames(row){
    const out=[row?.escola,row?.escolaFonte];
    try{
      if(typeof window.somFindRecord==='function'){
        const rec=window.somFindRecord(row?.escola||row?.escolaFonte||'');
        if(rec){
          out.push(rec.unidade,rec.escola,rec.nome);
          if(Array.isArray(rec.aliases))out.push(...rec.aliases);
          if(Array.isArray(rec.somAliases))out.push(...rec.somAliases);
        }
      }
    }catch(_){ }
    return out.filter(Boolean);
  }

  function schoolMatches(row,query){
    const q=schoolKey(query);
    if(!q)return true;
    return schoolNames(row).some(name=>{
      const k=schoolKey(name);
      return !!k&&(k===q||k.includes(q)||q.includes(k));
    });
  }

  function isSimDual(){
    const y=$('somAnoEscolar')?.value||'';
    return $('somModalidade')?.value==='Simulado 2026'&&(y==='4º ano'||y==='8º ano');
  }

  function patchSearchMatcher(){
    const current=window.somSearchMatches;
    if(typeof current!=='function'||current.__graV409HardSchoolMatch)return;
    const base=current;
    const wrapped=function(row,query){
      try{if(base.apply(this,arguments))return true;}catch(_){ }
      return schoolMatches(row,query);
    };
    wrapped.__graV409HardSchoolMatch=true;
    wrapped.__native=base;
    window.somSearchMatches=wrapped;
    try{somSearchMatches=wrapped;}catch(_){ }
  }

  function patchFilteredRows(){
    const current=window.somFilteredRows;
    if(typeof current!=='function'||current.__graV409HardSchoolFilter)return;
    const base=current;
    const wrapped=function(options){
      const out=base.apply(this,arguments);
      const opts=options||{};
      const input=$('somSearch');
      const query=String(input?.value||'').trim();
      if(opts.ignoreSearch||!query||$('somModalidade')?.value!=='Simulado 2026'||(Array.isArray(out)&&out.length))return out;

      // Rigid fallback: preserve every other filter by asking the original function
      // for the same scope with an empty search, then apply only the canonical-school
      // comparison ourselves. This avoids duplicating CRE/agent/priority/access rules.
      if(!input)return out;
      const originalValue=input.value;
      let candidates=[];
      try{
        input.value='';
        candidates=base.apply(this,arguments);
      }catch(_){
        candidates=[];
      }finally{
        input.value=originalValue;
      }
      if(!Array.isArray(candidates)||!candidates.length)return out;
      const recovered=candidates.filter(row=>schoolMatches(row,query));
      return recovered.length?recovered:out;
    };
    wrapped.__graV409HardSchoolFilter=true;
    wrapped.__native=base;
    window.somFilteredRows=wrapped;
    try{somFilteredRows=wrapped;}catch(_){ }
  }

  function rowsForSchool(){
    let rows=[];
    try{rows=window.somFilteredRows?.({ignoreComp:true})||[];}catch(_){ }
    const query=String($('somSearch')?.value||'').trim();
    if(!query||rows.length)return rows;
    // Last-resort read-only recovery. Access restrictions are always respected.
    const y=$('somAnoEscolar')?.value||'';
    const scope=Number($('regionalScopeSelect')?.value||0);
    const agent=$('somAgente')?.value||'';
    const priorityOnly=$('somPriority')?.value==='sim';
    const source=Array.isArray(window.SOM_ROWS)?window.SOM_ROWS:(typeof SOM_ROWS!=='undefined'&&Array.isArray(SOM_ROWS)?SOM_ROWS:[]);
    return source.filter(row=>{
      if(row?.modalidade!=='Simulado 2026'||row?.anoEscolar!==y)return false;
      if(typeof window.graMasterAllowsRow==='function'&&!window.graMasterAllowsRow(row))return false;
      if(scope){const m=String(row.cre||row.regional||'').match(/\d+/);if(!m||Number(m[0])!==scope)return false;}
      try{if(typeof window.somIsSpecificAgent==='function'&&window.somIsSpecificAgent(agent)&&window.somRowAgent?.(row)!==agent)return false;}catch(_){ }
      try{if(priorityOnly&&typeof window.priorityMatchesContext==='function'&&!window.priorityMatchesContext(row.escola,y,'Simulado 2026',row.cre))return false;}catch(_){ }
      return schoolMatches(row,query);
    });
  }

  function aggregateSkills(rows,component){
    try{
      if(typeof window.sim2026SkillAggregate==='function')return window.sim2026SkillAggregate(rows,component)||[];
    }catch(_){ }
    const map=new Map();
    for(const row of rows||[]){
      if(row?.componente!==component)continue;
      for(const skill of row?.habilidades||[]){
        const raw=skill?.valor;
        if(raw===null||raw===undefined||/^\s*[-–—]?\s*$/.test(String(raw)))continue;
        const value=Number(raw);if(!Number.isFinite(value))continue;
        const m=String(skill.posicao||skill.codigo||'').match(/H\s*0?(\d+)/i);if(!m)continue;
        const h=`H${String(Number(m[1])).padStart(2,'0')}`;
        if(!map.has(h))map.set(h,{h,sv:0,sw:0,description:skill.descricao||''});
        const item=map.get(h),w=Number(row.avaliados)>0?Number(row.avaliados):1;
        item.sv+=value*w;item.sw+=w;if(!item.description)item.description=skill.descricao||'';
      }
    }
    return [...map.values()].map(x=>({...x,value:x.sw?x.sv/x.sw:NaN})).filter(x=>Number.isFinite(x.value));
  }

  function weighted(rows,key){
    let sv=0,sw=0;
    for(const row of rows||[]){const v=Number(row?.[key]),w=Number(row?.avaliados)||0;if(Number.isFinite(v)&&w>0){sv+=v*w;sw+=w;}}
    return sw?sv/sw:null;
  }

  function fmtNum(v,d=1){return Number.isFinite(Number(v))?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';}
  function fmtPct(v){return Number.isFinite(Number(v))?`${fmtNum(v,1)}%`:'—';}
  function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  function skillMeta(year,component,h){
    try{return (typeof SIMULADO2026_SKILL_META!=='undefined'?SIMULADO2026_SKILL_META:{})[`${year}|${component}|${h}`]||{};}catch(_){return {};}
  }

  function skillItems(rows,component){
    const y=$('somAnoEscolar')?.value||'';
    const local=aggregateSkills(rows,component).sort((a,b)=>a.value-b.value||String(a.h).localeCompare(String(b.h),'pt-BR')).slice(0,5);
    let network=[];try{network=window.sim2026NetworkSkills?.(y,component)||[];}catch(_){ }
    const networkMap=new Map(network.map(x=>[x.h,Number(x.value)]));
    return local.map(item=>({...item,ref:networkMap.get(item.h),meta:skillMeta(y,component,item.h)}));
  }

  function fallbackRender(rows){
    const card=$('somSkillCard'),target=$('somSkillBars'),title=$('somSkillTitle'),subtitle=$('somSkillSubtitle');
    if(!card||!target||!rows?.length)return false;
    const y=$('somAnoEscolar')?.value||'';
    const query=String($('somSearch')?.value||'').trim();
    const school=rows.find(r=>r?.escola)?.escola||query;
    const allLp=rows.filter(r=>r.componente==='LP'),allMt=rows.filter(r=>r.componente==='MT');
    const lp=skillItems(rows,'LP'),mt=skillItems(rows,'MT');
    if(!lp.length&&!mt.length)return false;

    const compHtml=(component,label,list,compRows)=>{
      const note=weighted(compRows,'notaPadronizadaComponente');
      const prof=weighted(compRows,'proficiencia');
      const skills=list.map(item=>{
        const code=item.meta?.codigo?`${item.h} · ${item.meta.codigo}`:item.h;
        const desc=item.meta?.descricao||item.description||'';
        const delta=Number.isFinite(Number(item.ref))?Number(item.value)-Number(item.ref):null;
        const deltaText=Number.isFinite(delta)?`${delta>0?'+':''}${fmtNum(delta,1)} p.p.`:'—';
        return `<div class="v301-skill" title="${esc(code+' — '+desc)}"><div class="v301-skill-top"><span class="v301-skill-code">${esc(code)}</span><span class="v301-skill-value">${esc(fmtPct(item.value))}</span></div><div class="v301-skill-desc">${esc(desc)}</div><div class="v301-skill-meter" aria-hidden="true"><i style="width:${Math.max(3,Math.min(100,Number(item.value)||0)).toFixed(1)}%"></i></div><div class="v301-skill-ref">Rede: <b>${esc(fmtPct(item.ref))}</b> · Dif.: <b class="${Number.isFinite(delta)&&(delta<0)?'neg':'pos'}">${esc(deltaText)}</b></div></div>`;
      }).join('');
      return `<section class="v301-comp-column" data-v301-component="${component}"><div class="v301-comp-head"><h4>${esc(label)}</h4><div class="v301-comp-metrics"><div class="v301-comp-metric"><span>Nota padronizada</span><b>${esc(fmtNum(note,1))}</b></div><div class="v301-comp-metric"><span>Proficiência média</span><b>${esc(fmtNum(prof,1))}</b></div></div></div><div class="v301-skill-list">${skills}</div></section>`;
    };
    const npVals=[];
    const bySchool=new Map();
    for(const row of rows){const k=schoolKey(row.escola||row.escolaFonte);if(!k)continue;if(!bySchool.has(k))bySchool.set(k,{});bySchool.get(k)[row.componente]=row;}
    bySchool.forEach(g=>{const a=Number(g.LP?.notaPadronizadaComponente??g.LP?.notaPadronizada),b=Number(g.MT?.notaPadronizadaComponente??g.MT?.notaPadronizada);if(Number.isFinite(a)&&Number.isFinite(b))npVals.push((a+b)/2);});
    const np=npVals.length?npVals.reduce((a,b)=>a+b,0)/npVals.length:null;
    card.classList.remove('is-hidden');card.hidden=false;card.classList.add('v301-sim-dual-card');
    if(title)title.textContent='Simulado 2026 — Língua Portuguesa × Matemática';
    if(subtitle)subtitle.textContent=`Escola: ${school}. Nota Padronizada combinada acima; notas, proficiências e 5 habilidades mais desafiadoras de cada componente abaixo.`;
    target.innerHTML=`<div class="v301-sim-summary" data-v409-hard-guard="1"><div class="v301-np-hero"><div><small>Escola: ${esc(school)} · 1 escola no recorte</small><strong>Nota Padronizada — LP + MT</strong></div><div class="v301-np-value">${esc(fmtNum(np,1))}</div></div><div class="v301-dual-grid">${compHtml('LP','Língua Portuguesa',lp,allLp)}${compHtml('MT','Matemática',mt,allMt)}</div></div>`;
    return true;
  }

  function domSkillCount(){
    return {
      summary:!!document.querySelector('#somSkillBars .v301-sim-summary'),
      lp:document.querySelectorAll('#somSkillBars [data-v301-component="LP"] .v301-skill').length,
      mt:document.querySelectorAll('#somSkillBars [data-v301-component="MT"] .v301-skill').length
    };
  }

  async function enforce(){
    const token=++epoch;
    patchSearchMatcher();patchFilteredRows();
    if(!isSimDual())return false;
    const query=String($('somSearch')?.value||'').trim();
    if(!query)return false;
    const y=$('somAnoEscolar')?.value||'';
    try{if(typeof window.sim2026EnsureYearForIndicator==='function')await window.sim2026EnsureYearForIndicator(y,$('somComponente')?.value||'LP');}catch(_){ }
    if(token!==epoch||!isSimDual())return false;
    let rows=rowsForSchool();
    if(!rows.length)return false;
    const haveLp=aggregateSkills(rows,'LP').length>0,haveMt=aggregateSkills(rows,'MT').length>0;
    if(!haveLp&&!haveMt)return false;

    try{window.__GRA_V301_SIM_DUAL__?.render?.();}catch(_){ }
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(token!==epoch)return false;
    let state=domSkillCount();
    if(state.summary&&(!haveLp||state.lp>0)&&(!haveMt||state.mt>0))return true;

    // A later historical renderer cleared/overwrote the card: render a deterministic
    // fallback from the already-filtered source rows. No data is recalculated beyond
    // the same weighted aggregation used by the native Simulado module.
    const ok=fallbackRender(rows);
    if(ok)document.documentElement.dataset.graSimuladoSchoolGuard='recovered';
    return ok;
  }

  function schedule(ms=100){
    clearTimeout(scheduled);
    scheduled=delay(()=>{scheduled=0;enforce().catch(err=>console.error('v409 school-skill guard',err));},ms);
  }

  function wrapRender(name){
    const current=window[name];
    if(typeof current!=='function'||current.__graV409SchoolGuard)return;
    const base=current;
    const wrapped=function(){const out=base.apply(this,arguments);schedule(30);return out;};
    wrapped.__graV409SchoolGuard=true;wrapped.__native=base;window[name]=wrapped;
    try{if(name==='renderResultados')renderResultados=wrapped;else if(name==='renderResultadosSearchOnly')renderResultadosSearchOnly=wrapped;}catch(_){ }
  }

  function install(){
    patchSearchMatcher();patchFilteredRows();wrapRender('renderResultados');wrapRender('renderResultadosSearchOnly');
    document.documentElement.dataset.graSimuladoSchoolGuard='installed';
    schedule(80);
  }

  document.addEventListener('input',event=>{if(event.target?.id==='somSearch')schedule(120);},true);
  document.addEventListener('change',event=>{const id=event.target?.id||'';if(id==='regionalScopeSelect'||id.startsWith('som'))schedule(50);},true);
  document.addEventListener('click',event=>{if(event.target?.closest?.('.nav button[data-section="resultados"]'))schedule(80);},true);
  const bars=$('somSkillBars');
  if(bars&&typeof MutationObserver==='function')new MutationObserver(()=>{
    if(isSimDual()&&String($('somSearch')?.value||'').trim()&&!document.querySelector('#somSkillBars .v301-sim-summary'))schedule(40);
  }).observe(bars,{childList:true});

  // Re-install briefly after boot in case a historical module assigns a wrapper late.
  [0,350,1200,3000].forEach(ms=>delay(install,ms));

  window.__GRA_SIMULADO_SCHOOL_GUARD__={
    version:VERSION,
    contract:'Busca direta de escola no Simulado 4º/8º mantém 5 habilidades LP + 5 MT; aliases E.M./EM/Escola Municipal são equivalentes.',
    schoolKey,schoolMatches,enforce,install,
    audit(){
      const rows=rowsForSchool(),state=domSkillCount();
      return {version:VERSION,query:String($('somSearch')?.value||''),year:String($('somAnoEscolar')?.value||''),rows:rows.length,schools:[...new Set(rows.map(r=>r.escola).filter(Boolean))],lpSource:aggregateSkills(rows,'LP').length,mtSource:aggregateSkills(rows,'MT').length,...state,status:document.documentElement.dataset.graSimuladoSchoolGuard||''};
    }
  };
})();
