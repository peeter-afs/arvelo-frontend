const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nf=n=>Math.abs(n).toLocaleString('et-EE',{minimumFractionDigits:2,maximumFractionDigits:2});
const fN=n=>Math.abs(n)<0.005?'–':(n<0?'−':'')+nf(n);
const fE=n=>(n<0?'−':'')+nf(n)+'\u00a0€';
const I={search:'<path d="M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/>',chev:'<path d="M6 9l6 6 6-6"/>',x:'<path d="M18 6L6 18M6 6l12 12"/>',cal:'<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',print:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',dl:'<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',star:'<path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 5.2 20.9l1.1-6.5L1.6 9.8l6.5-.9z"/>',ok:'<path d="M20 6L9 17l-5-5"/>',warn:'<path d="M12 8v4M12 16h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',cmp:'<path d="M8 3v18M16 3v18M3 8h5M16 16h5"/>',mail:'<path d="M4 4h16v16H4z"/><path d="M4 6l8 7 8-7"/>'};
const ic=(k,st='')=>`<svg class="i" viewBox="0 0 24 24"${st?` style="${st}"`:''}>${I[k]}</svg>`;
function toast(m){const t=$('toast');t.textContent=m;t.className='toast on';clearTimeout(t._h);t._h=setTimeout(()=>t.className='toast',2400)}

const NAV=[['Finants',[['pl','Kasumiaruanne'],['bs','Bilanss']]],['Raamat',[['tb','Proovibilanss',0],['to','Käibeandmik',0],['gl','Pearaamat',0]]],['Maksud',[['kmd','KMD aruanne',0]]],['Partnerid',[['aging','Aegumisaruanne'],['ps','Partneri kontokaart',0]]],['Juhtimine',[['dim','Kulukohad ja projektid'],['ar','Majandusaasta aruanne',0]]]];
const RNAME={bs:'Bilanss',pl:'Kasumiaruanne',aging:'Aegumisaruanne',dim:'Kulukohad ja projektid'};
const ASOF=[['today','Täna','07.10.2026',1],['pm','Eelmise kuu lõpp','30.09.2026',.97],['pq','Eelmise kvartali lõpp','30.06.2026',.9],['py','Eelmise aasta lõpp','31.12.2025',.82]];
const RANGE=[['ytd','Aasta algusest','01.01.2026 – 07.10.2026',1],['cm','Jooksev kuu','01.10.2026 – 31.10.2026',.09],['pm','Eelmine kuu','01.09.2026 – 30.09.2026',.11],['cq','Jooksev kvartal','01.10.2026 – 31.12.2026',.09],['pq','Eelmine kvartal','01.07.2026 – 30.09.2026',.29],['py','Eelmine aasta','01.01.2025 – 31.12.2025',1.24]];
const CMP={bs:[['none','Võrdlus puudub'],['pye','Eelmise aasta lõpp','31.12.2025',1],['sdly','Sama kuupäev eelmisel aastal','07.10.2025',.93],['custom','Kohandatud kuupäev…']],pl:[['none','Võrdlus puudub'],['spy','Sama periood eelmisel aastal','01.01.–07.10.2025',1],['pp','Eelmine periood','16.03.–31.12.2025',.96],['custom','Kohandatud periood…']]};
const MODE={bs:'asof',pl:'range',aging:'asof',dim:'range'};
const DEF={bs:{per:'today',cmp:'pye',zero:false},pl:{per:'ytd',cmp:'spy',zero:false},aging:{per:'today',dir:'receivable',overdue:false},dim:{per:'ytd',kind:'projects',status:'all',drafts:false}};
const S={rep:'bs',f:JSON.parse(JSON.stringify(DEF)),sel:null,view:null,pop:null};
const VKEY='arvelo.reports.views';
let VIEWS=JSON.parse(localStorage.getItem(VKEY)||'null')||[{id:'v1',name:'Kvartali bilanss',rep:'bs',f:{per:'pq',cmp:'sdly',zero:false},shared:true},{id:'v2',name:'Ostjad üle tähtaja',rep:'aging',f:{per:'today',dir:'receivable',overdue:true},shared:true},{id:'v3',name:'Pooleli projektid + mustandid',rep:'dim',f:{per:'ytd',kind:'projects',status:'in_progress',drafts:true},shared:false}];
const saveViews=()=>localStorage.setItem(VKEY,JSON.stringify(VIEWS));
const F=()=>S.f[S.rep];
const preset=()=>(MODE[S.rep]==='asof'?ASOF:RANGE).find(p=>p[0]===F().per);
const cmpOpt=()=>CMP[S.rep]?.find(c=>c[0]===F().cmp);
const k=()=>preset()[3];

function density(){const m=localStorage.getItem('arvelo.density')||'auto';document.body.classList.toggle('compact',m==='compact'||(m==='auto'&&(innerWidth<1680||innerHeight<860)))}
addEventListener('resize',density);density();

/* ---------- report builders: one row model for screen + print ---------- */
function build(){
  const r=S.rep,f=F(),K=k();
  if(r==='bs'||r==='pl'){
    const cmp=f.cmp!=='none'&&f.cmp!=='custom'?cmpOpt():null,CK=cmp?cmp[3]:0;
    const cols=[{l:'Konto'},{l:preset()[2].length>10?'Periood':preset()[2],n:1}];if(cmp)cols.push({l:cmp[2],n:1},{l:'Muutus',n:1},{l:'%',n:1,w:'64px',pct:1});
    const vals=(v,cv)=>cmp?[v,cv,v-cv,Math.abs(cv)>0.005?(v-cv)/Math.abs(cv)*100:null]:[v];
    const rows=[];const L=(l,g)=>({t:'ln',key:(l.c||l.n),c:l.c,n:l.special?l.n+' (arvutuslik)':l.n,v:vals(l.v*K,l.cv*CK),zero:Math.abs(l.v)<0.005&&Math.abs(l.cv)<0.005,acc:l,grp:g});
    const gs=g=>[g.lines.reduce((s,l)=>s+l.v,0)*K,g.lines.reduce((s,l)=>s+l.cv,0)*CK];
    if(r==='bs'){
      const block=(arr,tot)=>{let a=0,b=0;arr.forEach(g=>{rows.push({t:'grp',n:g.t});g.lines.forEach(l=>rows.push(L(l,g.t)));const[x,y]=gs(g);a+=x;b+=y;rows.push({t:'tot',n:g.t+' kokku',v:vals(x,y)})});return[a,b]};
      rows.push({t:'sec',n:'Varad'});const A=block(BS.assets);rows.push({t:'gr',n:'Varad kokku',v:vals(...A)});
      rows.push({t:'sec',n:'Kohustised ja omakapital'});const Lb=block(BS.liab);rows.push({t:'tot',n:'Kohustised kokku',v:vals(...Lb)});
      const E=block(BS.equity);rows.push({t:'gr',n:'Kohustised ja omakapital kokku',v:vals(Lb[0]+E[0],Lb[1]+E[1])});
      const diff=A[0]-(Lb[0]+E[0]);return {cols,rows,cmp,check:{ok:Math.abs(diff)<0.01,diff},totals:{a:A[0],l:Lb[0],e:E[0]}};
    }
    let run=[0,0];const add=g=>{const t=gs(g);run=[run[0]+t[0],run[1]+t[1]];return t};
    const grp=g=>{rows.push({t:'grp',n:g.t});g.lines.forEach(l=>rows.push(L(l,g.t)));const t=add(g);if(g.lines.length>1)rows.push({t:'tot',n:g.t+' kokku',v:vals(...t)})};
    PL.filter(g=>g.side==='rev').forEach(grp);const rev=[...run];
    PL.filter(g=>g.side==='exp').forEach(grp);rows.push({t:'res',n:'Ärikasum (-kahjum)',v:vals(...run)});
    PL.filter(g=>g.side==='fin').forEach(grp);rows.push({t:'res',n:'Kasum (kahjum) enne tulumaksu',v:vals(...run)});
    PL.filter(g=>g.side==='tax').forEach(grp);rows.push({t:'res',n:'Aruandeaasta kasum (kahjum)',v:vals(...run)});
    return {cols,rows,cmp,totals:{rev:rev[0],exp:run[0]-rev[0],net:run[0]}};
  }
  if(r==='aging'){
    const P=AGING[f.dir].map(p=>({...p,b:p.b.map(x=>x*K),total:p.total*K})).filter(p=>!f.overdue||p.total-p.b[0]>0.005);
    const cols=[{l:f.dir==='receivable'?'Ostja':'Tarnija'},{l:'Tähtaeg ees',n:1,w:'112px'},{l:'1–30 p',n:1,w:'104px'},{l:'31–60 p',n:1,w:'104px'},{l:'61–90 p',n:1,w:'104px'},{l:'Üle 90 p',n:1,w:'104px'},{l:'Kokku',n:1,w:'120px'}];
    const sum=[0,0,0,0,0];P.forEach(p=>p.b.forEach((x,i)=>sum[i]+=x));const tot=sum.reduce((s,x)=>s+x,0);
    const rows=P.map(p=>({t:'ln',key:p.id,n:p.name,sub:p.inv.length+' arvet',v:[...p.b,p.total],bucket:1,p}));rows.push({t:'gr',n:'Kokku',v:[...sum,tot]});
    return {cols,rows,sum,tot};
  }
  const kind=f.kind,arr=DIM[kind==='projects'?'projects':'cost_centers'].filter(d=>kind!=='projects'||f.status==='all'||d.status===f.status);
  const cols=[{l:kind==='projects'?'Projekt':'Kulukoht'},{l:'Tulud',n:1},{l:'Kulud',n:1},{l:'Tulem',n:1},{l:'Marginaal',n:1,w:'84px',pct:1}];if(kind==='projects')cols.push({l:'Lõpetamata tööd',n:1});
  const T=[0,0,0,0];let dr=0,dc=0;
  const rows=arr.map(d=>{const rev=d.rev*K+(f.drafts?d.drev:0),cost=d.costs*K+(f.drafts?d.dcost:0),res=rev-cost;T[0]+=rev;T[1]+=cost;T[2]+=res;T[3]+=d.wip||0;if(f.drafts){dr+=d.drev;dc+=d.dcost}
    const v=[rev,-cost,res,rev>0?res/rev*100:null];if(kind==='projects')v.push(d.wip||0);return {t:'ln',key:d.id,c:d.code,n:d.name,sub:d.partner,status:d.status,done:d.done,v,d,dim:1}});
  const tv=[T[0],-T[1],T[2],T[0]?T[2]/T[0]*100:null];if(kind==='projects')tv.push(T[3]);rows.push({t:'gr',n:'Kokku',v:tv});
  return {cols,rows,T,dr,dc};
}

/* ---------- rendering ---------- */
const KW={pl:'kasum kahjum tulud kulud tulemiaruanne p&l',bs:'bilanss varad kohustised omakapital',tb:'proovibilanss saldod',to:'käibeandmik käive deebet kreedit',gl:'pearaamat konto kanded',kmd:'kmd käibemaks km inf deklaratsioon emta',aging:'aegumine võlg võlgnevused laekumata ostjad tarnijad tähtaeg',ps:'partner kontokaart väljavõte saldokinnitus',dim:'kulukoht projekt dimensioon tulem marginaal',ar:'majandusaasta aruanne aastaaruanne'};
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
let RQ='',RI=0;
function railMatches(){const q=norm(RQ.trim());const out=[];
  NAV.forEach(([g,items])=>{const its=items.filter(([id,l])=>!q||norm(l+' '+g+' '+(KW[id]||'')).includes(q));if(its.length)out.push({g,items:its})});
  const views=VIEWS.filter(v=>!q||norm(v.name+' '+RNAME[v.rep]).includes(q));return {out,views,q}}
function renderRailList(){const {out,views,q}=railMatches();let n=0;const hl=s=>{if(!q)return esc(s);const i=norm(s).indexOf(q);return i<0?esc(s):esc(s.slice(0,i))+'<mark>'+esc(s.slice(i,i+q.length))+'</mark>'+esc(s.slice(i+q.length))};
  const flat=[];
  let h=out.map(({g,items})=>`<div class="rg">${g}</div>${items.map(([id,l,on])=>{if(on===0)return `<button class="ri off" title="Järgmises etapis · sama kest"><span class="t">${hl(l)}</span></button>`;const k=flat.length;flat.push({rep:id});return `<button class="ri ${S.rep===id&&!S.view?'on':''} ${q&&k===RI?'kb':''}" data-rep="${id}"><span class="t">${hl(l)}</span></button>`}).join('')}`).join('');
  if(views.length)h+=`<div class="rg">Salvestatud vaated</div>${views.map(v=>{const k=flat.length;flat.push({view:v.id});return `<button class="ri rv ${S.view===v.id?'on':''} ${q&&k===RI?'kb':''}" data-view="${v.id}"><span class="t">${hl(v.name)}</span><span class="d">${RNAME[v.rep]}${v.shared?' · kõigile':' · ainult mina'}</span></button>`}).join('')}`;
  if(!out.length&&!views.length)h=`<div class="rnone">Aruannet „${esc(RQ)}“ ei leitud</div>`;
  $('rlist').innerHTML=h;$('rlist')._flat=flat}
function renderRail(){
  if(!$('rlist'))$('rail').innerHTML=`<div class="rh">Aruanded</div><div class="rsearch">${ic('search')}<input id="rq" placeholder="Otsi aruannet" autocomplete="off" /><kbd>/</kbd></div><div class="rs" id="rlist"></div><div class="rf">${COMPANY.name} · aruandeaasta 2026</div>`;
  renderRailList();
}
function dirty(){const v=VIEWS.find(x=>x.id===S.view);return v&&JSON.stringify(v.f)!==JSON.stringify(F())}
function renderTop(B){
  const v=VIEWS.find(x=>x.id===S.view);
  $('title').textContent=v?v.name:RNAME[S.rep];
  const p=preset();$('sub').textContent=(v?RNAME[S.rep]+' · ':'')+(MODE[S.rep]==='asof'?'seisuga '+p[2]:p[2]);
  let m=[];
  if(S.rep==='bs')m=[['Varad',fE(B.totals.a)],['Kohustised',fE(B.totals.l)],['Omakapital',fE(B.totals.e)]];
  if(S.rep==='pl')m=[['Tulud',fE(B.totals.rev)],['Kulud',fE(B.totals.exp)],['Kasum',fE(B.totals.net),B.totals.net>=0?'pos':'neg']];
  if(S.rep==='aging'){const od=B.tot-B.sum[0];m=[['Avatud',fE(B.tot)],['Üle tähtaja',fE(od),od>0?'warn':''],['Üle 90 p',fE(B.sum[4]),B.sum[4]>0?'neg':'']]}
  if(S.rep==='dim')m=[['Tulud',fE(B.T[0])],['Kulud',fE(-B.T[1])],['Tulem',fE(B.T[2]),B.T[2]>=0?'pos':'neg']];
  $('metrics').innerHTML=m.map(([a,b,c])=>`<div class="metric ${c||''}"><span class="k">${a}</span><span class="v mono">${b}</span></div>`).join('');
  $('acts').innerHTML=`<button class="btn" data-pop="save">${ic('star')} ${v?'Vaade':'Salvesta vaade'}</button>
  <button class="btn" data-act="print">${ic('print')} Prindi</button>
  <button class="btn" data-pop="exp">${ic('dl')} Ekspordi ${ic('chev','font-size:11px')}</button>
  <div class="pop" id="pop-save" ${S.pop==='save'?'':'hidden'} style="left:auto;right:0;width:270px">${v?`<div class="lbl">Vaade</div><input class="inp" id="vname" value="${esc(v.name)}" /><label class="chk" style="margin-top:8px"><input type="checkbox" id="vshared" ${v.shared?'checked':''} /> Näita kõigile kasutajatele</label><div class="popfoot"><button class="btn sm ghost" data-act="vdel" style="color:var(--neg)">Kustuta</button><span class="hint"></span><button class="btn sm primary" data-act="vupd">Salvesta muudatused</button></div>`:`<div class="lbl">Uus vaade</div><input class="inp" id="vname" placeholder="nt Kuu lõpu bilanss" /><label class="chk" style="margin-top:8px"><input type="checkbox" id="vshared" /> Näita kõigile kasutajatele</label><div class="popfoot"><span class="hint">Salvestab perioodi, võrdluse ja filtrid</span><button class="btn sm primary" data-act="vsave">Salvesta</button></div>`}</div>
  <div class="menu" id="pop-exp" ${S.pop==='exp'?'':'hidden'} style="top:34px;right:0"><button class="mitem" data-act="xlsx"><span>Excel (.xlsx)<span class="d">Valemid ja vahesummad säilivad</span></span></button><button class="mitem" data-act="csv"><span>CSV<span class="d">Ainult read, ilma vormindamiseta</span></span></button><button class="mitem" data-act="pdf"><span>PDF<span class="d">Sama mis prindivaade</span></span></button></div>`;
}
function renderFilters(){
  const f=F(),md=MODE[S.rep],P=md==='asof'?ASOF:RANGE,p=preset();
  let h=`<div class="rel"><button class="perbtn" data-pop="per">${ic('cal')} ${md==='asof'?'Seisuga':'Periood'} <b class="mono">${p[0]==='ytd'||p[0]==='today'?p[1]:p[2]}</b> ${ic('chev','font-size:11px')}</button>
  <div class="pop" id="pop-per" ${S.pop==='per'?'':'hidden'}><div class="lbl">${md==='asof'?'Seisuga':'Periood'}</div><div class="presets">${P.map(x=>`<button class="${x[0]===f.per?'on':''}" data-per="${x[0]}" title="${x[2]}">${x[1]}</button>`).join('')}</div><div class="lbl" style="margin:10px 0 6px">Kohandatud</div><div class="dates ${md==='asof'?'one':''}">${md==='asof'?`<input class="inp mono" placeholder="pp.kk.aaaa" value="${p[2]}" />`:`<input class="inp mono" placeholder="pp.kk.aaaa" value="${p[2].split(' – ')[0]}" /><input class="inp mono" placeholder="pp.kk.aaaa" value="${p[2].split(' – ')[1]}" />`}</div><div class="popfoot"><span class="hint">${p[2]}</span><button class="btn sm primary" data-act="closepop">Rakenda</button></div></div></div>`;
  if(CMP[S.rep]){const c=cmpOpt();h+=`<div class="rel"><button class="perbtn ${f.cmp!=='none'?'on':''}" data-pop="cmp">${ic('cmp')} ${f.cmp==='none'?'Võrdlus':'vs <b class="mono">'+esc(c[2]||c[1])+'</b>'} ${ic('chev','font-size:11px')}</button>
  <div class="menu" id="pop-cmp" ${S.pop==='cmp'?'':'hidden'} style="top:34px;left:0;width:250px">${CMP[S.rep].map(x=>`<button class="mitem" data-cmp="${x[0]}" style="${x[0]===f.cmp?'color:var(--text);font-weight:600':''}"><span>${x[1]}${x[2]?`<span class="d mono">${x[2]}</span>`:''}</span></button>`).join('')}</div></div>
  <label class="chk"><input type="checkbox" data-tog="zero" ${f.zero?'checked':''} /> Näita nullsaldoga kontosid</label>`}
  if(S.rep==='aging')h+=`<div class="seg"><button class="${f.dir==='receivable'?'on':''}" data-set="dir:receivable">Ostjad</button><button class="${f.dir==='payable'?'on':''}" data-set="dir:payable">Tarnijad</button></div><label class="chk"><input type="checkbox" data-tog="overdue" ${f.overdue?'checked':''} /> Ainult üle tähtaja</label>`;
  if(S.rep==='dim')h+=`<div class="seg"><button class="${f.kind==='projects'?'on':''}" data-set="kind:projects">Projektid</button><button class="${f.kind==='cost_centers'?'on':''}" data-set="kind:cost_centers">Kulukohad</button></div>${f.kind==='projects'?`<div class="seg">${[['all','Kõik'],['in_progress','Pooleli'],['completed','Lõpetatud']].map(([a,b])=>`<button class="${f.status===a?'on':''}" data-set="status:${a}">${b}</button>`).join('')}</div>`:''}<label class="chk"><input type="checkbox" data-tog="drafts" ${f.drafts?'checked':''} /> Kaasa mustandarved</label>`;
  if(dirty())h+=`<span class="sp"></span><span class="dirty">Vaade muudetud · <a data-act="vupd">Salvesta</a> · <a data-act="vreset">Taasta</a></span>`;
  $('railrow').innerHTML=h;
}
function cellFmt(v,c,row){if(v==null)return '<span class="zero">–</span>';if(c.pct)return `<span class="${v>0.05?'dpos':v<-0.05?'dneg':'mut'}">${v>0?'+':v<0?'−':''}${Math.abs(v).toLocaleString('et-EE',{maximumFractionDigits:1})}%</span>`;
  if(Math.abs(v)<0.005)return '<span class="zero">–</span>';return `<span class="${row.bucket&&v>0.005?'':''}">${fN(v)}</span>`}
function visCols(B){const w=$('report').clientWidth-14;if(w<=0)return B.cols;let cols=B.cols.slice();const need=()=>cols.reduce((s,c,i)=>s+(i===0?240:parseInt(c.w||'128px')),0);while(need()>w&&cols.length>2){const i=cols.findIndex(c=>c.pct);if(i>0){cols.splice(i,1);continue}if(cols.length>4){cols.splice(cols.length-2,1);continue}break}return cols}
function renderReport(B){
  const f=F(),cols=visCols(B),idx=cols.map(c=>B.cols.indexOf(c)-1);
  const rc=cols.map((c,i)=>i===0?'minmax(240px,1fr)':(c.w||'128px')).join(' ');
  let head='';
  if(S.rep==='aging'){const P=['b0','b1','b2','b3','b4'];head=`<b>${B.rows.length-1} partnerit</b><div class="bucketbar">${B.sum.map((x,i)=>`<i style="width:${B.tot?x/B.tot*100:0}%;background:var(--${P[i]})"></i>`).join('')}</div><div class="legend">${['Tähtaeg ees','1–30','31–60','61–90','90+'].map((l,i)=>`<span><span class="dot" style="background:var(--${P[i]})"></span>${l}</span>`).join('')}</div><div class="r">Summad eurodes</div>`}
  else if(S.rep==='dim')head=`<b>${B.rows.length-1} ${f.kind==='projects'?'projekti':'kulukohta'}</b><span style="color:var(--text-3)">· pearaamatu kannete dimensioonidest</span><div class="r">${f.drafts&&(B.dr||B.dc)?`<span style="color:#7d5a13">sh mustandid: tulud ${fE(B.dr)}, kulud ${fE(B.dc)}</span>`:''}<span>Summad eurodes</span></div>`;
  else head=`<b>${S.rep==='bs'?'Bilanss':'Kasumiaruanne'}</b><span style="color:var(--text-3)">· ${S.rep==='bs'?'seisuga '+preset()[2]:preset()[2]}${B.cmp?' · võrdlus '+B.cmp[2]:''}</span><div class="r"><span style="color:var(--text-3)">Klõps kontol avab pearaamatu</span><span>Summad eurodes</span></div>`;
  const rowH=r=>{const cls=['rr',r.t,r.zero?'zr':'',r.t==='ln'?'':'' ,S.sel===r.key&&r.t==='ln'?'on':''].join(' ');
    let first;
    if(r.t==='ln'){if(r.dim)first=`<div class="acc"><span class="code mono" style="width:44px">${esc(r.c)}</span><span class="nm">${esc(r.n)}${r.sub?`<small>${esc(r.sub)}</small>`:''}${r.status?` <span class="tag ${r.status==='completed'?'ok':'info'}">${r.status==='completed'?'Lõpetatud '+dstr(r.done).slice(0,5):'Pooleli'}</span>`:''}</span></div>`;
      else if(r.bucket)first=`<div class="acc" style="padding-left:0"><span class="nm" style="font-weight:600">${esc(r.n)}<small>${r.sub}</small></span></div>`;
      else first=`<div class="acc"><span class="code mono">${esc(r.c||'')}</span><span class="nm">${esc(r.n)}</span></div>`}
    else first=`<div class="acc">${esc(r.n)}</div>`;
    if(r.t==='sec'||r.t==='grp')return `<div class="${cls}">${first}${cols.slice(1).map(()=>'<div></div>').join('')}</div>`;
    const ln=r.t==='ln';
    return `<div class="${cls}${ln?' ln':''}" ${ln?`data-row="${esc(r.key)}"`:''}>${first}${cols.slice(1).map((c,i)=>{const v=r.v[idx[i+1]];const neg=c.l==='Tulem'&&v<0;let style='';if(r.bucket&&idx[i+1]>=1&&idx[i+1]<=4&&v>0.005)style=` style="color:var(--b${idx[i+1]})"`;return `<div class="n mono ${neg?'neg':''}"${style}>${cellFmt(v,c,r)}</div>`}).join('')}</div>`};
  const check=B.check?`<div class="check ${B.check.ok?'ok':'bad'}">${ic(B.check.ok?'ok':'warn')}<span>${B.check.ok?'Bilanss on tasakaalus: varad = kohustised + omakapital':'Bilanss ei ole tasakaalus · vahe '+fE(B.check.diff)}</span><span class="r">Aruandeaasta kasum tuleb kasumiaruandest · <a data-rep="pl">ava</a></span></div>`:'';
  $('report').innerHTML=`<div class="listhead">${head}</div><div class="tscroll ${f.zero?'showzero':''}"><div class="rt" style="--rc:${rc}"><div class="rhd">${cols.map(c=>`<div class="${c.n?'n':''}">${esc(c.l)}</div>`).join('')}</div>${B.rows.map(rowH).join('')}</div></div>${check}`;
}

function ledger(acc){let seed=0;for(const ch of acc.c||acc.n)seed=(seed*31+ch.charCodeAt(0))%9973;const r=rng(seed+11);const close=acc.v*k();const open=acc.cv*0.7;const n=6+Math.floor(r()*6);const diff=close-open;const rows=[];let bal=open;
  const docs=['Müügiarve 258','Ostuarve AR-','Pangatehing ','Palgaarvestus 0','Kanne MK-'];
  for(let i=0;i<n;i++){const last=i===n-1;let amt=last?close-bal:r2((diff/n)*(0.4+r()*1.2)+(r()-.5)*Math.abs(diff)*0.15);const d=amt>=0?amt:0,c=amt<0?-amt:0;bal+=amt;const di=Math.floor(r()*docs.length);rows.push({date:addD(TODAY,-Math.floor((n-i)*(MODE[S.rep]==='asof'?18:22))),doc:docs[di]+(di===3?(4+Math.floor(r()*5))+'/2026':(10+Math.floor(r()*89))),desc:['Arve tasumine','Kauba ost','Teenuse müük','Kulumi arvestus','Korrigeerimine','Laekumine'][Math.floor(r()*6)],d,c,bal})}
  return {open,close,rows,d:rows.reduce((s,x)=>s+x.d,0),c:rows.reduce((s,x)=>s+x.c,0)}}

function renderDrill(B){
  const body=$('body');const row=B.rows.find(r=>r.t==='ln'&&r.key===S.sel);
  body.classList.toggle('drill',!!row);if(!row){$('drill').innerHTML='';return}
  const x=`<button class="btn sm ghost" data-act="close" title="Sulge (Esc)">${ic('x')}</button>`;
  if(row.acc){const L=ledger(row.acc);
    $('drill').innerHTML=`<div class="dhead"><div class="drow"><div class="tt"><h2><span class="mono" style="color:var(--text-3);font-weight:600">${esc(row.c)}</span> ${esc(row.acc.n)}</h2><div class="line">Pearaamat · ${MODE[S.rep]==='asof'?'01.01.2026 – '+preset()[2]:preset()[2]} · ${esc(row.grp)}</div></div>${x}</div></div>
    <div class="dbody"><div class="sec"><div class="strip"><div><div class="k">Algsaldo</div><div class="v mono">${fN(L.open)}</div></div><div><div class="k">Deebet</div><div class="v mono">${fN(L.d)}</div></div><div><div class="k">Kreedit</div><div class="v mono">${fN(L.c)}</div></div><div><div class="k">Lõppsaldo</div><div class="v mono">${fN(L.close)}</div></div></div></div>
    <div class="sec" style="border-bottom:none"><div class="sech">Kanded · ${L.rows.length}<span class="r"><a data-act="gl">Ava pearaamatus ${ic('ext','font-size:10px')}</a></span></div>
    <div class="lines" style="--lc:66px minmax(0,1fr) 74px 74px 80px"><div class="lhead"><div>Kuupäev</div><div>Dokument</div><div class="r">Deebet</div><div class="r">Kreedit</div><div class="r">Saldo</div></div>
    <div class="lrow ob"><div></div><div>Algsaldo</div><div></div><div></div><div class="a mono">${fN(L.open)}</div></div>
    ${L.rows.map(t=>`<div class="lrow"><div class="mono">${dstr(t.date).slice(0,5)}</div><div><a>${esc(t.doc)}</a><span class="s">${esc(t.desc)}</span></div><div class="r mono">${t.d?nf(t.d):''}</div><div class="r mono">${t.c?nf(t.c):''}</div><div class="a mono">${fN(t.bal)}</div></div>`).join('')}
    <div class="lrow ob"><div></div><div>Lõppsaldo</div><div class="r mono">${nf(L.d)}</div><div class="r mono">${nf(L.c)}</div><div class="a mono">${fN(L.close)}</div></div></div></div></div>
    <div class="dfoot"><span class="hint">↑↓ järgmine konto · Esc sulgeb</span><div class="r"><button class="btn" data-act="gl">${ic('ext')} Ava pearaamatus</button></div></div>`;return}
  if(row.p){const p=row.p,f=F(),K=k();const od=p.total-p.b[0],old=Math.max(0,...p.inv.map(i=>i.od));
    $('drill').innerHTML=`<div class="dhead"><div class="drow"><div class="tt"><h2>${esc(p.name)}</h2><div class="line">${f.dir==='receivable'?'Ostja':'Tarnija'} · seisuga ${preset()[2]} · ${p.inv.length} avatud arvet</div></div>${x}</div></div>
    <div class="dbody"><div class="sec"><div class="strip c3"><div><div class="k">Avatud</div><div class="v mono">${fE(p.total)}</div></div><div><div class="k">Üle tähtaja</div><div class="v mono" style="${od>0?'color:var(--warn)':''}">${fE(od)}</div></div><div><div class="k">Vanim</div><div class="v mono" style="${old>90?'color:var(--neg)':''}">${old>0?old+' p':'–'}</div></div></div></div>
    <div class="sec" style="border-bottom:none"><div class="sech">Avatud arved</div><div class="lines" style="--lc:minmax(0,1fr) 78px 62px 90px"><div class="lhead"><div>Arve</div><div>Tähtaeg</div><div class="r">Üle</div><div class="r">Avatud</div></div>
    ${p.inv.map(i=>`<div class="lrow"><div><a>${f.dir==='receivable'?'Müügiarve':'Ostuarve'} ${esc(i.nr)}</a><span class="s mono">${dstr(i.date)}</span></div><div class="mono">${dstr(i.due)}</div><div class="r mono" style="color:${i.od>90?'var(--b4)':i.od>60?'var(--b3)':i.od>30?'var(--b2)':i.od>0?'var(--b1)':'var(--text-3)'};font-weight:600">${i.od>0?i.od+' p':'–'}</div><div class="a mono">${nf(i.amt*K)}</div></div>`).join('')}</div></div></div>
    <div class="dfoot"><button class="btn" data-act="ps">Partneri kontokaart</button><div class="r">${f.dir==='receivable'&&od>0?`<button class="btn primary" data-act="remind">${ic('mail')} Saada meeldetuletus</button>`:f.dir==='payable'&&od>0?`<button class="btn primary" data-act="batch">Lisa maksepaketti</button>`:''}</div></div>`;return}
  const d=row.d,f=F(),K=k();const rev=row.v[0],cost=-row.v[1];
  const accT=(arr,s)=>arr.map(a=>`<div class="lrow"><div><span class="mono" style="color:var(--text-3)">${a.c}</span> ${esc(a.n)}</div><div class="a mono">${s}${nf(a.v*K)}</div></div>`).join('');
  $('drill').innerHTML=`<div class="dhead"><div class="drow"><div class="tt"><h2><span class="mono" style="color:var(--text-3);font-weight:600">${esc(d.code)}</span> ${esc(d.name)}</h2><div class="line">${d.partner?esc(d.partner)+' · ':''}${preset()[2]}${d.status?' · '+(d.status==='completed'?'lõpetatud '+dstr(d.done):'pooleli'):''}</div></div>${x}</div></div>
  <div class="dbody"><div class="sec"><div class="strip ${d.wip!=null&&f.kind==='projects'?'':'c3'}"><div><div class="k">Tulud</div><div class="v mono">${fN(rev)}</div></div><div><div class="k">Kulud</div><div class="v mono">${fN(-cost)}</div></div><div><div class="k">Tulem</div><div class="v mono" style="color:${rev-cost>=0?'var(--pos)':'var(--neg)'}">${fN(rev-cost)}</div></div>${f.kind==='projects'?`<div><div class="k">Lõpet. tööd</div><div class="v mono">${fN(d.wip||0)}</div></div>`:''}</div>${f.drafts&&(d.drev||d.dcost)?`<div style="margin-top:6px;font-size:11px;color:#7d5a13">sh mustandarved: tulud ${fE(d.drev)}, kulud ${fE(d.dcost)}</div>`:''}</div>
  <div class="sec"><div class="sech">Kontode kaupa</div><div class="lines" style="--lc:minmax(0,1fr) 96px">${d.byRev.length?`<div class="lhead"><div>Tulud</div><div></div></div>${accT(d.byRev,'')}`:''}<div class="lhead"><div>Kulud</div><div></div></div>${accT(d.byCost,'−')}</div></div>
  <div class="sec" style="border-bottom:none"><div class="sech">Dokumendid · ${d.lines.length}</div><div class="lines" style="--lc:56px minmax(0,1fr) 90px">${d.lines.map(l=>`<div class="lrow"><div class="mono">${dstr(l.date).slice(0,5)}</div><div><a>${l.kind==='rev'?'Müügiarve':'Ostuarve'} ${esc(l.nr)}</a><span class="s">${esc(l.partner)}</span></div><div class="a mono" style="${l.kind==='rev'?'color:var(--pos)':''}">${l.kind==='rev'?'+':'−'}${nf(l.amt)}</div></div>`).join('')}</div></div></div>
  <div class="dfoot"><span class="hint">↑↓ järgmine · Esc sulgeb</span><div class="r"><button class="btn" data-act="gl">${ic('ext')} Ava pearaamatus</button></div></div>`;
}

const SBI={home:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',inv:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',bank:'<path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M2 21h20M12 3l9 5H3z"/>',pay:'<path d="M3 7h18v12H3zM16 13h2"/><path d="M3 7l3-4h12l3 4"/>',gl:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 8h6M9 12h6"/>',rep:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',fa:'<path d="M21 8l-9-5-9 5 9 5zM3 8v8l9 5 9-5V8"/>',set:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>'};
const SBN=[['home','Töölaud',0],['inv','Arvete keskus',1],['bank','Pank',1],['pay','Palgaarvestus',1],['gl','Pearaamat',1],['rep','Aruanded',0],['fa','Põhivara',0],['set','Seaded',0]];
let SBW=false;
function renderSidebar(){$('sb').className='sb'+(SBW?' wide':'');$('sb').innerHTML=`<div class="brand"><span class="logo">A</span><span class="bn">Arvelo</span><button class="tg" data-sb="collapse" title="Ahenda">${ic('chev','transform:rotate(90deg)')}</button></div>
<nav>${SBN.map(([k,l,sub])=>`<button class="it ${k==='rep'?'on':''}" title="${l}" data-sbi="${k}"><svg class="i" viewBox="0 0 24 24">${SBI[k]}</svg><span class="lb">${l}</span>${sub?`<span class="cv">${ic('chev','transform:rotate(-90deg)')}</span>`:''}</button>`).join('')}</nav>
<button class="exp" data-sb="expand" title="Laienda menüü">${ic('chev','transform:rotate(-90deg)')}</button>
<div class="user"><span class="av">PS</span><span>Peeter Salmu</span></div>`}
let B;
function render(){renderSidebar();B=build();renderRail();renderTop(B);renderFilters();renderReport(B);renderDrill(B)}

/* ---------- print preview ---------- */
function printView(){
  const f=F(),p=preset(),cmp=B.cmp;let codes=true,sign=S.rep==='bs'||S.rep==='pl';
  const draw=()=>{const cols=B.cols;
    const tr=r=>{if(r.t==='sec'||r.t==='grp')return `<tr class="${r.t}"><td colspan="${cols.length}">${esc(r.n)}</td></tr>`;if(r.zero&&!f.zero)return '';
      const nm=r.t==='ln'?`${codes&&r.c?`<span class="code">${esc(r.c)}</span>`:''}${esc(r.n)}${r.sub&&r.dim?` <span style="color:#888">· ${esc(r.sub)}</span>`:''}`:esc(r.n);
      return `<tr class="${r.t}"><td>${nm}</td>${r.v.map((v,i)=>`<td>${v==null?'–':cols[i+1].pct?(v>0?'+':v<0?'−':'')+Math.abs(v).toLocaleString('et-EE',{maximumFractionDigits:1})+'%':fN(v)}</td>`).join('')}</tr>`};
    $('pv').innerHTML=`<div class="pvbar"><b>Prindivaade</b><span style="color:var(--text-3);font-size:12px">${RNAME[S.rep]} · A4</span><label class="chk"><input type="checkbox" id="pcodes" ${codes?'checked':''} /> Kontokoodid</label>${S.rep==='bs'||S.rep==='pl'?`<label class="chk"><input type="checkbox" id="psign" ${sign?'checked':''} /> Allkirjaväljad</label>`:''}<div class="r"><button class="btn" data-pv="close">Sulge <kbd>Esc</kbd></button><button class="btn primary" data-pv="print">${ic('print')} Prindi / salvesta PDF</button></div></div>
    <div class="pvscroll"><div class="sheet"><div class="co"><div><b>${COMPANY.name}</b>Registrikood ${COMPANY.reg} · KMKR ${COMPANY.vat}<br />${COMPANY.addr}</div><div style="text-align:right">Koostatud ${dstr(TODAY)}<br />Kadri Tamm</div></div>
    <h2>${RNAME[S.rep]}${S.rep==='aging'?' · '+(f.dir==='receivable'?'ostjad':'tarnijad'):S.rep==='dim'?' · '+(f.kind==='projects'?'projektid':'kulukohad'):''}</h2><div class="per">${MODE[S.rep]==='asof'?'Seisuga '+p[2]:'Periood '+p[2]}${cmp?' · võrdlus '+cmp[2]:''} · summad eurodes</div>
    <table><thead><tr>${cols.map(c=>`<th>${esc(c.l)}</th>`).join('')}</tr></thead><tbody>${B.rows.map(tr).join('')}</tbody></table>
    ${sign?`<div class="sign"><div>Juhatuse liige</div><div>Raamatupidaja</div></div>`:''}
    <div class="foot"><span>Arvelo · ${COMPANY.name}</span><span>lk 1 / 1</span></div></div></div>`;};
  draw();$('pv').hidden=false;
  $('pv').onclick=e=>{const a=e.target.closest('[data-pv]')?.dataset.pv;if(a==='close')$('pv').hidden=true;if(a==='print')window.print()};
  $('pv').onchange=e=>{if(e.target.id==='pcodes')codes=e.target.checked;if(e.target.id==='psign')sign=e.target.checked;draw()};
}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target,d=k=>t.closest(`[data-${k}]`);let el;
  if(t.closest('#pv'))return;
  if(el=d('sb')){SBW=el.dataset.sb==='expand';renderSidebar();setTimeout(()=>B&&renderReport(B),320);return}
  if(el=d('sbi')){if(el.dataset.sbi==='rep'){S.view=null;S.sel=null;render()}else toast(el.title+' · prototüübis ei ava');return}
  const inPop=t.closest('.pop,.menu');
  if(el=d('pop')){const n=el.dataset.pop;S.pop=S.pop===n?null:n;renderTop(B);renderFilters();if(S.pop==='save')setTimeout(()=>$('vname')?.focus(),0);return}
  if(!inPop&&S.pop){S.pop=null;renderTop(B);renderFilters()}
  if(el=d('rep')){S.rep=el.dataset.rep;S.view=null;S.sel=null;render();return}
  if(el=d('view')){const v=VIEWS.find(x=>x.id===el.dataset.view);S.rep=v.rep;S.f[v.rep]=JSON.parse(JSON.stringify(v.f));S.view=v.id;S.sel=null;render();return}
  if(el=d('per')){F().per=el.dataset.per;S.pop=null;render();return}
  if(el=d('cmp')){const c=el.dataset.cmp;if(c==='custom'){toast('Avab kuupäevavalija võrdluseks');return}F().cmp=c;S.pop=null;render();return}
  if(el=d('set')){const[a,b]=el.dataset.set.split(':');F()[a]=b;if(a==='dir'||a==='kind')S.sel=null;render();return}
  if(el=d('row')){S.sel=S.sel===el.dataset.row?null:el.dataset.row;render();return}
  if(!(el=d('act')))return;const a=el.dataset.act;
  if(a==='closepop'){S.pop=null;render()}
  else if(a==='close'){S.sel=null;render()}
  else if(a==='print'||a==='pdf'){S.pop=null;render();printView()}
  else if(a==='xlsx'||a==='csv'){S.pop=null;render();toast(`Laaditud alla: ${RNAME[S.rep].toLowerCase()}-${preset()[2].replace(/ – /,'_')}.${a}`)}
  else if(a==='vsave'){const n=$('vname').value.trim()||RNAME[S.rep]+' · '+preset()[1];const v={id:'v'+Date.now(),name:n,rep:S.rep,f:JSON.parse(JSON.stringify(F())),shared:$('vshared').checked};VIEWS.push(v);saveViews();S.view=v.id;S.pop=null;render();toast('Vaade salvestatud')}
  else if(a==='vupd'){const v=VIEWS.find(x=>x.id===S.view);if($('vname'))v.name=$('vname').value.trim()||v.name;if($('vshared'))v.shared=$('vshared').checked;v.f=JSON.parse(JSON.stringify(F()));saveViews();S.pop=null;render();toast('Vaade uuendatud')}
  else if(a==='vreset'){const v=VIEWS.find(x=>x.id===S.view);S.f[S.rep]=JSON.parse(JSON.stringify(v.f));render()}
  else if(a==='vdel'){VIEWS=VIEWS.filter(x=>x.id!==S.view);saveViews();S.view=null;S.pop=null;render();toast('Vaade kustutatud')}
  else if(a==='gl')toast('Avab pearaamatu: konto + sama periood');
  else if(a==='ps')toast('Avab partneri kontokaardi');
  else if(a==='remind')toast('Meeldetuletus saadetud');
  else if(a==='batch')toast('Avab maksepaketi koostamise (Maksepaketid)');
});
document.addEventListener('change',e=>{const g=e.target.dataset?.tog;if(g){F()[g]=e.target.checked;render()}});
document.addEventListener('input',e=>{if(e.target.id==='rq'){RQ=e.target.value;RI=0;renderRailList()}});
document.addEventListener('keydown',e=>{if(e.target.id==='rq'){const fl=$('rlist')._flat||[];
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(fl.length){RI=(RI+(e.key==='ArrowDown'?1:-1)+fl.length)%fl.length;renderRailList()}return}
    if(e.key==='Enter'){const m=fl[RQ.trim()?RI:0];if(m){const sel=m.rep?`[data-rep="${m.rep}"]`:`[data-view="${m.view}"]`;const b=$('rlist').querySelector(sel);RQ='';e.target.value='';e.target.blur();b&&b.click()}return}
    if(e.key==='Escape'){RQ='';e.target.value='';renderRailList();e.target.blur();return}return}
  if(e.key==='/'&&!e.target.matches('input')&&$('pv').hidden){e.preventDefault();$('rq').focus();return}
  if(e.target.matches('input')){if(e.key==='Enter'&&e.target.id==='vname')document.querySelector('[data-act=vsave],[data-act=vupd]')?.click();if(e.key==='Escape')e.target.blur();return}
  if(!$('pv').hidden){if(e.key==='Escape')$('pv').hidden=true;return}
  if(e.key==='Escape'){if(S.pop)S.pop=null;else S.sel=null;render();return}
  if((e.key==='ArrowDown'||e.key==='ArrowUp')&&S.sel){e.preventDefault();const L=B.rows.filter(r=>r.t==='ln'&&(!r.zero||F().zero));const i=L.findIndex(r=>r.key===S.sel);const n=L[Math.max(0,Math.min(L.length-1,i+(e.key==='ArrowDown'?1:-1)))];if(n){S.sel=n.key;render();const on=document.querySelector('.rr.on'),sc=document.querySelector('.tscroll');if(on&&sc&&(on.offsetTop<sc.scrollTop+32||on.offsetTop>sc.scrollTop+sc.clientHeight-30))sc.scrollTop=on.offsetTop-sc.clientHeight/2}}
  if(e.key==='p'&&(e.metaKey||e.ctrlKey)){e.preventDefault();printView()}});
(()=>{const g=$('gutter');let on=false;g.addEventListener('mousedown',e=>{on=true;e.preventDefault()});addEventListener('mousemove',e=>{if(!on)return;const w=Math.max(340,Math.min(innerWidth-620,innerWidth-e.clientX-16));document.documentElement.style.setProperty('--pw',w+'px')});addEventListener('mouseup',()=>{if(on){on=false;renderReport(B)}});g.addEventListener('dblclick',()=>{document.documentElement.style.removeProperty('--pw');renderReport(B)})})();
{let lw=-1;new ResizeObserver(()=>{const w=$('report').clientWidth;if(w!==lw){lw=w;if(B)renderReport(B)}}).observe($('report'))}
render();requestAnimationFrame(()=>requestAnimationFrame(()=>renderReport(B)));addEventListener('load',()=>renderReport(B));
