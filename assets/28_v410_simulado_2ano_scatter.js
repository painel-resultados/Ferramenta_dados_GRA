/*
 * GRA v410 — Simulado 2026 · 2º ano · 2ª CRE
 * - Nova visualização "Gráfico de Dispersão" no filtro Componente.
 * - X = Proficiência em Leitura / Língua Portuguesa (SAEB), corte 743.
 * - Y = Proficiência na escala CAEd (Matemática), corte 500.
 * - Prioritária = quadrado; não prioritária = círculo.
 * - Azul = acima dos dois cortes; amarelo = abaixo de um; vermelho = abaixo dos dois.
 * - Habilidades do Simulado estabilizadas em todos os caminhos de filtros.
 *
 * Este patch é carregado imediatamente ANTES do hard guard v409. O guard v409
 * permanece, por contrato, como o último patch da aplicação.
 */
(function(){
  'use strict';

  const VERSION='v410';
  const SCATTER_VALUE='GRAFICO_DISPERSAO';
  const SCATTER_LABEL='Gráfico de Dispersão';
  const X_MIN=696, X_MAX=840, X_CUT=743;
  const Y_MIN=470, Y_MAX=670, Y_CUT=500;
  const COLORS={blue:'#2f86bd',yellow:'#e3a52b',red:'#cf4f55'};
  const $=id=>document.getElementById(id);
  const safe=value=>typeof window.esc==='function'
    ? window.esc(String(value??''))
    : String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(v,d=1)=>Number.isFinite(Number(v))
    ? Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})
    : '—';
  const pct=v=>Number.isFinite(Number(v))?`${fmt(v,1)}%`:'—';

  let renderBusy=false;
  let scatterSticky=false;
  let ensureEpoch=0;
  let skillEpoch=0;
  let scheduledSkill=0;
  let scheduledScatter=0;
  let observer=null;

  function currentYear(){return $('somAnoEscolar')?.value||'';}
  function isSim(){return $('somModalidade')?.value==='Simulado 2026';}
  function regionalScope(){return Number($('regionalScopeSelect')?.value||0);}
  function eligible(){return isSim()&&currentYear()==='2º ano'&&regionalScope()===2;}
  function isScatter(){return eligible()&&(scatterSticky||$('somComponente')?.value===SCATTER_VALUE);}
  function normalComponent(){
    const el=$('somComponente');
    const remembered=el?.dataset?.v410LastComponent;
    return remembered==='MT'?'MT':'LP';
  }

  function markScatterSentinel(){
    // v408 usa a chave literal do componente para decidir se precisa recarregar o
    // recorte. A visualização de dispersão não é uma base adicional; ela combina LP
    // e MT. Marcamos somente esta chave virtual para impedir uma recarga circular do
    // estabilizador antigo. Nenhuma linha ou payload é alterado.
    try{
      if(typeof SIMULADO2026_LOADED!=='undefined'&&SIMULADO2026_LOADED?.add){
        SIMULADO2026_LOADED.add(`2º ano|${SCATTER_VALUE}`);
      }
    }catch(_){ }
  }

  function ensureOption(){
    const el=$('somComponente');
    if(!el)return false;
    const wasScatter=scatterSticky||el.value===SCATTER_VALUE;
    if(['LP','MT'].includes(el.value))el.dataset.v410LastComponent=el.value;
    let opt=[...el.options].find(o=>o.value===SCATTER_VALUE);
    if(eligible()){
      if(!opt){
        opt=document.createElement('option');
        opt.value=SCATTER_VALUE;
        opt.textContent=SCATTER_LABEL;
        el.appendChild(opt);
      }
      markScatterSentinel();
      if(wasScatter)el.value=SCATTER_VALUE;
      return true;
    }
    if(opt)opt.remove();
    if(wasScatter){
      scatterSticky=false;
      const fallback=normalComponent();
      if([...el.options].some(o=>o.value===fallback))el.value=fallback;
      else if([...el.options].some(o=>o.value==='LP'))el.value='LP';
    }
    return false;
  }

  async function ensureScatterData(){
    if(!isScatter())return false;
    const token=++ensureEpoch;
    markScatterSentinel();
    const host=$('somMainChart');
    try{
      const jobs=[];
      if(typeof window.sim2026EnsureCombo==='function'){
        jobs.push(window.sim2026EnsureCombo('2º ano','LP'));
        jobs.push(window.sim2026EnsureCombo('2º ano','MT'));
      }else if(typeof sim2026EnsureCombo==='function'){
        jobs.push(sim2026EnsureCombo('2º ano','LP'));
        jobs.push(sim2026EnsureCombo('2º ano','MT'));
      }
      if(jobs.length)await Promise.all(jobs);
      if(token!==ensureEpoch||!isScatter())return false;
      markScatterSentinel();
      return true;
    }catch(err){
      if(token===ensureEpoch&&host){
        host.innerHTML=`<div class="som-empty">Não foi possível carregar LP e Matemática para a dispersão.<br>${safe(err?.message||err)}</div>`;
      }
      console.error('v410 scatter: falha ao carregar LP+MT',err);
      return false;
    }
  }

  function fold(value){
    return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }
  function schoolKey(value){
    return fold(value)
      .replace(/^\s*\d{5,}\s*[-–—:]?\s*/,'')
      .replace(/[._\-/]+/g,' ')
      .replace(/\bescola\s+municipal\b/g,' em ')
      .replace(/\be\s+m\b/g,' em ')
      .replace(/\bginasio\s+educacional\s+tecnologico\b/g,' get ')
      .replace(/[^a-z0-9]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function filteredRows(options){
    try{
      if(typeof window.somFilteredRows==='function')return window.somFilteredRows(options)||[];
      if(typeof somFilteredRows==='function')return somFilteredRows(options)||[];
    }catch(err){console.warn('v410 scatter: recorte indisponível',err);}
    return [];
  }

  function searchMatches(row,query){
    try{if(typeof window.somSearchMatches==='function'&&window.somSearchMatches(row,query))return true;}catch(_){ }
    const q=schoolKey(query);if(!q)return true;
    const values=[row?.escola,row?.escolaFonte];
    try{
      const rec=typeof window.somFindRecord==='function'?window.somFindRecord(row?.escola||''):null;
      if(rec)values.push(rec.unidade,rec.escola,rec.nome,...(rec.aliases||[]),...(rec.somAliases||[]));
    }catch(_){ }
    return values.filter(Boolean).some(v=>{const k=schoolKey(v);return k&&(k===q||k.includes(q)||q.includes(k));});
  }

  function axisValue(row,scaleName){
    const direct=Number(row?.escalas?.[scaleName]?.[0]);
    if(Number.isFinite(direct))return direct;
    const prof=Number(row?.proficiencia);
    return Number.isFinite(prof)?prof:null;
  }

  function scatterRows({ignoreSearch=false}={}){
    const rows=filteredRows({ignoreComp:true,ignoreSearch});
    return rows.filter(r=>r?.modalidade==='Simulado 2026'&&r.anoEscolar==='2º ano'&&['LP','MT'].includes(r.componente));
  }

  function pairRows(rows){
    const groups=new Map();
    for(const row of rows||[]){
      const name=String(row?.escola||row?.escolaFonte||'').trim();
      if(!name||!['LP','MT'].includes(row?.componente))continue;
      const key=`${String(row?.cre||'')}|${schoolKey(name)}`;
      if(!groups.has(key))groups.set(key,{school:name,cre:row?.cre||'',LP:null,MT:null});
      const g=groups.get(key);g[row.componente]=row;if(!g.school)g.school=name;
    }
    const out=[];
    groups.forEach(g=>{
      if(!g.LP||!g.MT)return;
      const x=axisValue(g.LP,'SAEB');
      const y=axisValue(g.MT,'CAED');
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      let priority=false;
      try{
        const fn=window.priorityMatchesContext||priorityMatchesContext;
        if(typeof fn==='function')priority=!!fn(g.school,'2º ano','Simulado 2026',g.cre);
      }catch(_){ }
      const belowX=x<X_CUT,belowY=y<Y_CUT;
      const status=belowX&&belowY?'red':(belowX||belowY?'yellow':'blue');
      out.push({...g,x,y,priority,status,belowX,belowY});
    });
    return out.sort((a,b)=>String(a.school).localeCompare(String(b.school),'pt-BR'));
  }

  function selectedQuery(){return String($('somSearch')?.value||'').trim();}
  function scopeLabel(){
    const q=selectedQuery();
    const agent=$('somAgente')?.value||'';
    let specific=false;
    try{specific=typeof window.somIsSpecificAgent==='function'&&window.somIsSpecificAgent(agent);}catch(_){ }
    if(q)return `Escola: ${q}`;
    if(specific)return `Agente: ${agent}`;
    const scope=regionalScope();
    return scope?`${scope}ª CRE`:'Toda a SME';
  }

  function installStyle(){
    if($('v410-simulado-scatter-style'))return;
    const style=document.createElement('style');
    style.id='v410-simulado-scatter-style';
    style.textContent=`
#resultados #somMainChart.v410-scatter-chart{min-height:0!important;overflow:visible}
#resultados .v410-scatter-shell{display:grid;gap:10px;min-width:0}
#resultados .v410-scatter-legend{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;color:#526779;font-size:10.5px;font-weight:800;line-height:1.25}
#resultados .v410-scatter-legend span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
#resultados .v410-dot,#resultados .v410-square{display:inline-block;width:10px;height:10px;background:#2f86bd;border:1px solid rgba(18,56,93,.16)}
#resultados .v410-dot{border-radius:50%}
#resultados .v410-square{border-radius:1px}
#resultados .v410-color{display:inline-block;width:10px;height:10px;border-radius:50%;border:1px solid rgba(18,56,93,.10)}
#resultados .v410-scatter-scroll{overflow-x:auto;overflow-y:hidden;padding-bottom:2px}
#resultados .v410-scatter-svg{display:block;width:100%;min-width:760px;height:auto;overflow:visible}
#resultados .v410-scatter-point{cursor:pointer;outline:none;transition:opacity .15s ease}
#resultados .v410-scatter-point .v410-marker{transform-box:fill-box;transform-origin:center;transition:transform .13s ease,filter .13s ease}
#resultados .v410-scatter-point:hover .v410-marker,#resultados .v410-scatter-point:focus-visible .v410-marker{transform:scale(1.35);filter:drop-shadow(0 2px 4px rgba(18,56,93,.28))}
#resultados .v410-scatter-point:focus-visible .v410-marker{stroke:#12385d;stroke-width:2.4}
#resultados .v410-scatter-note{color:#65758b;font-size:10.5px;line-height:1.4}
#resultados #somSkillCard.v410-scatter-skill-card{display:block!important;grid-column:auto!important}
#resultados #somSkillCard.v410-scatter-skill-card .v410-dual-skill-head{padding:11px 12px 8px;background:#f5f9fc;border-bottom:1px solid #e2ebf2}
#resultados #somSkillCard.v410-scatter-skill-card .v410-dual-skill-head h4{margin:0;color:#12385d;font-size:14px}
#resultados #somSkillCard.v410-scatter-skill-card .v410-dual-skill-head small{display:block;margin-top:3px;color:#65758b;font-size:10px;font-weight:700}
#resultados #somSkillCard.v410-scatter-skill-card .v410-scatter-skills .v301-comp-metrics{grid-template-columns:1fr}
#resultados #somSkillCard.v410-scatter-skill-card .v301-comp-metric span{white-space:normal}
#resultados #somSkillCard.v410-scatter-skill-card .v301-comp-metric b{font-size:18px}
@media(max-width:900px){#resultados .v410-scatter-svg{min-width:700px}}
@media(max-width:620px){#resultados .v410-scatter-svg{min-width:660px}}
`;
    document.head.appendChild(style);
  }

  function buildScatterSvg(points){
    const W=1320,H=610;
    const L=82,R=30,T=28,B=72;
    const pw=W-L-R,ph=H-T-B;
    const x=v=>L+(v-X_MIN)/(X_MAX-X_MIN)*pw;
    const y=v=>T+(Y_MAX-v)/(Y_MAX-Y_MIN)*ph;
    const xTicks=[696,720,743,760,780,800,820,840];
    const yTicks=[470,500,525,550,575,600,625,650,670];
    const gridX=xTicks.map(v=>`<g><line x1="${x(v).toFixed(2)}" y1="${T}" x2="${x(v).toFixed(2)}" y2="${H-B}" stroke="#e6edf2" stroke-width="1"/><text x="${x(v).toFixed(2)}" y="${H-B+24}" text-anchor="middle" font-size="12" fill="#68798b">${v}</text></g>`).join('');
    const gridY=yTicks.map(v=>`<g><line x1="${L}" y1="${y(v).toFixed(2)}" x2="${W-R}" y2="${y(v).toFixed(2)}" stroke="#e6edf2" stroke-width="1"/><text x="${L-12}" y="${(y(v)+4).toFixed(2)}" text-anchor="end" font-size="12" fill="#68798b">${v}</text></g>`).join('');
    const query=selectedQuery();
    const selectedKeys=new Set(points.filter(p=>query&&searchMatches(p.LP,query)).map(p=>`${p.cre}|${schoolKey(p.school)}`));
    const haveSelection=selectedKeys.size>0;
    let markerHtml='';
    for(const p of points){
      const cx=x(p.x),cy=y(p.y);
      const key=`${p.cre}|${schoolKey(p.school)}`;
      const selected=selectedKeys.has(key);
      const opacity=haveSelection&&!selected?0.20:0.92;
      const fill=COLORS[p.status];
      const title=`${p.school}\nLeitura / LP (SAEB): ${fmt(p.x,1)}\nMatemática (CAEd): ${fmt(p.y,1)}\n${p.priority?'Prioritária':'Não prioritária'}`;
      const marker=p.priority
        ? `<rect class="v410-marker" x="${(cx-6.5).toFixed(2)}" y="${(cy-6.5).toFixed(2)}" width="13" height="13" rx="1" fill="${fill}" stroke="#ffffff" stroke-width="1.1"/>`
        : `<circle class="v410-marker" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="6.4" fill="${fill}" stroke="#ffffff" stroke-width="1.1"/>`;
      const halo=selected?`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="11" fill="none" stroke="#12385d" stroke-width="2"/>`:'';
      const label=selected?`<text x="${Math.min(W-R-4,cx+12).toFixed(2)}" y="${Math.max(T+12,cy-10).toFixed(2)}" font-size="10.5" font-weight="800" fill="#12385d" paint-order="stroke" stroke="#fff" stroke-width="3">${safe(p.school)}</text>`:'';
      markerHtml+=`<g class="v410-scatter-point" data-som-school="${safe(p.school)}" role="button" tabindex="0" aria-label="Selecionar ${safe(p.school)}" style="opacity:${opacity}"><title>${safe(title)}</title>${halo}${marker}${label}</g>`;
    }
    return `<svg class="v410-scatter-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Dispersão das proficiências do Simulado 2026 do 2º ano da 2ª CRE"><rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="#fff" stroke="#dce7ef"/>${gridX}${gridY}<line x1="${x(X_CUT).toFixed(2)}" y1="${T}" x2="${x(X_CUT).toFixed(2)}" y2="${H-B}" stroke="#d85b70" stroke-width="1.7" stroke-dasharray="8 7"/><line x1="${L}" y1="${y(Y_CUT).toFixed(2)}" x2="${W-R}" y2="${y(Y_CUT).toFixed(2)}" stroke="#d85b70" stroke-width="1.7" stroke-dasharray="8 7"/><text x="${(x(X_CUT)+5).toFixed(2)}" y="${T+14}" font-size="10.5" font-weight="800" fill="#b44a60">corte 743</text><text x="${W-R-5}" y="${(y(Y_CUT)-7).toFixed(2)}" text-anchor="end" font-size="10.5" font-weight="800" fill="#b44a60">corte 500</text>${markerHtml}<text x="${L+pw/2}" y="${H-17}" text-anchor="middle" font-size="13" font-weight="850" fill="#12385d">Proficiência em Leitura / Língua Portuguesa (SAEB)</text><text x="21" y="${T+ph/2}" transform="rotate(-90 21 ${T+ph/2})" text-anchor="middle" font-size="13" font-weight="850" fill="#12385d">Proficiência na escala CAEd (Matemática)</text></svg>`;
  }

  function renderScatter(){
    if(!isScatter())return false;
    installStyle();markScatterSentinel();
    const host=$('somMainChart'),title=$('somMainTitle'),subtitle=$('somMainSubtitle');
    if(!host)return false;
    // A busca de uma escola destaca o ponto, mas preserva o universo de comparação
    // dos demais filtros (CRE/agente/prioridade). As habilidades, por outro lado,
    // respeitam a busca e passam ao recorte da escola.
    const rows=scatterRows({ignoreSearch:!!selectedQuery()});
    const points=pairRows(rows);
    if(title)title.textContent='Dispersão das proficiências das escolas — 2ª CRE — 2º ano';
    if(subtitle)subtitle.textContent='Leitura / Língua Portuguesa (SAEB) no eixo X e Matemática (CAEd) no eixo Y. Linhas tracejadas: 743 e 500.';
    host.classList.add('v410-scatter-chart');
    if(!points.length){
      host.innerHTML='<div class="som-empty">Não há pares de Língua Portuguesa e Matemática neste recorte para gerar a dispersão.</div>';
      return false;
    }
    const counts=points.reduce((a,p)=>{a[p.status]++;if(p.priority)a.priority++;return a;},{blue:0,yellow:0,red:0,priority:0});
    host.innerHTML=`<div class="v410-scatter-shell"><div class="v410-scatter-legend"><span><i class="v410-dot"></i>Não prioritárias</span><span><i class="v410-square"></i>Prioritárias</span><span><i class="v410-color" style="background:${COLORS.blue}"></i>Acima dos dois cortes</span><span><i class="v410-color" style="background:${COLORS.yellow}"></i>Abaixo de um corte</span><span><i class="v410-color" style="background:${COLORS.red}"></i>Abaixo dos dois cortes</span></div><div class="v410-scatter-scroll">${buildScatterSvg(points)}</div><div class="v410-scatter-note">${points.length.toLocaleString('pt-BR')} escolas no universo do gráfico · ${counts.priority.toLocaleString('pt-BR')} prioritárias. Passe o mouse sobre um ponto para identificar a unidade; clique para selecioná-la.</div></div>`;
    return true;
  }

  function skillMeta(year,component,h){
    try{return (typeof SIMULADO2026_SKILL_META!=='undefined'?SIMULADO2026_SKILL_META:{})[`${year}|${component}|${h}`]||{};}catch(_){return {};}
  }
  function skillAggregate(rows,component){
    try{
      const fn=window.sim2026ScopeSkills||sim2026ScopeSkills;
      if(typeof fn==='function')return fn(rows||[],currentYear(),component)||[];
    }catch(_){ }
    return [];
  }
  function networkSkills(year,component){
    try{
      const fn=window.sim2026NetworkSkills||sim2026NetworkSkills;
      if(typeof fn==='function')return fn(year,component)||[];
    }catch(_){ }
    return [];
  }
  function weightedScale(rows,component,scale){
    let sv=0,sw=0;
    for(const r of rows||[]){
      if(r?.componente!==component)continue;
      const v=axisValue(r,scale),w=Number(r?.avaliados)||0;
      if(Number.isFinite(v)&&w>0){sv+=v*w;sw+=w;}
    }
    return sw?sv/sw:null;
  }

  function skillItems(rows,year,component){
    let current=[];
    try{
      const fn=window.sim2026ScopeSkills||sim2026ScopeSkills;
      if(typeof fn==='function')current=fn(rows||[],year,component)||[];
    }catch(_){ }
    const net=networkSkills(year,component);
    const netMap=new Map(net.map(x=>[x.h,Number(x.value)]));
    return current.slice().sort((a,b)=>Number(a.value)-Number(b.value)||String(a.h).localeCompare(String(b.h),'pt-BR')).slice(0,5).map(item=>{
      const ref=netMap.get(item.h);
      const delta=Number.isFinite(ref)?Number(item.value)-ref:null;
      return {...item,ref,delta,meta:skillMeta(year,component,item.h)};
    });
  }
  function skillItemHtml(item){
    const code=item.meta?.codigo?`${item.h} · ${item.meta.codigo}`:item.h;
    const desc=item.meta?.descricao||item.description||'';
    const value=Number(item.value),width=Math.max(3,Math.min(100,Number.isFinite(value)?value:0));
    const delta=Number(item.delta);
    const deltaText=Number.isFinite(delta)?`${delta>0?'+':''}${fmt(delta,1)} p.p.`:'—';
    const cls=Number.isFinite(delta)?(delta<0?'neg':'pos'):'';
    return `<div class="v301-skill" title="${safe(`${code} — ${desc}`)}"><div class="v301-skill-top"><span class="v301-skill-code">${safe(code)}</span><span class="v301-skill-value">${safe(pct(value))}</span></div><div class="v301-skill-desc">${safe(desc)}</div><div class="v301-skill-meter" aria-hidden="true"><i style="width:${width.toFixed(1)}%"></i></div><div class="v301-skill-ref">Rede: <b>${safe(Number.isFinite(item.ref)?pct(item.ref):'—')}</b> · Dif.: <b class="${cls}">${safe(deltaText)}</b></div></div>`;
  }
  function skillColumn(rows,year,component,label,{metricLabel='',metricValue=null}={}){
    const list=skillItems(rows,year,component);
    const metric=metricLabel?`<div class="v301-comp-metrics"><div class="v301-comp-metric"><span>${safe(metricLabel)}</span><b>${safe(fmt(metricValue,1))}</b></div></div>`:'';
    return `<section class="v301-comp-column" data-v301-component="${component}"><div class="v301-comp-head"><h4>${safe(label)}</h4>${metric}</div><div class="v301-skill-list">${list.length?list.map(skillItemHtml).join(''):'<div class="v301-empty">Sem habilidades disponíveis neste recorte.</div>'}</div></section>`;
  }

  function showSkillCard(){
    const card=$('somSkillCard');if(!card)return;
    card.hidden=false;card.classList.remove('is-hidden','v408-skill-loading');
    const shortcut=[...document.querySelectorAll('#resultados .v222-section-jumps button')].find(btn=>(btn.textContent||'').trim()==='Habilidades');
    if(shortcut)shortcut.hidden=false;
  }

  function renderScatterSkills(){
    if(!isScatter())return false;
    const card=$('somSkillCard'),target=$('somSkillBars'),title=$('somSkillTitle'),subtitle=$('somSkillSubtitle');
    if(!card||!target)return false;
    const rows=scatterRows({ignoreSearch:false});
    const lp=skillItems(rows,'2º ano','LP'),mt=skillItems(rows,'2º ano','MT');
    showSkillCard();
    card.classList.add('v410-scatter-skill-card','v301-sim-dual-card');
    card.parentElement?.classList.remove('v301-sim-dual-outer');
    if(title)title.textContent='Simulado 2026 — habilidades desafiadoras: Língua Portuguesa × Matemática';
    if(subtitle)subtitle.textContent=`${scopeLabel()}. Cinco menores percentuais de acerto de cada componente, sempre visíveis lado a lado neste modo.`;
    if(!lp.length&&!mt.length){
      target.innerHTML='<div class="v301-empty">Não há habilidades disponíveis neste recorte.</div>';
      return false;
    }
    const lpMetric=weightedScale(rows,'LP','SAEB');
    const mtMetric=weightedScale(rows,'MT','CAED');
    target.innerHTML=`<div class="v301-sim-summary v410-scatter-skills" data-v410-scatter-skills="1"><div class="v301-dual-grid">${skillColumn(rows,'2º ano','LP','Língua Portuguesa',{metricLabel:'Proficiência em Leitura (SAEB)',metricValue:lpMetric})}${skillColumn(rows,'2º ano','MT','Matemática',{metricLabel:'Proficiência na escala CAEd',metricValue:mtMetric})}</div></div>`;
    return true;
  }

  function expectedSkillCount(rows,year,component){
    try{return Math.min(5,skillItems(rows,year,component).length);}catch(_){return 0;}
  }
  function dualDomCounts(){
    return {
      summary:!!document.querySelector('#somSkillBars .v301-sim-summary'),
      lp:document.querySelectorAll('#somSkillBars [data-v301-component="LP"] .v301-skill').length,
      mt:document.querySelectorAll('#somSkillBars [data-v301-component="MT"] .v301-skill').length
    };
  }
  function skillScopeRows(ignoreComp=false){return filteredRows(ignoreComp?{ignoreComp:true}:{});}

  function genericDualFallback(rows,year){
    const card=$('somSkillCard'),target=$('somSkillBars'),title=$('somSkillTitle'),subtitle=$('somSkillSubtitle');
    if(!card||!target)return false;
    const lp=skillItems(rows,year,'LP'),mt=skillItems(rows,year,'MT');
    if(!lp.length&&!mt.length)return false;
    showSkillCard();card.classList.add('v301-sim-dual-card');card.classList.remove('v410-scatter-skill-card');
    card.parentElement?.classList.add('v301-sim-dual-outer');
    if(title)title.textContent='Simulado 2026 — Língua Portuguesa × Matemática';
    if(subtitle)subtitle.textContent=`${scopeLabel()}. Cinco habilidades mais desafiadoras de cada componente.`;
    const lpRows=rows.filter(r=>r?.componente==='LP'),mtRows=rows.filter(r=>r?.componente==='MT');
    const avg=(rs,key)=>{let sv=0,sw=0;for(const r of rs){const v=Number(r?.[key]),w=Number(r?.avaliados)||0;if(Number.isFinite(v)&&w>0){sv+=v*w;sw+=w;}}return sw?sv/sw:null;};
    const col=(comp,label,rs,list)=>`<section class="v301-comp-column" data-v301-component="${comp}"><div class="v301-comp-head"><h4>${safe(label)}</h4><div class="v301-comp-metrics"><div class="v301-comp-metric"><span>Nota padronizada</span><b>${safe(fmt(avg(rs,'notaPadronizadaComponente'),1))}</b></div><div class="v301-comp-metric"><span>Proficiência média</span><b>${safe(fmt(avg(rs,'proficiencia'),1))}</b></div></div></div><div class="v301-skill-list">${list.length?list.map(skillItemHtml).join(''):'<div class="v301-empty">Sem habilidades disponíveis neste recorte.</div>'}</div></section>`;
    target.innerHTML=`<div class="v301-sim-summary" data-v410-skill-fallback="1"><div class="v301-dual-grid">${col('LP','Língua Portuguesa',lpRows,lp)}${col('MT','Matemática',mtRows,mt)}</div></div>`;
    return true;
  }

  async function stabilizeSkills(){
    const token=++skillEpoch;
    if(!isSim()){
      const card=$('somSkillCard');card?.classList.remove('v410-scatter-skill-card');
      return false;
    }
    const year=currentYear();
    try{
      if(isScatter()){
        showSkillCard();
        await ensureScatterData();
        if(token!==skillEpoch||!isScatter())return false;
        renderScatterSkills();
        return true;
      }
      if(year==='4º ano'||year==='8º ano'){
        showSkillCard();
        const comp=['LP','MT'].includes($('somComponente')?.value)?$('somComponente').value:'LP';
        if(typeof window.sim2026EnsureYearForIndicator==='function')await window.sim2026EnsureYearForIndicator(year,comp);
        else if(typeof sim2026EnsureYearForIndicator==='function')await sim2026EnsureYearForIndicator(year,comp);
        if(token!==skillEpoch||!isSim()||currentYear()!==year)return false;
        let rows=skillScopeRows(true);
        try{window.__GRA_V301_SIM_DUAL__?.render?.();}catch(err){console.warn('v410 skills: render dual histórico',err);}
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        if(token!==skillEpoch||!isSim()||currentYear()!==year)return false;
        rows=skillScopeRows(true);
        const expectedLp=expectedSkillCount(rows,year,'LP'),expectedMt=expectedSkillCount(rows,year,'MT');
        const dom=dualDomCounts();
        if((expectedLp&&dom.lp===0)||(expectedMt&&dom.mt===0)||(!dom.summary&&(expectedLp||expectedMt)))genericDualFallback(rows,year);
        else showSkillCard();
        return true;
      }
      if(year==='2º ano'){
        const comp=['LP','MT'].includes($('somComponente')?.value)?$('somComponente').value:'LP';
        if(typeof window.sim2026EnsureCombo==='function')await window.sim2026EnsureCombo(year,comp);
        else if(typeof sim2026EnsureCombo==='function')await sim2026EnsureCombo(year,comp);
        if(token!==skillEpoch||!isSim()||currentYear()!==year||$('somComponente')?.value!==comp)return false;
        const rows=skillScopeRows(false);
        try{
          const fn=window.renderSomSkills||renderSomSkills;
          if(typeof fn==='function')fn(rows);
        }catch(err){console.warn('v410 skills: render 2º ano',err);}
        const expected=expectedSkillCount(rows,year,comp);
        const dom=document.querySelectorAll('#somSkillBars .sim2026-skill-row').length;
        if(expected&&dom===0){
          // O renderizador nativo é a fonte canônica do 2º ano; uma segunda chamada
          // após dois frames recupera os casos em que um patch histórico o limpou.
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          if(token===skillEpoch){
            try{(window.renderSomSkills||renderSomSkills)(skillScopeRows(false));}catch(_){ }
          }
        }
        if(expected)showSkillCard();
        return true;
      }
    }catch(err){console.error('v410: falha ao estabilizar habilidades do Simulado',err);}
    return false;
  }

  function queueSkills(delay=30){
    clearTimeout(scheduledSkill);
    scheduledSkill=setTimeout(()=>{scheduledSkill=0;stabilizeSkills();},delay);
  }
  function queueScatter(delay=0){
    clearTimeout(scheduledScatter);
    scheduledScatter=setTimeout(async()=>{
      scheduledScatter=0;
      if(!isScatter())return;
      const host=$('somMainChart');
      if(host&&!host.querySelector('.v410-scatter-shell'))host.innerHTML='<div class="sim2026-loading">Carregando Língua Portuguesa e Matemática para o gráfico de dispersão…</div>';
      await ensureScatterData();
      if(!isScatter())return;
      renderScatter();renderScatterSkills();
    },delay);
  }

  function updateScopeChip(){
    if(!isScatter())return;
    const chip=$('somScopeChip');if(!chip)return;
    const agent=$('somAgente')?.value||'';
    let suffix='';try{if(typeof window.somIsSpecificAgent==='function'&&window.somIsSpecificAgent(agent))suffix=` · ${agent}`;}catch(_){ }
    chip.textContent=`Simulado 2026 · 2º ano · ${SCATTER_LABEL}${suffix} · cortes LP 743 / MT 500`;
  }

  function cleanupScatterClasses(){
    if(isScatter())return;
    $('somMainChart')?.classList.remove('v410-scatter-chart');
    const card=$('somSkillCard');
    card?.classList.remove('v410-scatter-skill-card');
  }

  function wrapRefresh(){
    const current=window.somRefreshSelectors;
    if(typeof current!=='function'||current.__v410Scatter)return;
    const base=current;
    const wrapped=function(){
      const el=$('somComponente');
      const wasScatter=scatterSticky||el?.value===SCATTER_VALUE;
      const last=['LP','MT'].includes(el?.value)?el.value:normalComponent();
      if(el)el.dataset.v410LastComponent=last;
      const out=base.apply(this,arguments);
      ensureOption();
      if(wasScatter&&eligible()){
        scatterSticky=true;
        const c=$('somComponente');if(c)c.value=SCATTER_VALUE;markScatterSentinel();
      }else if(!eligible())scatterSticky=false;
      cleanupScatterClasses();
      return out;
    };
    wrapped.__v410Scatter=true;wrapped.__native=base;
    window.somRefreshSelectors=wrapped;try{somRefreshSelectors=wrapped;}catch(_){ }
  }

  function wrapRender(name){
    const current=window[name];
    if(typeof current!=='function'||current.__v410Scatter)return;
    const base=current;
    const wrapped=function(){
      if(renderBusy)return base.apply(this,arguments);
      ensureOption();
      if(!isScatter()){
        cleanupScatterClasses();
        const out=base.apply(this,arguments);ensureOption();queueSkills(25);return out;
      }
      const compEl=$('somComponente');
      const saved=SCATTER_VALUE;
      const underlying=normalComponent();
      renderBusy=true;
      let out;
      try{
        markScatterSentinel();
        if(compEl)compEl.value=underlying;
        out=base.apply(this,arguments);
      }finally{
        if(compEl){ensureOption();compEl.value=saved;}
        renderBusy=false;
      }
      updateScopeChip();
      const host=$('somMainChart');
      if(host)host.innerHTML='<div class="sim2026-loading">Carregando Língua Portuguesa e Matemática para o gráfico de dispersão…</div>';
      queueScatter(0);queueSkills(20);
      return out;
    };
    wrapped.__v410Scatter=true;wrapped.__native=base;
    window[name]=wrapped;
    try{if(name==='renderResultados')renderResultados=wrapped;else if(name==='renderResultadosSearchOnly')renderResultadosSearchOnly=wrapped;}catch(_){ }
  }

  function onComponentChange(event){
    const el=event.target;if(el?.id!=='somComponente')return;
    if(['LP','MT'].includes(el.value)){el.dataset.v410LastComponent=el.value;scatterSticky=false;}
    if(el.value===SCATTER_VALUE){scatterSticky=true;markScatterSentinel();queueScatter(0);queueSkills(15);}
    else cleanupScatterClasses();
  }

  // Intercepta a seleção da nova opção ainda no WINDOW/capture. Isso ocorre antes
  // do listener histórico v300, que por contrato antigo reconstrói o seletor apenas
  // com LP/MT. Assim, o modo novo não é apagado e não precisamos alterar o v300.
  function interceptScatterChange(event){
    const el=event.target;if(el?.id!=='somComponente')return;
    if(['LP','MT'].includes(el.value)){scatterSticky=false;return;}
    if(el.value!==SCATTER_VALUE)return;
    scatterSticky=true;markScatterSentinel();
    event.stopImmediatePropagation();
    event.stopPropagation();
    setTimeout(async()=>{
      if(!isScatter())return;
      const host=$('somMainChart');if(host)host.innerHTML='<div class="sim2026-loading">Carregando Língua Portuguesa e Matemática para o gráfico de dispersão…</div>';
      await ensureScatterData();
      if(!isScatter())return;
      try{window.renderResultados?.();}catch(err){console.error('v410 scatter: render após seleção',err);}
      renderScatter();renderScatterSkills();queueSkills(30);
    },0);
  }

  function onFilterChange(event){
    const id=event.target?.id||'';
    if(!id)return;
    if(id==='somComponente'){onComponentChange(event);return;}
    if(id==='somModalidade'||id==='somAnoEscolar'||id==='regionalScopeSelect'){
      setTimeout(()=>{
        const el=$('somComponente');
        if(!eligible())scatterSticky=false;
        ensureOption();
        if(scatterSticky&&eligible()&&el){el.value=SCATTER_VALUE;markScatterSentinel();queueScatter(0);}
        queueSkills(35);
      },0);
    }else if(id.startsWith('som'))queueSkills(35);
  }

  function onSearchInput(event){
    if(event.target?.id!=='somSearch')return;
    if(isScatter())queueScatter(95);
    queueSkills(115);
  }

  function installObserver(){
    if(observer||typeof MutationObserver!=='function')return;
    const bars=$('somSkillBars'),results=$('resultados');
    if(!bars&&!results)return;
    observer=new MutationObserver(mutations=>{
      if(!isSim()||!results?.classList.contains('active'))return;
      if(isScatter()){
        if(!bars?.querySelector('[data-v410-scatter-skills="1"]'))queueSkills(45);
        return;
      }
      const y=currentYear();
      if(y==='4º ano'||y==='8º ano'){
        const dom=dualDomCounts();
        if(!dom.summary)queueSkills(45);
      }else if(y==='2º ano'&&!bars?.querySelector('.sim2026-skill-row'))queueSkills(45);
    });
    if(bars)observer.observe(bars,{childList:true,subtree:false});
    if(results)observer.observe(results,{attributes:true,attributeFilter:['class']});
  }

  function audit(){
    const allRows=isScatter()?scatterRows({ignoreSearch:!!selectedQuery()}):[];
    const points=pairRows(allRows);
    const counts=points.reduce((a,p)=>{a[p.status]++;if(p.priority)a.priority++;else a.nonPriority++;return a;},{blue:0,yellow:0,red:0,priority:0,nonPriority:0});
    const dom=dualDomCounts();
    return {
      version:VERSION,
      eligible:eligible(),scatter:isScatter(),
      limits:{x:[X_MIN,X_MAX],y:[Y_MIN,Y_MAX]},cuts:{x:X_CUT,y:Y_CUT},
      points:points.length,...counts,
      domPoints:document.querySelectorAll('#somMainChart .v410-scatter-point').length,
      domSquares:document.querySelectorAll('#somMainChart .v410-scatter-point rect.v410-marker').length,
      domCircles:document.querySelectorAll('#somMainChart .v410-scatter-point circle.v410-marker').length,
      lpSkills:dom.lp,mtSkills:dom.mt,
      skillCardVisible:!!$('somSkillCard')&&!$('somSkillCard').classList.contains('is-hidden')&&!$('somSkillCard').hidden,
      optionPresent:!![...($('somComponente')?.options||[])].find(o=>o.value===SCATTER_VALUE),
      v409Guard:window.__GRA_SIMULADO_SCHOOL_GUARD__?.version||null
    };
  }

  function install(){
    installStyle();wrapRefresh();wrapRender('renderResultados');wrapRender('renderResultadosSearchOnly');ensureOption();installObserver();
    document.documentElement.dataset.graV410Scatter='installed';
    queueSkills(70);
    if(isScatter())queueScatter(0);
  }

  // O <select> dispara primeiro `input` e depois `change` em navegadores modernos.
  // Interceptamos ambos no WINDOW/capture para registrar o modo Dispersão antes
  // que o compatibilizador histórico v300 reconstrua o seletor com LP/MT.
  window.addEventListener('input',interceptScatterChange,true);
  window.addEventListener('change',interceptScatterChange,true);
  document.addEventListener('change',onFilterChange,true);
  document.addEventListener('input',onSearchInput,true);
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('.nav button[data-section="resultados"]'))setTimeout(()=>{ensureOption();queueSkills(45);if(isScatter())queueScatter(45);},0);
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  // O hard guard v409 é carregado depois deste arquivo e deve permanecer o wrapper
  // externo/final. Por isso não reatribuímos renderizadores após o boot.
  [350,1200,3000].forEach(ms=>setTimeout(()=>{ensureOption();installObserver();if(scatterSticky&&eligible()){const el=$('somComponente');if(el)el.value=SCATTER_VALUE;}},ms));

  window.__GRA_V410_SCATTER__={
    version:VERSION,value:SCATTER_VALUE,label:SCATTER_LABEL,
    limits:{xMin:X_MIN,xMax:X_MAX,yMin:Y_MIN,yMax:Y_MAX},cuts:{x:X_CUT,y:Y_CUT},
    eligible,isScatter,ensureOption,ensureScatterData,render:renderScatter,renderSkills:renderScatterSkills,stabilizeSkills,audit,schoolKey
  };
})();
