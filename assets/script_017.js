
(function(){
  'use strict';
  const previousDonut=window.renderSomDonut;
  const palette=(typeof COLORS!=='undefined'&&Array.isArray(COLORS)&&COLORS.length>=3)?COLORS:['#126da0','#1f956c','#f0a122'];
  let lastContext=null;
  let donutCanShow=false;

  const byId=id=>document.getElementById(id);
  const isIdeb=()=>byId('somModalidade')?.value==='IDEB 2025';
  const segment=()=>byId('somAnoEscolar')?.value||'';
  const scope=()=>Number(byId('regionalScopeSelect')?.value||0);
  const scopeLabel=()=>byId('regionalScopeSelect')?.selectedOptions?.[0]?.textContent||'Toda a SME';
  const htmlEscape=value=>typeof window.esc==='function'?window.esc(value):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const creNumber=row=>{const match=String(row?.cre||row?.regional||'').match(/\d{1,2}/);return match?Number(match[0]):0;};
  const creName=n=>`${n}ª CRE`;
  const metricKey=()=>{const key=byId('somMetric')?.value||'principal';return ['ideb2023','ideb2025','crescimento'].includes(key)?key:'ideb2025';};
  const metricLabel=key=>({ideb2023:'IDEB 2023',ideb2025:'IDEB 2025',crescimento:'Crescimento 2023–2025'})[key]||'IDEB 2025';
  const number=value=>{const n=Number(value);return Number.isFinite(n)?n:null;};
  const growth=row=>{const direct=number(row?.crescimento);if(direct!==null)return direct;const a=number(row?.ideb2023),b=number(row?.ideb2025);return a!==null&&b!==null?b-a:null;};
  const rowValue=(row,key)=>key==='crescimento'?growth(row):number(row?.[key]??(key==='ideb2025'?row?.principal:null));
  const fmt=(value,key)=>{const n=number(value);if(n===null)return '—';const text=n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});return key==='crescimento'&&n>0?`+${text}`:text;};
  const agent=row=>(typeof window.somRowAgent==='function'?window.somRowAgent(row):row?.agente)||'Sem agente vinculado';
  const hasDetail=()=>{
    const q=String(byId('somSearch')?.value||'').trim();
    const ag=byId('somAgente')?.value||'';
    const priority=byId('somPriority')?.value==='sim';
    const specific=typeof window.somIsSpecificAgent==='function'?window.somIsSpecificAgent(ag):Boolean(ag);
    return Boolean(q)||specific||priority;
  };
  const uniqueSchools=rows=>{
    const map=new Map();
    (rows||[]).forEach(row=>{
      if(row?._afCreAggregate||!row?.escola)return;
      const key=String(row.codigoSME||row.codigoINEP||`${row.cre||row.regional||''}|${row.escola}`);
      const current=map.get(key);
      if(!current||number(row.ideb2025)!==null)map.set(key,row);
    });
    return [...map.values()];
  };
  function entities(rows,key){
    const schools=uniqueSchools(rows).filter(row=>rowValue(row,key)!==null);
    if(scope()===0&&!hasDetail()){
      const groups=new Map();
      schools.forEach(row=>{const n=creNumber(row);if(!n)return;if(!groups.has(n))groups.set(n,[]);groups.get(n).push(row);});
      return {kind:'CREs',items:[...groups.entries()].map(([n,members])=>{
        const values=members.map(row=>rowValue(row,key)).filter(v=>v!==null);
        const avg=values.reduce((a,b)=>a+b,0)/values.length;
        const avg23=members.map(r=>number(r.ideb2023)).filter(v=>v!==null);
        const avg25=members.map(r=>number(r.ideb2025)).filter(v=>v!==null);
        const avgG=members.map(growth).filter(v=>v!==null);
        return {name:creName(n),cre:n,value:avg,count:members.length,members,ideb2023:avg23.length?avg23.reduce((a,b)=>a+b,0)/avg23.length:null,ideb2025:avg25.length?avg25.reduce((a,b)=>a+b,0)/avg25.length:null,crescimento:avgG.length?avgG.reduce((a,b)=>a+b,0)/avgG.length:null};
      }).sort((a,b)=>a.cre-b.cre)};
    }
    return {kind:'escolas',items:schools.map(row=>({name:row.escola,value:rowValue(row,key),count:1,row,cre:creNumber(row),ideb2023:number(row.ideb2023),ideb2025:number(row.ideb2025),crescimento:growth(row)}))};
  }
  function split(items,key){
    const sorted=items.slice().sort((a,b)=>b.value-a.value||String(a.name).localeCompare(String(b.name),'pt-BR'));
    if(sorted.length<3)return null;
    const q=Math.floor(sorted.length/3),r=sorted.length%3,sizes=[q+(r>0?1:0),q+(r>1?1:0),q];
    const labels=key==='crescimento'?['Maiores crescimentos','Crescimento intermediário','Menores crescimentos']:['Faixa superior','Faixa intermediária','Faixa mais desafiadora'];
    let cursor=0;
    return sizes.map((size,index)=>{const members=sorted.slice(cursor,cursor+size);cursor+=size;return {categoria:labels[index],total:members.length,members,min:Math.min(...members.map(x=>x.value)),max:Math.max(...members.map(x=>x.value)),color:palette[index%palette.length]};});
  }
  function panelElements(){
    const donut=byId('somPie');
    const panel=donut?.closest('.card')||donut?.closest('.panel');
    const grid=panel?.parentElement;
    return {donut,panel,grid,legend:byId('somPieLegend'),subtitle:byId('somPieSubtitle')};
  }
  function setPanelVisible(show){
    const {panel,grid}=panelElements();
    if(panel)panel.hidden=!show;
    grid?.classList.toggle('v172-pie-hidden',!show);
    if(!show)closeDrawer();
  }
  function progressHasFocus(){return Boolean(document.querySelector('#somProgressChart .ideb-progress-legend.active'));}
  function updateFocusVisibility(){setPanelVisible(Boolean(donutCanShow&&!progressHasFocus()));}

  function ensureDrawer(){
    let drawer=byId('v172IdebStrataDrawer');
    if(drawer)return drawer;
    const backdrop=document.createElement('div');backdrop.id='v172IdebStrataBackdrop';backdrop.className='v172-strata-backdrop';backdrop.setAttribute('aria-hidden','true');
    drawer=document.createElement('aside');drawer.id='v172IdebStrataDrawer';drawer.className='v172-strata-drawer';drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-hidden','true');drawer.innerHTML='<div class="v172-strata-head"><div class="v172-strata-eyebrow" id="v172StrataEyebrow"></div><h2 id="v172StrataTitle"></h2><p id="v172StrataSubtitle"></p><button type="button" class="v172-strata-close" aria-label="Fechar detalhamento">×</button></div><div class="v172-strata-summary" id="v172StrataSummary"></div><div class="v172-strata-list" id="v172StrataList"></div>';
    document.body.append(backdrop,drawer);
    backdrop.addEventListener('click',closeDrawer);drawer.querySelector('.v172-strata-close')?.addEventListener('click',closeDrawer);
    return drawer;
  }
  function closeDrawer(){
    const drawer=byId('v172IdebStrataDrawer'),backdrop=byId('v172IdebStrataBackdrop');
    drawer?.classList.remove('open');backdrop?.classList.remove('open');
    drawer?.setAttribute('aria-hidden','true');backdrop?.setAttribute('aria-hidden','true');
    document.body.classList.remove('v172-strata-open');
  }
  function attr(label,value){return `<div class="v172-strata-attr"><b>${htmlEscape(value)}</b><span>${htmlEscape(label)}</span></div>`;}
  function openDrawer(category){
    const ctx=lastContext;if(!ctx)return;
    const stratum=ctx.strata.find(item=>item.categoria===category);if(!stratum)return;
    const drawer=ensureDrawer(),backdrop=byId('v172IdebStrataBackdrop');
    const kind=ctx.set.kind,unitLabel=kind==='CREs'?'CREs':'escolas';
    byId('v172StrataEyebrow').textContent=`${segment()} · ${scopeLabel()} · ${ctx.metricLabel}`;
    byId('v172StrataTitle').textContent=stratum.categoria;
    byId('v172StrataSubtitle').textContent=`${stratum.total} ${unitLabel} neste estrato. A classificação é relativa ao universo atualmente selecionado.`;
    byId('v172StrataSummary').innerHTML=[
      `<div class="v172-strata-kpi"><b>${stratum.total}</b><span>${unitLabel}</span></div>`,
      `<div class="v172-strata-kpi"><b>${htmlEscape(fmt(stratum.max,ctx.key))}</b><span>Maior ${htmlEscape(ctx.metricLabel)}</span></div>`,
      `<div class="v172-strata-kpi"><b>${htmlEscape(fmt(stratum.min,ctx.key))}</b><span>Menor ${htmlEscape(ctx.metricLabel)}</span></div>`
    ].join('');
    byId('v172StrataList').innerHTML=stratum.members.map(item=>{
      if(kind==='CREs'){
        return `<article class="v172-strata-item" style="--stratum-color:${stratum.color}"><div class="v172-strata-item-head"><h3>${htmlEscape(item.name)}</h3><span class="v172-strata-score">${htmlEscape(ctx.metricLabel)} ${htmlEscape(fmt(item.value,ctx.key))}</span></div><div class="v172-strata-meta">${item.count.toLocaleString('pt-BR')} escolas com resultado válido no segmento</div><div class="v172-strata-attrs">${attr('IDEB 2023 médio',fmt(item.ideb2023,'ideb2023'))}${attr('IDEB 2025 médio',fmt(item.ideb2025,'ideb2025'))}${attr('Crescimento médio',fmt(item.crescimento,'crescimento'))}</div></article>`;
      }
      const row=item.row||{};
      const codes=[row.codigoSME?`SME ${row.codigoSME}`:'',row.codigoINEP?`INEP ${row.codigoINEP}`:''].filter(Boolean).join(' · ');
      return `<article class="v172-strata-item" style="--stratum-color:${stratum.color}"><div class="v172-strata-item-head"><h3>${htmlEscape(item.name)}</h3><span class="v172-strata-score">${htmlEscape(ctx.metricLabel)} ${htmlEscape(fmt(item.value,ctx.key))}</span></div><div class="v172-strata-meta">${htmlEscape(creName(item.cre))} · ${htmlEscape(agent(row))}${codes?` · ${htmlEscape(codes)}`:''}</div><div class="v172-strata-attrs">${attr('IDEB 2023',fmt(item.ideb2023,'ideb2023'))}${attr('IDEB 2025',fmt(item.ideb2025,'ideb2025'))}${attr('Crescimento',fmt(item.crescimento,'crescimento'))}</div></article>`;
    }).join('');
    drawer.classList.add('open');backdrop?.classList.add('open');drawer.setAttribute('aria-hidden','false');backdrop?.setAttribute('aria-hidden','false');document.body.classList.add('v172-strata-open');
    setTimeout(()=>drawer.querySelector('.v172-strata-close')?.focus(),80);
  }

  function renderIdebDonut(rows){
    const {donut,legend,subtitle}=panelElements();
    const key=metricKey(),set=entities(rows,key),strata=split(set.items,key);
    donutCanShow=Boolean(strata);
    if(!strata){
      lastContext=null;
      if(donut)donut.innerHTML='<div class="donut-center"><b>—</b><span>estratos</span></div>';
      if(legend)legend.innerHTML='';
      setPanelVisible(false);
      return;
    }
    const total=strata.reduce((sum,item)=>sum+item.total,0);
    if(donut)donut.innerHTML=`<div class="donut-center"><b>${total.toLocaleString('pt-BR')}</b><span>${set.kind}</span></div>`;
    lastContext={key,metricLabel:metricLabel(key),set,strata};
    renderDonut('somPie','somPieLegend',strata.map(item=>({...item,percentual:item.total/total*100})),total,openDrawer);
    [...(legend?.querySelectorAll('.legend-row')||[])].forEach((row,index)=>{
      const item=strata[index];
      row.classList.add('v172-stratum');
      row.innerHTML=`<i class="swatch" style="background:${item.color}"></i><div class="legend-copy"><strong>${htmlEscape(item.categoria)}</strong><small>${set.kind==='CREs'?`${item.members.map(x=>x.name).join(' · ')}`:`${metricLabel(key)} ${fmt(item.min,key)} a ${fmt(item.max,key)}`}</small></div><span>${item.total}</span>`;
    });
    if(subtitle)subtitle.textContent=scope()===0&&!hasDetail()?`${segment()} · 11 CREs distribuídas em três estratos relativos. Toque em uma fatia para ver as regionais.`:`${segment()} · escolas distribuídas em três estratos relativos ao recorte. Toque em uma fatia para ver as unidades.`;
    updateFocusVisibility();
  }

  window.renderSomDonut=function(rows){
    if(!isIdeb()){
      donutCanShow=true;lastContext=null;setPanelVisible(true);closeDrawer();
      return typeof previousDonut==='function'?previousDonut(rows):undefined;
    }
    return renderIdebDonut(rows);
  };

  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDrawer();});
  document.addEventListener('click',event=>{
    if(event.target.closest('#somProgressChart .ideb-progress-legend, #somProgressChart .ideb-progress-reset, #somProgressChart .ideb-progress-series'))setTimeout(updateFocusVisibility,35);
  });
  ['regionalScopeSelect','somModalidade','somAnoEscolar','somComponente','somEdicao','somMetric','somAgente','somPriority','somMode'].forEach(id=>byId(id)?.addEventListener('change',closeDrawer));
  byId('somSearch')?.addEventListener('input',closeDrawer);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{if(typeof window.renderResultados==='function')window.renderResultados();},520),{once:true});
  else setTimeout(()=>{if(typeof window.renderResultados==='function')window.renderResultados();},520);
})();
