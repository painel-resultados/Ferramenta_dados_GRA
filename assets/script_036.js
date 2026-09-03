
(function(){
  'use strict';
  const previous=window.geoSomSnapshot;
  if(typeof previous!=='function')return;
  window.geoSomSnapshot=function(ctx){
    if(!ctx||ctx.evaluation!=='Simulado 2026')return previous(ctx);
    if((ctx.segment==='4º ano'||ctx.segment==='8º ano')&&ctx.indicator!=='notaPadronizada')ctx={...ctx,indicator:'notaPadronizada'};
    const region=Number(GEO_STATE?.region||0);
    const getFilter=document.getElementById('geoGet')?.value||'';
    const agentFilter=document.getElementById('geoAgent')?.value||'';
    const allSchools=agentFilter===GEO_ALL_SCHOOLS_VALUE;
    const priorityFilter=document.getElementById('geoPriority')?.value||'';
    const searchFilter=norm(document.getElementById('geoSearch')?.value||'');
    const filterKey=[region,getFilter,agentFilter,priorityFilter,searchFilter].join('¦');
    const key=['V290_SIM',ctx.segment,ctx.component,ctx.indicator,ctx.edition,GEO_STATE.somIndexSize,Array.isArray(SOM_ROWS)?SOM_ROWS.length:0,filterKey].join('\u0002');
    const cached=GEO_STATE.evalCache.get(key);if(cached)return cached;
    geoBuildSomIndex();
    const scope=(GEO_POINTS||[]).filter(point=>!region||Number(point.cre)===region);
    const values=new Map();
    scope.forEach(point=>{
      const rows=geoSomRowsForPoint(point,ctx);
      let value;
      if((ctx.segment==='4º ano'||ctx.segment==='8º ano')&&ctx.indicator==='notaPadronizada'){
        const lp=rows.find(r=>r.componente==='LP'),mt=rows.find(r=>r.componente==='MT');
        const a=Number(lp?.notaPadronizada),b=Number(mt?.notaPadronizada);
        value=Number.isFinite(a)&&Number.isFinite(b)?(a+b)/2:NaN;
      }else value=geoWeightedEval(rows,row=>geoSomMetricValue(row,ctx));
      if(Number.isFinite(value))values.set(point.name,value);
    });
    const medianValues=scope.filter(point=>{
      if(!values.has(point.name))return false;
      if(getFilter==='sim'&&!point.isGET)return false;
      if(getFilter==='nao'&&point.isGET)return false;
      if(!allSchools&&agentFilter&&point.agent!==agentFilter)return false;
      if(!allSchools&&!agentFilter&&!String(point.agent||'').trim())return false;
      if(priorityFilter==='sim'&&!priorityMatchesContext(point.name,ctx.segment,ctx.evaluation))return false;
      if(searchFilter&&!norm([point.name,point.agent,point.bairro,prioritySearchText(point.name)].join(' ')).includes(searchFilter))return false;
      return true;
    }).map(point=>values.get(point.name));
    const median=geoMedian(medianValues);
    const threshold=ctx.indicator==='proficiencia'?5:(ctx.indicator==='notaPadronizada'?.1:.5);
    const results=new Map();
    scope.forEach(point=>{
      const value=values.get(point.name);
      if(!Number.isFinite(value)||!Number.isFinite(median)){
        results.set(point.name,{status:'nodata',delta:null,value:null,median,count:0,suffix:''});return;
      }
      const delta=value-median;
      const status=Math.abs(delta)<=threshold?'flat':delta>0?'up':'down';
      const bandLabel=status==='flat'?'Próximo da mediana':status==='up'?'Acima da mediana':'Abaixo da mediana';
      results.set(point.name,{status,delta,value,median,count:1,suffix:ctx.indicator==='adqAv'?'%':'',bandLabel});
    });
    const snapshot={results,median,count:medianValues.length};
    GEO_STATE.evalCache.set(key,snapshot);return snapshot;
  };
})();
