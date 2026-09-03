
(function(){
'use strict';
const V='v366',MINE='mine',ALIAS_MAP={"guilherme gomes da silva":["Guilherme Gomes da Silva"],"leticia de souza cabral":["Leticia de Souza Cabral","Letícia Souza Cabral"],"simone ramalho lessa":["Simone Ramalho Lessa"],"fernanda alves santos rangel":["Fernanda Alves Santos Rangel","Fernanda Alves Santos"],"julio cesar carvalho soares":["Julio Cesar Carvalho Soares"],"lilian de jesus pimenta":["Lilian de Jesus Pimenta"],"rejane da silva":["REJANE DA SILVA"],"cynthia caputo macedo do espirito santo":["Cynthia Caputo Macedo do Espírito Santo"],"ana paula de siqueira carvalho":["Ana Paula de Siqueira Carvalho"],"debora cristina aquino de souza monteiro":["Débora Cristina Aquino de Souza Monteiro"],"elizete gomes coelho dos santos":["Elizete Gomes Coelho dos Santos"],"bruna braga tavares azara":["Bruna Braga Tavares Azara"],"daniele areas barria dos santos":["Daniele Areas Barria dos Santos"],"alexandra barbara de almeida":["Alexandra Barbara de Almeida"],"tatiana da silva souza":["Tatiana da Silva Souza","Tatiana Silva Souza"],"kellen correa vila marques":["Kellen Corrêa Vila Marques"],"gisele soares de andrade":["Gisele Soares de Andrade"],"rosilene machado carneiro pires":["Rosilene Machado Carneiro Pires","Rosilene Machado"],"flavia cristina alves de oliveira martins":["Flávia Cristina Alves de Oliveira Martins"],"clara dos reis magalhaes":["Clara dos Reis Magalhães"],"marcia da silva fonseca":["Márcia da Silva Fonseca"],"monique de figueiredo pagels":["Monique de Figueiredo Pagels","Monique Pagels"],"niele rosa pereira da silva":["NIELE ROSA PEREIRA DA SILVA"],"renata shirley silva barbosa":["Renata Shirley Silva Barbosa","Renata Barbosa"],"renata ferreira chrispino":["Renata Ferreira Chrispino","Renata Chrispino"],"daniele cataldi fernandez":["Daniele Cataldi Fernandez"],"barbara lenora teixeira portilho":["Bárbara Lenora Teixeira Portilho","Bárbara Portilho"],"sonia maria siqueira trotte":["Sonia Maria Siqueira Trotte"],"marcia lima de freitas rocha":["Marcia Lima de Freitas Rocha"],"francisco pedro bahia becerra velasquez":["Francisco Pedro Bahia Becerra Velasquez","Francisco Velasquez"],"paulo cesar meda":["Paulo César Meda"],"wallace benjamim costa amorim":["Wallace Benjamim Costa Amorim","Wallace Benjamim"],"silvana de fatima ferreira":["Silvana de Fátima Ferreira"],"evelin generoso ferreira fonseca":["Evelin Generoso Ferreira Fonseca","Évelin Generoso Fonseca"],"vera regina campos pacheco":["Vera Regina Campos Pacheco"],"milton fagundes da silva":["Milton Fagundes da Silva"],"claudia alexandre queiroz":["Claudia Alexandre Queiroz"],"tiago santos lopes":["Tiago Santos Lopes"],"pedro moreira lima":["Pedro Moreira Lima"],"luis felipe gomes de oliveira rocha":["Luis Felipe Gomes de Oliveira Rocha","Luis Felipe Rocha"],"maria daniela de santana":["Maria Daniela de Santana","Maria Daniela Santana"],"simone de jesus souza":["Simone de Jesus Souza","Simone Souza"],"carla maria mendonca lima":["Carla Maria Mendonça Lima"],"ana paula paranhos almeida":["Ana Paula Paranhos Almeida","Ana Paula Paranhos de Almeida"],"danielly dos santos volpato":["Daniélly dos Santos Volpato","Danielly Volpato"],"monique vianna dos passos nahoum":["Monique Vianna dos Passos Nahoum"],"renata figueiredo de araujo lima":["Renata Figueiredo de Araujo Lima"],"adriano de castro trindade":["Adriano de Castro Trindade"],"renata medeiros gomes coelho":["Renata Medeiros Gomes Coelho"],"laura maria mendes de souza":["Laura Maria Mendes De Souza"],"karine aparecida torquato soares da silva":["Karine Aparecida Torquato Soares da Silva"],"roberta barrese bighi":["Roberta Barrese Bighi"],"allan esteves basilio":["Allan Esteves Basílio"],"andrea pinto de oliveira goncalves":["Andréa Pinto de Oliveira Gonçalves","Andréa Pinto"],"daniele borges carvalho":["Daniele Borges Carvalho","Daniele Borges de Carvalho"],"camila da silva de souza":["Camila da Silva de Souza"],"angelica alves da silva":["Angelica Alves da Silva"],"eduardo meirelles azzam":["Eduardo Meirelles Azzam"],"karen da costa ferreira":["Karen da Costa Ferreira"],"sylvia schmidt motta pessoa martins":["Sylvia Schmidt Motta Pessôa Martins","Sylvia Martins"],"katia baptista da costa":["Katia Baptista da Costa"],"beatriz machado da costa":["Beatriz Machado da Costa"],"aline ribeiro de sousa baptista":["Aline Ribeiro de Sousa Baptista","Aline Ribeiro"],"janaina borges ramos rodrigues de souza":["Janaina Borges Ramos Rodrigues de Souza","Janaina Souza"],"geni de souza rodrigues":["Geni de Souza Rodrigues","Geni Rodrigues"],"caroline aquino martins":["Caroline Aquino Martins"],"paola brum duque estrada arguelho":["Paola Brum Duque Estrada Arguelho","Paola Brum"],"rafael martins farias":["Rafael Martins Farias"],"danielli wilhelm da costa":["Danielli Wilhelm da Costa"],"ester silva de azevedo":["Ester Silva de Azevedo"],"cristiane nascimento de mello rodrigues":["Cristiane Nascimento de Mello Rodrigues"],"rodrigo costa de souza":["Rodrigo Costa de Souza","Rodrigo Costa Souza"],"nathalia barbosa das chagas":["Nathália Barbosa das Chagas","Nathalia Chagas"],"tathiana innocencio salsa rosa":["Tathiana Innocencio Salsa Rosa"],"camila pereira gonsalez dinamarco":["Camila Pereira Gonsalez Dinamarco"],"alexandre florencio dos santos":["Alexandre Florencio dos Santos"],"daiana candido rodrigues":["Daiana Candido Rodrigues"],"amanda zambe dos santos periquito":["Amanda Zambe dos Santos Periquito"],"gabriela goncalves ozorio":["Gabriela Gonçalves Ozório"],"lilian carla guimaraes dias":["Lilian Carla Guimarães Dias","Lilian Dias"],"isadora araujo do nascimento":["Isadora Araújo do Nascimento"],"renata rosas de almeida":["Renata Rosas de Almeida"],"ivani alves rodrigues":["Ivani Alves Rodrigues"],"renata da silva seixas":["Renata da Silva Seixas"],"ana patricia neves pinheiro":["Ana Patrícia Neves Pinheiro"],"michele cristina de mello teodosio montenari":["Michele Cristina de Mello Teodosio Montenari","Michele Cristina Mello Teodosio Montenari"],"silvia rocha da costa":["Silvia Rocha da Costa"],"chrystiane carvalho":["Chrystiane  Carvalho","Chrystiane Rodrigues Machado de Carvalho"],"ana cristina barros araujo":["Ana Cristina Barros Araujo"],"renata chagas teixeira da silva de azeredo":["Renata Chagas Teixeira da Silva de Azeredo"],"fabricia belo viana":["Fabrícia Belo Viana"],"solanea de lemos magalhaes":["Solanea de Lemos Magalhães","Solanea Lemos Magalhães"],"rodrigo de almeida quadro":["Rodrigo de Almeida Quadro","Rodrigo Almeida Quadro"],"patricia ismerio nascimento albuquerque":["Patricia Ismério Nascimento Albuquerque","Patricia Ismério Nascimento"],"fanni hamphreis da silva":["Fanni Hamphreis da Silva"],"camila ferreira de morais":["Camila Ferreira de Morais"],"vanessa camargo de andrade pereira":["Vanessa Camargo de Andrade Pereira"],"tatiana pereira de carvalho":["Tatiana Pereira de Carvalho"],"maria isabel chaves de lyra":["Maria Isabel Chaves de Lyra"],"aline barbosa paiva":["Aline Barbosa Paiva"],"elina lopes cunha":["Élina Lopes Cunha"],"renata sipauba da silva pilon":["Renata Sipauba da Silva Pilon"],"amanda da silva cardoso":["Amanda da Silva Cardoso"],"andressa soares de oliveira":["Andressa Soares de Oliveira"],"janderson sales borges":["Janderson Sales Borges"],"thais dolem da silva feital":["Thais Dolem da Silva Feital"],"andrea verdan simoes rodrigues":["Andréa Verdan Simões Rodrigues","Andrea Verdan"],"graciele pimenta stabile gravina":["Graciele Pimenta Stabile Gravina"],"andressa marttorelli":["Andressa Marttorelli"],"rodolfo velasque freitas de oliveira":["Rodolfo Velasque Freitas de Oliveira"],"simone arruda fonseca santo":["Simone Arruda Fonseca Santo"],"fernanda noronha de paiva ferreira":["Fernanda Noronha de Paiva Ferreira"],"sonia ferreira larrubia folena":["Sônia Ferreira Larrubia Folena"],"dionice nascimento oliveira freire":["Dionice Nascimento Oliveira Freire","Dionice Freire"],"thamyres aparecida da silva":["Thamyres Aparecida da Silva"],"carlos andre oliveira bezerra":["Carlos André Oliveira Bezerra"],"lara do desterro porto":["Lara do Desterro Porto"]};
const $=id=>document.getElementById(id);
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const schoolKey=v=>norm(v).replace(/^\d{5,}\s*/,'').replace(/^get\s+/,'').replace(/^e\s*m\s+/,'escola municipal ').replace(/^em\s+/,'escola municipal ').replace(/^c\s*m\s+/,'creche municipal ').replace(/\s+/g,' ').trim();
const codeKey=v=>String(v??'').replace(/\D/g,'').replace(/^0+/,'');
const isAgent=()=>window.__GRA_ACCESS__?.role==='agent';
const mine=()=>isAgent()&&window.__GRA_MASTER_SCOPE__===MINE;
const accessName=()=>String(window.__GRA_ACCESS__?.name||'').trim();
const rowAgent=r=>String(r?.agente??r?.agent??r?.articulador??'').trim();
const rowSchool=r=>String(r?.escola??r?.unidade??r?.school??r?.nomeEscola??r?.name??'').trim();
const rowCode=r=>codeKey(r?.codigoSME??r?.codeSME??r?.designacao??r?.codigo??'');
let mySchools=new Set(),myCodes=new Set(),aliasSet=new Set(),staticBase=null,applying=false,lastMode='cre';
function aliases(){
  const key=norm(accessName()),vals=ALIAS_MAP[key]||[accessName()];
  aliasSet=new Set([key,...vals.map(norm)].filter(Boolean));
  return aliasSet;
}
function ensureBase(){
  if(staticBase||!isAgent()||typeof DATA==='undefined'||!DATA)return staticBase;
  staticBase={};
  for(const k of ['records','exclusivas','efpd','territoryUnits','agentSummary'])if(Array.isArray(DATA[k]))staticBase[k]=DATA[k].slice();
  staticBase.results={};
  if(DATA.results)for(const [k,v] of Object.entries(DATA.results))if(Array.isArray(v))staticBase.results[k]=v.slice();
  return staticBase;
}
function eachPool(fn){
  const base=ensureBase();
  try{if(base)for(const k of ['records','exclusivas','efpd','territoryUnits'])for(const r of base[k]||[])fn(r)}catch(_){}
  try{if(base?.results)for(const arr of Object.values(base.results))for(const r of arr||[])fn(r)}catch(_){}
  try{for(const p of (typeof GEO_POINTS!=='undefined'&&GEO_POINTS)||[])fn(p)}catch(_){}
  try{for(const r of (typeof SOM_ROWS!=='undefined'&&SOM_ROWS)||[])fn(r)}catch(_){}
  try{for(const r of (typeof ADR_ROWS!=='undefined'&&ADR_ROWS)||[])fn(r)}catch(_){}
  try{for(const r of (typeof SIMULADO2026_SCHOOL_ROWS!=='undefined'&&SIMULADO2026_SCHOOL_ROWS)||[])fn(r)}catch(_){}
}
function rebuildIdentity(){
  aliases();mySchools=new Set();myCodes=new Set();
  eachPool(r=>{const a=norm(rowAgent(r));if(!a||!aliasSet.has(a))return;const sk=schoolKey(rowSchool(r)),ck=rowCode(r);if(sk)mySchools.add(sk);if(ck)myCodes.add(ck)});
  window.__GRA_MY_SCHOOLS__=mySchools;window.__GRA_MY_SCHOOL_CODES__=myCodes;window.__GRA_AGENT_ALIASES__=aliasSet;
  return mySchools;
}
function allowsSchool(name){if(!mine())return true;const k=schoolKey(name);return !!k&&mySchools.has(k)}
function allowsRow(r){
  if(!mine())return true;if(!r)return false;
  const a=norm(rowAgent(r));if(a&&aliasSet.has(a))return true;
  const c=rowCode(r);if(c&&myCodes.has(c))return true;
  return allowsSchool(rowSchool(r));
}
function scoped(arr){return Array.isArray(arr)&&mine()?arr.filter(allowsRow):arr}
window.graMasterAllowsRow=allowsRow;window.graMasterAllowsSchool=allowsSchool;window.graMasterScopedRows=scoped;

function restoreStatic(){
  const base=ensureBase();if(!base||typeof DATA==='undefined'||!DATA)return;
  for(const k of ['records','exclusivas','efpd','territoryUnits','agentSummary'])if(Array.isArray(DATA[k])&&Array.isArray(base[k]))DATA[k].splice(0,DATA[k].length,...base[k]);
  if(DATA.results)for(const [k,v] of Object.entries(base.results||{}))if(Array.isArray(DATA.results[k]))DATA.results[k].splice(0,DATA.results[k].length,...v);
}
function applyStatic(){
  if(!isAgent())return;ensureBase();restoreStatic();rebuildIdentity();if(!mine())return;
  for(const k of ['records','exclusivas','efpd','territoryUnits'])if(Array.isArray(DATA?.[k]))DATA[k].splice(0,DATA[k].length,...DATA[k].filter(allowsRow));
  if(Array.isArray(DATA?.agentSummary))DATA.agentSummary.splice(0,DATA.agentSummary.length,...DATA.agentSummary.filter(r=>aliasSet.has(norm(rowAgent(r)))));
  if(DATA?.results)for(const [k,v] of Object.entries(DATA.results))if(Array.isArray(v))v.splice(0,v.length,...v.filter(allowsRow));
}
function defaultOpt(sel){return [...(sel?.options||[])].find(o=>o.value==='')||[...(sel?.options||[])].find(o=>/todas|todos/i.test(o.textContent||''))||sel?.options?.[0]||null}
function agentOpt(sel){return [...(sel?.options||[])].find(o=>aliasSet.has(norm(o.value))||aliasSet.has(norm(o.textContent)))||null}
const agentIds=['somAgente','adrAgente','geoAgent','filterAgente','resultAgente'];
const scopeIds=['somCre','adrCre','filterTerritorio','resultTerritorio'];
function setLocked(sel,on){if(!sel)return;sel.disabled=!!on;if(on)sel.dataset.graHardMaster='1';else delete sel.dataset.graHardMaster}
function enforceFilters({clearSearch=false,dispatchEvents=false}={}){
  if(!isAgent())return;aliases();const active=mine();
  for(const id of agentIds){const sel=$(id);if(!sel)continue;if(active){const o=agentOpt(sel);if(o)sel.value=o.value;else{const d=defaultOpt(sel);if(d)sel.value=d.value}setLocked(sel,true)}else{setLocked(sel,false);const d=defaultOpt(sel);if(d)sel.value=d.value}}
  for(const id of scopeIds){const sel=$(id);if(!sel)continue;if(active){const d=defaultOpt(sel);if(d)sel.value=d.value;setLocked(sel,true)}else{setLocked(sel,false);const d=defaultOpt(sel);if(d)sel.value=d.value}}
  const terr=$('territorySelect');if(terr){if(active){let target='';try{const r=(staticBase?.agentSummary||[]).find(x=>aliasSet.has(norm(rowAgent(x))));target=String(r?.territorio??'')}catch(_){}if(target&&[...terr.options].some(o=>String(o.value)===target))terr.value=target;setLocked(terr,true)}else setLocked(terr,false)}
  if(clearSearch)for(const id of ['somSearch','adrSearch','geoSearch','bankSearch','resultSearch','exclusiveSearch','efpdSearch','creDetailSearch','territorySearch','globalSearch']){const el=$(id);if(el&&el.value)el.value=''}
  if(dispatchEvents)for(const id of [...agentIds,...scopeIds]){const el=$(id);if(el)try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch(_){}}
}
function refreshStaticPanels(){
  try{window.initCRE?.()}catch(e){console.warn('v320 initCRE',e)}
  try{window.initAgents?.()}catch(e){console.warn('v320 initAgents',e)}
  try{window.initExclusivas?.()}catch(e){console.warn('v320 initExclusivas',e)}
  try{window.initEfpd?.()}catch(e){console.warn('v320 initEfpd',e)}
  try{window.renderBanco?.()}catch(_){}
  try{window.renderCREDetailed?.()}catch(_){}
}
function rerenderDynamic(){
  try{window.somRefreshSelectors?.()}catch(_){}try{window.adrRefreshSelectors?.()}catch(_){}
  enforceFilters({dispatchEvents:false});
  try{window.renderResultados?.()}catch(_){}try{window.renderADRs?.()}catch(_){}try{window.renderBanco?.()}catch(_){}try{window.renderExclusivas?.()}catch(_){}try{window.renderEfpd?.()}catch(_){}
  try{if(typeof window.geoScheduleFilters==='function')window.geoScheduleFilters(0);else window.renderGeo?.()}catch(_){}
}
function note(){
 const ctl=$('regionalScopeControl'),n=ctl?.querySelector('small');if(!n||!isAgent())return;
 const count=mySchools.size;
 n.textContent=mine()?`Somente minhas escolas · ${count} unidade${count===1?'':'s'} vinculada${count===1?'':'s'} a ${accessName()}. Este recorte é soberano: filtros inferiores de CRE, território e agente ficam anulados.`:`Todas as escolas da ${window.__GRA_ACCESS__.cre}ª CRE. “Somente minhas escolas” restringe todo o sistema às unidades do agente.`;
}
function applyMode({clearSearch=true}={}){
  if(!isAgent()||applying)return;applying=true;try{
    const now=window.__GRA_MASTER_SCOPE__===MINE?MINE:'cre';
    ensureBase();restoreStatic();rebuildIdentity();
    if(now===MINE){applyStatic()}else restoreStatic();
    enforceFilters({clearSearch:clearSearch&&now!==lastMode,dispatchEvents:false});note();refreshStaticPanels();rerenderDynamic();lastMode=now;
    document.documentElement.dataset.graMasterScope=now;
  }finally{applying=false}
}
function wrapRowsFn(name){try{const old=window[name];if(typeof old!=='function'||old.__gra320)return;const f=function(){const out=old.apply(this,arguments);return Array.isArray(out)?scoped(out):out};f.__gra320=true;window[name]=f}catch(_){}}
function wrapRefresh(name){try{const old=window[name];if(typeof old!=='function'||old.__gra320)return;const f=function(){const out=old.apply(this,arguments);setTimeout(()=>enforceFilters({dispatchEvents:false}),0);return out};f.__gra320=true;window[name]=f}catch(_){}}
function installWrappers(){
 ['somFilteredRows','somRowsForSelector','somAvaliaCreScatterRows','adrFilteredRows','getResultRows','geoVisiblePoints','geoReportRows','pptSomSourceV199','pptStructuralRecordsV201'].forEach(wrapRowsFn);
 ['somRefreshSelectors','adrRefreshSelectors'].forEach(wrapRefresh);
}
function stamp(){const b=$('dashboardVersionBadge');if(b)b.textContent=V;document.querySelectorAll('.gra-start-version,.gra-access-version,.exp-badge').forEach(el=>{if(/^v?\d+/i.test(el.textContent||''))el.textContent=V});document.documentElement.dataset.graVersion=V}
function boot(){
 stamp();if(!isAgent())return;ensureBase();rebuildIdentity();installWrappers();
 const master=$('regionalScopeSelect');if(master)master.addEventListener('change',()=>setTimeout(()=>{rebuildIdentity();applyMode({clearSearch:true})},0));
 document.addEventListener('change',e=>{if(!mine())return;const id=e.target?.id||'';if(agentIds.includes(id)||scopeIds.includes(id)||id==='territorySelect')setTimeout(()=>enforceFilters({dispatchEvents:false}),0)},true);
 document.querySelectorAll('.nav button[data-section]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{installWrappers();rebuildIdentity();enforceFilters({dispatchEvents:false});rerenderDynamic();stamp()},100)));
 [300,1000,2500,5200].forEach(ms=>setTimeout(()=>{installWrappers();rebuildIdentity();enforceFilters({dispatchEvents:false});note();stamp()},ms));
 applyMode({clearSearch:false});
 window.__GRA_V320_MASTER__={version:V,rebuildIdentity,allowsRow,allowsSchool,applyMode,get schools(){return [...mySchools]},get aliases(){return [...aliasSet]}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
