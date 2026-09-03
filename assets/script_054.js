
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const isIdeb=()=>byId('somModalidade')?.value==='IDEB 2025';
  const getOn=()=>Boolean(byId('somGetCompareToggle')?.checked);
  const turnoOn=()=>Boolean(byId('somTurnoCompareToggle')?.checked);
  const priorityOn=()=>byId('somPriority')?.value==='sim';
  const metric=()=>byId('somMetric')?.value||'ideb2025';
  const masterCre=()=>Number(byId('regionalScopeSelect')?.value||0);
  const escHtml=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>typeof window.norm==='function'?window.norm(String(v||'')):String(v||'').toLowerCase();
  const creNum=v=>{const m=String(v||'').match(/\d{1,2}/);return m?Number(m[0]):0;};
  const formatCre=v=>{const n=creNum(v);return n?`CRE ${String(n).padStart(2,'0')}`:(String(v||'').trim()||'CRE não informada');};
  const schoolKey=(name,cre)=>norm(`${formatCre(cre)}|${name}`);
  const fmtScore=v=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const fmtDelta=v=>`${Number(v)>0?'+':''}${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}`;
  const metricLabel=k=>k==='ideb2023'?'IDEB 2023':k==='crescimento'?'Progressão 2023 → 2025':'IDEB 2025';

  function structuralMeta(item){
    let point=null,rec=null;
    try{if(typeof window.geoFindPointForSchool==='function')point=window.geoFindPointForSchool(item.name,item.cre||'');}catch(_){ }
    try{if(typeof window.somFindRecord==='function')rec=window.somFindRecord(item.name);}catch(_){ }
    const voc=norm(rec?.vocacionada||'');
    /* Usa exatamente a mesma regra do gráfico comparativo GET x não GET. */
    const isGET=Boolean(rec)&&voc==='get';
    const turnoRaw=String(point?.turnoEF||rec?.turnoEF||rec?.turno||'').trim();
    const t=norm(turnoRaw);
    const turno=(t.includes('nao se aplica')||t.includes('não se aplica'))?'':t.includes('integral')?'Integral':t.includes('hibr')?'Híbrido':t.includes('parcial')?'Parcial':turnoRaw;
    return {isGET,turno};
  }
  function tagsHtml(item){
    const meta=structuralMeta(item),parts=['<span class="v213-tag get">GET</span>'];
    if(turnoOn()&&meta.turno){
      const t=norm(meta.turno),cls=t.includes('integral')?'turno-integral':t.includes('hibr')?'turno-hibrido':'turno-parcial';
      parts.push(`<span class="v213-tag ${cls}">${escHtml(meta.turno)}</span>`);
    }
    return parts.join('');
  }
  function itemsFromRows(rows,key=metric()){
    const grouped=new Map();
    (rows||[]).filter(r=>r&&r.modalidade==='IDEB 2025'&&!r._afCreAggregate&&r.escola).forEach(r=>{
      const name=String(r.escola||'').trim();if(!name)return;
      const id=schoolKey(name,r.cre||r.regional||'');
      if(!grouped.has(id))grouped.set(id,[]);
      grouped.get(id).push(r);
    });
    const out=[];
    grouped.forEach((rs,id)=>{
      const first=rs[0],v23s=rs.map(r=>Number(r.ideb2023)).filter(Number.isFinite),v25s=rs.map(r=>Number(r.ideb2025)).filter(Number.isFinite);
      const v23=v23s.length?v23s.reduce((a,b)=>a+b,0)/v23s.length:NaN;
      const v25=v25s.length?v25s.reduce((a,b)=>a+b,0)/v25s.length:NaN;
      const value=key==='ideb2023'?v23:key==='crescimento'?(Number.isFinite(v23)&&Number.isFinite(v25)?v25-v23:NaN):v25;
      if(!Number.isFinite(value))return;
      out.push({id,name:first.escola,cre:formatCre(first.cre||first.regional||''),value,v23,v25});
    });
    return out.sort((a,b)=>b.value-a.value||String(a.name).localeCompare(String(b.name),'pt-BR'));
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
  const displayValue=(item,key)=>key==='crescimento'?fmtDelta(item.value):fmtScore(item.value);
  const globalPos=(item,ranking,fallback)=>ranking.map.get(item.id)||fallback;
  function getItems(rows,key){return itemsFromRows(rows,key).filter(item=>structuralMeta(item).isGET);}
  function titleFor(kind,count,key){
    const n=Number(count)||0;
    if(key==='crescimento'){
      if(kind==='best')return `${n} ${n===1?'maior progressão GET':'maiores progressões GET'} — 2023 → 2025`;
      return `${n} ${n===1?'progressão GET mais desafiadora':'progressões GET mais desafiadoras'} — 2023 → 2025`;
    }
    if(kind==='best')return `${n} ${n===1?'maior resultado GET':'maiores resultados GET'} — ${metricLabel(key)}`;
    return `${n} ${n===1?'resultado GET mais desafiador':'resultados GET mais desafiadores'} — ${metricLabel(key)}`;
  }
  function rankRows(items,key,ranking){
    return items.map((item,index)=>{
      const pos=globalPos(item,ranking,index+1);
      return `<div class="v210-rank-row"><span class="v210-rank-pos">${pos}</span><div class="v210-rank-school"><div class="v213-school-name-line"><strong class="v213-school-label">${escHtml(item.name)}</strong>${tagsHtml(item)}</div><span>${escHtml(item.cre)} · <span class="v213-global-position">posição geral <b>${pos}º</b></span></span></div><span class="v210-rank-value">${displayValue(item,key)}</span></div>`;
    }).join('');
  }
  function block(kind,title,description,items,key,total,ranking){
    return `<section class="v210-rank-block ${kind}"><div class="v210-rank-head"><div><h4>${title}</h4><p>${description}</p></div><span class="v210-rank-count">${items.length} de ${total}</span></div><div class="v210-rank-list">${rankRows(items,key,ranking)}</div></section>`;
  }
  function renderGetMain(rows){
    const key=metric(),displayed=getItems(rows,key),ranking=globalRanking(key),target=byId('somMainChart'),title=byId('somMainTitle'),subtitle=byId('somMainSubtitle');
    const scopeLabel=byId('regionalScopeSelect')?.selectedOptions?.[0]?.textContent||'Toda a SME';
    const priorityLabel=priorityOn()?' prioritárias':'';
    if(title)title.textContent=`Escolas GET${priorityLabel} — ${metricLabel(key)}`;
    if(!displayed.length){
      if(subtitle)subtitle.textContent='Não há escolas GET com resultado válido neste recorte.';
      if(target)target.innerHTML='<div class="som-empty">Não há escolas GET com resultado válido neste recorte.</div>';
      return;
    }
    const __split313=window.graSplitOddRanking(displayed,10);
    const best=__split313.best,challenge=__split313.challenge;
    if(subtitle)subtitle.textContent=`${displayed.length} escolas GET com resultado válido. As posições são calculadas entre ${ranking.all.length} escolas gerais do segmento em ${scopeLabel}.`;
    const note=`<div class="v218-get-context">Com <strong>GET × não GET</strong> ligado, os gráficos comparativos continuam mostrando os dois grupos. O ranking abaixo exibe somente as <strong>GETs</strong>, preservando a posição de cada uma no conjunto geral do filtro Master (${escHtml(scopeLabel)}).</div>`;
    const bestDesc=key==='crescimento'?'GETs com maiores avanços; a posição numérica é relativa ao universo geral.':'GETs com maiores resultados; a posição numérica é relativa ao universo geral.';
    const challengeDesc=key==='crescimento'?'GETs com progressões mais desafiadoras; quedas aparecem negativas.':'GETs com menores resultados; a posição numérica é relativa ao universo geral.';
    if(target)target.innerHTML=`<div class="v210-school-ranking">${note}${block('best',titleFor('best',best.length,key),bestDesc,best,key,displayed.length,ranking)}${challenge.length?block('challenge',titleFor('challenge',challenge.length,key),challengeDesc,challenge,key,displayed.length,ranking):''}<div class="v210-all-schools-note">A lista completa das escolas GET deste recorte está logo abaixo, em <strong>Lista detalhada</strong>, com rolagem vertical.</div></div>`;
  }
  function renderGetTable(rows){
    const key=metric(),displayed=getItems(rows,key),ranking=globalRanking(key),target=byId('somTable'),count=byId('somCount');if(!target)return;
    const heading=target.closest('.card')?.querySelector('.panel-title h3');if(heading)heading.textContent='Escolas GET — posição no universo geral';
    if(count)count.textContent=`${displayed.length} escolas GET exibidas; posições calculadas entre ${ranking.all.length} escolas gerais do segmento no filtro Master.`;
    const headers=key==='crescimento'?['Pos. geral','Escola','CRE','IDEB 2023','IDEB 2025','Progressão']:['Pos. geral','Escola','CRE',metricLabel(key),'IDEB 2023','IDEB 2025','Progressão'];
    const head=`<thead><tr>${headers.map(h=>`<th>${escHtml(h)}</th>`).join('')}</tr></thead>`;
    const body=displayed.map((item,index)=>{
      const pos=globalPos(item,ranking,index+1),school=`<div class="v213-table-school"><strong>${escHtml(item.name)}</strong>${tagsHtml(item)}</div>`;
      const v23=Number.isFinite(item.v23)?fmtScore(item.v23):'—',v25=Number.isFinite(item.v25)?fmtScore(item.v25):'—',growth=Number.isFinite(item.v23)&&Number.isFinite(item.v25)?fmtDelta(item.v25-item.v23):'—';
      const cells=key==='crescimento'?[`${pos}º`,school,item.cre,v23,v25,growth]:[`${pos}º`,school,item.cre,displayValue(item,key),v23,v25,growth];
      return `<tr>${cells.map((c,i)=>`<td>${i===1?c:escHtml(c)}</td>`).join('')}</tr>`;
    }).join('');
    target.innerHTML=head+`<tbody>${body}</tbody>`;
  }
  const previousMain=window.renderSomMainChart;
  window.renderSomMainChart=function(rows){
    if(isIdeb()&&getOn())return renderGetMain(rows);
    return typeof previousMain==='function'?previousMain(rows):undefined;
  };
  const previousTable=window.renderSomTable;
  window.renderSomTable=function(rows){
    if(isIdeb()&&getOn())return renderGetTable(rows);
    return typeof previousTable==='function'?previousTable(rows):undefined;
  };
})();
