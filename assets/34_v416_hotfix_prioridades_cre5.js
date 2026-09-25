/* v416 HOTFIX — corrige recorte de prioridades da 5ª CRE.
   Motivo: planilha-fonte marcou cinco unidades apenas como "Prioritária",
   sem especificar Alfabetização ou Anos Finais. Mantém a v416. */
(function(){
  'use strict';

  const HOTFIX = [
    {name:'Escola Municipal Francisco Sertorio Portinho', cre:5, scope:'ALFA', type:'Alfabetização', years:['2º ano']},
    {name:'Escola Municipal Irã', cre:5, scope:'ALFA', type:'Alfabetização', years:['2º ano']},
    {name:'Escola Municipal Pires e Albuquerque', cre:5, scope:'ALFA', type:'Alfabetização', years:['2º ano']},
    {name:'Escola Municipal Albert Sabin', cre:5, scope:'ALFA', type:'Alfabetização', years:['2º ano']},
    {name:'Escola Municipal Sebastião de Lacerda', cre:5, scope:'ALFA_AI', type:'Alfabetização + Anos Iniciais', years:['2º ano','4º ano','5º ano']},
    {name:'Escola Municipal Mato Grosso', cre:5, scope:'ALFA_AI', type:'Alfabetização + Anos Iniciais', years:['2º ano','4º ano','5º ano']},
    {name:'Escola Municipal Rostham Pedro de Farias', cre:5, scope:'ALFA_AI', type:'Alfabetização + Anos Iniciais', years:['2º ano','4º ano','5º ano']},
    {name:'Escola Municipal Rodrigo Otávio Filho', cre:5, scope:'AF', type:'Anos Finais', years:['8º ano','9º ano']}
  ];

  function creNumber(value=''){
    const match=String(value??'').match(/\d+/);
    return match ? Number(match[0]) : 0;
  }
  function metaCre(meta){
    // Registros já existentes na lista histórica são da 2ª CRE.
    return Number(meta?.cre || 2);
  }
  function metaMatchesCre(meta,value=''){
    if(!String(value??'').trim()) return true;
    const requested=creNumber(value);
    return !!requested && requested===metaCre(meta);
  }

  // Amplia a lista canônica de prioridades sem alterar as entradas da 2ª CRE.
  HOTFIX.forEach(meta=>{
    const key=prioritySchoolKey(meta.name);
    const existing=PRIORITY_LOOKUP.get(key);
    if(existing && metaCre(existing)===5){
      Object.assign(existing,meta);
    }else{
      PRIORITY_SCHOOLS.push(meta);
      PRIORITY_LOOKUP.set(key,meta);
    }
    PRIORITY_SCHOOL_ORDER.set(key,PRIORITY_SCHOOLS.findIndex(item=>prioritySchoolKey(item.name)===key));
  });

  // A lógica anterior aceitava prioridades contextuais apenas quando a CRE era 2.
  // Agora a CRE é validada contra a própria metainformação da unidade.
  priorityMatchesContext=function(school,year='',evaluation='',cre=''){
    const meta=priorityMetaForSchool(school);
    if(!meta || !metaMatchesCre(meta,cre)) return false;
    const requested=priorityScopeFromContext(year,evaluation);
    if(!requested) return true;
    const token=String(meta.type||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(requested==='ALFA') return meta.scope==='ALFA' || meta.scope==='ALFA_AI' || token.includes('alfabet') || token.includes('alfa');
    if(requested==='AI') return meta.scope==='AI' || meta.scope==='ALFA_AI' || token.includes('iniciais');
    if(requested==='AF') return meta.scope==='AF' || token.includes('finais');
    return true;
  };

  prioritySearchText=function(name,cre=''){
    const meta=priorityMetaForSchool(name);
    if(!meta || !metaMatchesCre(meta,cre)) return '';
    return `prioritaria prioritarias prioridade ${meta.type} ${meta.scope} ${meta.years.join(' ')}`;
  };

  // Corrige também os metadados já materializados no Banco de Dados.
  DATA.records.forEach(record=>{
    if(Number(record.cre)!==5) return;
    const meta=priorityMetaForSchool(record.unidade);
    if(!meta || metaCre(meta)!==5) return;
    record.prioritaria='Sim';
    record.prioritariaBase='Sim';
    record.prioridadeTipo=meta.type;
    record.prioridadeTipoBase=meta.type;
    record.prioridadeAnos=meta.years.join(', ');
    record.prioridadeAnosBase=meta.scope==='AF'?'8º e 9º anos':meta.years.join(', ');
    record.prioridadeRecorte=meta.type;
    record.prioridadeRecorteBase=meta.type;
  });

  window.__GRA_V416_HOTFIX_PRIORIDADES_CRE5__={
    applied:true,
    schools:HOTFIX.map(x=>({name:x.name,cre:x.cre,scope:x.scope,type:x.type,years:x.years.slice()}))
  };
})();
