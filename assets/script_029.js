
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const escHtml=value=>typeof window.esc==='function'?window.esc(String(value??'')):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normText=value=>typeof window.norm==='function'?window.norm(String(value||'')):String(value||'').toLowerCase();
  const isIdeb=()=>byId('somModalidade')?.value==='IDEB 2025';
  const metric=()=>byId('somMetric')?.value||'ideb2025';
  const masterCre=()=>Number(byId('regionalScopeSelect')?.value||0);
  const priorityOn=()=>byId('somPriority')?.value==='sim';
  const getOn=()=>Boolean(byId('somGetCompareToggle')?.checked);
  const turnoOn=()=>Boolean(byId('somTurnoCompareToggle')?.checked);
  const fmtScore=v=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const fmtDelta=v=>`${Number(v)>0?'+':''}${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}`;
  const metricLabel=key=>key==='ideb2023'?'IDEB 2023':key==='crescimento'?'Progressão 2023 → 2025':'IDEB 2025';
  const formatCre=value=>{const raw=String(value||'').trim(),m=raw.match(/\d{1,2}/);return m?`CRE ${String(Number(m[0])).padStart(2,'0')}`:(raw||'CRE não informada');};
  function allSchoolsScope(){return masterCre()===0&&(byId('somAgente')?.value||'')==='__todas_escolas__';}
  function specificAgent(){const value=byId('somAgente')?.value||'';return typeof window.somIsSpecificAgent==='function'?window.somIsSpecificAgent(value):Boolean(value&&value!=='__todas_escolas__');}
  function schoolView(){
    if(!isIdeb())return false;
    if(masterCre()>0)return true;
    if(allSchoolsScope()||specificAgent())return true;
    if(String(byId('somSearch')?.value||'').trim())return true;
    return false;
  }
  function metaFor(item){
    const rec=typeof window.somFindRecord==='function'?window.somFindRecord(item.name):null;
    const voc=normText(rec?.vocacionada||rec?.vocacao||'');
    const isGET=voc==='get'||/\bget\b/.test(voc);
    const raw=String(rec?.turnoEF||rec?.turno||'').trim();
    let turno='';
    if(/integral/i.test(raw))turno='Integral';else if(/híbr|hibr/i.test(raw))turno='Híbrido';else if(raw)turno='Parcial';
    return {isGET,turno};
  }
  function tagsHtml(item){
    const meta=metaFor(item),parts=[];
    if(getOn()&&meta.isGET)parts.push('<span class="v213-tag get">GET</span>');
    if(turnoOn()&&meta.turno){const cls=meta.turno==='Integral'?'turno-integral':meta.turno==='Híbrido'?'turno-hibrido':'turno-parcial';parts.push(`<span class="v213-tag ${cls}">${escHtml(meta.turno)}</span>`);}
    return parts.join('');
  }
  function itemsFromRows(rows,key=metric()){
    const grouped=new Map();
    (rows||[]).filter(r=>r&&r.modalidade==='IDEB 2025'&&!r._afCreAggregate&&r.escola).forEach(r=>{
      const cre=formatCre(r.cre||r.regional||''),name=String(r.escola||'').trim();if(!name)return;
      const id=normText(`${cre}|${name}`);if(!grouped.has(id))grouped.set(id,[]);grouped.get(id).push(r);
    });
    const out=[];
    grouped.forEach((rs,id)=>{
      const first=rs[0],vals23=rs.map(r=>Number(r.ideb2023)).filter(Number.isFinite),vals25=rs.map(r=>Number(r.ideb2025)).filter(Number.isFinite);
      const v23=vals23.length?vals23.reduce((a,b)=>a+b,0)/vals23.length:NaN,v25=vals25.length?vals25.reduce((a,b)=>a+b,0)/vals25.length:NaN;
      let value=key==='ideb2023'?v23:key==='crescimento'?(Number.isFinite(v23)&&Number.isFinite(v25)?v25-v23:NaN):v25;
      if(!Number.isFinite(value))return;out.push({id,name:first.escola,cre:formatCre(first.cre||first.regional||''),value,v23,v25});
    });
    return out.sort((a,b)=>b.value-a.value||String(a.name).localeCompare(String(b.name),'pt-BR'));
  }
  const displayValue=(item,key)=>key==='crescimento'?fmtDelta(item.value):fmtScore(item.value);
  function rankRows(items,key){
    return items.map((item,index)=>`<div class="v210-rank-row"><span class="v210-rank-pos">${index+1}</span><div class="v210-rank-school"><div class="v213-school-name-line"><strong class="v213-school-label">${escHtml(item.name)}</strong>${tagsHtml(item)}</div><span>${escHtml(item.cre)}</span></div><span class="v210-rank-value">${displayValue(item,key)}</span></div>`).join('');
  }
  function block(kind,title,description,items,key,total){
    return `<section class="v210-rank-block ${kind}"><div class="v210-rank-head"><div><h4>${title}</h4><p>${description}</p></div><span class="v210-rank-count">${items.length} de ${total}</span></div><div class="v210-rank-list">${rankRows(items,key)}</div></section>`;
  }
  function renderUnified(rows){
    const key=metric(),items=itemsFromRows(rows,key),target=byId('somMainChart'),title=byId('somMainTitle'),subtitle=byId('somMainSubtitle');
    const masterLabel=byId('regionalScopeSelect')?.selectedOptions?.[0]?.textContent||'Toda a SME';
    const agent=byId('somAgente')?.value||'',agentLabel=byId('somAgente')?.selectedOptions?.[0]?.textContent||'';
    let scopeLabel=allSchoolsScope()?'Todas as Escolas':(masterCre()>0?masterLabel:'Escolas do recorte');
    if(specificAgent()&&agentLabel)scopeLabel=`${scopeLabel} · ${agentLabel}`;
    if(title)title.textContent=`${scopeLabel} — ${metricLabel(key)}`;
    if(!items.length){if(subtitle)subtitle.textContent='Não há escolas com resultado válido para este recorte.';if(target)target.innerHTML='<div class="som-empty">Não há escolas com resultado válido para este recorte.</div>';return;}
    const __split313=window.graSplitOddRanking(items,10),best=__split313.best,challenge=__split313.challenge;
    const bestTitle=key==='crescimento' ? `${best.length} ${best.length===1?'maior progressão':'maiores progressões'} — 2023 → 2025` : `${best.length} ${best.length===1?'maior resultado':'maiores resultados'} — ${metricLabel(key)}`;
    const challengeTitle=key==='crescimento' ? `${challenge.length} ${challenge.length===1?'progressão mais desafiadora':'progressões mais desafiadoras'} — 2023 → 2025` : `${challenge.length} ${challenge.length===1?'resultado mais desafiador':'resultados mais desafiadores'} — ${metricLabel(key)}`;
    const bestDesc=key==='crescimento'?'Escolas com os maiores avanços entre resultados pareados de 2023 e 2025.':`Escolas com os maiores valores de ${metricLabel(key)} no universo selecionado.`;
    const challengeDesc=key==='crescimento'?'Escolas com as progressões mais desafiadoras; quedas aparecem com valor negativo.':`Escolas com os menores valores de ${metricLabel(key)} no universo selecionado.`;
    if(subtitle)subtitle.textContent=`${items.length.toLocaleString('pt-BR')} escolas com resultado válido em ${scopeLabel}.`;
    const note=masterCre()>0?`<div class="v214-scope-note">O <strong>filtro Master ${escHtml(masterLabel)}</strong> define o universo. A leitura abaixo usa a mesma identidade visual da visão escolar da SME.</div>`:'';
    if(target)target.innerHTML=`<div class="v210-school-ranking">${note}${block('best',bestTitle,bestDesc,best,key,items.length)}${challenge.length?block('challenge',challengeTitle,challengeDesc,challenge,key,items.length):''}<div class="v210-all-schools-note">A lista completa de todas as escolas deste recorte está logo abaixo, em <strong>Lista detalhada</strong>, com rolagem vertical.</div></div>`;
  }
  const previousMain=window.renderSomMainChart;
  window.renderSomMainChart=function(rows){
    if(isIdeb()&&!priorityOn()&&schoolView())return renderUnified(rows);
    return typeof previousMain==='function'?previousMain(rows):undefined;
  };
  const previousTable=window.renderSomTable;
  window.renderSomTable=function(rows){
    const result=typeof previousTable==='function'?previousTable(rows):undefined;
    if(isIdeb()&&masterCre()>0&&!priorityOn()){
      const heading=byId('somTable')?.closest('.card')?.querySelector('.panel-title h3');
      const masterLabel=byId('regionalScopeSelect')?.selectedOptions?.[0]?.textContent||`CRE ${String(masterCre()).padStart(2,'0')}`;
      if(heading)heading.textContent=`Todas as Escolas — ${masterLabel} · lista completa`;
    }
    return result;
  };
  function install(){
    const badge=byId('dashboardVersionBadge');if(badge)badge.textContent='v366';
    document.querySelectorAll('.exp-badge').forEach(b=>b.textContent='v366');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
