
(function(){
  'use strict';

  const isIdeb=()=>document.getElementById('somModalidade')?.value==='IDEB 2025';
  const segment=()=>document.getElementById('somAnoEscolar')?.value||'';
  const scope=()=>Number(document.getElementById('regionalScopeSelect')?.value||0);
  const hasDetail=()=>{
    const q=String(document.getElementById('somSearch')?.value||'').trim();
    const ag=document.getElementById('somAgente')?.value||'';
    const priority=document.getElementById('somPriority')?.value==='sim';
    const specificAgent=typeof window.somIsSpecificAgent==='function'?window.somIsSpecificAgent(ag):Boolean(ag);
    return Boolean(q)||specificAgent||priority;
  };
  const score=row=>{
    for(const value of [row?.ideb2025,row?.principal,row?.media]){
      const n=Number(value); if(Number.isFinite(n))return n;
    }
    return null;
  };
  const growth=row=>{
    const direct=Number(row?.crescimento);
    if(Number.isFinite(direct))return direct;
    const a=Number(row?.ideb2023),b=Number(row?.ideb2025);
    return Number.isFinite(a)&&Number.isFinite(b)?b-a:null;
  };
  const creNum=row=>{
    const raw=String(row?.cre||row?.regional||'');
    const match=raw.match(/\d{1,2}/); return match?Number(match[0]):0;
  };
  const creLabel=n=>`${n}ª CRE`;
  const fmt=v=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2});
  const fmtDelta=v=>`${Number(v)>0?'+':''}${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2})}`;
  const schoolRows=rows=>(rows||[]).filter(row=>!row?._afCreAggregate&&row?.escola&&Number.isFinite(score(row)));

  function groupCreEntities(rows){
    const map=new Map();
    schoolRows(rows).forEach(row=>{
      const n=creNum(row); if(!n)return;
      if(!map.has(n))map.set(n,[]);
      map.get(n).push(score(row));
    });
    return [...map.entries()].map(([n,values])=>({name:creLabel(n),value:values.reduce((a,b)=>a+b,0)/values.length,count:values.length}));
  }
  function entitySet(rows){
    if(scope()===0&&!hasDetail()){
      if(segment()==='Anos Finais'&&(rows||[]).every(row=>row?._afCreAggregate)){
        return {kind:'CREs',items:(rows||[]).map(row=>({name:row._creLabel||row.escola||row.cre,value:score(row),count:Number(row._escolas2025)||0})).filter(x=>Number.isFinite(x.value))};
      }
      const cres=groupCreEntities(rows);
      if(cres.length>=3)return {kind:'CREs',items:cres};
    }
    const schools=schoolRows(rows).map(row=>({name:row.escola,value:score(row),count:1,cre:row.cre||row.regional||''}));
    return {kind:'escolas',items:schools};
  }
  function splitTertiles(items){
    const sorted=items.slice().sort((a,b)=>b.value-a.value||String(a.name).localeCompare(String(b.name),'pt-BR'));
    if(sorted.length<3)return null;
    const q=Math.floor(sorted.length/3),r=sorted.length%3;
    const sizes=[q+(r>0?1:0),q+(r>1?1:0),q];
    const labels=['Faixa superior','Faixa intermediária','Faixa mais desafiadora'];
    let cursor=0;
    return sizes.map((size,index)=>{
      const members=sorted.slice(cursor,cursor+size); cursor+=size;
      const min=Math.min(...members.map(x=>x.value)),max=Math.max(...members.map(x=>x.value));
      return {categoria:labels[index],total:members.length,members,min,max};
    });
  }
  function renderMeaningfulDonut(rows){
    const donut=document.getElementById('somPie');
    const legend=document.getElementById('somPieLegend');
    const subtitle=document.getElementById('somPieSubtitle');
    const title=donut?.closest('.panel')?.querySelector('.panel-title h3');
    if(title)title.textContent='Estratos do universo';
    const set=entitySet(rows);
    const strata=splitTertiles(set.items);
    if(!strata){
      if(donut)donut.innerHTML='<div class="v172-pie-empty">Este recorte não possui unidades suficientes com IDEB 2025 para formar três estratos úteis. O gráfico não é exibido para evitar uma pizza de uma única fatia.</div>';
      if(legend)legend.innerHTML='';
      if(subtitle)subtitle.textContent='Este recorte possui menos de três escolas com IDEB 2025 válido.';
      return;
    }
    const total=strata.reduce((sum,item)=>sum+item.total,0);
    donut.innerHTML=`<div class="donut-center"><b>${total.toLocaleString('pt-BR')}</b><span>${set.kind}</span></div>`;
    renderDonut('somPie','somPieLegend',strata.map(item=>({...item,percentual:item.total/total*100})),total,null);
    const rowsLegend=[...legend.querySelectorAll('.legend-row')];
    rowsLegend.forEach((row,index)=>{
      const item=strata[index];
      const members=item.members.map(x=>x.name).join(' · ');
      row.classList.add('v172-stratum');
      row.innerHTML=`<i class="swatch" style="background:${COLORS[index%COLORS.length]}"></i><div class="legend-copy"><strong>${item.categoria}</strong><small>${set.kind==='CREs'?members:`IDEB ${fmt(item.min)} a ${fmt(item.max)}`}</small></div><span>${item.total}</span>`;
    });
    if(subtitle){
      subtitle.textContent=scope()===0&&!hasDetail()
        ?`${segment()} · as CREs foram distribuídas em três estratos relativos ao universo SME.`
        :`${segment()} · as escolas foram distribuídas em três estratos relativos ao recorte selecionado.`;
    }
  }

  const previousDonut=window.renderSomDonut;
  window.renderSomDonut=function(rows){
    if(isIdeb())return renderMeaningfulDonut(rows);
    return previousDonut(rows);
  };

  const AF_TOP_GROWTH=[
    {escola:'EM FIGUEIREDO PIMENTEL',cre:'5ª CRE',crescimento:1.9},
    {escola:'EM BENJAMIM CONSTANT',cre:'1ª CRE',crescimento:1.5},
    {escola:'EM DESEMBARGADOR OSCAR TENÓRIO',cre:'2ª CRE',crescimento:1.5},
    {escola:'EM DALVA DE OLIVEIRA',cre:'8ª CRE',crescimento:1.4},
    {escola:'EM BRIGADEIRO EDUARDO GOMES',cre:'11ª CRE',crescimento:1.2},
    {escola:'EM ARAÚJO PORTO ALEGRE',cre:'2ª CRE',crescimento:1.0},
    {escola:'EM BARÃO DA TAQUARA',cre:'7ª CRE',crescimento:1.0},
    {escola:'EM SOARES PEREIRA',cre:'2ª CRE',crescimento:1.0},
    {escola:'EM ARMANDO KLABIN',cre:'10ª CRE',crescimento:0.9},
    {escola:'EM MARÍLIA DE DIRCEU',cre:'2ª CRE',crescimento:0.9}
  ];
  function topGrowthFromRows(rows){
    const seen=new Map();
    schoolRows(rows).forEach(row=>{
      const g=growth(row); if(!Number.isFinite(g))return;
      const key=typeof window.norm==='function'?window.norm(row.escola):String(row.escola).toLowerCase();
      const previous=seen.get(key);
      if(!previous||g>previous.crescimento)seen.set(key,{escola:row.escola,cre:(row.cre||row.regional||'').replace(/^CRE\s*0?/i,'')+'ª CRE',ideb2023:Number(row.ideb2023),ideb2025:Number(row.ideb2025),crescimento:g});
    });
    return [...seen.values()].sort((a,b)=>b.crescimento-a.crescimento||b.ideb2025-a.ideb2025).slice(0,15);
  }
  function renderEvolutionTable(rows){
    const tableTarget=document.getElementById('somTable');
    const count=document.getElementById('somCount');
    const panelTitle=tableTarget?.closest('.panel')?.querySelector('.panel-title h3');
    if(panelTitle)panelTitle.textContent='Escolas que mais evoluíram';
    let data=[];
    let limited=false;
    if(segment()==='Anos Finais'&&scope()===0&&!hasDetail()&&(rows||[]).every(row=>row?._afCreAggregate)){
      data=AF_TOP_GROWTH.map((row,index)=>({posicao:`${index+1}ª`,...row,crescimentoFmt:fmtDelta(row.crescimento)}));
      if(count)count.textContent='Maiores crescimentos do IDEB entre 2023 e 2025 no universo SME — Anos Finais.';
      table('somTable',data,[['posicao','Posição'],['escola','Escola'],['cre','CRE'],['crescimentoFmt','Evolução do IDEB']]);
      return;
    }
    data=topGrowthFromRows(rows);
    if(!data.length){
      if(tableTarget)tableTarget.innerHTML='<div class="v172-table-note">Não há escolas com valores válidos em 2023 e 2025 neste recorte para calcular o ranking de crescimento.</div>';
      if(count)count.textContent='Ranking escolar indisponível para este recorte.';
      return;
    }
    const formatted=data.map((row,index)=>({posicao:`${index+1}ª`,escola:row.escola,cre:row.cre,ideb2023:Number.isFinite(row.ideb2023)?fmt(row.ideb2023):'—',ideb2025:Number.isFinite(row.ideb2025)?fmt(row.ideb2025):'—',crescimento:fmtDelta(row.crescimento)}));
    if(count)count.textContent=`${data.length} escolas com maior evolução dentro do universo selecionado.`;
    table('somTable',formatted,[['posicao','Posição'],['escola','Escola'],['cre','CRE'],['ideb2023','IDEB 2023'],['ideb2025','IDEB 2025'],['crescimento','Evolução']]);
  }
  const previousTable=window.renderSomTable;
  window.renderSomTable=function(rows){
    if(isIdeb())return renderEvolutionTable(rows);
    return previousTable(rows);
  };

  function refresh(){ if(typeof window.renderResultados==='function')window.renderResultados(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,420),{once:true});
  else setTimeout(refresh,420);
})();
