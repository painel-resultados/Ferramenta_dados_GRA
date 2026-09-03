
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const txt=v=>String(v??'').trim();
const clean=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\bESCOLA MUNICIPAL\b/g,'EM').replace(/\bE\s*M\b/g,'EM').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const fmt=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=(v,d=1)=>Number.isFinite(Number(v))?fmt(v,d)+'%':'—';
const integer=v=>Number.isFinite(Number(v))?Math.round(Number(v)).toLocaleString('pt-BR'):'—';
const turmaCode=(year,ord)=>{const y=parseInt(String(year),10),base=({2:12,4:14,8:18})[y],n=Number(ord);return base&&Number.isFinite(n)?base*100+n:n};
function ensureCard(){
  let card=byId('sim306DetailCard');if(card)return card;
  const anchor=byId('somProgressCard')||byId('somTable')?.closest('.card');if(!anchor)return null;
  card=document.createElement('div');card.id='sim306DetailCard';card.className='card';card.hidden=true;
  card.innerHTML='<div class="sim306-head"><div><h3>Detalhamento do desempenho</h3><p id="sim306Intro">Leitura complementar do Simulado 2026.</p></div><span class="sim306-scope" id="sim306Scope"></span></div><div id="sim306Body"></div>';
  anchor.insertAdjacentElement('beforebegin',card);return card;
}
function uniqueSchool(rows){
  const map=new Map();(rows||[]).forEach(r=>{const name=txt(r?.escola);if(!name)return;const key=clean((r?.cre||'')+'|'+name);if(!map.has(key))map.set(key,r);});
  return map.size===1?[...map.values()][0]:null;
}
function aggregate(rows){
  const out={prev:0,pres:0,eff:0,acSV:0,acSW:0,levels:new Map(),schoolLevels:new Map(),schoolCount:0},seenSchools=new Set();
  (rows||[]).forEach(r=>{
    const prev=Number(r?.previstos)||0,pres=Number(r?.presentes)||0,eff=Number(r?.avaliados)||0,ac=Number(r?.acertoPct);
    out.prev+=prev;out.pres+=pres;out.eff+=eff;if(Number.isFinite(ac)&&eff>0){out.acSV+=ac*eff;out.acSW+=eff;}
    (r?.niveis||[]).forEach(n=>{const label=txt(n?.[0]);const count=Number(n?.[1])||0;if(!label)return;out.levels.set(label,(out.levels.get(label)||0)+count);});
    /* v310: nível médio da ESCOLA, vindo das colunas oficiais da planilha CGRA.
       O ano/componente já chega filtrado por somFilteredRows; por isso 4º e 8º nunca são misturados. */
    const school=txt(r?.escola),level=Number(r?.nivelDesempenho),schoolKey=clean((r?.cre||r?.regional||'')+'|'+school);
    if(school&&Number.isFinite(level)&&!seenSchools.has(schoolKey)){
      seenSchools.add(schoolKey);out.schoolLevels.set(level,(out.schoolLevels.get(level)||0)+1);
    }
  });
  out.schoolLevels=new Map([...out.schoolLevels.entries()].sort((a,b)=>Number(a[0])-Number(b[0])));
  out.schoolCount=seenSchools.size;
  out.presPct=out.prev?out.pres/out.prev*100:null;out.partPct=out.prev?out.eff/out.prev*100:null;out.acerto=out.acSW?out.acSV/out.acSW:null;return out;
}
function renderLevels(map,context){
  const entries=[...map.entries()].map(([label,count])=>({label,count:Number(count)||0}));
  const total=entries.reduce((s,x)=>s+x.count,0);if(!entries.length||!total)return '<div class="sim306-empty">A base não possui distribuição por níveis para este recorte.</div>';
  const bar=entries.map((x,i)=>{const p=x.count/total*100;return `<button type="button" class="sim306-level-seg" data-sim306-level="${i}" style="width:${Math.max(0,p)}%" aria-label="${x.label}: ${integer(x.count)} estudantes, ${pct(p,1)}" title="${x.label} · ${integer(x.count)} estudantes · ${pct(p,1)}"></button>`;}).join('');
  const legend=entries.map(x=>{const p=x.count/total*100;return `<div class="sim306-level-chip"><b>${x.label}</b><span>${integer(x.count)} estudantes · ${pct(p,1)}</span></div>`;}).join('');
  return `<div class="sim306-level-bar" role="group" aria-label="Distribuição dos estudantes por nível">${bar}</div><div class="sim306-level-legend">${legend}</div><div class="sim306-level-note" data-sim306-level-note="1">${context}</div>`;
}

