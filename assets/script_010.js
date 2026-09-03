
(function(){
  'use strict';

  // A avaliação pertence à escola; o agente deve refletir sempre o cadastro
  // estrutural vigente, inclusive depois de redistribuições da equipe.
  const previousAdrRowAgent=window.adrRowAgent;
  const previousAdrRowTerritorio=window.adrRowTerritorio;

  function currentPoint(row){
    if(typeof window.geoFindPointForSchool!=='function')return null;
    return window.geoFindPointForSchool(
      row?.escola||'',
      row?.regional??row?.cre??''
    );
  }

  window.adrRowAgent=function(row){
    const point=currentPoint(row);
    const current=String(point?.agent||'').trim();
    if(current)return typeof window.adrCanonicalAgentName==='function'
      ? window.adrCanonicalAgentName(current)
      : current;
    return typeof previousAdrRowAgent==='function' ? previousAdrRowAgent(row) : '';
  };

  window.adrRowTerritorio=function(row){
    const point=currentPoint(row);
    if(point&&point.territory!==null&&point.territory!==undefined&&String(point.territory).trim()!=='')return point.territory;
    return typeof previousAdrRowTerritorio==='function' ? previousAdrRowTerritorio(row) : '';
  };
})();
