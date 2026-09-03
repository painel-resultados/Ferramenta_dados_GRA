
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const isIdeb=()=>byId('somModalidade')?.value==='IDEB 2025';
  const metric=()=>byId('somMetric')?.value||'ideb2025';
  const scope=()=>Number(byId('regionalScopeSelect')?.value||0);
  const allSchools=()=>scope()===0 && (byId('somAgente')?.value||'')==='__todas_escolas__';
  const hasSchoolDetail=()=>{
    const agent=byId('somAgente')?.value||'';
    const specific=typeof window.somIsSpecificAgent==='function'?window.somIsSpecificAgent(agent):Boolean(agent&&agent!=='__todas_escolas__');
    return allSchools() || specific || Boolean(String(byId('somSearch')?.value||'').trim()) || byId('somPriority')?.value==='sim';
  };
  const pureRegional=()=>isIdeb()&&scope()===0&&!hasSchoolDetail();
  const formatCre=value=>{
    const raw=String(value||'').trim();
    const m=raw.match(/\d{1,2}/);
    return m?`CRE ${String(Number(m[0])).padStart(2,'0')}`:(raw||'CRE não informada');
  };
  const creNum=value=>{const m=String(value||'').match(/\d{1,2}/);return m?Number(m[0]):0;};
  const fmtScore=value=>Number(value).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const fmtDelta=value=>`${Number(value)>0?'+':''}${Number(value).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}`;
  const metricLabel=key=>key==='ideb2023'?'IDEB 2023':key==='crescimento'?'Progressão 2023 → 2025':'IDEB 2025';

  function rawSchoolRows(rows){
    return (rows||[]).filter(row=>row&&row.escola&&!row._afCreAggregate&&row.modalidade==='IDEB 2025');
  }
  function schoolItems(rows,key=metric()){
    const grouped=new Map();
    rawSchoolRows(rows).forEach(row=>{
      const cre=formatCre(row.cre||row.regional||'');
      const name=String(row.escola||'').trim();
      if(!name)return;
      const id=(typeof window.norm==='function'?window.norm(`${cre}|${name}`):`${cre}|${name}`.toLowerCase());
      if(!grouped.has(id))grouped.set(id,[]);
      grouped.get(id).push(row);
    });
    const out=[];
    grouped.forEach(rs=>{
      const first=rs[0];
      const vals23=rs.map(r=>Number(r.ideb2023)).filter(Number.isFinite);
      const vals25=rs.map(r=>Number(r.ideb2025)).filter(Number.isFinite);
      const v23=vals23.length?vals23.reduce((a,b)=>a+b,0)/vals23.length:NaN;
      const v25=vals25.length?vals25.reduce((a,b)=>a+b,0)/vals25.length:NaN;
      let value=NaN;
      if(key==='crescimento'){
        // Progressão só existe para a mesma escola com resultados válidos nos dois anos.
        if(Number.isFinite(v23)&&Number.isFinite(v25))value=v25-v23;
      }else if(key==='ideb2023') value=v23;
      else value=v25;
      if(!Number.isFinite(value))return;
      out.push({name:first.escola,cre:formatCre(first.cre||first.regional||''),agent:typeof window.somRowAgent==='function'?window.somRowAgent(first):(first.agente||''),value,v23,v25});
    });
    return out.sort((a,b)=>b.value-a.value||String(a.name).localeCompare(String(b.name),'pt-BR'));
  }
  function regionalItems(rows,key=metric()){
    const grouped=new Map();
    (rows||[]).filter(row=>row&&row.modalidade==='IDEB 2025').forEach(row=>{
      const n=creNum(row.cre||row.regional||row._creLabel||'');
      if(!n)return;
      if(!grouped.has(n))grouped.set(n,[]);
      grouped.get(n).push(row);
    });
    const result=[];
    [...grouped.entries()].sort((a,b)=>a[0]-b[0]).forEach(([n,rs])=>{
      const schools=rawSchoolRows(rs);
      let v23=NaN,v25=NaN,count=0;
      if(key==='crescimento'){
        const paired=schoolItems(schools,'crescimento');
        if(!paired.length)return;
        v23=paired.reduce((s,x)=>s+x.v23,0)/paired.length;
        v25=paired.reduce((s,x)=>s+x.v25,0)/paired.length;
        count=paired.length;
      }else{
        const aggregate=rs.filter(r=>r._afCreAggregate);
        const source=aggregate.length?aggregate:rs;
        const key23=source.map(r=>Number(r.ideb2023)).filter(Number.isFinite);
        const key25=source.map(r=>Number(r.ideb2025)).filter(Number.isFinite);
        v23=key23.length?key23.reduce((a,b)=>a+b,0)/key23.length:NaN;
        v25=key25.length?key25.reduce((a,b)=>a+b,0)/key25.length:NaN;
        count=new Set(schools.map(r=>String(r.codigoSME||r.codigoINEP||r.escola))).size||source.length;
      }
      const value=key==='ideb2023'?v23:key==='crescimento'?(v25-v23):v25;
      if(Number.isFinite(value))result.push({n,cre:`CRE ${String(n).padStart(2,'0')}`,value,v23,v25,count});
    });
    return result;
  }
  function challengeTitle(count,key){ const n=Math.max(0,Number(count)||0); return key==='crescimento' ? `${n} ${n===1?'progressão mais desafiadora':'progressões mais desafiadoras'} — 2023 → 2025` : `${n} ${n===1?'resultado mais desafiador':'resultados mais desafiadores'} — ${metricLabel(key)}`; }
  function bestTitle(count,key){ const n=Math.max(0,Number(count)||0); return key==='crescimento' ? `${n} ${n===1?'maior progressão':'maiores progressões'} — 2023 → 2025` : `${n} ${n===1?'maior resultado':'maiores resultados'} — ${metricLabel(key)}`; }
  function displayValue(item,key){return key==='crescimento'?fmtDelta(item.value):fmtScore(item.value);}
  function rankBlock(kind,title,description,items,key,total){
    const rows=items.map((item,index)=>`<div class="v210-rank-row"><span class="v210-rank-pos">${index+1}</span><div class="v210-rank-school"><strong>${typeof window.esc==='function'?window.esc(item.name):item.name}</strong><span>${typeof window.esc==='function'?window.esc(item.cre):item.cre}</span></div><span class="v210-rank-value">${displayValue(item,key)}</span></div>`).join('');
    return `<section class="v210-rank-block ${kind}"><div class="v210-rank-head"><div><h4>${title}</h4><p>${description}</p></div><span class="v210-rank-count">${items.length} de ${total}</span></div><div class="v210-rank-list">${rows}</div></section>`;
  }
  function renderAllSchoolsMain(rows){
    const key=metric(),items=schoolItems(rows,key),target=byId('somMainChart');
    const title=byId('somMainTitle'),subtitle=byId('somMainSubtitle');
    if(title)title.textContent=`Todas as Escolas — ${metricLabel(key)}`;
    if(!items.length){
      if(subtitle)subtitle.textContent='Não há escolas com resultado válido para este recorte.';
      if(target)target.innerHTML='<div class="som-empty">Não há escolas com resultado válido para este recorte.</div>';
      return;
    }
    const __split313=window.graSplitOddRanking(items,10);
    const best=__split313.best;
    const challenge=__split313.challenge;
    const bestDesc=key==='crescimento'?'Escolas com os maiores avanços entre os resultados pareados de 2023 e 2025.':`Escolas com os maiores valores de ${metricLabel(key)} no universo selecionado.`;
    const challengeDesc=key==='crescimento'?'Escolas com as progressões mais desafiadoras; quedas aparecem com valor negativo.':`Escolas com os menores valores de ${metricLabel(key)} no universo selecionado.`;
    if(subtitle)subtitle.textContent=`${items.length.toLocaleString('pt-BR')} escolas com resultado válido. A CRE aparece junto ao nome de cada unidade.`;
    if(target)target.innerHTML=`<div class="v210-school-ranking">${rankBlock('best',bestTitle(best.length,key),bestDesc,best,key,items.length)}${challenge.length?rankBlock('challenge',challengeTitle(challenge.length,key),challengeDesc,challenge,key,items.length):''}<div class="v210-all-schools-note">A lista completa de todas as escolas do recorte está logo abaixo, em <strong>Lista detalhada</strong>, com rolagem vertical.</div></div>`;
  }

  const previousMain=window.renderSomMainChart;
  window.renderSomMainChart=function(rows){
    if(isIdeb()&&allSchools())return renderAllSchoolsMain(rows);
    return typeof previousMain==='function'?previousMain(rows):undefined;
  };

  const previousCre=window.renderSomCreChart;
  window.renderSomCreChart=function(){
    const card=byId('somCreCompareCard');
    if(isIdeb()&&allSchools()){
      if(card)card.style.display='none';
      if(byId('somCreChart'))byId('somCreChart').innerHTML='';
      return;
    }
    if(card)card.style.removeProperty('display');
    return typeof previousCre==='function'?previousCre():undefined;
  };

  function renderSchoolDonut(rows){
    const key=metric(),items=schoolItems(rows,key),donut=byId('somPie'),legend=byId('somPieLegend'),subtitle=byId('somPieSubtitle');
    const title=donut?.closest('.card')?.querySelector('.panel-title h3');
    if(title)title.textContent='Distribuição das escolas';
    if(items.length<3){
      if(donut)donut.innerHTML='<div class="v172-pie-empty">Este recorte não possui pelo menos três escolas com resultado válido para formar estratos.</div>';
      if(legend)legend.innerHTML='';
      if(subtitle)subtitle.textContent='Estratos indisponíveis para este recorte.';
      return;
    }
    const sorted=items.slice().sort((a,b)=>b.value-a.value);
    const q=Math.floor(sorted.length/3),r=sorted.length%3,sizes=[q+(r>0?1:0),q+(r>1?1:0),q];
    const names=['Faixa superior','Faixa intermediária','Faixa mais desafiadora'];
    let cursor=0;
    const strata=sizes.map((size,index)=>{const members=sorted.slice(cursor,cursor+size);cursor+=size;return {categoria:names[index],total:members.length,members,min:Math.min(...members.map(x=>x.value)),max:Math.max(...members.map(x=>x.value))};});
    const total=items.length;
    if(donut)donut.innerHTML=`<div class="donut-center"><b>${total.toLocaleString('pt-BR')}</b><span>escolas</span></div>`;
    if(typeof window.renderDonut==='function')window.renderDonut('somPie','somPieLegend',strata.map(s=>({...s,percentual:s.total/total*100})),total,null);
    [...(legend?.querySelectorAll('.legend-row')||[])].forEach((row,index)=>{
      const item=strata[index];
      const range=key==='crescimento'?`${fmtDelta(item.min)} a ${fmtDelta(item.max)}`:`${fmtScore(item.min)} a ${fmtScore(item.max)}`;
      row.classList.add('v172-stratum');
      row.innerHTML=`<i class="swatch" style="background:${(window.COLORS||['#0e5a91','#1d8f68','#d9861c'])[index%3]}"></i><div class="legend-copy"><strong>${item.categoria}</strong><small>${metricLabel(key)} · ${range}</small></div><span>${item.total}</span>`;
    });
    if(subtitle)subtitle.textContent=`Todas as Escolas · ${metricLabel(key)} · estratos relativos ao universo escolar selecionado.`;
  }
  const previousDonut=window.renderSomDonut;
  window.renderSomDonut=function(rows){
    if(isIdeb()&&!pureRegional())return renderSchoolDonut(rows);
    return typeof previousDonut==='function'?previousDonut(rows):undefined;
  };

  function renderRegionalTable(rows){
    const key=metric(),items=regionalItems(rows,key),target=byId('somTable'),count=byId('somCount');
    const card=target?.closest('.card'),heading=card?.querySelector('.panel-title h3');
    if(heading)heading.textContent='CREs — visão regional';
    if(count)count.textContent=`${items.length} CREs com resultado válido no recorte, apresentadas em ordem numérica.`;
    const data=items.map(item=>({cre:item.cre,validas:item.count.toLocaleString('pt-BR'),ideb2023:Number.isFinite(item.v23)?fmtScore(item.v23):'—',ideb2025:Number.isFinite(item.v25)?fmtScore(item.v25):'—',crescimento:Number.isFinite(item.v23)&&Number.isFinite(item.v25)?fmtDelta(item.v25-item.v23):'—'}));
    if(typeof window.table==='function')window.table('somTable',data,[['cre','CRE'],['validas',key==='crescimento'?'Escolas pareadas':'Escolas válidas'],['ideb2023','IDEB 2023'],['ideb2025','IDEB 2025'],['crescimento','Progressão 2023→2025']]);
  }
  function renderSchoolTable(rows){
    const key=metric(),items=schoolItems(rows,key),target=byId('somTable'),count=byId('somCount');
    const card=target?.closest('.card'),heading=card?.querySelector('.panel-title h3');
    if(heading)heading.textContent=allSchools()?'Todas as Escolas — lista completa':'Lista detalhada de escolas';
    const basis=key==='crescimento'?'com IDEB válido em 2023 e 2025':'com resultado válido';
    if(count)count.textContent=`${items.length.toLocaleString('pt-BR')} escolas ${basis}, ordenadas do maior para o menor ${metricLabel(key)}.`;
    const data=items.map((item,index)=>({posicao:index+1,escola:item.name,cre:item.cre,ideb2023:Number.isFinite(item.v23)?fmtScore(item.v23):'—',ideb2025:Number.isFinite(item.v25)?fmtScore(item.v25):'—',crescimento:Number.isFinite(item.v23)&&Number.isFinite(item.v25)?fmtDelta(item.v25-item.v23):'—',resultado:displayValue(item,key)}));
    const cols=key==='crescimento'?[['posicao','Pos.'],['escola','Escola'],['cre','CRE'],['ideb2023','IDEB 2023'],['ideb2025','IDEB 2025'],['crescimento','Progressão']]:[['posicao','Pos.'],['escola','Escola'],['cre','CRE'],['resultado',metricLabel(key)],['ideb2023','IDEB 2023'],['ideb2025','IDEB 2025'],['crescimento','Progressão']];
    if(typeof window.table==='function')window.table('somTable',data,cols);
  }
  const previousTable=window.renderSomTable;
  window.renderSomTable=function(rows){
    if(isIdeb())return pureRegional()?renderRegionalTable(rows):renderSchoolTable(rows);
    return typeof previousTable==='function'?previousTable(rows):undefined;
  };

  function applyLayout(){
    if(!isIdeb())return;
    const compareCard=byId('somCreCompareCard'),compareGrid=compareCard?.parentElement,distribution=byId('somPie')?.closest('.card');
    const mainCard=byId('somMainChart')?.closest('.card'),mainGrid=mainCard?.parentElement;
    const viewSchools=allSchools();
    const button=byId('v181ViewIdebSchools');
    if(button)button.hidden=viewSchools;
    if(viewSchools){
      if(compareGrid){compareGrid.style.display='grid';compareGrid.style.removeProperty('grid-template-columns');}
      if(compareCard)compareCard.style.display='none';
      if(distribution)distribution.style.removeProperty('display');
      if(mainGrid)mainGrid.style.removeProperty('display');
      if(mainCard)mainCard.style.removeProperty('display');
    }
  }
  const previousRender=window.renderResultados;
  window.renderResultados=function(){
    const result=typeof previousRender==='function'?previousRender():undefined;
    setTimeout(applyLayout,8);
    return result;
  };
  function install(){
    ['regionalScopeSelect','somModalidade','somAnoEscolar','somMetric','somAgente','somPriority'].forEach(id=>byId(id)?.addEventListener('change',()=>setTimeout(applyLayout,12)));
    byId('somSearch')?.addEventListener('input',()=>setTimeout(applyLayout,12));
    setTimeout(()=>{if(typeof window.renderResultados==='function')window.renderResultados();},80);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