function renderSchoolLevels(map,totalSchools){
  const entries=[...map.entries()].map(([level,count])=>({level:Number(level),count:Number(count)||0})).filter(x=>Number.isFinite(x.level)&&x.count>0).sort((a,b)=>a.level-b.level);
  const total=Number(totalSchools)||entries.reduce((s,x)=>s+x.count,0);
  if(!entries.length||!total)return '<div class="sim306-empty">Não há nível de desempenho escolar informado para este recorte.</div>';
  const bar=entries.map(x=>{const p=x.count/total*100;const label=`N${x.level}`;const schools=`${integer(x.count)} escola${x.count===1?'':'s'}`;return `<button type="button" class="sim306-level-seg sim310-school-level-seg" data-sim311-school-level="${x.level}" style="width:${Math.max(0,p)}%" aria-label="Abrir ${schools} do ${label}" title="${label} · ${schools} · ${pct(p,1)} · clique para ver as escolas"></button>`;}).join('');
  const legend=entries.map(x=>{const p=x.count/total*100;return `<button type="button" class="sim306-level-chip sim311-school-level-chip" data-sim311-school-level="${x.level}" aria-label="Abrir escolas do nível N${x.level}"><b>N${x.level}</b><span>${integer(x.count)} escola${x.count===1?'':'s'} · ${pct(p,1)}</span></button>`;}).join('');
  return `<div class="sim306-level-bar sim310-school-level-bar" role="group" aria-label="Distribuição das escolas por nível de desempenho">${bar}</div><div class="sim306-level-legend">${legend}</div><div class="sim306-level-note">${integer(total)} escola${total===1?'':'s'} com nível de desempenho no recorte. Cada escola é contada uma única vez.</div>`;
}
function schoolBaseRow(selected,year,comp){
  const all=(typeof SIMULADO2026_SCHOOL_ROWS!=='undefined'&&Array.isArray(SIMULADO2026_SCHOOL_ROWS))?SIMULADO2026_SCHOOL_ROWS:[];
  const key=clean((selected?.cre||'')+'|'+(selected?.escolaFonte||selected?.escola||''));
  return all.find(r=>r?.anoEscolar===year&&r?.componente===comp&&clean((r?.cre||'')+'|'+(r?.escolaFonte||r?.escola||''))===key)||null;
}
function scaleHtml(name,a){
  if(!Array.isArray(a)||!a.some(v=>v!==null&&v!==''&&v!==undefined))return '';
  return `<div class="sim306-scale"><h5>Escala ${name}</h5><div class="sim306-scale-grid"><span>Proficiência<b>${fmt(a[0],1)}</b></span><span>Desvio padrão<b>${fmt(a[1],1)}</b></span><span>Padrão<b>${txt(a[2])||'—'}</b></span><span>Abaixo do Básico<b>${pct(a[3],1)}</b></span><span>Básico<b>${pct(a[4],1)}</b></span><span>Adequado<b>${pct(a[5],1)}</b></span><span>Avançado<b>${pct(a[6],1)}</b></span></div></div>`;
}
function moreHtml(row,agg){
  const single=!!row;const escala=single&&row?.escalas?scaleHtml('CAEd',row.escalas.CAED)+scaleHtml('SAEB',row.escalas.SAEB):'';
  const nivel=single&&Number.isFinite(Number(row?.nivelDesempenho))?'Nível '+Number(row.nivelDesempenho):'—';
  const pattern=single?txt(row?.padraoDesempenho)||'—':'—';
  const dp=single?fmt(row?.desvioPadrao,1):'—';
  return `<details class="sim306-more"><summary>Mais indicadores</summary><div class="sim306-more-body"><div class="sim306-more-grid"><div class="sim306-mini"><b>${pct(agg.presPct,1)}</b><span>Presença</span></div><div class="sim306-mini"><b>${pct(agg.acerto,1)}</b><span>Acerto médio no teste</span></div><div class="sim306-mini"><b>${nivel}</b><span>Nível de desempenho${single?' da escola':''}</span></div><div class="sim306-mini"><b>${pattern}</b><span>Padrão de desempenho · DP ${dp}</span></div></div>${escala?`<div class="sim306-scales">${escala}</div>`:''}</div></details>`;
}
function turmaRowsHtml(row,year,comp){
  const turmas=row?.turmas||[];if(!turmas.length)return '<div class="sim306-empty">Não há linhas de turma disponíveis para esta escola neste componente.</div>';
  const other=(year==='4º ano'||year==='8º ano')?schoolBaseRow(row,year,comp==='LP'?'MT':'LP'):null;const otherMap=new Map((other?.turmas||[]).map(t=>[Number(t.ord),t]));
  let heads='',body='';
  if(year==='4º ano'||year==='8º ano'){
    heads='<th>Turma</th><th>Prev.</th><th>Efet.</th><th>Part.</th><th>LP</th><th>MT</th><th>Geral</th>';
    body=turmas.map(t=>{const o=otherMap.get(Number(t.ord));const lp=comp==='LP'?t:o,mt=comp==='MT'?t:o;const geral=Number.isFinite(Number(lp?.notaMedia))?Number(lp.notaMedia):Number(mt?.notaMedia);const part=Number(t.participacaoPct);return `<tr data-sim306-turma="${Number(t.ord)}"><td><button type="button">Turma ${turmaCode(year,t.ord)}</button></td><td>${integer(t.previstos)}</td><td>${integer(t.avaliados)}</td><td>${pct(part,1)}</td><td>${fmt(lp?.notaPadronizadaComponente,1)}</td><td>${fmt(mt?.notaPadronizadaComponente,1)}</td><td><b>${fmt(geral,1)}</b></td></tr>`;}).join('');
  }else{
    heads=`<th>Turma</th><th>Prev.</th><th>Efet.</th><th>Part.</th><th>Proficiência</th><th>Nível</th><th>${comp==='LP'?'Alfabetização':'ADQ + AVA'}</th>`;
    body=turmas.map(t=>`<tr data-sim306-turma="${Number(t.ord)}"><td><button type="button">Turma ${turmaCode(year,t.ord)}</button></td><td>${integer(t.previstos)}</td><td>${integer(t.avaliados)}</td><td>${pct(t.participacaoPct,1)}</td><td>${fmt(t.proficiencia,0)}</td><td>${Number.isFinite(Number(t.nivelDesempenho))?'N'+Number(t.nivelDesempenho):'—'}</td><td><b>${pct(comp==='LP'?t.alfabetizacaoPct:t.adqAv,1)}</b></td></tr>`).join('');
  }
  return `<div class="sim306-turma-wrap"><table class="sim306-turma-table"><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></div><div class="sim306-level-note">Turmas identificadas pela ordem das linhas na planilha: 1201/1202… no 2º ano, 1401/1402… no 4º e 1801/1802… no 8º. Uma única turma corresponde sempre à turma 01.</div><div class="sim306-turma-detail" id="sim306TurmaDetail" hidden></div>`;
}
function turmaDetail(row,ord,year,comp){
  const t=(row?.turmas||[]).find(x=>Number(x.ord)===Number(ord));if(!t)return;
  const host=byId('sim306TurmaDetail');if(!host)return;
  const levels=new Map((t.niveis||[]).map(n=>[txt(n[0]),Number(n[1])||0]));
  const intro=`Turma ${turmaCode(year,ord)}: ${integer(t.avaliados)} estudantes efetivos · ${pct(t.participacaoPct,1)} de participação. A base atual não contém nomes de alunos; a abertura individual será vinculada quando a coleta nominal estiver disponível.`;
  host.innerHTML=`<strong>Turma ${turmaCode(year,ord)}</strong><div style="margin-top:7px">${renderLevels(levels,intro)}</div>`;host.hidden=false;
  host.querySelectorAll('[data-sim306-level]').forEach(btn=>btn.addEventListener('click',()=>selectLevel(btn,host)));
}
function selectLevel(btn,root){
  root.querySelectorAll('.sim306-level-seg').forEach(x=>x.classList.toggle('is-selected',x===btn));
  const note=root.querySelector('[data-sim306-level-note]');if(note)note.textContent=(btn.getAttribute('aria-label')||'Nível selecionado')+'. A base agregada não contém os nomes dos estudantes deste nível.';
}
function render(){
  const card=ensureCard();if(!card)return;
  const active=byId('somModalidade')?.value==='Simulado 2026';if(!active){card.hidden=true;return;}
  let rows=[];try{rows=typeof somFilteredRows==='function'?(somFilteredRows()||[]):[];}catch(_){rows=[];}
  const year=byId('somAnoEscolar')?.value||'';const comp=byId('somComponente')?.value||'LP';const selected=uniqueSchool(rows);const row=selected?schoolBaseRow(selected,year,comp):null;
  const agg=aggregate(rows);
  card.hidden=false;
  const intro=byId('sim306Intro'),scope=byId('sim306Scope'),body=byId('sim306Body');if(!body)return;
  const region=Number(byId('regionalScopeSelect')?.value||0);const agent=byId('somAgente')?.value||'';
  const scopeLabel=row?`Escola: ${row.escola}`:(region?`CRE ${String(region).padStart(2,'0')}`:(agent&&agent!=='__all_schools__'?`Abrangência: ${agent}`:'Toda a SME'));
  if(scope)scope.textContent=`${scopeLabel} · ${year} · ${comp}`;
  if(intro)intro.textContent=row?'Aprofundamento da escola selecionada, sem alterar os indicadores executivos acima.':'Distribuição complementar do recorte atual. Selecione uma escola para abrir as turmas.';
  const levelMap=agg.levels;
  const kpis=`<div class="sim306-kpis"><div class="sim306-kpi"><b>${integer(agg.prev)}</b><span>Previstos</span></div><div class="sim306-kpi"><b>${integer(agg.pres)}</b><span>Presentes · ${pct(agg.presPct,1)}</span></div><div class="sim306-kpi"><b>${integer(agg.eff)}</b><span>Efetivos</span></div><div class="sim306-kpi"><b>${pct(agg.partPct,1)}</b><span>Participação</span></div></div>`;
  const schoolLevels=!row&&agg.schoolCount?`<div class="sim310-school-levels"><div class="sim310-level-subhead"><b>Escolas por nível de desempenho</b><span>Nível médio atribuído a cada escola na planilha da CGRA.</span></div>${renderSchoolLevels(agg.schoolLevels,agg.schoolCount)}</div>`:'';
  const studentLabel=row?'Distribuição dos estudantes por nível':'Estudantes por nível';
  const levels=`<section class="sim306-section"><div class="sim306-section-head"><div><h4>Distribuição por níveis</h4><p>Somente níveis efetivamente utilizados neste ano/componente são apresentados.</p></div></div><div class="sim310-level-subhead"><b>${studentLabel}</b><span>${row?'Estratificação dos estudantes desta escola.':'Quantidade de estudantes do recorte em cada nível.'}</span></div>${renderLevels(levelMap,row?'Clique em um nível para ver a quantidade da escola; a lista nominal ainda não existe nesta base.':'A distribuição agrega as contagens das escolas pertencentes ao recorte atual.')}${schoolLevels}</section>`;
  const turmas=row?`<section class="sim306-section"><div class="sim306-section-head"><div><h4>Desempenho por turma</h4><p>Camada intermediária entre escola e aluno. Clique em uma turma para abrir seus níveis.</p></div><span class="sim306-scope">${(row.turmas||[]).length} turma${(row.turmas||[]).length===1?'':'s'} na base</span></div>${turmaRowsHtml(row,year,comp)}</section>`:`<section class="sim306-section"><div class="sim306-empty">Para abrir o desempenho por turma, selecione uma única escola pela busca ou pelo gráfico. O panorama regional continua disponível acima.</div></section>`;
  body.innerHTML=kpis+levels+turmas+moreHtml(row,agg);
  body.querySelectorAll('[data-sim306-level]').forEach(btn=>btn.addEventListener('click',()=>selectLevel(btn,body)));
  body.querySelectorAll('tr[data-sim306-turma]').forEach(tr=>tr.addEventListener('click',()=>turmaDetail(row,tr.dataset.sim306Turma,year,comp)));
}
function wrapRender(){
  if(window.__GRA_V306_DETAIL_WRAPPED__)return;
  const prev=window.renderResultados;if(typeof prev==='function'){
    const wrapped=function(){const out=prev.apply(this,arguments);try{render();}catch(e){console.warn('v306 detalhamento',e);}return out;};
    window.renderResultados=wrapped;try{renderResultados=wrapped;}catch(_){ }
  }
  window.__GRA_V306_DETAIL_WRAPPED__=true;
}
function stamp(){
  const badge=byId('dashboardVersionBadge');if(badge)badge.textContent='v366';
  document.querySelectorAll('.gra-start-version,.exp-badge').forEach(el=>{if(/^v?\d+/i.test(el.textContent||''))el.textContent='v366';});
  document.title=document.title.replace(/\bv30[2-9]\b/ig,'v318');
}
function boot(){ensureCard();wrapRender();stamp();setTimeout(()=>{stamp();render();},0);setTimeout(()=>{stamp();render();},700);window.__GRA_V306_SIM_DETAIL__={version:'v363',render};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
