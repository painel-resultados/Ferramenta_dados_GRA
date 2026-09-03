
(function(){
  'use strict';
  window.GRA_V292_DIAGNOSTICS=function(){
    return {
      version:'v363',
      geoAdrReady:Boolean(window.GEO_STATE?.adrReady),
      geoInitialized:Boolean(window.GEO_STATE?.initialized),
      simLoaded:typeof SIMULADO2026_LOADED!=='undefined'?[...SIMULADO2026_LOADED]:[],
      note:'O mapa não é mais renderizado enquanto está oculto na tela inicial. Simulado v300 mantém LP/MT selecionável para habilidades.'
    };
  };
})();
