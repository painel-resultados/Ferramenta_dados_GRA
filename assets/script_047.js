
(function(){
'use strict';
function clean(){
  ['somGetCompareToggle','adrGetCompareToggle','somTurnoCompareToggle','adrTurnoCompareToggle'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){ el.checked=false; el.closest('.gc-toggle-row')?.remove(); }
  });
  document.querySelectorAll('.gc-toggle-grid,.gc-compare-card').forEach(el=>el.remove());
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{clean();setTimeout(clean,300);setTimeout(clean,1500);},{once:true});
}else{
  clean();setTimeout(clean,300);setTimeout(clean,1500);
}
})();
