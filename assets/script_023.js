
function addSomUnitAssessmentSlide(pptx,ctx,meta,entry,slideNumber){
  const slide=pptx.addSlide();
  const label=entry.modalidade==='IDEB 2025'?`IDEB 2025 · ${entry.anoEscolar}`:`${entry.modalidade} · ${entry.anoEscolar}`;
  addHeader(slide,ctx,label,meta.school,slideNumber);
  slide.addShape('roundRect',{x:.72,y:1.52,w:11.95,h:4.72,rectRadius:.08,line:{color:BORDER,width:1},fill:{color:WHITE}});
  slide.addText(meta.school,{x:.96,y:1.74,w:5.8,h:.22,fontFace:'Aptos Display',fontSize:15,bold:true,color:NAVY,margin:0,fit:'shrink'});
  slide.addText([cleanText(meta.record?.creLabel||meta.record?.cre||''),cleanText(meta.record?.agente||''),label].filter(Boolean).join(' · '),{x:.96,y:2.0,w:7.8,h:.14,fontFace:'Aptos',fontSize:8.3,color:MUTED,margin:0,fit:'shrink'});

  const metricCard=(x,y,w,h,title,value,note='',accent=GREEN,valueSize=20)=>{
    slide.addShape('roundRect',{x,y,w,h,rectRadius:.06,line:{color:BORDER,width:.9},fill:{color:'FBFDFE'}});
    slide.addShape('rect',{x,y,w:.09,h,line:{color:accent,transparency:100},fill:{color:accent}});
    slide.addText(String(title||'').toUpperCase(),{x:x+.18,y:y+.12,w:w-.28,h:.14,fontFace:'Aptos',fontSize:8.1,bold:true,color:MUTED,margin:0,fit:'shrink'});
    slide.addText(String(value||'—'),{x:x+.18,y:y+.40,w:w-.28,h:.28,fontFace:'Aptos Display',fontSize:valueSize,bold:true,color:NAVY,margin:0,fit:'shrink'});
    if(note){
      slide.addText(String(note),{x:x+.18,y:y+.92,w:w-.28,h:.20,fontFace:'Aptos',fontSize:8,color:INK,margin:0,fit:'shrink'});
    }
  };
  const listBox=(x,y,w,h,title,accent,items,emptyText='Sem dados disponíveis nesta base.')=>{
    slide.addShape('roundRect',{x,y,w,h,rectRadius:.06,line:{color:BORDER,width:.8},fill:{color:'F9FBFD'}});
    slide.addText(title,{x:x+.18,y:y+.14,w:w-.28,h:.16,fontFace:'Aptos Display',fontSize:13,bold:true,color:accent,margin:0,fit:'shrink'});
    if(items && items.length){
      items.slice(0,4).forEach((item,i)=>{
        slide.addText(item,{x:x+.18,y:y+.46+i*.24,w:w-.30,h:.12,fontFace:'Aptos',fontSize:8,color:INK,margin:0,fit:'shrink'});
      });
    }else{
      slide.addText(emptyText,{x:x+.18,y:y+.56,w:w-.30,h:.12,fontFace:'Aptos',fontSize:8,color:MUTED,margin:0,fit:'shrink'});
    }
  };
  const topXs=[.95,3.63,6.31,8.99];
  const y1=2.38, y2=4.02, w4=2.45, h4=1.24;
  const partPct=row=>{
    const av=Number(row?.avaliados), pr=Number(row?.previstos);
    return (Number.isFinite(av)&&Number.isFinite(pr)&&pr>0) ? slidePct((av/pr)*100) : '—';
  };
  const partFrac=row=>{
    const av=Number(row?.avaliados), pr=Number(row?.previstos);
    return (Number.isFinite(av)&&Number.isFinite(pr)&&pr>0) ? `${Math.round(av)}/${Math.round(pr)}` : '—';
  };

  if(entry.modalidade==='Avalia RJ'){
    const row=entry.row||{};
    metricCard(topXs[0],y1,w4,h4,'LP',slidePct(row.lp),Number.isFinite(Number(row.proficienciaLP))?`Proficiência: ${slideScore(row.proficienciaLP,0)}`:'',BLUE);
    metricCard(topXs[1],y1,w4,h4,'MT',slidePct(row.mt),Number.isFinite(Number(row.proficienciaMT))?`Proficiência: ${slideScore(row.proficienciaMT,0)}`:'',GREEN);
    // v241: Resultado geral removido do Avalia RJ; LP e MT permanecem separados.
    const partLP=Number.isFinite(Number(row.participacaoLP))?slidePct(row.participacaoLP):'—';
    const partMT=Number.isFinite(Number(row.participacaoMT))?slidePct(row.participacaoMT):'—';
    metricCard(topXs[2],y1,w4,h4,'Participação',`${partLP} / ${partMT}`,'LP / MT','E29B24',17);
    const skills=somUnitSkillGroups(row,4);
    const lpItems=(skills.LP||[]).map(item=>`${item.code} — ${slidePct(item.value)}`);
    const mtItems=(skills.MT||[]).map(item=>`${item.code} — ${slidePct(item.value)}`);
    listBox(.95,y2,5.18,1.56,'Habilidades mais desafiadoras · LP',BLUE,lpItems);
    listBox(6.18,y2,5.18,1.56,'Habilidades mais desafiadoras · MT',GREEN_DARK,mtItems);
  }else if(entry.modalidade==='Prova Rio'){
    const lp=entry.lpRow||{}, mt=entry.mtRow||{};
    metricCard(topXs[0],y1,w4,h4,'LP · Adequado + Avançado',slidePct(Number(lp.principal ?? lp.adqAv)),partFrac(lp),BLUE,18);
    metricCard(topXs[1],y1,w4,h4,'LP · Abaixo do Básico',slidePct(lp.abaixo),`Participação: ${partPct(lp)}`,BLUE,18);
    metricCard(topXs[2],y1,w4,h4,'MT · Adequado + Avançado',slidePct(Number(mt.principal ?? mt.adqAv)),partFrac(mt),GREEN,18);
    metricCard(topXs[3],y1,w4,h4,'MT · Abaixo do Básico',slidePct(mt.abaixo),`Participação: ${partPct(mt)}`,GREEN,18);
    metricCard(topXs[0],y2,w4,h4,'LP · Básico',slidePct(lp.basico),'Distribuição de desempenho',BLUE,18);
    metricCard(topXs[1],y2,w4,h4,'LP · Avançado',slidePct(lp.avancado),Number.isFinite(Number(lp.avaliados))?`${Math.round(Number(lp.avaliados)).toLocaleString('pt-BR')} avaliados`:'' ,BLUE,18);
    metricCard(topXs[2],y2,w4,h4,'MT · Básico',slidePct(mt.basico),'Distribuição de desempenho',GREEN,18);
    metricCard(topXs[3],y2,w4,h4,'MT · Avançado',slidePct(mt.avancado),Number.isFinite(Number(mt.avaliados))?`${Math.round(Number(mt.avaliados)).toLocaleString('pt-BR')} avaliados`:'' ,GREEN,18);
  }else if(entry.modalidade==='IDEB 2025'){
    const row=entry.row||{};
    const growth=Number(row.crescimento);
    metricCard(topXs[0],y1,w4,h4,'IDEB 2025',slideScore(row.ideb2025 ?? row.principal,1),Number.isFinite(Number(row.np))?`Nota padronizada: ${slideScore(row.np,2)}`:'',BLUE,21);
    metricCard(topXs[1],y1,w4,h4,'IDEB 2023',slideScore(row.ideb2023,1),Number.isFinite(Number(row.ranking))?`Ranking na CRE: ${Math.round(Number(row.ranking))}`:'',GREEN,21);
    metricCard(topXs[2],y1,w4,h4,'Crescimento',Number.isFinite(growth)?`${growth>=0?'+':''}${slideScore(growth,1)}`:'—',Number.isFinite(Number(row.rankingCrescimento))?`Ranking de crescimento: ${Math.round(Number(row.rankingCrescimento))}`:'',Number.isFinite(growth)?(growth>=0?GREEN:'B23B3B'):'7A8794',19);
    metricCard(topXs[3],y1,w4,h4,'IR',slideScore(row.ir,3),'Taxa de rendimento','E29B24',19);
    metricCard(topXs[0],y2,w4,h4,'Proficiência LP',slideScore(row.lp,2),'Língua Portuguesa',BLUE,18);
    metricCard(topXs[1],y2,w4,h4,'Proficiência MT',slideScore(row.mt,2),'Matemática',GREEN,18);
    metricCard(topXs[2],y2,w4,h4,'Nota padronizada',slideScore(row.np,2),'Desempenho padronizado',NAVY,18);
    metricCard(topXs[3],y2,w4,h4,'Segmento',entry.anoEscolar||'—',meta.plan?`Plano de Ação: ${meta.plan}`:'',NAVY,12);
  }
  return true;
}
