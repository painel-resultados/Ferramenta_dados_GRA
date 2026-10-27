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
   const mode=$('adrMode'), interval=$('adrEvolucao'),agent=$('adrAgente');
   const saveMode=mode?.value,saveInterval=interval?.value,saveAgent=agent?.value;
   const special=String(saveAgent||'').startsWith('__gra_adr_');
   let result=[];
   try{
     if(mode)mode.value='individual';if(interval)interval.value='13';
     if(special&&agent)agent.value='';
     result=typeof adrFilteredRows==='function'?adrFilteredRows({ignoreAdr:true}):rawRows();
   }catch(err){console.warn('[v444] Filtro de habilidades',err);result=[]}
   finally{if(mode&&saveMode!=null)mode.value=saveMode;if(interval&&saveInterval!=null)interval.value=saveInterval;if(agent&&saveAgent!=null)agent.value=saveAgent}
   const sel=canon(window.__GRA_SELECTED_SCHOOL__||'');
   return result.filter(r=>r?.ano===ano&&r?.componente===comp&&(!special||saveAgent!=='__gra_adr_school__'||(sel&&canon(r.escola)===sel))); 
 }
 function series(h,ano,comp,adr){
   const info=match(h,ano,comp,adr),group=scoped(ano,comp);
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
 window.__GRA_V444_SKILL_EVOLUTION__={match,series,open,plot,pct,attach,stamp};
})();
