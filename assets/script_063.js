
(function(){
  'use strict';
  // Managerial priority remains exclusively LP/MT regardless of current component.
  window.v246IsManagerialPriorityComponent=function(c){return ['LP','MT'].includes(String(c||'').trim());};
  // História e Geografia are now valid progression components when ADR1 and ADR2 are both present.
  window.v246ProgressionComponents=new Set(['LP','MT','CN','História','Geografia']);
})();
