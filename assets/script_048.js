
(function(){
'use strict';
const V='v366';
function stamp(){
 const b=document.getElementById('dashboardVersionBadge');if(b)b.textContent=V;
 document.querySelectorAll('.gra-access-version,.gra-start-version,.exp-badge').forEach(el=>el.textContent=V);
 document.documentElement.dataset.graVersion=V;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{stamp();setTimeout(stamp,1800);},{once:true});else stamp();
})();
