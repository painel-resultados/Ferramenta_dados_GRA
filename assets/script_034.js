
(function(){
  'use strict';
  function applyV241Overrides(){
    if(window.__V241_AVALIA_OVERRIDES_INSTALLED__)return;
    window.__V241_AVALIA_OVERRIDES_INSTALLED__=true;
    const byId=id=>document.getElementById(id);
    const isAvalia=()=>byId('somModalidade')?.value==='Avalia RJ';
    const escHtml=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const normText=v=>typeof window.norm==='function'?window.norm(v):String(v||'').toLocaleLowerCase('pt-BR');
    const fmt=v=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';

    // A mesma escola mantém a mesma cor mesmo quando o usuário muda os filtros.
    function schoolColor(cre,school){
      const key=normText(`${cre||''}|${school||''}`);
      let hash=2166136261;
      for(let i=0;i<key.length;i++){hash^=key.charCodeAt(i);hash=Math.imul(hash,16777619);}
      hash>>>=0;
      const hue=Math.round((hash*0.618033988749895*360)%360);
      const sat=64+((hash>>>9)%23);
      const light=40+((hash>>>17)%18);
      return `hsl(${hue} ${sat}% ${light}%)`;
    }

    function forceAvaliaIndicator(){
      const sel=byId('somMetric');
      if(!sel||!isAvalia())return;
      sel.innerHTML='<option value="adqAv">% Adequado + Avançado</option>';
      sel.value='adqAv';
    }

    const previousAdjust=window.somAdjustMetricOptions;
    window.somAdjustMetricOptions=function(){
      const result=typeof previousAdjust==='function'?previousAdjust():undefined;
      forceAvaliaIndicator();
      return result;
    };

    function dedupeSchoolPoints(rows){
      const groups=new Map();
      (rows||[]).forEach(row=>{
        const school=String(row?.escola||'').trim();
        const lp=Number(row?.lp),mt=Number(row?.mt);
        if(!school||!Number.isFinite(lp)||!Number.isFinite(mt))return;
        const cre=String(row?.cre||row?.regional||'').trim();
        const key=normText(`${cre}|${school}`);
        if(!groups.has(key))groups.set(key,{school,cre,lp:[],mt:[],rows:[]});
        const g=groups.get(key);g.lp.push(lp);g.mt.push(mt);g.rows.push(row);
      });
      return [...groups.values()].map(g=>({
        escola:g.school,cre:g.cre,
        lp:g.lp.reduce((a,b)=>a+b,0)/g.lp.length,
        mt:g.mt.reduce((a,b)=>a+b,0)/g.mt.length,
        row:g.rows[0]
      })).sort((a,b)=>String(a.escola).localeCompare(String(b.escola),'pt-BR'));
    }

    function wideScatter(rows,highlightQuery=''){
      const target=byId('somMainChart');if(!target)return;
      const points=dedupeSchoolPoints(rows),q=normText(highlightQuery||'');
      if(!points.length){target.innerHTML='<div class="som-empty">Não há escolas com pares válidos de Língua Portuguesa e Matemática neste recorte.</div>';return;}
      const w=1600,h=500,L=76,R=30,T=26,B=64,pw=w-L-R,ph=h-T-B;
      const x=v=>L+pw*Math.max(0,Math.min(100,Number(v)))/100;
      const y=v=>T+ph*(1-Math.max(0,Math.min(100,Number(v)))/100);
      let grid='';
      [0,20,40,60,80,100].forEach(t=>{
        const xx=x(t),yy=y(t);
        grid+=`<line x1="${xx}" y1="${T}" x2="${xx}" y2="${T+ph}" stroke="#e6eef4" stroke-width="1"/><line x1="${L}" y1="${yy}" x2="${L+pw}" y2="${yy}" stroke="#e6eef4" stroke-width="1"/><text x="${xx}" y="${T+ph+22}" text-anchor="middle" font-size="11" fill="#718397">${t}%</text><text x="${L-12}" y="${yy+4}" text-anchor="end" font-size="11" fill="#718397">${t}%</text>`;
      });
      const marks=points.map(p=>{
        const focused=q&&normText(`${p.escola} ${p.cre}`).includes(q);
        const cx=x(p.lp),cy=y(p.mt),r=focused?9:6.4,opacity=q?(focused?1:.14):.88;
        const color=schoolColor(p.cre,p.escola);
        const label=focused?`<text x="${Math.min(w-R-240,cx+12)}" y="${Math.max(T+15,cy-12)}" font-size="11" font-weight="900" fill="#12385d" paint-order="stroke" stroke="#fff" stroke-width="4">${escHtml(p.escola)}</text>`:'';
        const ring=focused?`<circle cx="${cx}" cy="${cy}" r="14" fill="none" stroke="${color}" stroke-width="3" opacity=".58"/>`:'';
        return `<g class="v241-avalia-point ${focused?'som-scatter-focused':''}" data-som-school="${escHtml(p.escola)}" data-school-color="${color}" role="button" tabindex="0">${ring}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}" stroke="#fff" stroke-width="1.8"><title>${escHtml(p.escola)}${p.cre?` · ${escHtml(p.cre)}`:''}\nLíngua Portuguesa: ${fmt(p.lp)}\nMatemática: ${fmt(p.mt)}</title></circle>${label}</g>`;
      }).join('');
      target.innerHTML=`<div class="v241-avalia-scatter-wrap"><svg class="v241-avalia-scatter-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Avalia RJ: dispersão das escolas em Língua Portuguesa e Matemática, usando Adequado mais Avançado"><rect x="${L}" y="${T}" width="${pw}" height="${ph}" rx="12" fill="#fff" stroke="#d9e5ef"/>${grid}<line x1="${L}" y1="${T+ph}" x2="${L+pw}" y2="${T+ph}" stroke="#b7c9d8"/><line x1="${L}" y1="${T}" x2="${L}" y2="${T+ph}" stroke="#b7c9d8"/>${marks}<text x="${L+pw/2}" y="${h-10}" text-anchor="middle" fill="#526779" font-size="12" font-weight="900">Língua Portuguesa (Leitura + Escrita) — % Adequado + Avançado</text><text transform="translate(18 ${T+ph/2}) rotate(-90)" text-anchor="middle" fill="#526779" font-size="12" font-weight="900">Matemática — % Adequado + Avançado</text></svg></div><div class="v241-avalia-legend"><i></i><span>Cada escola possui uma cor de identificação própria e estável</span></div><div class="v241-avalia-note">Visualização descritiva do recorte selecionado. As cores servem apenas para distinguir visualmente as escolas e não representam classificação, faixa de desempenho ou ranking.</div>`;
    }

    const previousMain=window.renderSomMainChart;
    window.renderSomMainChart=function(rows){
      if(!isAvalia())return typeof previousMain==='function'?previousMain(rows):undefined;
      forceAvaliaIndicator();
      const search=String(byId('somSearch')?.value||'').trim();
      let source=rows||[];
      if(search&&typeof window.somFilteredRows==='function'){
        try{source=window.somFilteredRows({ignoreSearch:true});}catch(_){source=rows||[];}
      }
      wideScatter(source,search);
      const title=byId('somMainTitle'),subtitle=byId('somMainSubtitle');
      if(title)title.textContent='Avalia RJ — distribuição das escolas';
      if(subtitle)subtitle.textContent='Língua Portuguesa × Matemática · % Adequado + Avançado.';
    };

    const previousKpis=window.renderSomKpis;
    window.renderSomKpis=function(rows,baseRows){
      if(isAvalia()){const el=byId('somKpis');if(el)el.innerHTML='';return;}
      return typeof previousKpis==='function'?previousKpis(rows,baseRows):undefined;
    };
    const previousCre=window.renderSomCreChart;
    window.renderSomCreChart=function(){
      if(isAvalia()){const el=byId('somCreChart');if(el)el.innerHTML='';return;}
      return typeof previousCre==='function'?previousCre():undefined;
    };
    const previousDonut=window.renderSomDonut;
    window.renderSomDonut=function(rows){
      if(isAvalia()){const a=byId('somPie'),b=byId('somPieLegend');if(a)a.innerHTML='';if(b)b.innerHTML='';return;}
      return typeof previousDonut==='function'?previousDonut(rows):undefined;
    };
    const previousSkills=window.renderSomSkills;
    window.renderSomSkills=function(rows){
      return typeof previousSkills==='function'?previousSkills(rows):undefined;
    };
    const previousProgress=window.renderSomProgress;
    window.renderSomProgress=function(){
      if(isAvalia()){byId('somProgressCard')?.classList.remove('open');return;}
      return typeof previousProgress==='function'?previousProgress():undefined;
    };
    const previousTable=window.renderSomTable;
    window.renderSomTable=function(rows){
      if(isAvalia()){const el=byId('somTable');if(el)el.innerHTML='';const count=byId('somCount');if(count)count.textContent='';return;}
      return typeof previousTable==='function'?previousTable(rows):undefined;
    };

    function applyLayout(){
      const section=byId('resultados');if(!section)return;
      const on=isAvalia();section.classList.toggle('v241-avalia-only',on);
      const mainCard=byId('somMainChart')?.closest('.card'),mainGrid=mainCard?.parentElement;
      const distributionGrid=byId('somCreCompareCard')?.parentElement;
      const detailCard=byId('somTable')?.closest('.card');
      const kpis=byId('somKpis'),skills=byId('somSkillCard'),progress=byId('somProgressCard'),compare=byId('somGetCompareCard'),toggles=byId('somFiltersCard')?.querySelector('.gc-toggle-grid'),jumps=section.querySelector('.v222-section-jumps');
      if(on){
        forceAvaliaIndicator();
        const mode=byId('somMode');if(mode)mode.value='individual';
        [kpis,distributionGrid,progress,detailCard,compare,toggles,jumps].forEach(el=>{if(el)el.style.display='none';});
        if(skills){skills.style.removeProperty('display');skills.style.gridColumn='1/-1';}
        if(mainGrid){mainGrid.style.display='grid';mainGrid.style.gridTemplateColumns='minmax(0,1fr)';}
        if(mainCard){mainCard.style.display='block';mainCard.style.gridColumn='1/-1';}
        ['somGetCompareToggle','somTurnoCompareToggle'].forEach(id=>{const el=byId(id);if(el)el.checked=false;});
      }else{
        [kpis,distributionGrid,skills,detailCard,compare,toggles,jumps].forEach(el=>{if(el)el.style.removeProperty('display');});
        if(progress)progress.style.removeProperty('display');
        if(mainGrid){mainGrid.style.removeProperty('display');mainGrid.style.removeProperty('grid-template-columns');}
        if(mainCard){mainCard.style.removeProperty('display');mainCard.style.removeProperty('grid-column');}
      }
    }

    const previousRender=window.renderResultados;
    window.renderResultados=function(){
      forceAvaliaIndicator();
      const result=typeof previousRender==='function'?previousRender():undefined;
      forceAvaliaIndicator();applyLayout();
      return result;
    };

    // Current-view PPT: Avalia RJ keeps only its descriptive scatter slide; never ranking/progression.
    if(typeof window.addSomRankSlide==='function'){
      const previousRankSlide=window.addSomRankSlide;
      window.addSomRankSlide=function(pptx,ctx,slideNumber){if(isAvalia())return false;return previousRankSlide(pptx,ctx,slideNumber);};
    }
    if(typeof window.addSomProgressSlide==='function'){
      const previousProgressSlide=window.addSomProgressSlide;
      window.addSomProgressSlide=function(pptx,ctx,slideNumber){if(isAvalia())return false;return previousProgressSlide(pptx,ctx,slideNumber);};
    }
    if(typeof window.collectSomScatterRows==='function'){
      window.collectSomScatterRows=function(){
        if(!isAvalia())return [];
        const search=String(byId('somSearch')?.value||'').trim(),focus=normText(search);
        let rows=[];try{rows=window.somFilteredRows({ignoreSearch:!!search});}catch(_){rows=[];}
        return dedupeSchoolPoints(rows).map(p=>({name:p.escola,cre:p.cre,lp:p.lp,mt:p.mt,row:p.row,highlight:!!focus&&normText(`${p.escola} ${p.cre}`).includes(focus)}));
      };
    }

    try{
      const geoBtn=document.querySelector('[data-geo-eval="Avalia RJ"]');if(geoBtn){geoBtn.style.display='none';geoBtn.setAttribute('aria-hidden','true');geoBtn.tabIndex=-1;}
      if(window.GEO_STATE?.evaluation==='Avalia RJ'&&typeof window.geoSelectEvaluation==='function')window.geoSelectEvaluation('ADR');
    }catch(_){/* no-op */}

    forceAvaliaIndicator();applyLayout();if(typeof window.renderResultados==='function')window.renderResultados();
  }
  const schedule=()=>setTimeout(applyV241Overrides,420);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
