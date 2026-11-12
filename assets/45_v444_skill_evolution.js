/* Ferramenta GRA v444 — acompanhamento longitudinal de habilidades nas ADRs.
   Mantém os filtros da dashboard, não combina H01 de matrizes diferentes,
   não infere desempenho quando a habilidade não foi avaliada. */
(()=>{
 'use strict';
 if(window.__GRA_V444_SKILL_EVOLUTION__)return;
 const V='v444', ADRS=['ADR 1','ADR 2','ADR 3'];
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const canon=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 const codekey=s=>String(s??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const isNum=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
 const pct=v=>isNum(v)?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:2})+'%':'—';
 const rawRows=()=>{try{return typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS)?ADR_ROWS:(Array.isArray(window.ADR_ROWS)?window.ADR_ROWS:[])}catch(_){return []}};
 const lookup=(h,ano,comp,adr)=>{
   try{return typeof adrSkillInfo==='function'?adrSkillInfo(h,ano,comp,adr):null}catch(_){return null}
 };
 function identity(h,ano,comp,adr){
   const source=lookup(h,ano,comp,adr);if(!source?.codigo||!source?.descricao)return null;
   return {code:codekey(source.codigo),description:canon(source.descricao),text:String(source.descricao),original:String(source.codigo),h};
 }
 function match(h,ano,comp,adr){
   const from=identity(h,ano,comp,adr);
   if(!from)return {origin:null,matches:{},mismatch:[]};
   let matches={},mismatch=[];
   const years=typeof ADR_SKILL_DESCRIPTIONS==='object'?ADR_SKILL_DESCRIPTIONS:{};
   for(const ed of ADRS){
     const compKey=typeof adrNormCompSkill==='function'?adrNormCompSkill(comp):comp;
     const skills=years?.[ed]?.[ano]?.[compKey]||{};
     const candidates=Object.entries(skills).filter(([_,data])=>codekey(data?.codigo)===from.code);
     const valid=candidates.filter(([_,data])=>canon(data?.descricao)===from.description);
     if(valid.length===1)matches[ed]=valid[0][0];
     else if(candidates.length)mismatch.push(ed);
   }
   return {origin:from,matches,mismatch};
 }
 // Preserve actual current filter semantics, only ignore ADR edition and selected progress interval.
 // Reading the controls temporarily without emitting 'change' causes no visual or persistent changes.
 function scoped(ano,comp){
   const mode=$('adrMode'), interval=$('adrEvolucao'),agent=$('adrAgente'),year=$('adrAno'),component=$('adrComp');
   const saveMode=mode?.value,saveInterval=interval?.value,saveAgent=agent?.value,saveYear=year?.value,saveComp=component?.value;
   const special=String(saveAgent||'').startsWith('__gra_adr_');
   let result=[];
   try{
     if(mode)mode.value='individual';if(interval)interval.value='13';
     if(year)year.value=ano;if(component)component.value=comp;
     if(special&&agent)agent.value='';
     result=typeof adrFilteredRows==='function'?adrFilteredRows({ignoreAdr:true}):rawRows();
   }catch(err){console.warn('[v444] Filtro de habilidades',err);result=[]}
   finally{if(mode&&saveMode!=null)mode.value=saveMode;if(interval&&saveInterval!=null)interval.value=saveInterval;if(agent&&saveAgent!=null)agent.value=saveAgent;if(year&&saveYear!=null)year.value=saveYear;if(component&&saveComp!=null)component.value=saveComp}
   const sel=canon(window.__GRA_SELECTED_SCHOOL__||'');
   return result.filter(r=>r?.ano===ano&&r?.componente===comp&&(!special||saveAgent!=='__gra_adr_school__'||(sel&&canon(r.escola)===sel))); 
 }
 function series(h,ano,comp,adr,school){
   const info=match(h,ano,comp,adr),group=scoped(ano,comp).filter(r=>!school||(canon(r.escola)===canon(school.name)&&canon(r.regional||r.cre)===canon(school.cre)));
   const values=ADRS.map(ed=>{
     const skillCode=info.matches[ed];if(!skillCode)return null;
     let sw=0,sv=0,schools=new Set();
     for(const r of group){if(r.adr!==ed)continue;
       const hitem=(r.habilidades||[]).find(x=>codekey(x?.codigo)===codekey(skillCode));
       if(!hitem||!isNum(hitem.valor))continue;
       const v=Number(hitem.valor);if(v<0||v>100)continue;
       const weight=Number(r.avaliados)>0?Number(r.avaliados):1;
       sv+=weight*v;sw+=weight;schools.add(`${r.regional||''}|${r.escola||''}`);
     }
     return sw?{value:sv/sw,schools:schools.size,students:sw}:null;
   });
   return {...info,values};
 }
 function attach(rows){
   // Acompanhamento centralizado na sub-aba Habilidade.
   return;
   const area=$('adrSkillBars');if(!area)return;
   const bars=[...area.querySelectorAll('.bar-row')];if(!bars.length)return;
   const grouped=new Map();
   (rows||[]).forEach(r=>{(r.habilidades||[]).forEach(h=>{
     const v=h?.valor;if(!isNum(v))return;
     const id=`${r.adr||''}|${h.codigo||''}`,w=Number(r.avaliados)||1;
     if(!grouped.has(id))grouped.set(id,{h:h.codigo,sw:0,sv:0,anos:new Set(),comps:new Set(),adrs:new Set()});
     const obj=grouped.get(id);obj.sw+=w;obj.sv+=w*Number(v);
     obj.anos.add(r.ano);obj.comps.add(r.componente);obj.adrs.add(r.adr);
   })});
   const best=[...grouped.values()].map(x=>({...x,value:x.sw?x.sv/x.sw:0})).sort((a,b)=>a.value-b.value).slice(0,10);
   bars.forEach((el,i)=>{
     const item=best[i];if(!item)return;
     const areaName=el.querySelector('.bar-name');if(!areaName)return;
     if(areaName.querySelector('.gra-skill-follow'))return;
     const control=document.createElement('button');control.type='button';control.className='gra-skill-follow';
     control.textContent='Acompanhar habilidade';
     const year=item.anos.size===1?[...item.anos][0]:'';
     const comp=item.comps.size===1?[...item.comps][0]:'';
     const adr=item.adrs.size===1?[...item.adrs][0]:'';
     const compared=year&&comp&&adr?match(item.h,year,comp,adr):null;
     const enough=compared&&Object.keys(compared.matches).length>=2;
     control.disabled=!enough;
     if(!year||!comp||!adr)control.title='Selecione um único ano, componente e edição da ADR para comparar esta habilidade.';
     else if(!enough)control.title='Habilidade sem correspondência curricular validada em outra ADR para o mesmo ano e componente.';
     else control.title=`Exibir a evolução de ${compared.origin.original} nas ADRs comparáveis`;
     if(enough){control.dataset.year=year;control.dataset.comp=comp;control.dataset.adr=adr;control.dataset.h=item.h}
     areaName.appendChild(control);
   });
 }
 function contextLabel(data,year,comp){
   const cre=$('regionalScopeSelect')?.selectedOptions?.[0]?.textContent?.trim()||'Rede';
   const agent=$('adrAgente')?.selectedOptions?.[0]?.textContent?.trim()||'';
   const query=$('adrSearch')?.value?.trim()||'';
   return [year,({LP:'Língua Portuguesa',MT:'Matemática',CN:'Ciências da Natureza'}[comp]||comp),cre,
      agent&&!/todos|todas/i.test(agent)?agent:'',query?`Busca: ${query}`:''].filter(Boolean).join(' · ');
 }
 function plot(values){
   const W=1040,H=346,L=90,R=70,T=54,B=65;
   const x=i=>L+(W-L-R)*(i/2),y=v=>H-B-(H-T-B)*v/100;
   const ticks=[0,20,40,60,80,100];
   const grid=ticks.map(n=>`<g><line x1="${L}" y1="${y(n)}" x2="${W-R}" y2="${y(n)}" stroke="#e2ebf4" stroke-width="1.2"/><text x="${L-18}" y="${y(n)+6}" text-anchor="end" font-size="16" fill="#506b82">${n}%</text></g>`).join('');
   // No line bridging a missing intermediate ADR: only adjacent existing measurements.
   const segments=[];for(let i=0;i<2;i++)if(values[i]&&values[i+1])segments.push(`<line x1="${x(i)}" y1="${y(values[i].value)}" x2="${x(i+1)}" y2="${y(values[i+1].value)}" stroke="#1478b5" stroke-width="5" stroke-linecap="round"/>`);
   const points=values.map((datum,i)=>datum?`<g><circle cx="${x(i)}" cy="${y(datum.value)}" r="8" fill="#1478b5" stroke="#fff" stroke-width="3"/><text x="${x(i)}" y="${y(datum.value)+(datum.value>85?33:-20)}" font-size="26" font-weight="850" text-anchor="middle" fill="#12385d">${esc(pct(datum.value))}</text></g>`:`<text x="${x(i)}" y="${y(50)}" text-anchor="middle" fill="#859aad" font-size="24" font-weight="750">—</text>`).join('');
   const labels=ADRS.map((ed,i)=>`<text x="${x(i)}" y="${H-18}" text-anchor="middle" fill="#234a68" font-size="21" font-weight="800">${ed}</text>`).join('');
   return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução percentual por habilidade nas ADRs 1, 2 e 3" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:auto;min-height:260px;max-height:425px"><rect width="${W}" height="${H}" fill="#fff" rx="10"/>${grid}<line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" stroke="#bacddd"/>${segments.join('')}${points}${labels}</svg>`;
 }
 function modal(){
   let shell=$('graV444SkillDialog');if(shell)return shell;
   shell=document.createElement('div');shell.id='graV444SkillDialog';shell.className='gra-skill-overlay';shell.hidden=true;
   shell.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="graSkillTitle" tabindex="-1" class="gra-skill-dialog"><div class="gra-skill-head"><div><h2 id="graSkillTitle">Acompanhar habilidade</h2><p id="graSkillContext"></p></div><button type="button" id="graSkillClose" aria-label="Fechar gráfico">Fechar ×</button></div><div id="graSkillDescription"></div><div id="graSkillChart"></div><div id="graSkillFootnote"></div></section>';
   document.body.appendChild(shell);
   shell.querySelector('#graSkillClose').addEventListener('click',close);
   shell.addEventListener('click',e=>{if(e.target===shell)close()});
   return shell;
 }
 let priorFocus=null;
 function close(){const el=$('graV444SkillDialog');if(!el)return;el.hidden=true;document.body.classList.remove('gra-skill-open');priorFocus?.focus?.();}
 function open(button){
   const {year,comp,adr,h}=button.dataset;if(!year||!comp||!adr||!h)return;
   const data=series(h,year,comp,adr);if(!data.origin)return;
   const el=modal();priorFocus=button;
   $('graSkillTitle').textContent=`Acompanhar habilidade · ${data.origin.original}`;
   $('graSkillContext').textContent=contextLabel(data,year,comp);
   $('graSkillDescription').textContent=data.origin.text;
   $('graSkillChart').innerHTML=plot(data.values)+`<div class="gra-skill-summary">${ADRS.map((ed,i)=>`<div><span>${ed}</span><strong>${esc(pct(data.values[i]?.value))}</strong><small>${data.values[i]?`${data.values[i].schools} escola(s) com resultado`:'Não avaliada ou não comparável'}</small></div>`).join('')}</div>`;
   const count=data.values.filter(Boolean).length;
   $('graSkillFootnote').textContent=count>=2?'Comparação descritiva. Médias ponderadas pelo número de alunos avaliados das escolas no filtro atual; a composição e a dificuldade dos itens podem variar entre as ADRs.':'Não há dois resultados válidos para este filtro. Nenhum valor foi estimado.';
   el.hidden=false;document.body.classList.add('gra-skill-open');el.querySelector('.gra-skill-dialog').focus();
 }
 const style=document.createElement('style');style.id='gra-v444-skill-css';style.textContent=`
 #adrSkillBars .gra-skill-follow{display:inline-flex;align-items:center;justify-content:center;margin:7px 0 0;padding:7px 12px;background:#edf6fd;border:1px solid #a5cbe5;border-radius:9px;color:#155788;font-size:12px;line-height:1.3;font-weight:800;cursor:pointer;max-width:100%;font-family:inherit}
 #adrSkillBars .gra-skill-follow:hover:not(:disabled),#adrSkillBars .gra-skill-follow:focus-visible{background:#dcefff;border-color:#4692c3;outline-offset:2px}
 #adrSkillBars .gra-skill-follow:disabled{color:#8c9dad;border-color:#dae3eb;background:#f6f8fa;cursor:not-allowed}
 #adrSkillBars .bar-name .gra-skill-follow{width:max-content;align-self:flex-start;white-space:normal}
 .gra-skill-overlay[hidden]{display:none!important}.gra-skill-overlay{position:fixed;inset:0;background:rgba(10,28,45,.72);z-index:2147483635;display:flex;align-items:center;justify-content:center;padding:18px;overflow-y:auto}
 .gra-skill-dialog{width:min(1170px,100%);max-height:94vh;overflow:auto;background:#fff;border:1px solid #d2e2ee;border-radius:19px;padding:22px 24px 18px;box-shadow:0 22px 65px #071e3873;outline:none;box-sizing:border-box}
 .gra-skill-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}.gra-skill-head h2{font-size:24px;color:#12385d;margin:0 0 8px;line-height:1.25}.gra-skill-head p{font-size:14px;color:#587088;margin:0 0 10px}
 #graSkillClose{border:1px solid #c0d5e6;border-radius:9px;background:#f4f9fc;color:#204966;padding:10px 16px;font-size:13px;font-weight:800;cursor:pointer;flex-shrink:0}
 #graSkillDescription{font-size:15px;color:#234966;line-height:1.5;margin:10px 0 16px;max-width:1080px;font-weight:650}
 #graSkillChart{border:1px solid #dbe7f0;border-radius:13px;padding:14px 14px 10px;background:#fff}
 .gra-skill-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:4px}
 .gra-skill-summary>div{background:#f5f9fc;border:1px solid #e2edf4;border-radius:10px;padding:10px;text-align:center;min-width:0}.gra-skill-summary span{display:block;font-weight:750;color:#47657d;font-size:13px}.gra-skill-summary strong{display:block;color:#12385d;font-size:24px;margin-top:4px}.gra-skill-summary small{display:block;color:#60798c;font-size:11px;line-height:1.4;margin-top:3px}
 #graSkillFootnote{font-size:12px;line-height:1.6;color:#58738b;margin:12px 0 0}body.gra-skill-open{overflow:hidden}
 @media(max-width:650px){.gra-skill-overlay{padding:8px}.gra-skill-dialog{padding:12px}.gra-skill-head h2{font-size:18px}.gra-skill-head p{font-size:12px}.gra-skill-summary{gap:5px}.gra-skill-summary strong{font-size:18px}.gra-skill-summary small{font-size:10px}#graSkillChart{padding:5px}}
 `;document.head.appendChild(style);
 if(typeof window.renderADRSkills==='function'){
   const original=window.renderADRSkills;
   window.renderADRSkills=function(rows){const result=original.apply(this,arguments);try{attach(rows)}catch(e){console.warn('[v444] Acompanhamento de habilidades',e)}return result;};
 }
 document.addEventListener('click',e=>{const b=e.target.closest?.('#adrSkillBars .gra-skill-follow');if(b&&!b.disabled){e.preventDefault();open(b)} });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('graV444SkillDialog')?.hidden){close()}});
 // Single native version on login, header, welcome screen and subsequent redraws.
 const stamp=()=>{
   document.title='Ferramenta GRA de análise de dados — '+V;
   document.querySelectorAll('.gra-access-version,.gra-start-version,.exp-badge,#dashboardVersionBadge').forEach(el=>{if(el.textContent.trim()!==V)el.textContent=V});
 };
 const versionObserver=new MutationObserver(stamp);
 function initialize(){stamp();document.querySelectorAll('.gra-access-version,.gra-start-version,.exp-badge,#dashboardVersionBadge').forEach(el=>versionObserver.observe(el,{childList:true,characterData:true,subtree:true}));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
 window.__GRA_V444_SKILL_EVOLUTION__={match,series,scoped,open,plot,pct,attach,stamp};
})();

