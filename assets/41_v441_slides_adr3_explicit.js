(function(){
'use strict';
const W=window,D=document,H=W.GRA_PPT_SELECTION_HELPERS_V441;
const $=id=>D.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const num=v=>v===null||v===undefined||String(v).trim()===''||/^[-–—]$/.test(String(v).trim())?null:Number.isFinite(Number(v))?Number(v):null;
const cre=r=>Number(String(r?.regional||r?.cre||'').match(/\d+/)?.[0]||0);
const uniq=a=>[...new Set(a)],order=s=>Number(String(s).match(/\d+/)?.[0]||99);
const fmt=(v,unit='')=>num(v)===null?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:unit===' pontos'?2:1})+unit;
const compLabel=c=>({LP:'Língua Portuguesa',MT:'Matemática',CN:'Ciências da Natureza',CH:'Ciências Humanas',HIS:'História',GEO:'Geografia'}[c]||c);
// O banco oficial usa 'Geografia'/'História'; padronizar somente a chave de exibição/agrupamento.
const canonicalComponent=c=>({geografia:'GEO',historia:'HIS',ciencias:'CN','ciencias da natureza':'CN','lingua portuguesa':'LP',matematica:'MT'}[norm(c)]||c);
let state=null,session=0,lastFocus=null;
function scope(){
 const active=D.querySelector('.section.active')?.id||'resultados',prefix=active==='adrs'?'adr':active==='georreferenciamento'?'geo':'som';
 const master=$('regionalScopeSelect'),region=Number(master?.value||0)||Number(W.__GRA_ACCESS__?.role==='agent'?W.__GRA_ACCESS__.cre:0);
 const rawAgent=$(prefix==='geo'?'geoAgent':prefix+'Agente')?.value||'',agent=rawAgent.startsWith('__')?'':rawAgent;
 const query=String($(prefix==='geo'?'geoSearch':prefix+'Search')?.value||'').trim();
 const priority=$(prefix+'Priority')?.value==='sim',mine=W.__GRA_MASTER_SCOPE__==='mine',partners=!!W.__GRA_PARTNERS_EDUCATION_ACTIVE__;
 const title=[region?`${region}ª CRE`:'SME-Rio',mine?W.__GRA_ACCESS__?.name:agent,query?`Busca: ${query}`:'',priority?'Prioritárias':'',partners?'Parceiros da Educação':''].filter(Boolean).join(' · ');
 return {region,agent,query,priority,mine,partners,title,active};
}
function scopeKey(s){return JSON.stringify(s)}
function mergeContext(s){return {names:new Map(),records:new Map(),queryKey:H.schoolKey(s.query),queryNorm:norm(s.query)}}
function rowName(r,ctx){const name=r.escolaFonte||r.escola;let info=ctx.names.get(name);if(!info){info={key:H.schoolKey(name),normal:norm(r.escola)};ctx.names.set(name,info)}return info}
function rowId(r,ctx){return [cre(r),rowName(r,ctx).key,r.adr||r.modalidade,r.ano||r.anoEscolar,r.componente,r.edicao||''].join('|')}
function allowed(r,s,ctx){
 if(s.region&&cre(r)!==s.region)return false;
 // A busca e os demais filtros baratos vêm antes da associação estrutural.
 if(s.query){const name=rowName(r,ctx);if(!name.key.includes(ctx.queryKey)&&!name.normal.includes(ctx.queryNorm))return false}
 if(W.graMasterAllowsRow&&!W.graMasterAllowsRow(r))return false;
 if(s.priority&&!H.priority(r))return false;
 if(s.partners){const y=order(r.ano||r.anoEscolar);if(y===8||norm(r.anoEscolar)==='anos finais')return false}
 if(s.agent||s.partners){
  const id=cre(r)+'|'+(r.escolaFonte||r.escola);
  if(!ctx.records.has(id))ctx.records.set(id,H.record(r.escolaFonte||r.escola,cre(r)));
  const record=ctx.records.get(id);
  if(s.agent&&norm(record?.agente||r.agente)!==norm(s.agent))return false;
  if(s.partners&&!W.__GRA_V391_PARTNERS__?.isPartner?.(record||r))return false;
 }
 return true;
}
function mergeRow(maps,type,r,s,ctx){if(!r?.escola||r._afCreAggregate||!allowed(r,s,ctx))return;maps[type].set(rowId(r,ctx),r)}
function merged(maps){return {adr:[...maps.adr.values()],som:[...maps.som.values()]}}
function mergeSources(packages,live,s){
 const maps={adr:new Map(),som:new Map()},ctx=mergeContext(s);
 for(const type of ['adr','som'])for(const rows of [...packages.map(p=>p[type]||[]),live[type]||[]])for(const r of rows)mergeRow(maps,type,r,s,ctx);
 return merged(maps);
}
const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));
async function mergeSourcesAsync(packages,live,s,onProgress=()=>{},isCurrent=()=>true){
 const maps={adr:new Map(),som:new Map()},ctx=mergeContext(s),sources=['adr','som'].flatMap(type=>[...packages.map(p=>p[type]||[]),live[type]||[]].map(rows=>({type,rows}))),total=sources.reduce((n,x)=>n+x.rows.length,0);
 let processed=0,sliceStart=performance.now();onProgress({processed,total});await yieldUI();
 for(const {type,rows} of sources)for(const r of rows){
  if(!isCurrent())return null;
  mergeRow(maps,type,r,s,ctx);processed++;
  if(processed%64===0&&performance.now()-sliceStart>=12){onProgress({processed,total});await yieldUI();if(!isCurrent())return null;sliceStart=performance.now()}
 }
 if(!isCurrent())return null;onProgress({processed,total});await yieldUI();return isCurrent()?merged(maps):null;
}
function weighted(rows,key){let total=0,weight=0;for(const r of rows){const v=num(r[key]),n=num(r.avaliados);if(v===null||n===0)continue;const w=n>0?n:1;total+=v*w;weight+=w}return weight?total/weight:null}
function mean(rows,key){const a=rows.map(r=>num(r[key])).filter(v=>v!==null);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null}
function total(rows,key){const a=rows.map(r=>num(r[key])).filter(v=>v!==null);return a.length?a.reduce((x,y)=>x+y,0):null}
function assessment(r,type){return type==='adr'?r.adr:`${r.modalidade}|${r.edicao||'2025'}`}
function assessmentLabel(a){if(/^ADR/.test(a))return a;const[m,e]=a.split('|');return m==='Simulado 2026'?m:m==='IDEB 2025'?'IDEB':/\b20\d{2}$/.test(m)?m:`${m} ${e}`}
function normalized(data){
 const out=data.adr.map(r=>({...r,type:'adr',assessment:assessment(r,'adr'),year:r.ano,component:canonicalComponent(r.componente)}));
 for(const r of data.som){
  const cs=r.componente==='LP+MT'||(!r.componente&&r.modalidade!=='IDEB 2025')?['LP','MT']:[r.modalidade==='IDEB 2025'?'IDEB':r.componente];
  for(const c of cs){let n={...r,type:'som',assessment:assessment(r,'som'),year:r.anoEscolar,component:c};
   if(r.componente==='LP+MT')n={...n,avaliados:r['avaliados'+c],previstos:r['previstos'+c],proficiencia:r['proficiencia'+c],adqAv:r[c.toLowerCase()],abaixo:r['abaixo'+c],basico:r['basico'+c],adequado:r['adequado'+c],avancado:r['avancado'+c]};
   out.push(n);
  }
 }
 return out.filter(r=>r.assessment&&r.year&&r.component);
}
function skills(rows){
 const map=new Map();for(const r of rows)for(const k of r.habilidades||[]){
  const v=num(k.valor);if(v===null||num(r.avaliados)===0)continue;
  const c=String(k.codigo||'');if(r.component!=='IDEB'&&/^(LP|MT)\s/.test(c)&&!c.startsWith(r.component+' '))continue;
  const code=k.posicao||c,description=k.descricao||k.descricaoHabilidade||H.skillDescription(r,code)||'';
  if(!description)continue;
  const w=num(k.avaliados)>0?num(k.avaliados):num(r.avaliados)>0?num(r.avaliados):1;
  if(!map.has(code))map.set(code,{code,description,sum:0,weight:0});const x=map.get(code);x.sum+=v*w;x.weight+=w;
 }
 return [...map.values()].map(x=>({...x,value:x.sum/x.weight})).sort((a,b)=>a.value-b.value||a.code.localeCompare(b.code,'pt-BR')).slice(0,5);
}
function pure(s){return !s.agent&&!s.query&&!s.priority&&!s.mine&&!s.partners}
function skillRows(rows,s){const r=rows[0];if(pure(s)&&r.modalidade==='Simulado 2026'&&H.officialSkillRows){const official=H.officialSkillRows(r.year,r.component);if(official.length)return official.map(x=>({...x,year:r.year,component:r.component}))}return rows}
function metricBundle(rows,s){
 const r=rows[0],m=[],metric=(label,value,unit='',key='')=>{if(num(value)!==null)m.push({label,value,unit,key})};
 const official=pure(s)&&r.modalidade==='Simulado 2026';
 const avg=key=>official?H.officialMetric(key,r.year,r.component):weighted(rows,key);
 if(r.component==='IDEB'){
  const o=pure(s)?W.V235_IDEB_AGGREGATES?.[r.year]?.[s.region]:null;
  metric('IDEB 2025',o?.v25??mean(rows,'ideb2025'),' pontos','ideb2025');metric('IDEB 2023',o?.v23??mean(rows,'ideb2023'),' pontos','ideb2023');
  return m;
 }
 if(r.type==='adr'){
  if(['LP','MT'].includes(r.component)){metric('Adequado',weighted(rows,'adequado'),'%','adequado');metric('Abaixo do Básico',weighted(rows,'abaixo'),'%','abaixo');metric('Básico',weighted(rows,'basico'),'%','basico')}
  metric('Acerto total',weighted(rows,'acerto'),'%','acerto');
 }else{
  if(r.modalidade==='Simulado 2026'&&r.year!=='2º ano')metric('Nota padronizada do componente',avg('notaPadronizadaComponente'),' pontos','notaPadronizadaComponente');
  metric(r.modalidade==='Simulado 2026'&&r.year==='2º ano'&&r.component==='LP'?'Alfabetizados (SAEB ≥ 743)':'Adequado + Avançado',avg('adqAv'),'%','adqAv');
  metric('Proficiência',avg('proficiencia'),' pontos','proficiencia');
  for(const k of ['abaixo','basico','adequado','avancado'])metric(({abaixo:'Abaixo do Básico',basico:'Básico',adequado:'Adequado',avancado:'Avançado'})[k],avg(k),'%',k);
 }
 const av=total(rows,'avaliados'),pr=total(rows,'previstos');metric('Participação',av!==null&&pr>0?av/pr*100:null,'%','participacao');metric('Avaliados',av,'','avaliados');
 return m;
}
function grouped(rows){const m=new Map();for(const r of rows){const k=[r.assessment,r.year,r.component].join('~');if(!m.has(k))m.set(k,[]);m.get(k).push(r)}return [...m.values()]}
// Série das ADRs: % Adequado e % Abaixo do Básico em duas linhas (LP e MT),
// seguidas de % de acerto total em Ciências, Geografia e História.
// Nunca interpolar dados ausentes ou converter um campo ausente em zero.
function adrEvolution(groups){
 const byYear=new Map();
 for(const rs of groups){const r=rs[0];if(r.type!=='adr')continue;
  const yr=String(r.year),component=r.component,adr=r.assessment;
  if(!/^ADR [123]$/.test(adr))continue;
  if(!byYear.has(yr))byYear.set(yr,new Map());
  const byComp=byYear.get(yr);
  if(!byComp.has(component))byComp.set(component,new Map());
  byComp.get(component).set(adr,rs);
 }
 const slides=[];
 for(const [year,components]of [...byYear.entries()].sort((a,b)=>order(a[0])-order(b[0]))){
  const allAdrs=uniq([...components.values()].flatMap(m=>[...m.keys()])).sort((a,b)=>order(a)-order(b));
  if(allAdrs.length<2)continue;
  for(const def of [
   {metric:'adequado',label:'Adequado',title:`${year} — Adequado · LP e Matemática`,components:['LP','MT'],subtitle:'Percentual de estudantes no nível Adequado'},
   {metric:'abaixo',label:'Abaixo do Básico',title:`${year} — Abaixo do Básico · LP e Matemática`,components:['LP','MT'],subtitle:'Percentual de estudantes no nível Abaixo do Básico'},
   {metric:'acerto',label:'Acerto total',title:`${year} — Ciências, Geografia e História`,components:['CN','GEO','HIS'],subtitle:'Percentual de acerto total nas ADRs'}
  ]){
   const series=[];
   for(const comp of def.components){const byAdr=components.get(comp);if(!byAdr)continue;
    const values=allAdrs.map(a=>byAdr.has(a)?weighted(byAdr.get(a),def.metric):null);
    if(values.filter(v=>v!==null).length<2)continue;
    series.push({name:compLabel(comp),component:comp,values});
   }
   if(series.length)slides.push({kind:'adr-trend',title:`ADR — ${def.title}`,subtitle:def.subtitle,label:def.label,unit:'%',adrs:allAdrs,series,metric:def.metric,year});
  }
 }
 return slides;
}
function evolution(groups,s){
 // Avaliações não ADR mantêm suas progressões próprias (ex.: IDEB 2023/2025).
 const m=new Map();for(const rows of groups){const r=rows[0];if(r.type==='adr')continue;
  const family=r.modalidade,metric=r.component==='IDEB'?'ideb2025':r.modalidade==='Simulado 2026'&&r.year!=='2º ano'?'notaPadronizadaComponente':'adqAv';
  if(r.component==='IDEB'){
   const b=metricBundle(rows,s),v23=b.find(x=>x.key==='ideb2023')?.value,v25=b.find(x=>x.key==='ideb2025')?.value;
   if(num(v23)!==null&&num(v25)!==null)m.set([family,r.year,'IDEB'].join('~'),{kind:'evolution',title:`IDEB — ${r.year}`,subtitle:'Evolução 2023–2025',label:'IDEB',unit:' pontos',points:[{label:'2023',value:v23},{label:'2025',value:v25}]});
   continue;
  }
  const key=[family,r.year,r.component,metric].join('~');
  if(!m.has(key))m.set(key,{kind:'evolution',title:`${family} — ${r.year} — ${compLabel(r.component)}`,subtitle:'Evolução das avaliações selecionadas',label:metric==='notaPadronizadaComponente'?'Nota padronizada':'Adequado + Avançado',unit:metric==='notaPadronizadaComponente'?' pontos':'%',points:[]});
  const x=m.get(key),b=metricBundle(rows,s).find(x=>x.key===metric);
  if(b)x.points.push({label:assessmentLabel(r.assessment),value:b.value,order:order(r.edicao)});
 }
 return [...m.values()].filter(x=>x.points.length>=2).map(x=>({...x,points:x.points.sort((a,b)=>(a.order||0)-(b.order||0))}));
}
function plan(rows,selection,s){
 const selected=rows.filter(r=>selection.assessments.includes(r.assessment)&&selection.years.includes(r.year)&&(r.component==='IDEB'||selection.components.includes(r.component)));
 const groups=grouped(selected).sort((a,b)=>order(a[0].year)-order(b[0].year||99)||a[0].assessment.localeCompare(b[0].assessment,'pt-BR')||a[0].component.localeCompare(b[0].component));const slides=[];
 for(const rs of groups){const r=rs[0],title=`${assessmentLabel(r.assessment)} — ${r.year}${r.component==='IDEB'?'':' — '+compLabel(r.component)}`;
  if(selection.contents.includes('results')){const metrics=metricBundle(rs,s);for(let i=0;i<metrics.length;i+=6)slides.push({kind:'results',title,subtitle:'Resultados gerais',metrics:metrics.slice(i,i+6)})}
  if(selection.contents.includes('skills')&&r.component!=='IDEB'){const items=skills(skillRows(rs,s));if(items.length)slides.push({kind:'skills',title,subtitle:'Habilidades mais desafiadoras',items})}
 }
 if(selection.contents.includes('evolution')){
  // A ordem de cada ano é sempre Adequado LP/MT → Abaixo LP/MT → Ciências/GEO/HIS.
  slides.push(...adrEvolution(groups),...evolution(groups,s));
 }
 return slides;
}
const ADR_ASSESSMENTS=['ADR 1','ADR 2','ADR 3'];
function options(rows){
 // Exibir ADR 1/2/3 de modo estável, INDEPENDENTEMENTE da avaliação ativa,
 // da busca ou da disponibilidade momentânea no carregamento.
 const otherAssessments=uniq(rows.map(r=>r.assessment)).filter(a=>!ADR_ASSESSMENTS.includes(a)).sort((a,b)=>a.localeCompare(b,'pt-BR'));
 return {assessments:[...ADR_ASSESSMENTS,...otherAssessments],years:uniq(rows.map(r=>r.year)).sort((a,b)=>order(a)-order(b)||a.localeCompare(b,'pt-BR')),components:uniq(rows.map(r=>r.component)).filter(c=>c!=='IDEB').sort((a,b)=>['LP','MT','CN','GEO','HIS','CH'].indexOf(a)-['LP','MT','CN','GEO','HIS','CH'].indexOf(b))}
}
function assessmentCheckboxes(o,chosen){
 // Linha exclusiva para ADRs; não se mistura com demais avaliações ao quebrar a linha.
 return `<div class="v441-adr-options">${checks('assessments',ADR_ASSESSMENTS,chosen.assessments,assessmentLabel)}</div><div class="v441-options v441-other-assessments">${checks('assessments',o.assessments.filter(a=>!ADR_ASSESSMENTS.includes(a)),chosen.assessments,assessmentLabel)}</div>`;
}
function selectDefault(rows){const o=options(rows),isAdr=state?.scope.active==='adrs',activeAssessment=isAdr?$('adrSelect')?.value:[$('somModalidade')?.value,$('somEdicao')?.value||'2025'].join('|');const adrOptions=o.assessments.filter(a=>/^ADR [123]$/.test(a));return {...o,assessments:isAdr&&adrOptions.length?adrOptions:o.assessments.includes(activeAssessment)?[activeAssessment]:o.assessments,contents:isAdr?['evolution']:['results']}}
function selection(){return Object.fromEntries(['assessments','years','components','contents'].map(k=>[k,[...$('v441SlideForm').querySelectorAll(`input[data-group="${k}"]:checked`)].filter(x=>!x.disabled).map(x=>x.value)]))}
function checks(group,values,chosen,label=x=>x){return values.map(v=>`<label class="v441-check"><input type="checkbox" data-group="${group}" value="${esc(v)}" ${chosen.includes(v)?'checked':''}><span>${esc(label(v))}</span></label>`).join('')}
function dialog(){
 let o=$('v441SlideOverlay');if(o)return o;
 const style=D.createElement('style');style.textContent=`#v441SlideOverlay{position:fixed;inset:0;background:#0b2139aa;z-index:2147483000;display:grid;place-items:center;padding:16px}#v441SlideOverlay[hidden]{display:none}#v441SlideOverlay *{box-sizing:border-box}.v441-dialog{background:#fff;color:#19374f;width:min(760px,100%);max-height:92vh;overflow:auto;border-radius:16px;box-shadow:0 20px 70px #0005;font:14px Arial,sans-serif}.v441-head{display:flex;justify-content:space-between;gap:16px;padding:22px 24px 14px;border-bottom:1px solid #e2eaf0}.v441-head h2{font-size:22px;margin:0 0 8px}.v441-head p{line-height:1.5;margin:0;overflow-wrap:anywhere}.v441-close{background:none;border:0;font-size:26px;align-self:flex-start;cursor:pointer;color:#19374f}.v441-body{padding:18px 24px}.v441-body fieldset{border:0;padding:0;margin:0 0 22px;min-width:0}.v441-body legend{font-weight:bold;margin-bottom:10px;font-size:15px}.v441-options{display:flex;gap:9px 16px;flex-wrap:wrap}.v441-adr-options{display:flex;gap:12px 24px;flex-wrap:wrap;padding:4px 0 10px;border-bottom:1px solid #e8eef2;margin-bottom:10px}.v441-adr-options .v441-check{font-weight:600;white-space:nowrap}.v441-other-assessments{gap:9px 16px}.v441-check{display:flex;align-items:center;gap:8px;min-height:36px;cursor:pointer}.v441-check input{width:18px;height:18px;accent-color:#125884}.v441-check:has(input:disabled){opacity:.45;cursor:default}.v441-content{display:grid;gap:5px}.v441-footer{padding:16px 24px;background:#f5f9fb;border-top:1px solid #e2eaf0;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.v441-generate{background:#135b85;color:#fff;border:0;border-radius:8px;padding:13px 18px;font-weight:bold;cursor:pointer}.v441-generate:disabled{opacity:.5;cursor:default}.v441-message{font-size:12px;line-height:1.5;margin:10px 0 0;color:#536c7d}.v441-status{padding:30px 24px;line-height:1.6}.v441-error{color:#9a2727}.v441-text-button{background:none;border:0;color:#135b85;text-decoration:underline;cursor:pointer;font-size:13px;margin-right:16px}.v441-check:focus-within,.v441-generate:focus-visible{outline:2px solid #2677aa;outline-offset:3px}@media(max-width:500px){.v441-body,.v441-head,.v441-footer{padding:16px}.v441-generate{width:100%}}`;
 D.head.appendChild(style);o=D.createElement('div');o.id='v441SlideOverlay';o.dataset.graNoSchoolNav='1';o.dataset.hotfix='adr3-explicita-hf4';o.hidden=true;D.body.appendChild(o);
 o.addEventListener('click',e=>{if(e.target===o)close()});D.addEventListener('keydown',e=>{if(o.hidden)return;if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const f=[...o.querySelectorAll('button:not(:disabled),input:not(:disabled)')],first=f[0],last=f[f.length-1];if(e.shiftKey&&D.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&D.activeElement===last){e.preventDefault();first?.focus()}}});return o;
}
function close(){if(state?.busy)return;session++;dialog().hidden=true;lastFocus?.focus?.()}
function shell(body){const o=dialog();o.innerHTML=`<section class="v441-dialog" role="dialog" aria-modal="true" aria-labelledby="v441SlideTitle"><header class="v441-head"><div><h2 id="v441SlideTitle">Criar apresentação</h2><p>${esc(state?.scope.title||'')}</p></div><button type="button" class="v441-close" aria-label="Fechar">×</button></header>${body}</section>`;o.hidden=false;o.querySelector('.v441-close').onclick=close;return o}
function renderForm(chosen=selectDefault(state.rows)){
 const o=options(state.rows);shell(`<form id="v441SlideForm"><div class="v441-body"><fieldset><legend>Avaliações</legend><div class="v441-assessments">${assessmentCheckboxes(o,chosen)}</div></fieldset><fieldset><legend>Anos</legend><div class="v441-options">${checks('years',o.years,chosen.years)}</div></fieldset><fieldset><legend>Componentes</legend><div class="v441-options">${checks('components',o.components,chosen.components,compLabel)}</div><p class="v441-message">O IDEB é apresentado por segmento.</p></fieldset><fieldset><legend>O que incluir nos slides</legend><div class="v441-content">${checks('contents',['results','evolution','skills'],chosen.contents,v=>({results:'Resultados gerais',evolution:'Evolução dos resultados',skills:'Habilidades mais desafiadoras'})[v])}</div></fieldset><button type="button" class="v441-text-button" id="v441SelectAll">Marcar todas as avaliações</button><button type="button" class="v441-text-button" id="v441Clear">Limpar seleção</button><p class="v441-message" id="v441SlideHint" aria-live="polite"></p></div><footer class="v441-footer"><span id="v441SlideCount" aria-live="polite"></span><button type="submit" class="v441-generate" id="v441SlideGenerate">Gerar apresentação</button></footer></form>`);
 $('v441SlideForm').onchange=refresh;$('v441SlideForm').onsubmit=e=>{e.preventDefault();generate()};
 $('v441SelectAll').onclick=()=>{for(const x of $('v441SlideForm').querySelectorAll('[data-group="assessments"]'))x.checked=true;refresh()};
 $('v441Clear').onclick=()=>{for(const x of $('v441SlideForm').querySelectorAll('input'))x.checked=false;refresh()};refresh();dialog().querySelector('input')?.focus();
}
function refresh(){
 const form=$('v441SlideForm');if(!form)return;
 const raw=Object.fromEntries(['assessments','years','components'].map(k=>[k,[...form.querySelectorAll(`input[data-group="${k}"]:checked`)].map(x=>x.value)]));
 const availableYears=new Set(state.rows.filter(r=>raw.assessments.includes(r.assessment)).map(r=>r.year));
 for(const x of form.querySelectorAll('[data-group="years"]'))x.disabled=!availableYears.has(x.value);
 const availableComponents=new Set(state.rows.filter(r=>raw.assessments.includes(r.assessment)&&raw.years.includes(r.year)).map(r=>r.component));
 for(const x of form.querySelectorAll('[data-group="components"]'))x.disabled=!availableComponents.has(x.value);
 const s=selection(),candidate=state.rows.filter(r=>s.assessments.includes(r.assessment)&&s.years.includes(r.year)&&(r.component==='IDEB'||s.components.includes(r.component))),groups=grouped(candidate);
 const availability={results:groups.some(rs=>metricBundle(rs,state.scope).length),skills:groups.some(rs=>rs[0].component!=='IDEB'&&skills(skillRows(rs,state.scope)).length),evolution:adrEvolution(groups).length>0||evolution(groups,state.scope).length>0};
 for(const x of form.querySelectorAll('[data-group="contents"]'))x.disabled=!availability[x.value];
 state.selection=selection();state.plan=plan(state.rows,state.selection,state.scope);
 const count=state.plan.length?state.plan.length+1:0;$('v441SlideCount').textContent=count?`Capa incluída · ${count} slides`:'Selecione avaliações, anos e conteúdo';
 $('v441SlideGenerate').textContent=`Gerar apresentação${count?' — '+count+' slides':''}`;$('v441SlideGenerate').disabled=!count;
 const adr3Available=state.rows.some(r=>r.assessment==='ADR 3');
 $('v441SlideHint').textContent=!adr3Available?'A opção ADR 3 está disponível. Este recorte ainda não possui registros da ADR 3 nos dados carregados; nenhum valor será inventado.':!availability.evolution?'ADR 3 disponível neste universo. Para exibir a evolução, selecione ao menos duas ADRs e a opção Evolução dos resultados.':'Evolução: Adequado LP/MT → Abaixo do Básico LP/MT → acerto total em Ciências, Geografia e História; até três ADRs, conforme as avaliações marcadas.';
}
function addText(slide,text,x,y,w,h,size=18,extra={}){slide.addText(text,{x,y,w,h,fontFace:'Aptos',fontSize:size,color:'19374F',margin:0,breakLine:false,fit:'shrink',...extra})}
// Linhas desenhadas como vetores nativos do PPT: valores sempre em uma tabela fixa,
// sem rótulos sobre os pontos, evitando colisões mesmo quando duas séries coincidem.
function renderAdrTrend(slide,d){
 const colors={LP:'176AA0',MT:'198560',CN:'176AA0',GEO:'C18720',HIS:'8055A0'};
 const chart={x:.82,y:1.52,w:11.72,h:3.89};
 slide.addShape('roundRect',{x:chart.x,y:chart.y,w:chart.w,h:chart.h,rectRadius:.08,line:{color:'DFE9F0',width:1},fill:{color:'FFFFFF'}});
 const plot={x:1.65,y:1.87,w:10.30,h:2.85};
 for(let t=0;t<=4;t++){const y=plot.y+plot.h*t/4;
  slide.addShape('line',{x:plot.x,y,w:plot.w,h:0,line:{color:t===4?'AFC2CF':'E5ECF1',width:t===4?1.1:.75}});
  addText(slide,`${100-t*25}%`,.98,y-.12,.48,.24,10,{color:'61788A',align:'right'});
 }
 const n=d.adrs.length,xAt=i=>plot.x+(n===1?plot.w/2:plot.w*i/(n-1)),yAt=v=>plot.y+(100-Math.max(0,Math.min(100,v)))*plot.h/100;
 d.adrs.forEach((adr,i)=>addText(slide,adr,xAt(i)-.53,4.94,1.06,.27,12,{align:'center',bold:true,color:'526D80'}));
 d.series.forEach((s,index)=>{const color=colors[s.component]||'176AA0',marker=s.component==='MT'||s.component==='GEO'?'diamond':'ellipse';
  for(let i=0;i<n-1;i++){const a=s.values[i],b=s.values[i+1];if(a===null||b===null)continue;
   const x1=xAt(i),x2=xAt(i+1),y1=yAt(a),y2=yAt(b);slide.addShape('line',{x:x1,y:Math.min(y1,y2),w:x2-x1,h:Math.abs(y2-y1),flipV:y1>y2,line:{color,width:3,dashType:s.component==='MT'||s.component==='GEO'?'dash':'solid'}});
  }
  for(let i=0;i<n;i++){const v=s.values[i];if(v===null)continue;const x=xAt(i),y=yAt(v),r=.092;
   slide.addShape(marker,{x:x-r,y:y-r,w:r*2,h:r*2,line:{color:'FFFFFF',width:1.2},fill:{color}});
  }
 });
 // Cabeçalho e matriz tabular: linhas separadas evitam sobreposição de percentuais.
 const table={x:1.05,y:5.54,w:11.25,row:.31};
 slide.addShape('roundRect',{x:table.x,y:table.y,w:table.w,h:.43+d.series.length*table.row+.10,rectRadius:.05,line:{color:'E1E9EF',width:.9},fill:{color:'F8FBFD'}});
 addText(slide,'COMPONENTE',table.x+.20,table.y+.11,3,.20,9,{bold:true,color:'61788A'});
 d.adrs.forEach((a,i)=>addText(slide,a,table.x+3.15+i*2.63,table.y+.11,2.25,.20,9.5,{bold:true,align:'center',color:'61788A'}));
 d.series.forEach((series,j)=>{const yy=table.y+.49+j*table.row,color=colors[series.component]||'176AA0';
  slide.addShape('ellipse',{x:table.x+.2,y:yy+.06,w:.11,h:.11,line:{color,transparency:100},fill:{color}});
  addText(slide,series.name,table.x+.41,yy,2.72,.24,10.5,{bold:true});
  series.values.forEach((v,i)=>addText(slide,v===null?'—':fmt(v,'%'),table.x+3.15+i*2.63,yy,2.25,.25,11.5,{align:'center',bold:true,color}));
 });
}
function renderDeck(descriptors,s,selection){
 const ppt=H.recorder();ppt.layout='LAYOUT_WIDE';ppt.title=`${s.title} — Avaliações`;ppt.author='CGRA · SME-Rio';ppt.company='Secretaria Municipal de Educação';ppt.lang='pt-BR';ppt.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'pt-BR'};
 const ctx={scopeTitle:s.title,scopeKind:s.query?'Recorte de escolas':s.agent||s.mine?'Agente':s.region?'Coordenadoria Regional':'Rede municipal',sectionLabel:'Resultados das avaliações',filters:[selection.assessments.map(assessmentLabel).join(', '),selection.years.join(', '),selection.components.map(compLabel).join(', ')]};H.cover(ppt,ctx);
 descriptors.forEach((d,i)=>{const slide=ppt.addSlide();H.header(slide,ctx,d.title,d.kind==='evolution'?`${d.subtitle} · ${d.label}`:d.kind==='adr-trend'?`${d.subtitle} · ${d.adrs.join(' → ')}`:d.subtitle,i+2);
  if(d.kind==='results'){d.metrics.forEach((m,j)=>{const y=1.65+j*.75;addText(slide,m.label,.8,y,8.4,.36,19);addText(slide,fmt(m.value,m.unit),9.4,y,3.1,.36,24,{bold:true,align:'right'});slide.addShape('line',{x:.8,y:y+.52,w:11.7,h:0,line:{color:'E3EAF0',width:.8}})})}
  else if(d.kind==='adr-trend'){renderAdrTrend(slide,d)}
  else if(d.kind==='skills'){d.items.forEach((k,j)=>{const y=1.5+j*1.02;addText(slide,k.code,.8,y,1.3,.25,17,{bold:true});addText(slide,fmt(k.value,'%'),11.1,y,1.4,.25,20,{bold:true,align:'right'});addText(slide,k.description,2.2,y,8.55,.72,k.description.length>330?12:15);slide.addShape('line',{x:.8,y:y+.85,w:11.7,h:0,line:{color:'E3EAF0',width:.8}})})}
  else {slide.addChart('line',[{name:d.label,labels:d.points.map(p=>p.label),values:d.points.map(p=>p.value)}],{x:.9,y:1.6,w:11.5,h:4.55,showLegend:false,showValue:true,showTitle:false,chartColors:['176AA0'],showMarker:true,markerSize:7,lineSize:3,dataLabelPosition:'t',dataLabelFormatCode:d.unit==='%'?'0.0"%"':'0.00',catAxisLabelFontSize:14,valAxisLabelFontSize:13,valAxisTitle:d.label,showCatName:false,showBorder:false});const delta=d.points.at(-1).value-d.points[0].value;addText(slide,`Variação: ${delta>=0?'+':''}${fmt(delta,d.unit==='%'?' p.p.':d.unit)}`,1,6.4,11.3,.3,18,{bold:true})}
 });return ppt;
}
async function generate(){
 if(!state?.plan.length||state.busy)return;
 if(scopeKey(scope())!==state.scopeKey){shell('<div class="v441-status">O universo mudou. Feche esta janela e abra Slides novamente para carregar o novo recorte.</div>');return}
 const run=session,selection=state.selection,descriptors=state.plan.slice();state.busy=true;shell('<div class="v441-status" id="v441SlideProgress" role="status">Preparando a apresentação…</div>');
 try{
  const ppt=renderDeck(descriptors,state.scope,selection);if(ppt.slides.length!==descriptors.length+1)throw Error('A contagem dos slides não corresponde à seleção.');
  await H.preload();const compiled=await H.compile(ppt,e=>{if(run===session&&$('v441SlideProgress'))$('v441SlideProgress').textContent=e.message||'Gerando o PowerPoint…'});
  if(compiled.slideCount!==ppt.slides.length)throw Error('O compilador retornou uma quantidade diferente de slides.');
  const filename=`Ferramenta_GRA_${state.scope.title.replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,95)}_v441.pptx`;
  W.__GRA_PPT_V441_LAST_AUDIT={scope:state.scope.title,selection,slides:ppt.slides.length,kinds:descriptors.map(d=>d.kind),adrTrends:descriptors.filter(d=>d.kind==='adr-trend').map(d=>({title:d.title,adrs:d.adrs,series:d.series.map(s=>({component:s.component,values:s.values}))}))};
  if(run===session){dialog().hidden=true;await H.save(compiled.blob,filename,null)}
 }catch(e){shell(`<div class="v441-status v441-error" role="alert">${esc(e.message||'Não foi possível gerar a apresentação.')}<p><button class="v441-text-button" id="v441Retry">Voltar à seleção</button></p></div>`);$('v441Retry').onclick=()=>renderForm(selection)}finally{state.busy=false}
}
async function open(){
 if(state?.busy)return;lastFocus=D.activeElement;const run=++session,s=scope();state={scope:s,scopeKey:scopeKey(s),busy:false};shell('<div class="v441-status" id="v441SlideLoading" role="status">Carregando avaliações do universo selecionado…</div>');dialog().querySelector('button')?.focus();
 try{const regions=s.region?[s.region]:[1,2,3,4,5,6,7,8,9,10,11],packages=[];
  for(const n of regions){const p=await W.GRA_PPT_DATA_LOAD_V388(n);if(run!==session)return;packages.push(p);$('v441SlideLoading').textContent=`Carregando avaliações… ${packages.length}/${regions.length}`;await new Promise(r=>setTimeout(r,0))}
  if(scopeKey(scope())!==state.scopeKey)throw Error('O universo mudou durante o carregamento. Abra Slides novamente.');
  const data=await mergeSourcesAsync(packages,H.live(),s,p=>{if(run===session&&$('v441SlideLoading'))$('v441SlideLoading').textContent=`Organizando avaliações do recorte… ${Math.round(p.total?p.processed/p.total*100:100)}%`},()=>run===session);if(!data||run!==session)return;if(scopeKey(scope())!==state.scopeKey)throw Error('O universo mudou durante o carregamento. Abra Slides novamente.');state.rows=normalized(data);if(!state.rows.length){shell('<div class="v441-status">Não há avaliações disponíveis para este universo.</div>');return}renderForm();
 }catch(e){if(run===session)shell(`<div class="v441-status v441-error" role="alert">${esc(e.message||'Não foi possível carregar as avaliações.')}</div>`)}
}
if(!H)return;
W.GRA_PPT_V388=open;W.__GRA_PPT_ENGINE_VERSION='v441';
W.GRA_SLIDES_V441={open,close,scope,mergeSources,mergeSourcesAsync,normalized,options,plan,metricBundle,skills,evolution,adrEvolution,renderDeck,weighted,num,get state(){return state}};
})();
