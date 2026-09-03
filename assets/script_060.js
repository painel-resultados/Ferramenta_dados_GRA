
(function(){
  'use strict';
  const A={
    'Anos Iniciais':{
      0:{v23:6.02,v25:6.28,delta:.26,c23:648,c25:660},
      1:{v23:5.8,v25:5.9,delta:.1,c23:29,c25:30},2:{v23:6.1,v25:6.4,delta:.3,c23:70,c25:72},3:{v23:5.8,v25:6.0,delta:.2,c23:55,c25:56},4:{v23:5.9,v25:6.0,delta:.1,c23:66,c25:68},5:{v23:6.0,v25:6.2,delta:.2,c23:66,c25:64},6:{v23:5.7,v25:6.1,delta:.4,c23:44,c25:43},7:{v23:6.1,v25:6.3,delta:.2,c23:72,c25:76},8:{v23:5.8,v25:6.2,delta:.4,c23:80,c25:81},9:{v23:6.1,v25:6.2,delta:.1,c23:69,c25:71},10:{v23:5.9,v25:6.4,delta:.5,c23:73,c25:75},11:{v23:6.2,v25:6.5,delta:.3,c23:24,c25:24}
    },
    'Anos Finais':{
      0:{v23:5.18,v25:5.20,delta:.02,c23:349,c25:363},
      1:{v23:5.2,v25:5.1,delta:-.1,c23:19,c25:20},2:{v23:5.2,v25:5.4,delta:.2,c23:41,c25:43},3:{v23:5.2,v25:5.2,delta:0,c23:31,c25:30},4:{v23:5.1,v25:5.1,delta:0,c23:34,c25:34},5:{v23:5.3,v25:5.2,delta:-.1,c23:37,c25:38},6:{v23:5.1,v25:5.0,delta:-.1,c23:20,c25:20},7:{v23:5.3,v25:5.3,delta:0,c23:37,c25:42},8:{v23:5.1,v25:5.1,delta:0,c23:42,c25:46},9:{v23:5.2,v25:5.2,delta:0,c23:34,c25:35},10:{v23:5.1,v25:5.1,delta:0,c23:41,c25:41},11:{v23:5.4,v25:5.4,delta:0,c23:13,c25:14}
    }
  };
  window.V235_IDEB_AGGREGATES=A;
  const byId=id=>document.getElementById(id);
  const isIdeb=()=>byId('somModalidade')?.value==='IDEB 2025';
  const seg=()=>byId('somAnoEscolar')?.value||'';
  const metric=()=>byId('somMetric')?.value||'ideb2025';
  const scope=()=>Number(byId('regionalScopeSelect')?.value||0);
  const agent=()=>byId('somAgente')?.value||'';
  const specificAgent=()=>typeof window.somIsSpecificAgent==='function'?window.somIsSpecificAgent(agent()):Boolean(agent()&&agent()!=='__todas_escolas__');
  const noSubset=()=>!specificAgent()&&!String(byId('somSearch')?.value||'').trim()&&(byId('somPriority')?.value||'')!=='sim';
  const aggregate=()=>A[seg()]?.[scope()]||null;
  const fullAggregate=()=>isIdeb()&&noSubset()&&Boolean(aggregate());
  const pureRegional=()=>fullAggregate()&&scope()===0&&agent()==='';
  const progress=()=>isIdeb()&&((byId('somMode')?.value||'')==='progressao'||metric()==='crescimento');
  const fmt=(v,d=2)=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const delta=v=>`${Number(v)>0?'+':''}${fmt(v,2)}`;
  const escHtml=v=>typeof window.esc==='function'?window.esc(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const metricValue=(d,key)=>key==='ideb2023'?d.v23:key==='crescimento'?d.delta:d.v25;
  const metricName=key=>key==='ideb2023'?'IDEB 2023':key==='crescimento'?'Crescimento 2023 → 2025':'IDEB 2025';

  const previousKpis=window.renderSomKpis;
  window.renderSomKpis=function(rows,baseRows){
    if(fullAggregate()&&['principal','ideb2023','ideb2025','crescimento'].includes(metric())){
      const d=aggregate(),key=metric()==='principal'?'ideb2025':metric(),regional=scope();
      const value=key==='crescimento'?delta(d.delta):fmt(metricValue(d,key),2);
      const label=metricName(key);
      if(typeof window.renderKpis==='function')window.renderKpis('somKpis',[
        {label:'Escolas 2023',value:d.c23.toLocaleString('pt-BR'),note:regional?'cobertura escolar na base carregada':'IDEB válido na edição'},
        {label:'Escolas 2025',value:d.c25.toLocaleString('pt-BR'),note:regional?'cobertura escolar na base carregada':'IDEB válido na edição'},
        {label,value,note:regional?(key==='crescimento'?'IDEB oficial 2025 − IDEB oficial 2023':'resultado oficial SME-Rio'):(key==='crescimento'?'média 2025 − média 2023':'média simples das escolas válidas')},
        {label:regional?'Recorte':'CREs na base',value:regional?`${regional}ª CRE`:'11',note:regional?'fonte oficial SME-Rio':'cálculo independente por edição'}
      ]);
      return;
    }
    return typeof previousKpis==='function'?previousKpis(rows,baseRows):undefined;
  };

  function officialSeries(key){
    return Object.entries(A[seg()]||{}).filter(([n])=>Number(n)>0).map(([n,d])=>({n:Number(n),label:`CRE ${String(n).padStart(2,'0')}`,value:metricValue(d,key),...d})).sort((a,b)=>b.value-a.value||a.n-b.n);
  }
  function renderOfficialBars(){
    const chart=byId('somCreChart'),card=byId('somCreCompareCard');if(!chart||!card)return;
    const key=metric()==='principal'?'ideb2025':metric(),items=officialSeries(key);if(!items.length)return;
    card.style.display='block';chart.classList.add('v235-official-bars');
    const title=byId('somCreTitle'),subtitle=byId('somCreSubtitle');
    if(title)title.textContent=`Comparativo entre CREs — ${metricName(key)}`;
    if(subtitle)subtitle.textContent=key==='crescimento'?'Evolução oficial de cada CRE = IDEB 2025 − IDEB 2023, conforme publicação da SME-Rio.':'Resultados oficiais das CREs publicados pela SME-Rio.';
    const w=1120,h=430,pL=64,pR=28,pT=38,pB=92,vals=items.map(x=>x.value),includeZero=key==='crescimento';
    let min=Math.min(...vals),max=Math.max(...vals);if(includeZero){min=Math.min(min,0);max=Math.max(max,0);const pad=Math.max(.04,(max-min)*.16);min-=pad;max+=pad;}else{min=Math.max(0,Math.floor((min-.35)*10)/10);max=Math.min(10,Math.ceil((max+.35)*10)/10);}if(max-min<.4){min-=.2;max+=.2;}
    const y=v=>pT+(h-pT-pB)*(1-(v-min)/(max-min||1)),slot=(w-pL-pR)/items.length,bw=Math.min(58,slot*.58),base=y(includeZero?0:min);
    const ticks=Array.from({length:6},(_,i)=>min+(max-min)*i/5);
    const grid=ticks.map(v=>`<g><line x1="${pL}" y1="${y(v)}" x2="${w-pR}" y2="${y(v)}" stroke="#e1ebf2"/><text x="${pL-10}" y="${y(v)+4}" text-anchor="end" fill="#718597" font-size="11">${fmt(v,key==='crescimento'?2:1)}</text></g>`).join('');
    const bars=items.map((d,i)=>{const cx=pL+slot*(i+.5),yy=y(d.value),top=Math.min(yy,base),height=Math.max(2,Math.abs(base-yy)),color=d.value<0?'#b85252':'#1c79b8';return `<g><rect x="${cx-bw/2}" y="${top}" width="${bw}" height="${height}" rx="7" fill="${color}"><title>${d.label} · oficial 2023 ${fmt(d.v23)} · oficial 2025 ${fmt(d.v25)} · evolução ${delta(d.delta)}</title></rect><text x="${cx}" y="${d.value>=0?top-9:top+height+17}" text-anchor="middle" fill="#12385d" font-size="12" font-weight="900">${key==='crescimento'?delta(d.value):fmt(d.value)}</text><text x="${cx}" y="${h-pB+25}" transform="rotate(-28 ${cx} ${h-pB+25})" text-anchor="end" fill="#526779" font-size="11.5" font-weight="800">${d.label}</text></g>`;}).join('');
    chart.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Comparativo oficial do IDEB entre CREs">${grid}<line x1="${pL}" y1="${base}" x2="${w-pR}" y2="${base}" stroke="${includeZero?'#8da7b9':'#b9ccd9'}" stroke-width="1.4"/>${bars}</svg>`;
  }
  const previousCre=window.renderSomCreChart;
  window.renderSomCreChart=function(){
    if(pureRegional()&&['principal','ideb2023','ideb2025','crescimento'].includes(metric()))return renderOfficialBars();
    byId('somCreChart')?.classList.remove('v235-official-bars');
    return typeof previousCre==='function'?previousCre():undefined;
  };

  function renderOfficialTable(){
    const key=metric()==='principal'?'ideb2025':metric(),target=byId('somTable'),count=byId('somCount');if(!target)return;
    const items=Object.entries(A[seg()]||{}).filter(([n])=>Number(n)>0).sort((a,b)=>Number(a[0])-Number(b[0])).map(([n,d])=>({cre:`CRE ${String(n).padStart(2,'0')}`,e23:d.c23.toLocaleString('pt-BR'),ideb23:fmt(d.v23),e25:d.c25.toLocaleString('pt-BR'),ideb25:fmt(d.v25),crescimento:delta(d.delta)}));
    const heading=target.closest('.card')?.querySelector('.panel-title h3');if(heading)heading.textContent='CREs — resultados oficiais SME-Rio';
    if(count)count.textContent=`${items.length} CREs · IDEB 2023, IDEB 2025 e evolução conforme publicação oficial da SME-Rio.`;
    if(typeof window.table==='function')window.table('somTable',items,[['cre','CRE'],['e23','Escolas 2023'],['ideb23','IDEB 2023'],['e25','Escolas 2025'],['ideb25','IDEB 2025'],['crescimento','Crescimento']]);
  }
  const previousTable=window.renderSomTable;
  window.renderSomTable=function(rows){
    if(pureRegional()&&['principal','ideb2023','ideb2025','crescimento'].includes(metric()))return renderOfficialTable();
    return typeof previousTable==='function'?previousTable(rows):undefined;
  };

  function scaleBounds(values){let min=Math.min(...values),max=Math.max(...values);min=Math.max(0,Math.floor((min-.25)*10)/10);max=Math.min(10,Math.ceil((max+.25)*10)/10);if(max-min<.8){const mid=(min+max)/2;min=Math.max(0,mid-.5);max=Math.min(10,mid+.5);}return {min,max};}
  function renderOfficialProgress(){
    const card=byId('somProgressCard'),chart=byId('somProgressChart'),tableTarget=byId('somProgressTable');if(!card||!chart)return;
    card.classList.add('open');chart.classList.remove('v235-agent-progress');chart.classList.add('v181-cre-progress');
    const title=card.querySelector('.panel-title h3'),subtitle=card.querySelector('.panel-title p');
    if(title)title.textContent='Progressão das CREs — IDEB 2023 → 2025';
    if(subtitle)subtitle.textContent=`Toda a SME · ${seg()}. Valores oficiais das CREs publicados pela SME-Rio para 2023 e 2025.`;
    const series=Object.entries(A[seg()]||{}).filter(([n])=>Number(n)>0).map(([n,d])=>({n:Number(n),label:`CRE ${String(n).padStart(2,'0')}`,...d})).sort((a,b)=>a.n-b.n);
    const values=series.flatMap(s=>[s.v23,s.v25]),{min,max}=scaleBounds(values),w=1120,h=440,pT=34,pB=62,x23=205,x25=w-205,plotH=h-pT-pB;
    const y=v=>pT+plotH*(1-(v-min)/(max-min||1));
    const ticks=Array.from({length:6},(_,i)=>min+(max-min)*i/5),palette=['#0d6ea8','#1694a6','#2d8f65','#7b8f2d','#bd7a2a','#a65d73','#7566b5','#3c7f9b','#9a6b3b','#52704e','#855f98'];
    const grid=ticks.map(v=>`<g><line x1="${x23}" y1="${y(v)}" x2="${x25}" y2="${y(v)}" stroke="#e4edf3"/><text x="${w/2}" y="${y(v)-4}" text-anchor="middle" fill="#9aabba" font-size="9">${fmt(v,1)}</text></g>`).join('');
    const lines=series.map((s,i)=>{const color=palette[i%palette.length],tip=`${s.label} · oficial ${fmt(s.v23)} → ${fmt(s.v25)} · ${delta(s.delta)}`;return `<g class="v235-cre-official-series" data-v235-cre="${i}" style="opacity:.82;cursor:pointer"><line x1="${x23}" y1="${y(s.v23)}" x2="${x25}" y2="${y(s.v25)}" stroke="${color}" stroke-width="3.2" stroke-linecap="round"><title>${escHtml(tip)}</title></line><circle cx="${x23}" cy="${y(s.v23)}" r="5" fill="${color}" stroke="#fff" stroke-width="1.5"><title>${escHtml(tip)}</title></circle><circle cx="${x25}" cy="${y(s.v25)}" r="5" fill="${color}" stroke="#fff" stroke-width="1.5"><title>${escHtml(tip)}</title></circle><text x="${x23-14}" y="${y(s.v23)+4}" text-anchor="end" fill="${color}" font-size="11" font-weight="900">${fmt(s.v23)}</text><text x="${x25+14}" y="${y(s.v25)+4}" text-anchor="start" fill="${color}" font-size="11" font-weight="900">${fmt(s.v25)}</text></g>`;}).join('');
    const legend=series.map((s,i)=>`<button type="button" data-v235-legend="${i}" aria-pressed="false"><i style="background:${palette[i%palette.length]}"></i>${s.label} · ${delta(s.delta)}</button>`).join('');
    const sme=A[seg()][0];
    chart.innerHTML=`<div class="v181-progress-summary"><span><strong>${series.length} CREs</strong> · valores oficiais SME-Rio.</span><span>Comparação das CREs: IDEB 2023 → IDEB 2025.</span></div><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Progressão agregada do IDEB das CREs">${grid}<text x="${x23}" y="${h-18}" text-anchor="middle" fill="#526779" font-size="14" font-weight="900">IDEB 2023</text><text x="${x25}" y="${h-18}" text-anchor="middle" fill="#526779" font-size="14" font-weight="900">IDEB 2025</text>${lines}</svg><div class="v181-cre-legend"><button type="button" data-v235-reset>Mostrar todas</button>${legend}</div>`;
    let active=null;const apply=index=>{active=(index===null||active===index)?null:index;chart.querySelectorAll('.v235-cre-official-series').forEach(el=>{const sel=active!==null&&Number(el.dataset.v235Cre)===active;el.style.opacity=active===null?'.82':(sel?'1':'.07');el.style.filter=sel?'drop-shadow(0 5px 8px rgba(18,56,93,.22))':'none';});chart.querySelectorAll('[data-v235-legend]').forEach(btn=>{const sel=active!==null&&Number(btn.dataset.v235Legend)===active;btn.classList.toggle('active',sel);btn.setAttribute('aria-pressed',String(sel));});};
    chart.querySelectorAll('[data-v235-legend]').forEach(btn=>btn.addEventListener('click',()=>apply(Number(btn.dataset.v235Legend))));chart.querySelectorAll('.v235-cre-official-series').forEach(el=>el.addEventListener('click',()=>apply(Number(el.dataset.v235Cre))));chart.querySelector('[data-v235-reset]')?.addEventListener('click',()=>{active=null;apply(null);});
    if(tableTarget&&typeof window.table==='function')window.table('somProgressTable',series.map(s=>({cre:s.label,e23:s.c23,ideb23:fmt(s.v23),e25:s.c25,ideb25:fmt(s.v25),evolucao:delta(s.delta)})),[['cre','CRE'],['e23','Escolas 2023'],['ideb23','IDEB 2023'],['e25','Escolas 2025'],['ideb25','IDEB 2025'],['evolucao','Evolução']]);
  }
  function injectCreSummary(){
    if(!progress()||!fullAggregate()||scope()<=0||specificAgent())return;
    const d=aggregate(),chart=byId('somProgressChart');if(!d||!chart||chart.querySelector('.v235-aggregate-summary'))return;
    const detail=chart.classList.contains('v235-agent-progress')?'As linhas abaixo são um detalhamento pareado por agente e não alteram o resultado oficial da CRE.':'As linhas abaixo mostram trajetórias individuais das escolas com resultados comparáveis; o valor agregado da CRE é o oficial da SME-Rio.';
    chart.insertAdjacentHTML('afterbegin',`<div class="v235-aggregate-summary"><strong>Resultado oficial da ${scope()}ª CRE:</strong> ${fmt(d.v23)} → ${fmt(d.v25)} · <strong>${delta(d.delta)}</strong>. ${detail}</div>`);
  }
  const previousProgress=window.renderSomProgress;
  window.renderSomProgress=function(){
    if(pureRegional()&&progress())return renderOfficialProgress();
    const result=typeof previousProgress==='function'?previousProgress():undefined;
    setTimeout(injectCreSummary,0);return result;
  };

  const previousResultados=window.renderResultados;
  window.renderResultados=function(){const result=typeof previousResultados==='function'?previousResultados():undefined;setTimeout(()=>{if(pureRegional()&&!progress())renderOfficialBars();},15);return result;};
})();
