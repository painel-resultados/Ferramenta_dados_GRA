
(function(){
  'use strict';
  const VERSION='v366';
  const stamp=()=>{
    const badge=document.getElementById('dashboardVersionBadge');
    if(badge)badge.textContent=VERSION;
    const start=document.querySelector('.gra-start-version');
    if(start)start.textContent=VERSION;
    document.querySelectorAll('.exp-badge').forEach(el=>el.textContent=VERSION);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp,{once:true}); else stamp();
})();
