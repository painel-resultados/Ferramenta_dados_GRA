
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const escHtml=v=>typeof window.esc==='function'?window.esc(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const nrm=v=>typeof window.norm==='function'?window.norm(String(v||'')):String(v||'').toLowerCase();
  const metric=()=>byId('adrMetric')?.value||'adequado';
  const mode=()=>byId('adrMode')?.value||'individual';
  const getOn=()=>Boolean(byId('adrGetCompareToggle')?.checked);
  const turnoOn=()=>Boolean(byId('adrTurnoCompareToggle')?.checked);
  const priorityOn=()=>byId('adrPriority')?.value==='sim';
  const masterCre=()=>Number(byId('regionalScopeSelect')?.value||0);
  const lower=k=>typeof window.adrLowerIsBetter==='function'?window.adrLowerIsBetter(k):k==='abaixo';
  const label=k=>typeof window.adrMetricLabel==='function'?window.adrMetricLabel(k):k;
  const pct=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%':'—';
  const delta=v=>Number.isFinite(Number(v))?`${Number(v)>0?'+':''}${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} p.p.`:'—';
  const creNum=v=>{const m=String(v||'').match(/\d{1,2}/);return m?Number(m[0]):0;};
  const formatCre=v=>{const n=creNum(v);return n?`CRE ${String(n).padStart(2,'0')}`:(String(v||'').trim()||'CRE não informada');};
  const idFor=(name,cre)=>nrm(`${formatCre(cre)}|${name}`);
  function meta(name,cre){
    let point=null,rec=null;
    try{if(typeof window.geoFindPointForSchool==='function')point=window.geoFindPointForSchool(name,cre||'');}catch(_){ }
    try{if(typeof window.somFindRecord==='function')rec=window.somFindRecord(name);}catch(_){ }
    const vocational=nrm(rec?.vocacionada||rec?.vocacao||'');
    const isGET=typeof point?.isGET==='boolean'?Boolean(point.isGET):(vocational.includes('get')||vocational.includes('geo'));
    const raw=String(point?.turnoEF||rec?.turnoEF||rec?.turno||'').trim();
    let turno=''; if(/integral/i.test(raw))turno='Integral';else if(/híbr|hibr/i.test(raw))turno='Híbrido';else if(raw)turno='Parcial';
    return {isGET,turno};
  }
  function tags(item){
    const m=item.meta||meta(item.name,item.cre),out=[];
    if(getOn()&&m.isGET)out.push('<span class="v213-tag get">GET</span>');
    if(turnoOn()&&m.turno){const cls=m.turno==='Integral'?'turno-integral':m.turno==='Híbrido'?'turno-hibrido':'turno-parcial';out.push(`<span class="v213-tag ${cls}">${escHtml(m.turno)}</span>`);}
    return out.join('');
  }
  function masterRows(){
    const ano=byId('adrAno')?.value||'',comp=byId('adrComp')?.value||'',adr=byId('adrSelect')?.value||'',m=mode(),scope=masterCre();
    const base=(typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS))?ADR_ROWS:[];
    return base.filter(r=>{
      if(ano&&r.ano!==ano)return false;
      if(comp&&r.componente!==comp)return false;
      if(m==='individual'&&adr&&r.adr!==adr)return false;
      if(scope&&creNum(r.regional||r.cre||'')!==scope)return false;
      return Boolean(r.escola);
    });
  }
  function weighted(rows,key){
    if(typeof window.adrWeightAvg==='function')return window.adrWeightAvg(rows,key);
    let sw=0,sv=0; rows.forEach(r=>{const v=Number(r?.[key]),w=Math.max(1,Number(r?.avaliados)||1);if(Number.isFinite(v)){sw+=w;sv+=v*w;}}); return sw?sv/sw:NaN;
  }
  function individualItems(rows,key){
    const groups=new Map();
    (rows||[]).forEach(r=>{const v=Number(r?.[key]);if(!r?.escola||!Number.isFinite(v))return;const id=idFor(r.escola,r.regional);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(r);});
    const out=[...groups.entries()].map(([id,rs])=>{const first=rs[0],value=weighted(rs,key);if(!Number.isFinite(Number(value)))return null;return {id,name:first.escola,cre:formatCre(first.regional),agent:typeof window.adrRowAgent==='function'?(window.adrRowAgent(first)||'—'):'—',value,adr:first.adr||'',meta:meta(first.escola,first.regional)};}).filter(Boolean);
    return out.sort((a,b)=>{const d=lower(key)?a.value-b.value:b.value-a.value;return d||String(a.name).localeCompare(String(b.name),'pt-BR');});
  }
  function progressItems(rows,key){
    const groups=new Map();
    (rows||[]).forEach(r=>{if(!r?.escola||!['ADR 1','ADR 2'].includes(r.adr))return;const id=idFor(r.escola,r.regional);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(r);});
    const out=[];
    groups.forEach((rs,id)=>{
      const r1=rs.filter(r=>r.adr==='ADR 1'&&Number.isFinite(Number(r?.[key]))),r2=rs.filter(r=>r.adr==='ADR 2'&&Number.isFinite(Number(r?.[key])));if(!r1.length||!r2.length)return;
      const v1=weighted(r1,key),v2=weighted(r2,key);if(!Number.isFinite(Number(v1))||!Number.isFinite(Number(v2)))return;
      const rawDelta=Number(v2)-Number(v1),progresso=lower(key)?-rawDelta:rawDelta,first=r2[0]||r1[0];
      out.push({id,name:first.escola,cre:formatCre(first.regional),agent:typeof window.adrRowAgent==='function'?(window.adrRowAgent(first)||'—'):'—',v1:Number(v1),v2:Number(v2),rawDelta,progresso,value:progresso,meta:meta(first.escola,first.regional)});
    });
    return out.sort((a,b)=>b.progresso-a.progresso||String(a.name).localeCompare(String(b.name),'pt-BR'));
  }
  function items(rows,key){return mode()==='progressao'?progressItems(rows,key):individualItems(rows,key);}
  function generalRanking(key){const all=items(masterRows(),key),map=new Map();all.forEach((x,i)=>map.set(x.id,i+1));return {all,map};}
  function visibleItems(rows,key){let out=items(rows,key);if(getOn())out=out.filter(x=>x.meta?.isGET);return out;}
  function split(list){const total=list.length;if(total<=1)return {best:list.slice(),challenge:[],total};const n=total>=20?10:Math.floor(total/2);return {best:list.slice(0,n),challenge:list.slice(total-n).reverse(),total};}
  function scopeDescription(totalGeneral){
    const master=byId('regionalScopeSelect')?.selectedOptions?.[0]?.textContent||'Toda a SME';
    if(getOn())return `Somente GETs são listadas; a posição permanece relativa às ${totalGeneral} escolas gerais comparáveis de ${master}.`;
    if(priorityOn())return `Somente prioritárias são listadas; a posição permanece relativa às ${totalGeneral} escolas gerais comparáveis de ${master}.`;
    const ag=byId('adrAgente')?.value||'',agLabel=byId('adrAgente')?.selectedOptions?.[0]?.textContent||'';
    if(ag&&ag!=='__todas_escolas__')return `Recorte do agente ${agLabel}; a posição permanece relativa às ${totalGeneral} escolas gerais comparáveis de ${master}.`;
    return `Ranking escolar no universo de ${master}; posição calculada no conjunto geral comparável do mesmo ano, componente e indicador.`;
  }
  function titlePrefix(){if(getOn())return 'GETs';if(priorityOn())return 'prioritárias';return 'escolas';}
  function bestTitle(n,key){if(mode()==='progressao')return `${n} ${n===1?'maior progressão':'maiores progressões'} — ADR 1 → ADR 2`;return `${n} ${n===1?'melhor resultado':'melhores resultados'} — ${label(key)}`;}
  function challengeTitle(n,key){if(mode()==='progressao')return `${n} ${n===1?'progressão mais desafiadora':'progressões mais desafiadoras'} — ADR 1 → ADR 2`;return `${n} ${n===1?'resultado mais desafiador':'resultados mais desafiadores'} — ${label(key)}`;}
  function rowHtml(item,index,key,ranking){
    const pos=ranking.map.get(item.id)||index+1,tg=tags(item);
    let sub='';
    if(mode()==='progressao')sub=`<span class="v218-adr-progress-values"><strong>ADR 1: ${pct(item.v1)}</strong><span>→</span><strong>ADR 2: ${pct(item.v2)}</strong><span>Variação: ${delta(item.rawDelta)}</span></span> · posição geral <b>${pos}º</b>`;
    else sub=`${escHtml(item.cre)} · ${escHtml(item.agent)} · ${escHtml(item.adr)} · posição geral <b>${pos}º</b>`;
    const right=mode()==='progressao'?delta(item.progresso):pct(item.value);
    return `<div class="v210-rank-row"><span class="v210-rank-pos">${pos}</span><div class="v210-rank-school"><div class="v213-school-name-line"><strong class="v213-school-label">${escHtml(item.name)}</strong>${tg}</div><span class="v218-adr-row-sub">${sub}</span></div><span class="v210-rank-value">${right}</span></div>`;
  }
  function block(kind,title,desc,list,key,total,ranking){return `<section class="v210-rank-block ${kind}"><div class="v210-rank-head"><div><h4>${escHtml(title)}</h4><p>${escHtml(desc)}</p></div><span class="v210-rank-count">${list.length} de ${total}</span></div><div class="v210-rank-list">${list.map((x,i)=>rowHtml(x,i,key,ranking)).join('')}</div></section>`;}
  const oldSchool=window.renderADRSchoolBars;
  window.renderADRSchoolBars=function(rows){
    const key=metric(),shown=visibleItems(rows,key),ranking=generalRanking(key),sp=split(shown),target=byId('adrSchoolBars');if(!target)return typeof oldSchool==='function'?oldSchool(rows):undefined;
    target.className='bars adr-school-list v218-adr-ranking';
    const title=byId('adrSchoolTitle'),subtitle=byId('adrSchoolSubtitle');
    const context=byId('adrSchoolContext');
    if(context){const strong=context.querySelector('strong');if(shown.length===1){if(strong)strong.textContent=shown[0].name;context.hidden=false;}else{if(strong)strong.textContent='';context.hidden=true;}}
    if(title)title.textContent=mode()==='progressao'?`Progressão das ${titlePrefix()} — ${label(key)}`:`Ranking das ${titlePrefix()} — ${label(key)}`;
    if(subtitle)subtitle.textContent=shown.length?`${shown.length} escolas exibidas; posição calculada entre ${ranking.all.length} escolas gerais comparáveis.`:'Não há escolas comparáveis neste recorte.';
    if(!shown.length){target.innerHTML='<div class="adr-empty">Não há escolas com dados comparáveis para este recorte.</div>';return;}
    const noteClass=getOn()?'get':priorityOn()?'priority':'';
    const note=`<div class="v218-adr-scope-note ${noteClass}">${escHtml(scopeDescription(ranking.all.length))}</div>`;
    const lowerNote=key==='abaixo'?' Em Abaixo do Básico, menor percentual é melhor.':'';
    const bestDesc=mode()==='progressao'?`Maior evolução favorável no indicador selecionado.${lowerNote}`:(lower(key)?'Menores percentuais no indicador selecionado.':'Maiores percentuais no indicador selecionado.');
    const challengeDesc=mode()==='progressao'?`Menor evolução ou maior regressão no indicador selecionado.${lowerNote}`:(lower(key)?'Maiores percentuais no indicador selecionado.':'Menores percentuais no indicador selecionado.');
    target.innerHTML=`<div class="v210-school-ranking">${note}${block('best',bestTitle(sp.best.length,key),bestDesc,sp.best,key,shown.length,ranking)}${sp.challenge.length?block('challenge',challengeTitle(sp.challenge.length,key),challengeDesc,sp.challenge,key,shown.length,ranking):''}<div class="v210-all-schools-note">A lista completa deste recorte está logo abaixo, em <strong>Lista detalhada</strong>.</div></div>`;
  };
  function renderTable(rows){
    const key=metric(),shown=visibleItems(rows,key),ranking=generalRanking(key),target=byId('adrTable'),count=byId('adrCount');if(!target)return;
    const heading=target.closest('.card')?.querySelector('.panel-title h3');if(heading)heading.textContent=mode()==='progressao'?`Lista detalhada — progressão das ${titlePrefix()}`:`Lista detalhada — ${titlePrefix()}`;
    if(count)count.textContent=`${shown.length} escolas exibidas; posições relativas a ${ranking.all.length} escolas gerais comparáveis no filtro Master.`;
    const headers=mode()==='progressao'?['Pos. geral','Escola','CRE','Agente','ADR 1','ADR 2','Variação real','Evolução favorável']:['Pos. geral','Escola','CRE','Agente','ADR',label(key)];
    const body=shown.map((x,i)=>{
      const pos=ranking.map.get(x.id)||i+1,school=`<div class="v218-table-school"><strong>${escHtml(x.name)}</strong>${tags(x)}</div>`;
      const vals=mode()==='progressao'?[`${pos}º`,school,x.cre,x.agent,pct(x.v1),pct(x.v2),delta(x.rawDelta),delta(x.progresso)]:[`${pos}º`,school,x.cre,x.agent,x.adr,pct(x.value)];
      return '<tr>'+vals.map((v,j)=>`<td${j===0?' class="v218-pos"':''}>${j===1?v:escHtml(v)}</td>`).join('')+'</tr>';
    }).join('');
    target.innerHTML='<thead><tr>'+headers.map(h=>`<th>${escHtml(h)}</th>`).join('')+'</tr></thead><tbody>'+body+'</tbody>';
  }
  window.renderADRTable=renderTable;
  function install(){
    const badge=byId('dashboardVersionBadge');if(badge)badge.textContent='v366';
    document.querySelectorAll('.exp-badge').forEach(b=>b.textContent='v366');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
