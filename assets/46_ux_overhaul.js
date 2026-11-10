/* GRA navigation layer. No datasets, charts, filters or exports are replaced. */
(()=>{
 'use strict';
 if(window.__GRA_UX46__)return;
 const definitions={
   cre:['Visão geral','Conheça as unidades e os segmentos da 2ª CRE.'],
   agentes:['Agentes e territórios','Consulte a distribuição e as unidades por agente.'],
   banco:['Banco de dados','Encontre escolas e consulte os registros detalhados.'],
   georreferenciamento:['Mapa de resultados','Escolha uma avaliação e explore as escolas no mapa.'],
   exclusivas:['Unidades exclusivas','Explore as unidades por categoria e consulte a lista.'],
   efpd:['Ensino Fundamental e Dimensão','Veja a distribuição por plano e unidade.'],
   resultados:['Somativas','Escolha o recorte, leia os indicadores e aprofunde os resultados.'],
   adrs:['ADRs','Analise resultados, progressão e habilidades por edição.'],
   criterios:['Critérios','Consulte a definição dos campos e recortes usados na ferramenta.']
 };
 const targets={
   cre:[['Indicadores','#creKpis'],['Gráficos','#donutEF'],['Listas','#agentTable']],
   agentes:[['Filtros','#territorySelect'],['Resumo','#territoryFacts'],['Lista','#territoryTable']],
   banco:[['Filtros','#bankSearch'],['Resultados','#bankTable'],['Metas','#metasBankCard']],
   georreferenciamento:[['Avaliação','#geoEvalFilters'],['Filtros','#geoSearch'],['Mapa','#geoMap']],
   exclusivas:[['Categorias','#exclusivePills'],['Busca','#exclusiveSearch'],['Lista','#exclusiveTable']],
   efpd:[['Gráficos','#efpdPageBars'],['Dados','#efpdTable']],
   resultados:[['Filtros','#somFiltersCard'],['Indicadores','#somKpis'],['Lista','#somTable']],
   adrs:[['Filtros','#adrFiltersCard'],['Gráficos','#adrSchoolBars'],['Lista','#adrTable']],
   criterios:[['Critérios','#criteriaCards']]
 };
 function intro(section){
   if(section.querySelector(':scope > .gra-ux-section-intro'))return;
   const [title,description]=definitions[section.id]||[section.id,''];
   const header=document.createElement('div');header.className='gra-ux-section-intro';
   const h=document.createElement('h2');h.textContent=title;header.append(h);
   const p=document.createElement('p');p.textContent=description;header.append(p);
   const context=document.createElement('span');context.className='gra-ux-context';header.append(context);
   const links=document.createElement('nav');links.className='gra-ux-jumps';links.setAttribute('aria-label','Ir para conteúdo de '+title);
   for(const [label,selector] of targets[section.id]||[]){
     const destination=section.querySelector(selector);
     if(!destination)continue;
     const button=document.createElement('button');button.type='button';button.textContent=label;
     button.addEventListener('click',()=>{
       // The ADR skills view is an alternate view, so use its own filters when selected.
       const activeSkills=section.id==='adrs'&&section.classList.contains('gra-skills-active');
       const target=activeSkills?section.querySelector('#graSkillPage'):destination;
       target?.scrollIntoView({behavior:'smooth',block:'start'});
     });
     links.append(button);
   }
   if(links.childElementCount)header.append(links);
   section.prepend(header);
 }
 function update(){
   const select=document.getElementById('regionalScopeSelect');
   const scope=select?.selectedOptions?.[0]?.textContent?.trim()||'Toda a SME';
   document.querySelectorAll('.gra-ux-context').forEach(el=>{if(el.textContent!==scope)el.textContent=scope});
 }
 function boot(){
   document.querySelectorAll('main.main > section.section').forEach(intro);
   update();
   document.getElementById('regionalScopeSelect')?.addEventListener('change',update);
   window.__GRA_UX46__={update};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
