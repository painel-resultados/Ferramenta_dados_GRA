
(()=>{
  function install(){
    const chart=document.getElementById('somMainChart');
    if(!chart||chart.dataset.v148PointSelection==='1') return;
    chart.dataset.v148PointSelection='1';

    const searchInput=()=>document.getElementById('somSearch');
    const isAvaliaActive=()=>{
      const section=document.getElementById('resultados');
      return Boolean(section?.classList.contains('active')) && document.getElementById('somModalidade')?.value==='Avalia RJ';
    };
    const hasPointSelection=()=>Boolean(chart.querySelector('.som-scatter-focused'));
    const clearPointSelection=()=>{
      const input=searchInput();
      if(!input||!input.value||!hasPointSelection()) return;
      input.value='';
      input.dispatchEvent(new Event('input',{bubbles:true}));
    };
    const activatePoint=event=>{
      const point=event.target?.closest?.('[data-som-school]');
      if(!point||!chart.contains(point)) return false;
      if(event.type==='keydown'&&!['Enter',' '].includes(event.key)) return false;
      event.preventDefault();
      event.stopPropagation();
      const school=point.dataset.somSchool;
      const input=searchInput();
      if(!school||!input) return false;
      input.value=school;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      return true;
    };

    chart.addEventListener('click',event=>{
      if(activatePoint(event)) return;
      // Mantém o clique dentro do gráfico fora do manipulador global.
      event.stopPropagation();
      // Uma área vazia do gráfico remove o destaque sem deslocar a página.
      clearPointSelection();
    });
    chart.addEventListener('keydown',activatePoint);

    document.addEventListener('click',event=>{
      if(!isAvaliaActive()||chart.contains(event.target)) return;
      // Qualquer clique fora do gráfico remove a escola selecionada.
      clearPointSelection();
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
