
(function(){
  'use strict';

  /**
   * Desenha um segmento preservando a direção visual mesmo quando o ponto final
   * está acima do inicial. O PowerPoint/PptxGenJS não trata de forma confiável
   * caixas com altura negativa, o que fazia a linha terminar no marcador errado.
   */
  function pptSafeLineSegmentV226(slide,x1,y1,x2,y2,line){
    const ax=Number(x1),ay=Number(y1),bx=Number(x2),by=Number(y2);
    if(!slide||typeof slide.addShape!=='function'||![ax,ay,bx,by].every(Number.isFinite))return null;
    const opts={
      x:Math.min(ax,bx),
      y:Math.min(ay,by),
      w:Math.abs(bx-ax),
      h:Math.abs(by-ay),
      line:line||{}
    };
    if(ax>bx)opts.flipH=true;
    if((ax<=bx&&ay>by)||(ax>bx&&ay<=by))opts.flipV=true;
    slide.addShape('line',opts);
    return opts;
  }

  globalThis.pptSafeLineSegmentV226=pptSafeLineSegmentV226;
})();

