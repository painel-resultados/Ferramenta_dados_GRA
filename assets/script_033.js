
(function(){
  'use strict';
  // Contrato explícito para a preparação fracionada e para os testes de abertura.
  try{
    if(typeof geoInitStage==='function')window.geoInitStage=geoInitStage;
    if(typeof geoScheduleFilters==='function')window.geoScheduleFilters=geoScheduleFilters;
    if(typeof geoEvalContext==='function')window.geoEvalContext=geoEvalContext;
    if(typeof geoAdrSnapshot==='function')window.geoAdrSnapshot=geoAdrSnapshot;
    if(typeof GEO_STATE!=='undefined')window.GEO_STATE=GEO_STATE;
    if(typeof GEO_3D_STATE!=='undefined')window.GEO_3D_STATE=GEO_3D_STATE;
  }catch(error){console.warn('Contrato do georreferenciamento v295',error);}
})();
