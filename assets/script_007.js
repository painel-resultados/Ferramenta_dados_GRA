
(function(){
  const CHART_ROOTS='#somMainChart,#somGetChart1,#somGetChart2';
  let tooltip=null,hideTimer=null;

  function ensureTooltip(){
    if(tooltip&&document.body.contains(tooltip))return tooltip;
    tooltip=document.createElement('div');
    tooltip.className='mobile-scatter-tooltip';
    tooltip.setAttribute('role','status');
    tooltip.setAttribute('aria-live','polite');
    document.body.appendChild(tooltip);
    return tooltip;
  }
  function titleOf(circle){
    return circle?.querySelector?.('title')?.textContent?.trim()||'';
  }
  function eligibleCircle(circle){
    return !!(circle&&circle.matches('circle')&&titleOf(circle));
  }
  function nearestTitledCircle(svg,clientX,clientY){
    let best=null,bestDistance=Infinity;
    svg.querySelectorAll('circle').forEach(circle=>{
      if(!eligibleCircle(circle))return;
      const box=circle.getBoundingClientRect();
      const cx=box.left+box.width/2,cy=box.top+box.height/2;
      const distance=Math.hypot(clientX-cx,clientY-cy);
      if(distance<bestDistance){bestDistance=distance;best=circle;}
    });
    return bestDistance<=32?best:null;
  }
  function fillTooltip(raw){
    const box=ensureTooltip();
    box.replaceChildren();
    const parts=raw.includes('\n')
      ? raw.split(/\n+/).map(x=>x.trim()).filter(Boolean)
      : raw.split(/\s+·\s+/).map(x=>x.trim()).filter(Boolean);
    const heading=document.createElement('strong');
    heading.textContent=parts.shift()||'Escola';
    box.appendChild(heading);
    parts.forEach(part=>{
      const line=document.createElement('span');
      line.textContent=part;
      box.appendChild(line);
    });
    return box;
  }
  function positionTooltip(box,clientX,clientY){
    // v81: remove o display:none gravado no fechamento anterior antes de reabrir.
    box.style.removeProperty('display');
    box.style.left='12px';
    box.style.top='12px';
    box.classList.add('open');
    const rect=box.getBoundingClientRect();
    const margin=12;
    let left=clientX-rect.width/2;
    left=Math.max(margin,Math.min(left,window.innerWidth-rect.width-margin));
    let top=clientY-rect.height-18;
    if(top<margin)top=Math.min(window.innerHeight-rect.height-margin,clientY+18);
    box.style.left=Math.round(left)+'px';
    box.style.top=Math.round(top)+'px';
  }
  function show(circle,clientX,clientY){
    const raw=titleOf(circle);
    if(!raw)return;
    const box=fillTooltip(raw);
    positionTooltip(box,clientX,clientY);
    clearTimeout(hideTimer);
    hideTimer=setTimeout(hide,5200);
  }
  function hide(){
    clearTimeout(hideTimer);
    if(!tooltip)return;
    tooltip.classList.remove('open');
    setTimeout(()=>{if(tooltip&&!tooltip.classList.contains('open'))tooltip.style.display='none';},160);
  }
  document.addEventListener('pointerup',event=>{
    const svg=event.target.closest?.('svg');
    if(!svg||!svg.closest(CHART_ROOTS))return;
    let circle=event.target.closest?.('circle');
    if(!eligibleCircle(circle))circle=nearestTitledCircle(svg,event.clientX,event.clientY);
    if(!circle)return;
    event.preventDefault();
    show(circle,event.clientX,event.clientY);
  },true);
  document.addEventListener('pointerup',event=>{
    if(!event.target.closest?.(CHART_ROOTS))hide();
  });
  window.addEventListener('scroll',hide,{passive:true});
  window.addEventListener('resize',hide);
})();
