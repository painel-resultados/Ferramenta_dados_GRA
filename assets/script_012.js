
(function(){
  'use strict';

  function rowCreNumber(row){
    const direct=typeof creNumber==='function'
      ? creNumber(row?.cre||row?.regional||row?.creLabel||'')
      : Number(String(row?.cre||row?.regional||row?.creLabel||'').match(/\d+/)?.[0]||0);
    if(direct)return Number(direct);
    try{
      const point=typeof geoFindPointForSchool==='function'
        ? geoFindPointForSchool(row?.escola||'',row?.cre||row?.regional||'')
        : null;
      return Number(point?.cre)||null;
    }catch(_){return null;}
  }

  function medianScopeForRow(row){
    const ownCre=rowCreNumber(row);
    if(ownCre)return {cre:ownCre,label:`${ownCre}ª CRE`};
    const selected=Number((typeof GEO_STATE!=='undefined'&&GEO_STATE?.region)||0);
    return selected?{cre:selected,label:`${selected}ª CRE`}:{cre:null,label:'SME'};
  }

  function rowMatchesMedianScope(row,scope){
    if(!scope?.cre)return true;
    return rowCreNumber(row)===Number(scope.cre);
  }

  geoIdebMedianPair=function(label,row){
    const edition=String(row?.edicao||'2025');
    const scope=medianScopeForRow(row);
    const rows=(Array.isArray(SOM_ROWS)?SOM_ROWS:[]).filter(item=>
      rowMatchesMedianScope(item,scope)&&
      String(item.modalidade||'').includes('IDEB')&&
      String(item.anoEscolar||'')===String(label||'')&&
      (!edition||String(item.edicao||'')===edition)
    );
    return {
      m23:geoMedian(rows.map(item=>item.ideb2023)),
      m25:geoMedian(rows.map(item=>item.ideb2025??item.principal)),
      count:rows.length,
      scopeLabel:scope.label
    };
  };

  geoIdebCard=function(label,row,fallback){
    const v23=geoNum(row?.ideb2023),v25=geoNum(row?.ideb2025??row?.principal),fb=geoNum(String(fallback||'').replace(',','.'));
    const a=Number.isFinite(v23)?v23:fb,b=Number.isFinite(v25)?v25:null,delta=(Number.isFinite(a)&&Number.isFinite(b))?b-a:null;
    const med=geoIdebMedianPair(label,row);
    const medianLine=(Number.isFinite(med.m23)||Number.isFinite(med.m25))
      ? `<div class="geo-median-line">Mediana ${esc(med.scopeLabel)}<br><b>${Number.isFinite(med.m23)?geoFmt(med.m23,1):'—'} → ${Number.isFinite(med.m25)?geoFmt(med.m25,1):'—'}</b></div>`
      : '';
    return `<div class="geo-ideb-card"><small>${esc(label)}</small><div class="geo-ideb-values"><b>${Number.isFinite(a)?geoFmt(a,1):'—'}</b><i>→</i><b>${Number.isFinite(b)?geoFmt(b,1):'—'}</b></div>${geoDeltaBadge(delta,'')}${medianLine}</div>`;
  };

  geoSomMedian=function(row,field){
    if(!field)return null;
    const modality=String(row?.modalidade||''),evaluation=String(row?.avaliacao||''),edition=String(row?.edicao||''),year=String(row?.anoEscolar||''),component=String(row?.componente||'');
    const scope=medianScopeForRow(row);
    const rows=(Array.isArray(SOM_ROWS)?SOM_ROWS:[]).filter(item=>
      rowMatchesMedianScope(item,scope)&&
      String(item.modalidade||'')===modality&&
      String(item.avaliacao||'')===evaluation&&
      String(item.edicao||'')===edition&&
      String(item.anoEscolar||'')===year&&
      String(item.componente||'')===component
    );
    return geoMedian(rows.map(item=>item?.[field]));
  };

  geoSomReference=function(row){
    const metric=geoSomMetric(row);
    if(!Number.isFinite(metric.value))return '<div class="geo-mini-metrics"><span class="geo-mini-value">—</span></div>';
    const median=geoSomMedian(row,metric.field);
    const scope=medianScopeForRow(row);
    let badge='';
    if(Number.isFinite(median)){
      const diff=metric.value-median,cls=Math.abs(diff)<=.05?'equal':diff>0?'above':'below',label=Math.abs(diff)<=.05?'Na mediana':diff>0?'Acima da mediana':'Abaixo da mediana';
      badge=`<span class="geo-mini-reference ${cls}">${label}</span>`;
    }
    return `<div class="geo-mini-metrics"><span class="geo-mini-value">${geoFmt(metric.value,1)}${metric.suffix}</span>${Number.isFinite(median)?`<span class="geo-mini-median">Mediana ${esc(scope.label)}: ${geoFmt(median,1)}${metric.suffix}</span>${badge}`:''}</div>`;
  };

  window.GEO_MEDIAN_SCOPE_V156={rowCreNumber,medianScopeForRow};
})();
