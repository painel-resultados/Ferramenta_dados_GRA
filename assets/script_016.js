
(function(){
  'use strict';
  const previousProgress=window.renderSomProgress;
  const isIdeb=()=>document.getElementById('somModalidade')?.value==='IDEB 2025';
  const metric=()=>document.getElementById('somMetric')?.value||'';
  const mode=()=>document.getElementById('somMode')?.value||'individual';
  const fmtScore=value=>Number(value).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const fmtGrowth=value=>`${Number(value)>0?'+':''}${Number(value).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}`;
  const schoolKey=row=>String(row?.codigoSME||row?.codigoINEP||`${row?.cre||''}|${row?.escola||''}`);
  const colorFor=delta=>delta>0.00001?'#1d8f68':delta<-0.00001?'#b23b3b':'#d9861c';
  const shortName=name=>{
    const clean=String(name||'').replace(/^Escola Municipal\s+/i,'').replace(/^E\.?\s*M\.?\s*/i,'').trim();
    return clean.length>34?clean.slice(0,33)+'…':clean;
  };

  function renderSchoolProgress(){
    const card=document.getElementById('somProgressCard');
    if(!card)return;
    card.classList.add('open');
    const title=card.querySelector('.panel-title h3');
    const subtitle=card.querySelector('.panel-title p');
    if(title)title.textContent='Progressão individual das escolas — IDEB 2023 → 2025';
    if(subtitle)subtitle.textContent='Cada linha representa uma escola do universo selecionado. Use os botões para destacar uma unidade específica.';

    const source=(typeof window.somFilteredRows==='function'?window.somFilteredRows({ignoreEdicao:true}):[])
      .filter(row=>!row?._afCreAggregate&&row?.escola);
    const seen=new Map();
    source.forEach(row=>{
      const v23=Number(row.ideb2023),v25=Number(row.ideb2025);
      if(!Number.isFinite(v23)||!Number.isFinite(v25))return;
      const key=schoolKey(row);
      const item={key,escola:row.escola,cre:row.cre||row.regional||'—',agente:(typeof window.somRowAgent==='function'?window.somRowAgent(row):row.agente)||'—',v23,v25,delta:v25-v23};
      const previous=seen.get(key);
      if(!previous||item.v25>previous.v25)seen.set(key,item);
    });
    const series=[...seen.values()].sort((a,b)=>b.delta-a.delta||b.v25-a.v25||String(a.escola).localeCompare(String(b.escola),'pt-BR'));
    const chart=document.getElementById('somProgressChart');
    const tableTarget=document.getElementById('somProgressTable');
    if(!series.length){
      chart.innerHTML='<div class="som-empty">Não há escolas com IDEB válido em 2023 e 2025 no recorte selecionado.</div>';
      tableTarget.innerHTML='';
      return;
    }

    const values=series.flatMap(item=>[item.v23,item.v25]);
    const rawMin=Math.min(...values),rawMax=Math.max(...values);
    const min=Math.max(0,Math.floor((rawMin-.35)*10)/10);
    const max=Math.min(10,Math.ceil((rawMax+.35)*10)/10);
    const w=900,h=350,padL=58,padR=34,padT=28,padB=52;
    const x23=padL,x25=w-padR;
    const y=value=>h-padB-(h-padT-padB)*((value-min)/(max-min||1));
    const ticks=Array.from({length:6},(_,i)=>min+(max-min)*i/5);
    const grid=ticks.map(value=>`<g><line x1="${padL}" y1="${y(value)}" x2="${w-padR}" y2="${y(value)}" stroke="#e3edf4" stroke-width="1"/><text x="${padL-11}" y="${y(value)+4}" text-anchor="end" fill="#718597" font-size="11">${fmtScore(value)}</text></g>`).join('');
    const lines=series.map((item,index)=>{
      const color=colorFor(item.delta);
      const titleText=`${item.escola} · ${item.cre} · ${fmtScore(item.v23)} → ${fmtScore(item.v25)} (${fmtGrowth(item.delta)})`;
      return `<g class="ideb-progress-series" data-progress-idx="${index}" style="opacity:.42"><line class="ideb-progress-line" x1="${x23}" y1="${y(item.v23)}" x2="${x25}" y2="${y(item.v25)}" stroke="${color}" stroke-width="1.55" stroke-linecap="round"><title>${esc(titleText)}</title></line><circle cx="${x23}" cy="${y(item.v23)}" r="2.7" fill="${color}"><title>${esc(titleText)}</title></circle><circle cx="${x25}" cy="${y(item.v25)}" r="2.7" fill="${color}"><title>${esc(titleText)}</title></circle></g>`;
    }).join('');
    const buttons=series.map((item,index)=>`<button type="button" class="ideb-progress-legend" data-progress-idx="${index}" title="${esc(item.escola)} · ${esc(item.cre)}"><i style="background:${colorFor(item.delta)}"></i><span>${esc(shortName(item.escola))} · ${esc(item.cre)} · ${esc(fmtGrowth(item.delta))}</span></button>`).join('');
    chart.innerHTML=`
      <div class="ideb-progress-status"><span><strong>${series.length.toLocaleString('pt-BR')} escolas pareadas</strong> no recorte atual. Linhas verdes indicam avanço, amarelas estabilidade e vermelhas queda.</span><span class="ideb-progress-selection" id="idebProgressSelection">Selecione uma escola abaixo para realçar sua trajetória.</span></div>
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:350px" aria-label="Progressão individual do IDEB das escolas entre 2023 e 2025">
        ${grid}
        <line x1="${padL}" y1="${h-padB}" x2="${w-padR}" y2="${h-padB}" stroke="#c5d7e4" stroke-width="1.2"/>
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h-padB}" stroke="#c5d7e4" stroke-width="1.2"/>
        ${lines}
        <text x="${x23}" y="${h-18}" text-anchor="middle" fill="#526b7d" font-size="13" font-weight="800">IDEB 2023</text>
        <text x="${x25}" y="${h-18}" text-anchor="middle" fill="#526b7d" font-size="13" font-weight="800">IDEB 2025</text>
      </svg>
      <div class="ideb-progress-legend-wrap"><button type="button" class="ideb-progress-reset">Mostrar todas</button>${buttons}</div>`;

    let active=null;
    const selection=document.getElementById('idebProgressSelection');
    const apply=index=>{
      active=active===index?null:index;
      chart.querySelectorAll('.ideb-progress-series').forEach(el=>{
        const selected=active!==null&&Number(el.dataset.progressIdx)===active;
        el.style.opacity=active===null?'.42':(selected?'1':'.045');
        el.style.filter=selected?'drop-shadow(0 5px 10px rgba(18,56,93,.30))':'none';
        const line=el.querySelector('.ideb-progress-line');
        if(line){
          line.setAttribute('stroke-width',selected?'5':'1.55');
          line.setAttribute('stroke',selected?'#12385d':colorFor(series[Number(el.dataset.progressIdx)].delta));
        }
      });
      chart.querySelectorAll('.ideb-progress-legend').forEach(btn=>{
        const selected=active!==null&&Number(btn.dataset.progressIdx)===active;
        btn.classList.toggle('active',selected);
        btn.setAttribute('aria-pressed',String(selected));
      });
      if(selection){
        if(active===null)selection.textContent='Selecione uma escola abaixo para realçar sua trajetória.';
        else{
          const item=series[active];
          selection.textContent=`${item.escola} · ${item.cre} · ${fmtScore(item.v23)} → ${fmtScore(item.v25)} · ${fmtGrowth(item.delta)}`;
        }
      }
    };
    chart.querySelectorAll('.ideb-progress-legend').forEach(btn=>btn.addEventListener('click',()=>apply(Number(btn.dataset.progressIdx))));
    chart.querySelectorAll('.ideb-progress-series').forEach(line=>line.addEventListener('click',()=>apply(Number(line.dataset.progressIdx))));
    chart.querySelector('.ideb-progress-reset')?.addEventListener('click',()=>{active=null;apply(null);});

    const rows=series.map((item,index)=>({
      posicao:`${index+1}ª`,
      cre:item.cre,
      escola:item.escola,
      agente:item.agente,
      ideb2023:fmtScore(item.v23),
      ideb2025:fmtScore(item.v25),
      crescimento:fmtGrowth(item.delta)
    }));
    table('somProgressTable',rows,[['posicao','Posição por crescimento'],['cre','CRE'],['escola','Escola'],['agente','Agente'],['ideb2023','IDEB 2023'],['ideb2025','IDEB 2025'],['crescimento','Crescimento']]);
  }

  window.renderSomProgress=function(){
    if(isIdeb()&&(mode()==='progressao'||metric()==='crescimento'))return renderSchoolProgress();
    const card=document.getElementById('somProgressCard');
    const title=card?.querySelector('.panel-title h3');
    const subtitle=card?.querySelector('.panel-title p');
    if(title)title.textContent='Progressão das somativas';
    if(subtitle)subtitle.textContent='Evolução da métrica selecionada por edição/ano, mantendo modalidade, ano escolar e componente.';
    return previousProgress();
  };
})();
