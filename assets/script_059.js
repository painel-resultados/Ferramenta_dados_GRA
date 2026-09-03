
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const previousProgress=window.renderSomProgress;
  let view='school';
  const palette=['#0e5a91','#1d8f68','#d9861c','#7b61a8','#2f7f8f','#b45757','#4c74b8','#8a6d3b','#277a6b','#9a5f91','#5c7082','#2d8fbd','#7a9b35','#c46f2c','#5e6dc6','#9b5a71'];
  const isIdeb=()=>byId('somModalidade')?.value==='IDEB 2025';
  const isProgress=()=>isIdeb()&&((byId('somMode')?.value||'')==='progressao'||(byId('somMetric')?.value||'')==='crescimento');
  const regionalScope=()=>Number(byId('regionalScopeSelect')?.value||0);
  const selectedAgent=()=>byId('somAgente')?.value||'';
  const isSpecificAgent=value=>typeof window.somIsSpecificAgent==='function'?window.somIsSpecificAgent(value):Boolean(value&&value!=='__todas_escolas__');
  const eligible=()=>isProgress()&&regionalScope()>0&&!isSpecificAgent(selectedAgent());
  const fmt=v=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const fmtDelta=v=>`${Number(v)>0?'+':''}${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}`;
  const escHtml=v=>typeof window.esc==='function'?window.esc(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const schoolKey=row=>String(row?.codigoSME||row?.codigoINEP||`${row?.cre||row?.regional||''}|${row?.escola||''}`);
  const rowAgent=row=>(typeof window.somRowAgent==='function'?window.somRowAgent(row):row?.agente)||'';

  function sourceRows(){
    const rows=typeof window.somFilteredRows==='function'?window.somFilteredRows({ignoreEdicao:true}):[];
    return (rows||[]).filter(row=>row&&row.modalidade==='IDEB 2025'&&!row._afCreAggregate&&row.escola);
  }
  function agentSeries(){
    const schools=new Map();
    sourceRows().forEach(row=>{
      const raw23=row.ideb2023,raw25=row.ideb2025;
      if(raw23===null||raw23===undefined||String(raw23).trim()===''||raw25===null||raw25===undefined||String(raw25).trim()==='')return;
      const v23=Number(raw23),v25=Number(raw25);if(!Number.isFinite(v23)||!Number.isFinite(v25))return;
      const agent=rowAgent(row);if(!agent)return;
      const key=schoolKey(row),item={key,agent,escola:row.escola,v23,v25};
      if(!schools.has(key))schools.set(key,item);
    });
    const groups=new Map();
    schools.forEach(item=>{
      if(!groups.has(item.agent))groups.set(item.agent,[]);
      groups.get(item.agent).push(item);
    });
    return [...groups.entries()].map(([agent,items])=>{
      const v23=items.reduce((sum,item)=>sum+item.v23,0)/items.length;
      const v25=items.reduce((sum,item)=>sum+item.v25,0)/items.length;
      return {agent,v23,v25,delta:v25-v23,count:items.length};
    }).filter(item=>Number.isFinite(item.v23)&&Number.isFinite(item.v25)).sort((a,b)=>b.delta-a.delta||b.v25-a.v25||String(a.agent).localeCompare(String(b.agent),'pt-BR'));
  }
  function toggleHost(){return byId('somProgressCard')?.querySelector('.panel-title');}
  function ensureToggle(){
    const host=toggleHost();if(!host)return null;
    let btn=byId('v235IdebAgentProgressToggle');
    if(!btn){
      btn=document.createElement('button');btn.type='button';btn.id='v235IdebAgentProgressToggle';btn.className='v235-progress-view-toggle';
      btn.addEventListener('click',()=>{view=view==='agent'?'school':'agent';if(typeof window.renderSomProgress==='function')window.renderSomProgress();});
      host.appendChild(btn);
    }
    const available=eligible()&&agentSeries().length>=2;
    if(!available)view='school';
    btn.hidden=!available;
    btn.classList.toggle('active',available&&view==='agent');
    btn.textContent=view==='agent'?'Por escola':'Por agente';
    btn.setAttribute('aria-pressed',String(available&&view==='agent'));
    btn.title=view==='agent'?'Voltar à evolução individual das escolas':'Comparar a evolução média do conjunto de escolas de cada agente';
    return btn;
  }
  function scale(values){
    const lo=Math.min(...values),hi=Math.max(...values);let min=Math.max(0,Math.floor((lo-.3)*10)/10),max=Math.min(10,Math.ceil((hi+.3)*10)/10);
    if(max-min<.8){const mid=(min+max)/2;min=Math.max(0,Math.floor((mid-.5)*10)/10);max=Math.min(10,Math.ceil((mid+.5)*10)/10);}return {min,max};
  }
  function renderAgentProgress(){
    const card=byId('somProgressCard'),chart=byId('somProgressChart'),tableTarget=byId('somProgressTable');if(!card||!chart)return;
    const series=agentSeries();
    card.classList.add('open');chart.classList.add('v235-agent-progress');chart.classList.remove('v181-cre-progress');
    const title=card.querySelector('.panel-title h3'),subtitle=card.querySelector('.panel-title p');
    const creLabel=`${regionalScope()}ª CRE`,segment=byId('somAnoEscolar')?.value||'segmento selecionado';
    if(title)title.textContent='Progressão por agente — IDEB 2023 → 2025';
    if(subtitle)subtitle.textContent=`${creLabel} · ${segment}. Cada linha representa uma leitura pareada das escolas do agente com IDEB válido nos dois anos; o resultado agregado da CRE segue o valor oficial publicado pela SME-Rio.`;
    if(series.length<2){
      chart.innerHTML='<div class="som-empty">Não há pelo menos dois agentes com escolas pareadas e IDEB válido em 2023 e 2025 neste recorte.</div>';if(tableTarget)tableTarget.innerHTML='';return;
    }
    const values=series.flatMap(s=>[s.v23,s.v25]),{min,max}=scale(values);
    const w=980,h=390,pL=68,pR=44,pT=32,pB=58,x23=pL,x25=w-pR,plotH=h-pT-pB;
    const y=v=>pT+plotH*(1-(v-min)/(max-min||1));
    const ticks=Array.from({length:6},(_,i)=>min+(max-min)*i/5);
    const grid=ticks.map(v=>`<g><line x1="${pL}" y1="${y(v)}" x2="${w-pR}" y2="${y(v)}" stroke="#e3edf4" stroke-width="1"/><text x="${pL-12}" y="${y(v)+4}" text-anchor="end" fill="#718597" font-size="11">${fmt(v)}</text></g>`).join('');
    const lines=series.map((s,i)=>{
      const color=palette[i%palette.length],tip=`${s.agent} · ${s.count} escolas pareadas · ${fmt(s.v23)} → ${fmt(s.v25)} (${fmtDelta(s.delta)})`;
      return `<g class="v235-agent-series" data-agent-idx="${i}" style="opacity:.82"><line x1="${x23}" y1="${y(s.v23)}" x2="${x25}" y2="${y(s.v25)}" stroke="${color}" stroke-width="3" stroke-linecap="round"><title>${escHtml(tip)}</title></line><circle cx="${x23}" cy="${y(s.v23)}" r="4.5" fill="${color}" stroke="#fff" stroke-width="1.5"><title>${escHtml(tip)}</title></circle><circle cx="${x25}" cy="${y(s.v25)}" r="4.5" fill="${color}" stroke="#fff" stroke-width="1.5"><title>${escHtml(tip)}</title></circle></g>`;
    }).join('');
    const totalSchools=series.reduce((sum,s)=>sum+s.count,0);
    const legend=series.map((s,i)=>`<button type="button" data-agent-legend="${i}" aria-pressed="false" title="${escHtml(s.agent)}"><i style="background:${palette[i%palette.length]}"></i><span>${escHtml(s.agent)} · ${s.count} esc. · ${fmtDelta(s.delta)}</span></button>`).join('');
    chart.innerHTML=`<div class="v235-agent-summary"><span><strong>${series.length} agentes</strong> · ${totalSchools} escolas pareadas no recorte.</span><span>Detalhamento pareado por agente; não substitui o resultado oficial agregado da CRE.</span></div><svg viewBox="0 0 ${w} ${h}" style="width:100%;height:390px" role="img" aria-label="Progressão do IDEB por agente entre 2023 e 2025">${grid}<line x1="${pL}" y1="${h-pB}" x2="${w-pR}" y2="${h-pB}" stroke="#c5d7e4" stroke-width="1.2"/>${lines}<text x="${x23}" y="${h-18}" text-anchor="middle" fill="#526b7d" font-size="13" font-weight="800">IDEB 2023</text><text x="${x25}" y="${h-18}" text-anchor="middle" fill="#526b7d" font-size="13" font-weight="800">IDEB 2025</text></svg><div class="v235-agent-legend"><button type="button" data-agent-reset><span>Mostrar todos</span></button>${legend}</div>`;
    let active=null;
    const apply=index=>{
      active=(index===null||active===index)?null:index;
      chart.querySelectorAll('.v235-agent-series').forEach(el=>{const selected=active!==null&&Number(el.dataset.agentIdx)===active;el.style.opacity=active===null?'.82':(selected?'1':'.07');el.style.filter=selected?'drop-shadow(0 5px 9px rgba(18,56,93,.22))':'none';el.querySelector('line')?.setAttribute('stroke-width',selected?'5':'3');});
      chart.querySelectorAll('[data-agent-legend]').forEach(btn=>{const selected=active!==null&&Number(btn.dataset.agentLegend)===active;btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected));});
    };
    chart.querySelectorAll('[data-agent-legend]').forEach(btn=>btn.addEventListener('click',()=>apply(Number(btn.dataset.agentLegend))));
    chart.querySelectorAll('.v235-agent-series').forEach(el=>el.addEventListener('click',()=>apply(Number(el.dataset.agentIdx))));
    chart.querySelector('[data-agent-reset]')?.addEventListener('click',()=>{active=null;apply(null);});
    if(tableTarget&&typeof window.table==='function')window.table('somProgressTable',series.map((s,index)=>({posicao:`${index+1}ª`,agente:s.agent,escolas:s.count,ideb2023:fmt(s.v23),ideb2025:fmt(s.v25),crescimento:fmtDelta(s.delta)})),[['posicao','Posição por evolução'],['agente','Agente'],['escolas','Escolas pareadas'],['ideb2023','IDEB 2023'],['ideb2025','IDEB 2025'],['crescimento','Evolução']]);
  }
  window.renderSomProgress=function(){
    ensureToggle();
    if(eligible()&&view==='agent')return renderAgentProgress();
    const chart=byId('somProgressChart');if(chart)chart.classList.remove('v235-agent-progress');
    const result=typeof previousProgress==='function'?previousProgress():undefined;
    ensureToggle();return result;
  };
  function refreshToggle(){
    if(!eligible())view='school';ensureToggle();
  }
  ['regionalScopeSelect','somMode','somModalidade','somAnoEscolar','somComponente','somEdicao','somMetric','somAgente','somPriority'].forEach(id=>byId(id)?.addEventListener('change',()=>setTimeout(refreshToggle,0)));
  byId('somSearch')?.addEventListener('input',()=>setTimeout(refreshToggle,0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refreshToggle,850),{once:true});else setTimeout(refreshToggle,850);
})();
