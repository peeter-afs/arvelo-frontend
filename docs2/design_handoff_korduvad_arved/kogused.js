(function(){
document.head.insertAdjacentHTML('beforeend','<style>.qban{display:flex;align-items:center;gap:8px;padding:7px 9px;margin-bottom:7px;border:1px dashed #e2c48c;border-radius:8px;background:#fdf8ec;font-size:11.5px;color:#8a5a0c}.qban .btn{margin-left:auto;height:23px;font-size:11px;text-decoration:none}</style>');
const url=()=>'Kogused.html?mall='+encodeURIComponent($('tname').value);
$('gennow').insertAdjacentHTML('beforebegin','<a class="btn sm" id="qopen" style="text-decoration:none">Sisesta kogused</a>');
const _render=render;
render=function(){_render();const n=vqN(),o=$('qopen');if(o){o.hidden=!n;o.style.display=n?'':'none';o.href=url()}if(!n)return;const r=upcoming(1);
  if(r.length)$('runs').insertAdjacentHTML('afterbegin',`<div class="qban"><span><b>${active().length}</b> arvet ootab kogust · ${dstr(r[0])}</span><a class="btn sm" href="${url()}">Sisesta kogused</a></div>`)};
render();
})();