/* Ordenação explícita e consistente das colunas de resultados. O controle
   reaparece depois de qualquer atualização de filtros sem alterar os dados. */
(()=>{
 'use strict';
 if(window.__GRA_RESULT_SORT_V1__)return;
 window.__GRA_RESULT_SORT_V1__=true;
 const collator=new Intl.Collator('pt-BR',{numeric:true,sensitivity:'base'});
 const state=new WeakMap();
 let pending=false;const dirty=new Set();
 const text=cell=>String(cell?.textContent||'').trim();
 function number(value){
   let s=String(value??'').trim().replace(/\u00a0/g,' ');
   if(!s||/^[—–-]+$/.test(s))return null;
   // A unidade nunca deve participar do valor usado na ordenação.
   s=s.replace(/\s*(?:p\.?p\.?|%|alunos?|escolas?|unidades?)\s*$/i,'').replace(/\s/g,'');
   if(!/^[+\-\u2212]?[\d.,]+$/.test(s)){
     const first=s.match(/^([+\-\u2212]?[\d.,]+)%?\/?REF:/i);
     if(!first)return null;
     s=first[1];
   }
   s=s.replace('\u2212','-');
   if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
   else if(/^[-+]?\d{1,3}(?:\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
   const n=Number(s);return Number.isFinite(n)?n:null;
 }
 function headers(table){
   const head=table.tHead?.rows?.[table.tHead.rows.length-1]||[...table.rows].find(r=>r.querySelector('th'));
   if(!head)return [];
   let col=0;
   return [...head.cells].map(th=>{const entry={th,col};col+=th.colSpan||1;return entry});
 }
 function rowsOf(body,table){
   const head=table.tHead?null:headers(table)[0]?.th?.parentElement;
   return [...body.rows].filter(r=>r!==head&&r.cells.length&&!r.querySelector('th'));
 }
 function numeric(table,col){
   let valid=0,total=0;
   for(const body of table.tBodies){
     for(const row of rowsOf(body,table)){
       if(row.classList.contains('sim414-turma-row'))continue;
       const v=text(row.cells[col]);if(!v||/^[—–-]+$/.test(v))continue;
       total++;if(number(v)!==null)valid++;
       if(total>=50)break;
     }
     if(total>=50)break;
   }
   return total>0&&valid/total>=.7;
 }
 function groupsOf(rows){
   if(!rows.some(r=>r.classList.contains('sim414-school-row')))return rows.map(row=>({main:row,children:[]}));
   const groups=[];let active=null;
   for(const row of rows){
     if(row.classList.contains('sim414-school-row')||!active){active={main:row,children:[]};groups.push(active)}
     else if(row.classList.contains('sim414-turma-row'))active.children.push(row);
     else {active={main:row,children:[]};groups.push(active)}
   }
   return groups;
 }
 function compare(a,b,col,dir){
   const av=text(a.cells[col]),bv=text(b.cells[col]);
   const an=number(av),bn=number(bv);
   if(an===null&&bn===null)return collator.compare(av,bv)*dir;
   // Ausências ficam ao fim nos dois sentidos.
   if(an===null)return 1;if(bn===null)return -1;
   return (an-bn)*dir;
 }
 function sort(table,col,dir){
   if(table.dataset.graChunking==='1')return;
   const choices=headers(table),choice=choices.find(h=>h.col===col);
   if(!choice||!numeric(table,col))return;
   const current=state.get(table)||{};
   state.set(table,{...current,col,dir,head:choice.th.parentElement});
   for(const body of table.tBodies){
     const group=groupsOf(rowsOf(body,table));
     group.sort((a,b)=>compare(a.main,b.main,col,dir));
     const frag=document.createDocumentFragment();
     for(const item of group){frag.appendChild(item.main);for(const child of item.children)frag.appendChild(child)}
     body.appendChild(frag);
   }
   for(const {th,col:index} of choices){
     th.setAttribute('aria-sort',index===col?(dir===1?'ascending':'descending'):'none');
     th.querySelectorAll('.gra-rsort-button').forEach(button=>button.setAttribute('aria-pressed',String(index===col&&Number(button.dataset.direction)===dir)));
   }
   const toolbar=table.id==='adrProgressTable'?document.getElementById('gra-progress-sort-toolbar'):null;
   if(toolbar){toolbar.querySelector('select').value=String(col);toolbar.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.direction)===dir)))}
 }
 function progressToolbar(table,choices){
   const wrap=table.closest('.table-wrap');if(!wrap)return;
   let bar=document.getElementById('gra-progress-sort-toolbar');
   if(!bar){
     bar=document.createElement('div');bar.id='gra-progress-sort-toolbar';bar.className='gra-rsort-toolbar';
     bar.innerHTML='<label for="gra-progress-sort-column">Ordenar resultados por</label><select id="gra-progress-sort-column" aria-label="Coluna para ordenar a progressão"></select><div class="gra-rsort-pair"><button type="button" data-direction="-1" aria-label="Maior para menor" title="Maior para menor">↓</button><button type="button" data-direction="1" aria-label="Menor para maior" title="Menor para maior">↑</button></div>';
     wrap.before(bar);
   }
   const select=bar.querySelector('select'),previous=select.value;
   const signature=choices.map(({th,col})=>col+':'+(th.dataset.graSortLabel||text(th).replace(/[↑↓]/g,'').trim())).join('|');
   if(bar.dataset.columns!==signature){
     select.replaceChildren(...choices.map(({th,col})=>{const option=document.createElement('option');option.value=String(col);option.textContent=th.dataset.graSortLabel||text(th).replace(/[↑↓]/g,'').trim();return option}));
     bar.dataset.columns=signature;
     select.value=choices.some(c=>String(c.col)===previous)?previous:String(choices.find(c=>/varia|progres|delta/i.test(c.th.dataset.graSortLabel||''))?.col??choices.at(-1)?.col);
   }
   bar.hidden=!choices.length;
 }
 function prepare(table){
   if(!(table instanceof HTMLTableElement)||!table.isConnected)return;
   const head=headers(table),results=head.filter(({th,col})=>th.colSpan===1&&numeric(table,col));
   for(const {th,col} of head){
     if(!results.some(item=>item.th===th))continue;
     if(th.querySelector('.gra-rsort-pair'))continue;
     const label=text(th);th.dataset.graSortLabel=label;
     // A ordenação antiga por clique no título é substituída pelo par de botões.
     th.removeAttribute('data-gra-global-sort');th.removeAttribute('tabindex');th.removeAttribute('title');
     const pair=document.createElement('span');pair.className='gra-rsort-pair';
     for(const [direction,title,glyph] of [[-1,'Maior para menor','↓'],[1,'Menor para maior','↑']]){
       const button=document.createElement('button');button.type='button';button.className='gra-rsort-button';
       button.dataset.column=String(col);button.dataset.direction=String(direction);
       button.setAttribute('aria-label',`${label}: ${title.toLowerCase()}`);button.title=title;button.textContent=glyph;
       pair.append(button);
     }
     th.appendChild(pair);
   }
   if(table.id==='adrProgressTable')progressToolbar(table,results);
   const old=state.get(table),current=head[0]?.th?.parentElement;
   if(old&&old.head!==current&&results.some(c=>c.col===old.col))sort(table,old.col,old.dir);
 }
 function scan(){document.querySelectorAll('table').forEach(prepare)}
 function schedule(table){if(table instanceof HTMLTableElement)dirty.add(table);if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;for(const item of dirty)prepare(item);dirty.clear()})}
 const style=document.createElement('style');style.id='gra-result-sort-style';
 style.textContent=`table th:has(> .gra-rsort-pair){white-space:normal;min-width:105px}table th:has(> .gra-rsort-pair)::after{display:none!important}.gra-rsort-pair{display:inline-flex;vertical-align:middle;gap:3px;margin-left:7px;white-space:nowrap}.gra-rsort-pair button{display:inline-grid;place-items:center;width:28px;height:28px;border:1px solid #bed5e5;border-radius:7px;background:#fff;color:#17496b;font:800 18px/1 system-ui;cursor:pointer}.gra-rsort-pair button:hover,.gra-rsort-pair button[aria-pressed="true"]{background:#12385d;color:#fff;border-color:#12385d}.gra-rsort-pair button:focus-visible{outline:3px solid #51a5c0;outline-offset:2px}.gra-rsort-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin:14px 0 6px;color:#234b68;font-size:13px;font-weight:750}.gra-rsort-toolbar select{width:auto;min-width:130px;max-width:220px;min-height:36px;border:1px solid #c4d9e8;border-radius:8px;padding:5px 9px;background:#fff;color:#12385d;font:inherit}.gra-rsort-toolbar .gra-rsort-pair{margin-left:0}@media(max-width:650px){.gra-rsort-toolbar{align-items:stretch}.gra-rsort-toolbar label{width:100%}.gra-rsort-toolbar select{flex:1}.gra-rsort-pair button{width:34px;height:34px}}`;
 document.head.appendChild(style);
 window.addEventListener('click',event=>{
   const button=event.target.closest?.('.gra-rsort-button,#gra-progress-sort-toolbar button');
   if(!button)return;
   const table=button.closest('table')||document.getElementById('adrProgressTable');
   const col=button.closest('table')?Number(button.dataset.column):Number(document.getElementById('gra-progress-sort-column')?.value);
   event.preventDefault();event.stopPropagation();sort(table,col,Number(button.dataset.direction));
 },true);
 document.addEventListener('change',event=>{if(event.target?.id==='gra-progress-sort-column'){const table=document.getElementById('adrProgressTable');sort(table,Number(event.target.value),state.get(table)?.dir||-1)}},true);
 function boot(){
   scan();
   const observer=new MutationObserver(mutations=>{
     for(const mutation of mutations){
       if(!mutation.addedNodes.length)continue;
       const owner=mutation.target.closest?.('table');
       if(owner) {schedule(owner);continue}
       for(const node of mutation.addedNodes){
         if(node.nodeType!==1)continue;
         if(node.matches?.('table'))schedule(node);
         node.querySelectorAll?.('table').forEach(schedule);
       }
     }
   });
   observer.observe(document.body,{childList:true,subtree:true});
   document.addEventListener('gra-table-rendered',event=>schedule(event.target),true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

// Identidade visual compartilhada com o ranking de habilidades mais desafiadoras.
(()=>{const style=document.createElement('style');style.id='gra-skill-catalog-identity';style.textContent=`
 #graSkillResults.gra-skill-results{display:flex;flex-direction:column;gap:0;margin-top:14px}
 #graSkillResults .gra-skill-catalog-row{display:block;border:0;border-bottom:1px solid #edf1f5;border-left:0;border-radius:0;padding:12px 0 13px;background:transparent;min-width:0}
 #graSkillResults .gra-skill-catalog-row:first-child{border-top:1px solid #edf1f5}
 #graSkillResults .gra-skill-catalog-row .gra-skill-result-head{justify-content:flex-start;gap:8px}
 #graSkillResults .gra-skill-catalog-row .gra-skill-result-head strong{display:inline-flex;align-items:center;min-height:29px;padding:4px 10px;border-radius:999px;background:#eaf4f7;color:#173b59;font-size:13px;font-weight:850}
 #graSkillResults .gra-skill-catalog-row .gra-skill-result-head span{color:#5b7588;font-size:12px;font-weight:750}
 #graSkillResults .gra-skill-catalog-row .gra-skill-catalog-meta{margin:5px 0 4px;color:#5b7588;font-size:12px;line-height:1.35}
 #graSkillResults .gra-skill-catalog-row p{margin:0 0 8px;color:#557081;font-size:13px;line-height:1.45;max-width:none}
 #graSkillResults .gra-skill-catalog-meter{height:9px;margin:0 88px 0 0;border-radius:9px;overflow:hidden;background:#e9f0f5}
 #graSkillResults .gra-skill-catalog-meter b{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#1b966f,#78c9ab)}
 #graSkillResults .gra-skill-catalog-score{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:-18px;min-height:18px;color:#60768a;font-size:12px}
 #graSkillResults .gra-skill-catalog-score strong{color:#145e89;font-size:15px;font-weight:850;font-variant-numeric:tabular-nums}
 @media(max-width:600px){#graSkillResults .gra-skill-catalog-meter{margin-right:74px}#graSkillResults .gra-skill-catalog-row p{font-size:13px}}
 `;document.head.appendChild(style)})();

(()=>{let s=document.createElement("style");s.id="gra-v46-responsive";s.textContent='/* Responsive controls: intrinsic height and normal document flow. */\n@media(max-width:760px){\n body.exp-ui .topbar{height:auto!important;min-height:0!important;position:relative!important}\n body.exp-ui .topbar .actions{position:relative!important;inset:auto!important;transform:none!important;height:auto!important;min-height:0!important;grid-template-rows:none!important;grid-auto-rows:minmax(56px,auto)!important;align-items:stretch!important;padding-bottom:10px!important}\n body.exp-ui .topbar .actions > *{position:relative!important;inset:auto!important;transform:none!important;min-width:0!important;height:auto!important;min-height:56px!important;max-height:none!important;box-sizing:border-box!important}\n body.exp-ui .topbar .actions .global-search-wrap{min-height:52px!important}\n body.exp-ui .topbar .actions #v392SchoolContextBtn,\n body.exp-ui .topbar .actions #partnersEducationBtn,\n body.exp-ui .topbar .actions #pdfExportBtn,\n body.exp-ui .topbar .actions #slideExportBtn,\n body.exp-ui .topbar .actions #reportExperimentalBtn{height:auto!important;min-height:56px!important;align-self:stretch!important}\n body.exp-ui #partnersEducationBtn .gra-partner-switch-label{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.22!important;font-size:12px!important}\n body.exp-ui #partnersEducationBtn .gra-partner-switch-status{font-size:10px!important}\n body.exp-ui .topbar + *,body.exp-ui main{position:relative;clear:both}\n .geo-map-card .geo-legend{max-width:calc(100vw - 28px)!important;overflow-x:auto!important;justify-content:flex-start!important;scrollbar-width:thin}\n}\n@media(max-width:430px){\n body.exp-ui .topbar .actions{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important}\n body.exp-ui .topbar .actions > button{white-space:normal!important;line-height:1.2!important;overflow-wrap:anywhere!important}\n}\n.gra-skill-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}\n.gra-skill-tabs button{min-height:46px;border:1px solid #bdd4e4;background:#fff;color:#12385d;border-radius:12px;padding:10px 18px;font:inherit;font-weight:800;cursor:pointer}\n.gra-skill-tabs button.active{background:#12385d;color:#fff}\n#adrs.gra-skills-active > :not(.gra-skill-tabs):not(.gra-skill-page){display:none!important}\n.gra-skill-page[hidden]{display:none!important}\n.gra-skill-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:16px}\n.gra-skill-filters label{display:grid;gap:6px;color:#415c73;font-size:12px;font-weight:800;min-width:0}\n.gra-skill-filters select,.gra-skill-filters input{width:100%;min-width:0;min-height:46px;border:1px solid #bfd3e0;border-radius:11px;background:#fff;color:#183b59;padding:9px 12px;font:inherit;font-size:15px}\n.gra-skill-search{grid-column:span 2}\n.gra-skill-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:16px}\n.gra-skill-result{border:1px solid #d5e4ec;border-left:5px solid #8a9dac;border-radius:12px;padding:14px;background:#fff;min-width:0}\n.gra-skill-result.up{border-left-color:#16865f}.gra-skill-result.down{border-left-color:#b34444}\n.gra-skill-result-head,.gra-skill-values{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}\n.gra-skill-result-head span{font-size:12px;font-weight:800}.gra-skill-result.up .gra-skill-result-head span{color:#08714d}.gra-skill-result.down .gra-skill-result-head span{color:#ab3838}\n.gra-skill-result p{line-height:1.45;margin:9px 0}.gra-skill-values{padding:9px 0;border-top:1px solid #e7eef3;font-size:13px}.gra-skill-result small{color:#5a7183}\n.gra-skill-empty{grid-column:1/-1;padding:18px;background:#f4f8fb;border-radius:12px}\n@media(max-width:600px){.gra-skill-filters{grid-template-columns:1fr 1fr}.gra-skill-filters label{grid-column:1/-1}.gra-skill-tabs button{flex:1}.gra-skill-results{grid-template-columns:1fr}}\n';document.head.appendChild(s)})();
(()=>{const section=document.getElementById('adrs');if(!section||document.getElementById('graSkillPage'))return;const nav=document.createElement('nav');nav.className='gra-skill-tabs';nav.setAttribute('aria-label','Visualização das ADRs');nav.innerHTML='<button type="button" class="active" data-gra-adr-tab="overview" aria-pressed="true">Visão geral</button><button type="button" data-gra-adr-tab="skills" aria-pressed="false">Habilidade</button>';const panel=document.createElement('div');panel.className='card gra-skill-page';panel.id='graSkillPage';panel.hidden=true;panel.innerHTML='<div class="panel-title"><div><h3>Progressão por habilidade</h3><p>Compare o percentual de acerto da mesma habilidade curricular em duas ADRs.</p></div></div><div class="gra-skill-filters"><label>Ano escolar<select id="graSkillYear"></select></label><label>Componente<select id="graSkillComp"></select></label><label>Comparar edições<select id="graSkillPair"><option value="12">ADR 1 → ADR 2</option><option value="23">ADR 2 → ADR 3</option><option value="13">ADR 1 → ADR 3</option><option value="123">ADR 1 → ADR 2 → ADR 3</option></select></label><label>Escola<input id="graSkillSchool" type="search" list="graSkillSchoolList" autocomplete="off" placeholder="Todas as escolas ou digite o nome"><datalist id="graSkillSchoolList"></datalist><div id="graSkillSchoolSuggestions" class="gra-skill-suggestions" hidden></div></label><label>Resultado<select id="graSkillDirection"><option value="all">Todas</option><option value="up">Subiram</option><option value="flat">Estagnaram</option><option value="down">Caíram</option></select></label><label class="gra-skill-search">Buscar habilidade<input id="graSkillSearch" type="search" placeholder="Código ou descrição"></label></div><p id="graSkillStatus" class="footer-note" aria-live="polite"></p><div id="graSkillResults" class="gra-skill-results"></div>';section.prepend(panel);section.prepend(nav)})();
(()=>{
 const page=document.getElementById('graSkillPage');if(!page)return;
 const filters=page.querySelector('.gra-skill-filters');
 filters.insertAdjacentHTML('beforebegin','<div class="gra-skill-view"><label for="graSkillView">Visualização</label><select id="graSkillView"><option value="catalog">Todas as habilidades</option><option value="progress">Progressão entre ADRs</option></select></div>');
 const year=document.getElementById('graSkillYear'),comp=document.getElementById('graSkillComp');
 year.insertAdjacentHTML('afterbegin','<option value="all">Todos os anos</option>');
 comp.insertAdjacentHTML('afterbegin','<option value="all">Todos os componentes</option>');
 const pair=document.getElementById('graSkillPair');pair.insertAdjacentHTML('beforebegin','<select id="graSkillEdition" aria-label="Edição da ADR"><option value="all">Todas as ADRs</option><option value="ADR 1">ADR 1</option><option value="ADR 2">ADR 2</option><option value="ADR 3">ADR 3</option></select>');
 pair.parentElement.classList.add('gra-skill-pair-field');
 const status=document.getElementById('graSkillStatus');
 status.insertAdjacentHTML('afterend','<div class="gra-skill-list-head"><h4 id="graSkillListTitle">Lista de habilidades</h4><div class="gra-skill-order" role="group" aria-label="Ordenar habilidades"><button type="button" data-skill-sort="desc" aria-label="Ordenar do maior para o menor" title="Maior primeiro">↑</button><button type="button" data-skill-sort="asc" aria-label="Ordenar do menor para o maior" title="Menor primeiro">↓</button></div></div>');
 document.getElementById('graSkillResults').insertAdjacentHTML('afterend','<button type="button" id="graSkillMore" class="gra-skill-more" hidden>Mostrar mais habilidades</button>');
 const style=document.createElement('style');style.textContent='.gra-skill-view{display:flex;align-items:center;gap:12px;margin:14px 0}.gra-skill-view label{font-weight:800;color:#31546c}.gra-skill-view select{min-height:44px;padding:8px 12px;border:1px solid #bfd3e0;border-radius:10px;background:#fff;color:#183b59;font:inherit}.gra-skill-list-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px}.gra-skill-list-head h4{margin:0;font-size:18px}.gra-skill-order{display:flex;gap:6px}.gra-skill-order button{width:42px;height:42px;border:1px solid #bfd3e0;border-radius:10px;background:#fff;color:#173b59;font-size:23px;font-weight:800;cursor:pointer}.gra-skill-order button[aria-pressed="true"]{background:#173b59;color:#fff}.gra-skill-more{display:block;margin:18px auto 0;border:1px solid #bfd3e0;background:#f2f8fb;color:#173b59;border-radius:10px;padding:12px 20px;font:inherit;font-weight:800;cursor:pointer}.gra-skill-more[hidden]{display:none}.gra-skill-catalog-meta{color:#5b7588;font-size:12px;font-weight:700;margin-top:6px}.gra-skill-pair-field #graSkillEdition{display:none}.gra-skill-catalog .gra-skill-pair-field #graSkillPair,.gra-skill-catalog .gra-skill-filters label:has(#graSkillDirection){display:none}.gra-skill-catalog .gra-skill-pair-field #graSkillEdition{display:block}';document.head.appendChild(style);
})();
/* ADR: comparação curricular por habilidade, conforme o recorte atual. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const fmt=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:1});
 const pairs={12:[0,1],23:[1,2],13:[0,2],123:[0,1,2]};
 let sortDirection='asc';
 let visibleCount=120;
 const compNames={LP:'Língua Portuguesa',MT:'Matemática',CN:'Ciências',GEO:'Geografia',HIS:'História'};
 function line(item,indices){
   const names=indices.map(i=>'ADR '+(i+1)),data=indices.map(i=>item.values[i]);
   const y=v=>95-Number(v)*.7,color=item.trend==='up'?'#16865f':item.trend==='down'?'#b34444':'#60798c';
   const xs=indices.length===3?[55,180,305]:[55,305];
   const path=data.map((d,i)=>i?'<line x1="'+xs[i-1]+'" y1="'+y(data[i-1].value)+'" x2="'+xs[i]+'" y2="'+y(d.value)+'" stroke="'+color+'" stroke-width="4" stroke-linecap="round"/>':'').join('');
   const points=data.map((d,i)=>'<circle cx="'+xs[i]+'" cy="'+y(d.value)+'" r="6" fill="'+color+'"/><text x="'+xs[i]+'" y="'+Math.max(16,y(d.value)-12)+'" text-anchor="middle">'+fmt(d.value)+'%</text><text x="'+xs[i]+'" y="127" text-anchor="middle">'+names[i]+'</text>').join('');
   return '<svg class="gra-skill-line" viewBox="0 0 360 140" role="img" aria-label="Gráfico de linhas: '+data.map((d,i)=>names[i]+' '+fmt(d.value)+' por cento').join('; ')+'" xmlns="http://www.w3.org/2000/svg"><line x1="40" y1="95" x2="320" y2="95" stroke="#dde7ee"/>'+path+points+'</svg>';
 }
 let timer;
 function rows(){
   try{return typeof ADR_ROWS!=='undefined'&&Array.isArray(ADR_ROWS)?ADR_ROWS:window.ADR_ROWS||[]}catch(_){return []}
 }
 function rawYears(){return [...new Set(rows().filter(r=>r.habilidades?.length).map(r=>r.ano))].sort((a,b)=>parseInt(a)-parseInt(b))}
 const memo=new Map();
 const catalogScopes=new Map();
 function scopeRows(year,comp){
   const key=JSON.stringify([year,comp,$('regionalScopeSelect')?.value,$('adrAgente')?.value,$('adrPriority')?.value,$('adrSearch')?.value,window.__GRA_SELECTED_SCHOOL__]);
   if(!catalogScopes.has(key)){if(catalogScopes.size>100)catalogScopes.clear();catalogScopes.set(key,window.__GRA_V444_SKILL_EVOLUTION__.scoped(year,comp))}
   return catalogScopes.get(key);
 }
 function catalog(year,comp,school){
   const key=JSON.stringify([year,comp,school?.name,school?.cre,$('regionalScopeSelect')?.value,$('adrAgente')?.value,$('adrPriority')?.value,$('adrSearch')?.value]);
   if(memo.has(key))return memo.get(key);
   const scope=window.__GRA_V444_SKILL_EVOLUTION__.scoped(year,comp).filter(r=>!school||(norm(r.escola)===norm(school.name)&&norm(r.regional||r.cre)===norm(school.cre)));
   const matched=new Map(),grouped=new Map();
   for(const r of scope){
     const index=Number(r.adr?.match(/\d+/)?.[0])-1;if(index<0||index>2)continue;
     for(const h of r.habilidades||[]){
       const v=Number(h.valor);if(h.valor==null||h.valor===''||!Number.isFinite(v)||v<0||v>100)continue;
       const mk=r.adr+'|'+h.codigo;let m=matched.get(mk);
       if(m===undefined){m=window.__GRA_V444_SKILL_EVOLUTION__.match(h.codigo,year,comp,r.adr);matched.set(mk,m)}
       if(!m.origin)continue;
       const id=m.origin.code+'|'+m.origin.description;
       if(!grouped.has(id))grouped.set(id,{code:m.origin.original,description:m.origin.text,match:m.matches,values:[null,null,null]});
       const item=grouped.get(id),cell=item.values[index]||{sum:0,weight:0,schools:new Set()};
       const weight=Number(r.avaliados)>0?Number(r.avaliados):1;
       cell.sum+=v*weight;cell.weight+=weight;cell.schools.add((r.regional||r.cre||'')+'|'+r.escola);item.values[index]=cell;
     }
   }
   const result=[...grouped.values()].map(item=>({...item,values:item.values.map(x=>x?{value:x.sum/x.weight,schools:x.schools.size}:null)}));
   if(memo.size>80)memo.clear();memo.set(key,result);return result;
 }
 function hasPair(items,indices){return items.some(item=>indices.every(i=>item.match['ADR '+(i+1)]&&item.values[i]))}
 function setChoices(select,values,enabled,preferred){
   const old=select.value||preferred;
   select.replaceChildren(...values.map(value=>{const o=document.createElement('option');o.value=value;o.textContent=select.id==='graSkillPair'?pairs[value].map(i=>'ADR '+(i+1)).join(' → '):value;o.disabled=!enabled(value);return o}));
   const chosen=values.find(x=>x===old&&enabled(x))||values.find(enabled)||'';
   select.value=chosen;select.disabled=!chosen;
 }
 function schoolsFor(year,comp){
   const scope=window.__GRA_V444_SKILL_EVOLUTION__.scoped(year,comp);
   return [...new Map(scope.filter(r=>r.escola).map(r=>{const cre=r.regional||r.cre||'';return [norm(r.escola+'|'+cre),{name:r.escola,cre,label:r.escola+' · '+cre}]})).values()].sort((x,y)=>x.label.localeCompare(y.label,'pt-BR'));
 }
 function suggest(schools){
   const input=$('graSkillSchool'),box=$('graSkillSchoolSuggestions'),typed=norm(input.value.trim());
   box.replaceChildren();if(!typed){box.hidden=true;return}
   const matches=schools.filter(s=>norm(s.label).includes(typed)).slice(0,12);
   for(const item of matches){const b=document.createElement('button');b.type='button';b.textContent=item.label;b.addEventListener('click',()=>{input.value=item.label;box.hidden=true;schedule()});box.appendChild(b)}
   box.hidden=!matches.length||schools.some(x=>norm(x.label)===typed);
 }
 function renderCatalog(yearSelect,compSelect,schoolInput){
   const engine=window.__GRA_V444_SKILL_EVOLUTION__,allYears=rawYears();
   const allFor=y=>[...new Set(rows().filter(r=>r.ano===y&&r.habilidades?.length).map(r=>r.componente))];
   const valid=(y,c)=>scopeRows(y,c).some(r=>(r.habilidades||[]).some(h=>h.valor!==''&&h.valor!=null&&Number.isFinite(Number(h.valor))&&Number(h.valor)>=0&&Number(h.valor)<=100));
   setChoices(yearSelect,['all',...allYears],y=>y==='all'||allFor(y).some(c=>valid(y,c)),'all');
   const year=yearSelect.value,years=year==='all'?allYears:[year];
   const allComps=[...new Set(rows().filter(r=>years.includes(r.ano)&&r.habilidades?.length).map(r=>r.componente))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
   setChoices(compSelect,['all',...allComps],c=>c==='all'||years.some(y=>valid(y,c)),'all');
   const comp=compSelect.value,comps=comp==='all'?allComps:[comp],edition=$('graSkillEdition').value;
   const scoped=[];
   for(const y of years)for(const c of comps)scoped.push(...scopeRows(y,c));
   const schoolMap=new Map();for(const r of scoped){if(!r.escola)continue;const cre=r.regional||r.cre||'',label=r.escola+' · '+cre;schoolMap.set(norm(label),{name:r.escola,cre,label})}
   const schools=[...schoolMap.values()].sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
   $('graSkillSchoolList').replaceChildren(...schools.map(item=>{const o=document.createElement('option');o.value=item.label;return o}));
   suggest(schools);
   const typed=schoolInput.value.trim(),selected=typed?schools.find(x=>norm(x.label)===norm(typed)):null;
   if(typed&&!selected){$('graSkillStatus').textContent='Selecione o nome completo da escola nas sugestões.';$('graSkillResults').innerHTML='';$('graSkillMore').hidden=true;return}
   const grouped=new Map();
   for(const r of scoped){if(edition!=='all'&&r.adr!==edition)continue;if(selected&&(norm(r.escola)!==norm(selected.name)||norm(r.regional||r.cre)!==norm(selected.cre)))continue;
     for(const h of r.habilidades||[]){const v=Number(h.valor);if(h.valor==null||h.valor===''||!Number.isFinite(v)||v<0||v>100)continue;
       const matched=engine.match(h.codigo,r.ano,r.componente,r.adr),code=matched.origin?.original||String(h.codigo||'').trim();if(!code)continue;
       const description=matched.origin?.text||h.descricao||h.descricaoHabilidade||'';
       const key=[r.ano,r.componente,r.adr,norm(code),norm(description)].join('|');
       if(!grouped.has(key))grouped.set(key,{year:r.ano,comp:r.componente,edition:r.adr,code,description,sum:0,weight:0,schools:new Set()});
       const item=grouped.get(key),w=Number(r.avaliados)>0?Number(r.avaliados):1;item.sum+=v*w;item.weight+=w;item.schools.add((r.regional||r.cre||'')+'|'+r.escola);
     }
   }
   const query=norm($('graSkillSearch').value.trim());
   const output=[...grouped.values()].map(x=>({...x,value:x.sum/x.weight})).filter(x=>!query||norm(x.code+' '+x.description).includes(query));
   output.sort((a,b)=>(sortDirection==='desc'?b.value-a.value:a.value-b.value)||a.year.localeCompare(b.year,'pt-BR')||a.comp.localeCompare(b.comp,'pt-BR')||a.edition.localeCompare(b.edition,'pt-BR')||a.code.localeCompare(b.code,'pt-BR'));
   $('graSkillListTitle').textContent='Todas as habilidades · percentual de acerto';
   $('graSkillStatus').textContent=`${output.length} resultado(s) · ${year==='all'?'Todos os anos':year} · ${comp==='all'?'Todos os componentes':compNames[comp]||comp} · ${edition==='all'?'Todas as ADRs':edition} · ${selected?selected.label:'Todas as escolas'}. Média ponderada pelos alunos avaliados em cada escola.`;
   $('graSkillResults').innerHTML=output.length?output.slice(0,visibleCount).map(x=>`<article class="gra-skill-result gra-skill-catalog-row"><div class="gra-skill-result-head"><strong>${esc(x.code)}</strong><span>${esc(x.edition)}${x.year?' · '+esc(x.year):''}</span></div><div class="gra-skill-catalog-meta">${esc(compNames[x.comp]||x.comp)} · ${x.schools.size} escola(s)</div><p>${esc(x.description||'Descrição não disponível nesta base')}</p><div class="gra-skill-catalog-meter"><b style="width:${Math.max(0,Math.min(100,x.value)).toFixed(2)}%"></b></div><div class="gra-skill-catalog-score"><span>Acerto</span><strong>${fmt(x.value)}%</strong></div></article>`).join(''):'<p class="gra-skill-empty">Não há habilidades para esta seleção.</p>';
   const more=$('graSkillMore');more.hidden=output.length<=visibleCount;more.textContent=`Mostrar mais habilidades (${Math.min(output.length-visibleCount,120)} de ${output.length-visibleCount} restantes)`;
 }
 function render(){
   if(!$('graSkillPage')||$('graSkillPage').hidden)return;
   const engine=window.__GRA_V444_SKILL_EVOLUTION__;if(!engine||!rows().length){$('graSkillStatus').textContent='Carregando resultados das ADRs…';return}
   const yearSelect=$('graSkillYear'),compSelect=$('graSkillComp'),pairSelect=$('graSkillPair'),schoolInput=$('graSkillSchool');
   const catalogView=$('graSkillView').value==='catalog';$('graSkillPage').classList.toggle('gra-skill-catalog',catalogView);
   $('graSkillPage').querySelector('.panel-title h3').textContent=catalogView?'Habilidades das ADRs':'Progressão por habilidade';
   $('graSkillPage').querySelector('.panel-title p').textContent=catalogView?'Consulte todas as habilidades avaliadas no recorte, inclusive as que aparecem em apenas uma ADR.':'Compare o percentual de acerto da mesma habilidade curricular entre edições disponíveis.';
   pairSelect.parentElement.firstChild.textContent=catalogView?'Edição da ADR':'Comparar edições';
   if(catalogView){renderCatalog(yearSelect,compSelect,schoolInput);return}
   const currentSchools=schoolsFor(yearSelect.value||$('adrAno')?.value||'2º ano',compSelect.value||$('adrComp')?.value||'LP');
   const typed=schoolInput.value.trim(),school=currentSchools.find(x=>norm(x.label)===norm(typed));
   const years=rawYears(),compsFor=y=>[...new Set(rows().filter(r=>r.ano===y&&r.habilidades?.length).map(r=>r.componente))];
   const anyPair=(y,c)=>Object.values(pairs).some(indices=>hasPair(catalog(y,c,school),indices));
   setChoices(yearSelect,years,y=>compsFor(y).some(c=>anyPair(y,c)), $('adrAno')?.value);
   const year=yearSelect.value,comps=compsFor(year).sort((a,b)=>a.localeCompare(b,'pt-BR'));
   setChoices(compSelect,comps,c=>anyPair(year,c),$('adrComp')?.value);
   const comp=compSelect.value;
   const schools=year&&comp?schoolsFor(year,comp):[];
   $('graSkillSchoolList').replaceChildren(...schools.map(item=>{const o=document.createElement('option');o.value=item.label;return o}));
   suggest(schools);
   const selected=typed?schools.find(x=>norm(x.label)===norm(typed)):null;
   const items=year&&comp?catalog(year,comp,selected):[];
   const pairValues=Object.keys(pairs);
   setChoices(pairSelect,pairValues,v=>hasPair(items,pairs[v]),'12');
   const indices=pairs[pairSelect.value],directionSelect=$('graSkillDirection');
   if(!indices){$('graSkillResults').innerHTML='';$('graSkillMore').hidden=true;$('graSkillStatus').textContent='Nenhuma comparação disponível para este recorte.';return}
   const a=indices[0],b=indices[indices.length-1],base='ADR '+(a+1),end='ADR '+(b+1);
   const comparable=items.filter(item=>indices.every(i=>item.match['ADR '+(i+1)]&&item.values[i])).map(item=>{
     const delta=item.values[b].value-item.values[a].value,trend=delta>1?'up':delta< -1?'down':'flat';return {...item,start:item.values[a],finish:item.values[b],delta,trend};
   });
   for(const o of directionSelect.options){o.disabled=o.value!=='all'&&!comparable.some(item=>item.trend===o.value)}
   if(directionSelect.selectedOptions[0]?.disabled)directionSelect.value='all';
   if(typed&&!selected){$('graSkillStatus').textContent='Selecione o nome completo da escola nas sugestões.';$('graSkillResults').innerHTML='';$('graSkillMore').hidden=true;return}
   const query=norm($('graSkillSearch').value.trim()),direction=directionSelect.value;
   const output=comparable.filter(item=>(direction==='all'||item.trend===direction)&&(!query||norm(item.code+' '+item.description).includes(query)));
   output.sort((x,y)=>(sortDirection==='desc'?y.delta-x.delta:x.delta-y.delta)||x.code.localeCompare(y.code,'pt-BR'));
   $('graSkillListTitle').textContent='Progressão das habilidades · variação em p.p.';
   $('graSkillStatus').textContent=output.length+' habilidade(s) comparáveis · '+year+' · '+comp+' · '+indices.map(i=>'ADR '+(i+1)).join(' → ')+(selected?' · '+selected.label:' · Todas as escolas')+'. Estagnação: variação de até 1 ponto percentual. Médias ponderadas pelos alunos avaliados; turmas e dificuldade dos itens podem variar.';
   $('graSkillResults').innerHTML=output.length?output.slice(0,visibleCount).map(item=>`<article class="gra-skill-result ${item.trend}"><div class="gra-skill-result-head"><strong>${esc(item.code)}</strong><span>${item.trend==='up'?'Subiu':item.trend==='down'?'Caiu':'Estagnou'}</span></div><p>${esc(item.description)}</p>${line(item,indices)}<div class="gra-skill-values"><span>${base}: <b>${fmt(item.start.value)}%</b></span><span>${end}: <b>${fmt(item.finish.value)}%</b></span><strong>${item.delta>0?'+':''}${fmt(item.delta)} p.p.</strong></div><small>${item.start.schools} escola(s) na primeira ADR · ${item.finish.schools} na segunda</small></article>`).join(''):'<p class="gra-skill-empty">Não há habilidades para esta seleção.</p>';
   const more=$('graSkillMore');more.hidden=output.length<=visibleCount;more.textContent=`Mostrar mais habilidades (${Math.min(output.length-visibleCount,120)} de ${output.length-visibleCount} restantes)`;
 }

 function schedule(){clearTimeout(timer);timer=setTimeout(render,120)}
 function boot(){
   document.querySelectorAll('[data-gra-adr-tab]').forEach(button=>button.addEventListener('click',()=>{
     const active=button.dataset.graAdrTab==='skills',section=$('adrs');
     section.classList.toggle('gra-skills-active',active);$('graSkillPage').hidden=!active;
     document.querySelectorAll('[data-gra-adr-tab]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});
     if(active){schedule()}
   }));
   ['graSkillView','graSkillEdition','graSkillYear','graSkillComp','graSkillPair','graSkillDirection','regionalScopeSelect','adrAgente','adrPriority'].forEach(id=>$(id)?.addEventListener('change',()=>{memo.clear();if(['regionalScopeSelect','adrAgente','adrPriority'].includes(id))catalogScopes.clear();visibleCount=120;if(id==='graSkillYear'){$('graSkillSchool').value='';$('graSkillComp').value=''}if(id==='graSkillComp')$('graSkillSchool').value='';if(id==='graSkillView'){$('graSkillYear').value='';$('graSkillComp').value='';$('graSkillSchool').value=''}schedule()}));
   document.querySelectorAll('[data-skill-sort]').forEach(button=>button.addEventListener('click',()=>{sortDirection=button.dataset.skillSort;document.querySelectorAll('[data-skill-sort]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));visibleCount=120;schedule()}));
   document.querySelector('[data-skill-sort="asc"]')?.setAttribute('aria-pressed','true');
   $('graSkillMore')?.addEventListener('click',()=>{visibleCount+=120;schedule()});
   $('graSkillSearch')?.addEventListener('input',schedule);
   $('graSkillSchool')?.addEventListener('input',schedule);
   $('graSkillSchool')?.addEventListener('change',schedule);
   $('adrSearch')?.addEventListener('input',()=>{catalogScopes.clear();schedule()});
   document.addEventListener('click',e=>{if(e.target.closest?.('.nav button[data-section="adrs"]'))schedule()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
(()=>{const s=document.createElement('style');s.textContent='.gra-skill-line{display:block;width:100%;height:auto;background:#f8fbfd;border:1px solid #e2ebf1;border-radius:10px;margin:12px 0}.gra-skill-line text{font-family:system-ui,sans-serif;fill:#234966;font-size:13px;font-weight:750}.gra-skill-line text:nth-last-child(-n+2){fill:#5d7283;font-size:12px}';document.head.appendChild(s)})();

(()=>{const s=document.createElement('style');s.textContent='#graSkillSchoolSuggestions{display:grid;max-height:230px;overflow:auto;border:1px solid #c2d8e7;border-radius:10px;background:white;margin-top:4px}#graSkillSchoolSuggestions[hidden]{display:none}#graSkillSchoolSuggestions button{background:white;border:0;border-bottom:1px solid #e7eef4;text-align:left;padding:12px;color:#183b59;font:inherit;font-size:14px;cursor:pointer}#graSkillSchoolSuggestions button:hover,#graSkillSchoolSuggestions button:focus{background:#e8f3fb}.gra-skill-filters option:disabled{color:#9daab5}';document.head.appendChild(s)})();

/* v46 visual system is bundled here to keep the deployed asset self-contained. */
(()=>{const style=document.createElement('style');style.id='gra-ux46-styles';style.textContent='/* GRA visual system: presentation only. Existing chart, table and filter DOM remains intact. */\nbody.exp-ui {\n  --navy:#173b59;\n  --blue:#156789;\n  --blue2:#2181a4;\n  --sky:#eaf4f7;\n  --line:#d6e3e9;\n  --text:#1c3448;\n  --muted:#526d7e;\n  --card:#fff;\n  --soft:#f5f9fa;\n  --shadow:0 7px 24px rgba(20,57,78,.055);\n  --radius:16px;\n  color:var(--text);\n  background:#f4f8fa;\n  font-family:Inter,"Segoe UI",Arial,sans-serif;\n  line-height:1.45;\n}\nbody.exp-ui .main {max-width:none}\nbody.exp-ui .section {min-width:0}\nbody.exp-ui .section > .card,\nbody.exp-ui .section .grid > .card,\nbody.exp-ui .section > .grid .card {\n  border-color:#dbe6eb;\n  border-radius:16px;\n  box-shadow:var(--shadow);\n}\nbody.exp-ui .section .card {min-width:0}\nbody.exp-ui .section .card h3 {font-size:clamp(17px,1.45vw,20px);line-height:1.25;letter-spacing:-.025em;color:#173b59}\nbody.exp-ui .section .card h4 {font-size:15px;line-height:1.3}\nbody.exp-ui .section .panel-title {align-items:flex-start;gap:14px}\nbody.exp-ui .section .panel-title p {color:#557081;font-size:13px;line-height:1.45;max-width:75ch}\nbody.exp-ui .section .footer-note,\nbody.exp-ui .section .muted {color:#577182}\nbody.exp-ui .sidebar {background:#123b56;box-shadow:4px 0 20px rgba(18,48,67,.13)}\nbody.exp-ui .sidebar .brand {border-color:rgba(255,255,255,.15)}\nbody.exp-ui .sidebar .nav {gap:5px}\nbody.exp-ui .sidebar .nav button {\n  font-family:inherit;\n  font-size:14px;\n  line-height:1.25;\n  border-radius:11px;\n  min-height:42px;\n  transition:background .15s ease,color .15s ease;\n}\nbody.exp-ui .sidebar .nav button.active {background:#eff8fa;color:#123b56;box-shadow:none}\nbody.exp-ui .sidebar .nav button:focus-visible,\nbody.exp-ui .main button:focus-visible,\nbody.exp-ui .main summary:focus-visible,\nbody.exp-ui .main input:focus-visible,\nbody.exp-ui .main select:focus-visible {outline:3px solid #51a5c0;outline-offset:2px}\nbody.exp-ui .topbar {background:#fff;border:1px solid #dbe6eb;border-radius:17px;padding:16px 18px;box-shadow:var(--shadow)}\nbody.exp-ui .topbar .title h2 {font-size:clamp(18px,2vw,27px);line-height:1.2;color:#173b59}\nbody.exp-ui .topbar .title p {font-size:13px;color:#557081}\nbody.exp-ui .main .btn,\nbody.exp-ui .main .pill {box-shadow:none;border-color:#cbdce4}\nbody.exp-ui .main .btn:hover,\nbody.exp-ui .main .pill:hover {background:#eaf5f8;border-color:#8db8c9}\nbody.exp-ui .main .pill.active {background:#173b59;color:#fff}\nbody.exp-ui .section select,\nbody.exp-ui .section input[type="search"],\nbody.exp-ui .section input.search,\nbody.exp-ui .section .search {\n  color:#1c3b50;\n  border-color:#cbdde5;\n  background-color:#fff;\n  border-radius:11px;\n  font-family:inherit;\n  font-size:14px;\n  min-height:44px;\n}\nbody.exp-ui .section select:disabled,\nbody.exp-ui .section input:disabled {opacity:.48;cursor:not-allowed}\nbody.exp-ui .section .toolbar {gap:10px}\nbody.exp-ui .section .toolbar > select,\nbody.exp-ui .section .toolbar > input,\nbody.exp-ui .section .toolbar > label {min-width:min(100%,170px);max-width:100%}\nbody.exp-ui .section .filter-context,\nbody.exp-ui .section .geo-eval-context {font-size:12px;line-height:1.4}\nbody.exp-ui .section details > summary {cursor:pointer;color:#1b5270;font-weight:750}\nbody.exp-ui .section .table-wrap {border-color:#d9e5ea;border-radius:12px;max-width:100%}\nbody.exp-ui .section table {font-variant-numeric:tabular-nums}\nbody.exp-ui .section table th {background:#173b59;letter-spacing:.01em}\nbody.exp-ui .section table td {border-color:#e6edf0}\nbody.exp-ui .section table tr:hover td {background:#f2f8fa}\nbody.exp-ui .section .kpi {border-radius:15px;min-height:105px}\nbody.exp-ui .section .kpi:after {display:none}\nbody.exp-ui .section .kpi .label {letter-spacing:0;text-transform:none;font-size:12px}\nbody.exp-ui .section .kpi .value {font-size:clamp(26px,2.7vw,34px);letter-spacing:-.045em}\nbody.exp-ui .section .bar-row {min-width:0}\nbody.exp-ui .section .bar-name {min-width:0;overflow-wrap:anywhere}\nbody.exp-ui .section .legend-row {border-radius:10px}\nbody.exp-ui .gra-ux-section-intro {\n  margin:0 0 16px;\n  padding:20px 22px;\n  border:1px solid #d9e7eb;\n  border-left:4px solid #2181a4;\n  background:#fff;\n  border-radius:15px;\n  box-shadow:var(--shadow);\n}\n#adrs.gra-skills-active > .gra-ux-section-intro:not(.gra-skill-page) {display:block!important}\nbody.exp-ui .gra-ux-section-intro h2 {font-size:clamp(21px,2.1vw,27px);line-height:1.2;letter-spacing:-.03em;margin:0;color:#173b59}\nbody.exp-ui .gra-ux-section-intro p {font-size:13px;color:#557081;margin:6px 0 0;max-width:72ch}\nbody.exp-ui .gra-ux-context {display:inline-block;margin-top:10px;padding:5px 9px;background:#eaf4f7;border-radius:8px;color:#245a73;font-size:12px;font-weight:750}\nbody.exp-ui .gra-ux-jumps {display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}\nbody.exp-ui .gra-ux-jumps button {border:1px solid #c9dce5;border-radius:9px;background:#f6fafb;color:#25536c;padding:7px 11px;min-height:38px;font:inherit;font-size:12px;font-weight:750;cursor:pointer}\nbody.exp-ui .gra-ux-jumps button:hover {background:#e7f3f7}\nbody.exp-ui .gra-ux-jumps button:focus-visible {outline:3px solid #51a5c0;outline-offset:2px}\nbody.exp-ui .gra-ux-rank-link {border:1px solid #c9dce5;background:#f6fafb;color:#1d526f;padding:9px 13px;border-radius:10px;font:inherit;font-size:12px;font-weight:750;cursor:pointer}\nbody.exp-ui .adr-hf-complete {margin-top:12px;border:1px solid #d5e4ea;background:#fff;border-radius:11px;padding:11px 15px}\nbody.exp-ui .adr-hf-complete summary {font-size:13px}\nbody.exp-ui .adr-hf-complete ol {columns:2;column-gap:32px;padding-left:26px;line-height:1.7;font-size:13px}\nbody.exp-ui .adr-hf-complete li {break-inside:avoid;margin-bottom:5px}\n@media(max-width:1100px){\n  body.exp-ui .main {padding:16px}\n  body.exp-ui .section .grid {min-width:0}\n}\n@media(max-width:700px){\n  body.exp-ui .main {padding:10px 11px 24px}\n  body.exp-ui .topbar {padding:11px;margin-bottom:12px}\n  body.exp-ui .section > .card,\n  body.exp-ui .section .grid > .card {padding:15px;border-radius:14px}\n  body.exp-ui .gra-ux-section-intro {padding:15px;margin-bottom:12px}\n  body.exp-ui .section .panel-title {flex-wrap:wrap}\n  body.exp-ui .section .toolbar > select,\n  body.exp-ui .section .toolbar > input,\n  body.exp-ui .section .toolbar > label {width:100%;flex:1 1 100%}\n  body.exp-ui .section .table-wrap {overflow-x:auto;overscroll-behavior-inline:contain}\n  body.exp-ui .adr-hf-complete ol {columns:1}\n  body.exp-ui .gra-ux-jumps {display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}\n  body.exp-ui .gra-ux-jumps button {padding:8px 5px;line-height:1.25}\n}\n@media(prefers-reduced-motion:reduce){\n  body.exp-ui .section,body.exp-ui .sidebar .nav button {animation:none;transition:none}\n}\n';document.head.append(style)})();
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
