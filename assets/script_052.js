
(function(){
 const V='v366';
 function stamp(){
   const b=document.getElementById('dashboardVersionBadge');if(b)b.textContent=V;
   document.querySelectorAll('.gra-access-version,.gra-start-version,.exp-badge').forEach(el=>el.textContent=V);
   document.documentElement.dataset.graVersion=V;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp,{once:true});else stamp();
 [500,2200,7000,16000].forEach(ms=>setTimeout(stamp,ms));
})();
