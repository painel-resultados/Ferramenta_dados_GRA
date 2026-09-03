
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const isIdeb=()=>byId('somModalidade')?.value==='IDEB 2025';
  const metric=()=>byId('somMetric')?.value||'ideb2025';
  const masterCre=()=>Number(byId('regionalScopeSelect')?.value||0);
  const priorityOn=()=>byId('somPriority')?.value==='sim';
  const getOn=()=>Boolean(byId('somGetCompareToggle')?.checked);
  const turnoOn=()=>Boolean(byId('somTurnoCompareToggle')?.checked);
  const fmtScore=v=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const fmtDelta=v=>`${Number(v)>0?'+':''}${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}`;
  const metricLabel=k=>k==='ideb2023'?'IDEB 2023':k==='crescimento'?'Progressão 2023 → 2025':'IDEB 2025';
  const escHtml=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const creNum=v=>{const m=String(v||'').match(/\d{1,2}/);return m?Number(m[0]):0;};
  const formatCre=v=>{const n=creNum(v);return n?`CRE ${String(n).padStart(2,'0')}`:(String(v||'').trim()||'CRE não informada');};
  const schoolKey=(name,cre)=>typeof window.norm==='function'?window.norm(`${formatCre(cre)}|${name}`):`${formatCre(cre)}|${name}`.toLowerCase();

  function structuralMeta(name,cre){
    let point=null,rec=null;
    try{if(typeof window.geoFindPointForSchool==='function')point=window.geoFindPointForSchool(name,cre||'');}catch(_){ }
    try{if(typeof window.somFindRecord==='function')rec=window.somFindRecord(name);}catch(_){ }
    const turnoRaw=String(point?.turnoEF||rec?.turnoEF||'').trim();
    const token=typeof window.norm==='function'?window.norm(turnoRaw):turnoRaw.toLowerCase();
    const turno=(token.includes('nao se aplica')||token.includes('não se aplica'))?'':token.includes('integral')?'Integral':token.includes('hibr')?'Híbrido':token.includes('parcial')?'Parcial':turnoRaw;
    const voc=typeof window.norm==='function'?window.norm(rec?.vocacionada||''):String(rec?.vocacionada||'').toLowerCase();
    const isGET=typeof point?.isGET==='boolean'?Boolean(point.isGET):Boolean(rec?.isGET)||voc.includes('get')||voc.includes('geo');
    return {isGET,turno};
  }
  function tagsHtml(item){
    const meta=structuralMeta(item.name,item.cre),parts=[];
    if(getOn()&&meta.isGET)parts.push('<span class="v213-tag get">GET</span>');
    if(turnoOn()&&meta.turno){
      const t=typeof window.norm==='function'?window.norm(meta.turno):meta.turno.toLowerCase();
      const cls=t.includes('integral')?'turno-integral':t.includes('hibr')?'turno-hibrido':'turno-parcial';
      parts.push(`<span class="v213-tag ${cls}">${escHtml(meta.turno)}</span>`);
    }
    return parts.join('');
  }
  function rawRows(rows){return (rows||[]).filter(r=>r&&r.escola&&!r._afCreAggregate&&r.modalidade==='IDEB 2025');}
  function itemsFromRows(rows,key=metric()){
    const grouped=new Map();
    rawRows(rows).forEach(row=>{
      const name=String(row.escola||'').trim();if(!name)return;
      const id=schoolKey(name,row.cre||row.regional||'');
      if(!grouped.has(id))grouped.set(id,[]);
      grouped.get(id).push(row);
    });
    const items=[];
    grouped.forEach((rs,id)=>{
      const first=rs[0];
      const v23s=rs.map(r=>Number(r.ideb2023)).filter(Number.isFinite),v25s=rs.map(r=>Number(r.ideb2025)).filter(Number.isFinite);
      const v23=v23s.length?v23s.reduce((a,b)=>a+b,0)/v23s.length:NaN;
      const v25=v25s.length?v25s.reduce((a,b)=>a+b,0)/v25s.length:NaN;
      const value=key==='ideb2023'?v23:key==='crescimento'?(Number.isFinite(v23)&&Number.isFinite(v25)?v25-v23:NaN):v25;
      if(!Number.isFinite(value))return;
      items.push({id,name:first.escola,cre:formatCre(first.cre||first.regional||''),value,v23,v25});
    });
    return items.sort((a,b)=>b.value-a.value||String(a.name).localeCompare(String(b.name),'pt-BR'));
  }
  function masterUniverseRows(){
    const all=(typeof SOM_ROWS!=='undefined'&&Array.isArray(SOM_ROWS))?SOM_ROWS:[];
    const segment=byId('somAnoEscolar')?.value||'',scope=masterCre();
    return all.filter(row=>{
      if(!row||row.modalidade!=='IDEB 2025'||row._afCreAggregate||!row.escola)return false;
      if(segment&&row.anoEscolar!==segment)return false;
      if(scope&&creNum(row.cre||row.regional||'')!==scope)return false;
      return true;
    });
  }
  function globalRanking(key=metric()){
    const all=itemsFromRows(masterUniverseRows(),key),map=new Map();
    all.forEach((item,index)=>map.set(item.id,index+1));
    return {all,map};
  }
  function displayValue(item,key){return key==='crescimento'?fmtDelta(item.value):fmtScore(item.value);}
  function globalPos(item,ranking,fallback){return ranking.map.get(item.id)||fallback;}
  function rankRows(items,key,ranking){
    return items.map((item,index)=>{
      const pos=globalPos(item,ranking,index+1),tags=tagsHtml(item);
      return `<div class="v210-rank-row"><span class="v210-rank-pos">${pos}</span><div class="v210-rank-school"><div class="v213-school-name-line"><strong class="v213-school-label">${escHtml(item.name)}</strong>${tags}</div><span>${escHtml(item.cre)} · <span class="v213-global-position">posição geral <b>${pos}º</b></span></span></div><span class="v210-rank-value">${displayValue(item,key)}</span></div>`;
    }).join('');
  }
  function block(kind,title,description,items,key,total,ranking){
    return `<section class="v210-rank-block ${kind}"><div class="v210-rank-head"><div><h4>${title}</h4><p>${description}</p></div><span class="v210-rank-count">${items.length} de ${total}</span></div><div class="v210-rank-list">${rankRows(items,key,ranking)}</div></section>`;
  }
  function renderPriorityMain(rows){
    const key=metric(),displayed=itemsFromRows(rows,key),ranking=globalRanking(key),target=byId('somMainChart'),title=byId('somMainTitle'),subtitle=byId('somMainSubtitle');
    if(title)title.textContent=`Escolas prioritárias — ${metricLabel(key)}`;
    if(!displayed.length){if(target)target.innerHTML='<div class="som-empty">Não há escolas prioritárias com resultado válido neste recorte.</div>';if(subtitle)subtitle.textContent='Nenhuma escola prioritária possui resultado válido para este indicador.';return;}
    const __split313=window.graSplitOddRanking(displayed,10);
    const best=__split313.best,challenge=__split313.challenge;
    const scopeLabel=byId('regionalScopeSelect')?.selectedOptions?.[0]?.textContent||'Toda a SME';
    if(subtitle)subtitle.textContent=`${displayed.length} prioritárias com resultado válido. A posição exibida é a posição real entre ${ranking.all.length} escolas gerais de ${byId('somAnoEscolar')?.value||'segmento'} em ${scopeLabel}.`;
    const note=`<div class="v213-priority-context">O número de posição <strong>não é reiniciado nas prioritárias</strong>: ele corresponde ao ranking no conjunto geral do mesmo segmento dentro do filtro Master (${escHtml(scopeLabel)}).</div>`;
    const bestTitle=key==='crescimento' ? `${best.length} ${best.length===1?'maior progressão prioritária':'maiores progressões prioritárias'} — 2023 → 2025` : `${best.length} ${best.length===1?'maior resultado prioritário':'maiores resultados prioritários'} — ${metricLabel(key)}`;
    const challengeTitle=key==='crescimento' ? `${challenge.length} ${challenge.length===1?'progressão prioritária mais desafiadora':'progressões prioritárias mais desafiadoras'} — 2023 → 2025` : `${challenge.length} ${challenge.length===1?'resultado prioritário mais desafiador':'resultados prioritários mais desafiadores'} — ${metricLabel(key)}`;
    const bestDesc=key==='crescimento'?'Prioritárias com maiores avanços; a posição numérica é relativa ao universo geral.':'Prioritárias com maiores resultados; a posição numérica é relativa ao universo geral.';
    const challengeDesc=key==='crescimento'?'Prioritárias com progressões mais desafiadoras; quedas aparecem negativas.':'Prioritárias com menores resultados; a posição numérica é relativa ao universo geral.';
    if(target)target.innerHTML=`<div class="v210-school-ranking">${note}${block('best',bestTitle,bestDesc,best,key,displayed.length,ranking)}${challenge.length?block('challenge',challengeTitle,challengeDesc,challenge,key,displayed.length,ranking):''}</div>`;
  }
  function renderCustomTable(items,key,ranking,target){
    const headers=key==='crescimento'?['Pos. geral','Escola','CRE','IDEB 2023','IDEB 2025','Progressão']:['Pos. geral','Escola','CRE',metricLabel(key),'IDEB 2023','IDEB 2025','Progressão'];
    const head=`<thead><tr>${headers.map(h=>`<th>${escHtml(h)}</th>`).join('')}</tr></thead>`;
    const body=items.map((item,index)=>{
      const pos=globalPos(item,ranking,index+1),tags=tagsHtml(item),school=`<div class="v213-table-school"><strong>${escHtml(item.name)}</strong>${tags}</div>`;
      const v23=Number.isFinite(item.v23)?fmtScore(item.v23):'—',v25=Number.isFinite(item.v25)?fmtScore(item.v25):'—',growth=Number.isFinite(item.v23)&&Number.isFinite(item.v25)?fmtDelta(item.v25-item.v23):'—';
      const cells=key==='crescimento'?[`${pos}º`,school,item.cre,v23,v25,growth]:[`${pos}º`,school,item.cre,displayValue(item,key),v23,v25,growth];
      return `<tr>${cells.map((c,i)=>`<td>${i===1?c:escHtml(c)}</td>`).join('')}</tr>`;
    }).join('');
    target.innerHTML=head+`<tbody>${body}</tbody>`;
  }
  function renderPriorityTable(rows){
    const key=metric(),displayed=itemsFromRows(rows,key),ranking=globalRanking(key),target=byId('somTable'),count=byId('somCount');if(!target)return;
    const heading=target.closest('.card')?.querySelector('.panel-title h3');if(heading)heading.textContent='Escolas prioritárias — posição no universo geral';
    if(count)count.textContent=`${displayed.length} prioritárias exibidas; posições calculadas entre ${ranking.all.length} escolas gerais do segmento no filtro Master.`;
    renderCustomTable(displayed,key,ranking,target);
  }
  function decorateRanking(){
    const target=byId('somMainChart');if(!target)return;
    [...target.querySelectorAll('.v210-rank-row')].forEach(row=>{
      const schoolBox=row.querySelector('.v210-rank-school'),strong=schoolBox?.querySelector('strong');if(!schoolBox||!strong||schoolBox.querySelector('.v213-tag'))return;
      const name=(strong.textContent||'').trim(),cre=(schoolBox.querySelector('span')?.textContent||'').split('·')[0].trim(),tags=tagsHtml({name,cre});if(!tags)return;
      let line=strong.closest('.v213-school-name-line');
      if(!line){line=document.createElement('div');line.className='v213-school-name-line';strong.parentNode.insertBefore(line,strong);line.appendChild(strong);strong.classList.add('v213-school-label');}
      line.insertAdjacentHTML('beforeend',tags);
    });
  }
  function decorateExistingTable(){
    const target=byId('somTable');if(!target)return;
    const headers=[...target.querySelectorAll('thead th')].map(th=>(th.textContent||'').trim());
    const normalized=headers.map(h=>typeof window.norm==='function'?window.norm(h):h.toLowerCase());
    const schoolIndex=normalized.findIndex(h=>h==='escola'),creIndex=normalized.findIndex(h=>h==='cre');
    if(schoolIndex<0)return; // visão regional não tem coluna Escola.
    [...target.querySelectorAll('tbody tr')].forEach(tr=>{
      const cells=tr.querySelectorAll('td');if(cells.length<=schoolIndex)return;
      const schoolCell=cells[schoolIndex],name=(schoolCell.textContent||'').trim();if(!name)return;
      const cre=creIndex>=0?(cells[creIndex]?.textContent||'').trim():'';
      schoolCell.innerHTML=`<div class="v213-table-school"><strong>${escHtml(name)}</strong>${tagsHtml({name,cre})}</div>`;
    });
  }

  const previousMain=window.renderSomMainChart;
  window.renderSomMainChart=function(rows){
    if(isIdeb()&&priorityOn())return renderPriorityMain(rows);
    const result=typeof previousMain==='function'?previousMain(rows):undefined;
    if(isIdeb()&&(getOn()||turnoOn()))setTimeout(decorateRanking,0);
    return result;
  };
  const previousTable=window.renderSomTable;
  window.renderSomTable=function(rows){
    if(isIdeb()&&priorityOn())return renderPriorityTable(rows);
    const result=typeof previousTable==='function'?previousTable(rows):undefined;
    if(isIdeb()&&(getOn()||turnoOn()))setTimeout(decorateExistingTable,0);
    return result;
  };
  function refreshBadges(){if(isIdeb()&&typeof window.renderResultados==='function')window.renderResultados();}
  function install(){
    ['somGetCompareToggle','somTurnoCompareToggle'].forEach(id=>byId(id)?.addEventListener('change',()=>setTimeout(refreshBadges,12)));
    setTimeout(refreshBadges,100);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
