
(function(){
  'use strict';
  function numeric(item){
    if(item==null)return NaN;
    if(typeof item==='number')return Number(item);
    for(const key of ['value','progresso','rawDelta','final','inicial','score','resultado','media','magnitude','principal','ideb2025']){
      const n=Number(item?.[key]); if(Number.isFinite(n))return n;
    }
    return NaN;
  }
  function mean(items){const a=(items||[]).map(numeric).filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;}
  function split(items,maxPerGroup=10){
    const source=Array.isArray(items)?items:[], total=source.length, cap=Math.max(1,Number(maxPerGroup)||10);
    if(total<=1)return {best:source.slice(),challenge:[],omitted:0,total,capped:false,maxPerGroup:cap};
    if(total>cap*2)return {best:source.slice(0,cap),challenge:source.slice(total-cap).reverse(),omitted:total-cap*2,total,capped:true,maxPerGroup:cap};
    const half=Math.floor(total/2);
    if(total%2===0)return {best:source.slice(0,half),challenge:source.slice(half).reverse(),omitted:0,total,capped:false,maxPerGroup:cap};
    const best=source.slice(0,half), naturalChallenge=source.slice(half+1), challenge=naturalChallenge.slice().reverse(), middle=source[half];
    const mv=numeric(middle), bm=mean(best), cm=mean(naturalChallenge);
    let toBest=true;
    if(Number.isFinite(mv)&&Number.isFinite(bm)&&Number.isFinite(cm))toBest=Math.abs(mv-bm)<=Math.abs(mv-cm);
    else if(Number.isFinite(mv)){
      const left=best.length?numeric(best[best.length-1]):NaN, right=naturalChallenge.length?numeric(naturalChallenge[0]):NaN;
      if(Number.isFinite(left)&&Number.isFinite(right))toBest=Math.abs(mv-left)<=Math.abs(mv-right);
      else if(!Number.isFinite(left)&&Number.isFinite(right))toBest=false;
    }
    if(toBest)best.push(middle);else challenge.push(middle);
    return {best,challenge,omitted:0,total,capped:false,maxPerGroup:cap,middleAssigned:toBest?'best':'challenge'};
  }
  window.graSplitOddRanking=split;
})();
