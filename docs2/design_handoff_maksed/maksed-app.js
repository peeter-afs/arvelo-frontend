const $=id=>document.getElementById(id);
const fmt=n=>n.toLocaleString('et-EE',{minimumFractionDigits:2,maximumFractionDigits:2})+'\u00a0€';
const fmtN=n=>n.toLocaleString('et-EE',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ibanF=s=>s?s.replace(/(.{4})/g,'$1 ').trim():'';
const ibanS=s=>s?s.slice(0,4)+' … '+s.slice(-4):'';
const ini=n=>n.replace(/\b(AS|OÜ|Ltd|Eesti)\b/g,'').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const av=n=>{let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%997;const p=PALET[h%PALET.length];return `<span class="av" style="background:${p[0]};color:${p[1]}">${esc(ini(n))}</span>`};
const I={up:'<path d="M7 17L17 7M8 7h9v9"/>',down:'<path d="M17 7L7 17M16 17H7V8"/>',chev:'<path d="M6 9l6 6 6-6"/>',l:'<path d="M15 18l-6-6 6-6"/>',r:'<path d="M9 18l6-6-6-6"/>',x:'<path d="M18 6L6 18M6 6l12 12"/>',plus:'<path d="M12 5v14M5 12h14"/>',search:'<path d="M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/>',cal:'<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',warn:'<path d="M12 8v4M12 16h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',ok:'<path d="M20 6L9 17l-5-5"/>',send:'<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',dl:'<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',more:'<path d="M5 12h.01M12 12h.01M19 12h.01"/>',ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',undo:'<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',stamp:'<path d="M5 22h14M19 18H5v-3a2 2 0 0 1 2-2h3l-1-5a3 3 0 1 1 6 0l-1 5h3a2 2 0 0 1 2 2z"/>',info:'<path d="M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/>',refresh:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'};
const ic=(k,st='')=>`<svg class="i" viewBox="0 0 24 24"${st?` style="${st}"`:''}>${I[k]}</svg>`;
const PST={draft:['Mustand','pend'],posted:['Konteeritud','ok'],reversed:['Tühistatud','void']};
const OIC={pinv:'file',payroll:'user',manual:'plus'};
const otag=b=>`<span class="otag ${b.origin}">${ic(OIC[b.origin])}${ORIGIN[b.origin][1]}</span>`;
const tag=(l,c)=>`<span class="tag ${c}"><span class="dot"></span>${esc(l)}</span>`;
function toast(m,err){const t=$('toast');t.textContent=m;t.className='toast on'+(err?' err':'');clearTimeout(t._h);t._h=setTimeout(()=>t.className='toast',2400)}

const S={mod:location.hash==='#paketid'?'batch':'pay',pst:'all',dir:'all',q:'',invChip:null,pSel:PAYMENTS[4].id,bst:'active',borig:'all',bq:'',bSel:'mb1',reversing:false,menu:null};
const BGROUP={active:['draft','generated','uploaded','sent','rejected'],done:['confirmed'],voided:['voided'],all:Object.keys(BSTAT)};
const bTotal=b=>b.lines.reduce((s,l)=>s+l.amount,0);

function density(){const m=localStorage.getItem('arvelo.density')||'auto';const c=m==='compact'||(m==='auto'&&(innerWidth<1680||innerHeight<860));document.body.classList.toggle('compact',c)}
addEventListener('resize',density);density();

function payList(){const q=S.q.toLowerCase();return PAYMENTS.filter(p=>(S.pst==='all'||p.status===S.pst)&&(S.dir==='all'||p.direction===S.dir)&&(!S.invChip||p.invoice===S.invChip)&&(!q||(p.partner+' '+p.invoice+' '+p.ref+' '+fmtN(p.amount)).toLowerCase().includes(q)))}
function batchList(){const q=S.bq.toLowerCase();return BATCHES.filter(b=>BGROUP[S.bst].includes(b.status)&&(S.borig==='all'||b.origin===S.borig)&&(!q||(b.name+' '+b.bank.name+' '+b.lines.map(l=>l.payee).join(' ')).toLowerCase().includes(q)))}

function renderTop(){
  const draftN=PAYMENTS.filter(p=>p.status==='draft').length,actN=BATCHES.filter(b=>['draft','rejected'].includes(b.status)).length;
  $('title').textContent=S.mod==='pay'?'Maksed':'Maksepaketid';
  $('modtabs').innerHTML=`<button class="modtab ${S.mod==='pay'?'on':''}" data-mod="pay">Maksed${draftN?`<span class="pill">${draftN}</span>`:''}</button><button class="modtab ${S.mod==='batch'?'on':''}" data-mod="batch">Maksepaketid${actN?`<span class="pill">${actN}</span>`:''}</button>`;
  let m;
  if(S.mod==='pay'){const live=PAYMENTS.filter(p=>p.status!=='reversed');m=[['Sissetulev',fmt(live.filter(p=>p.direction==='incoming').reduce((s,p)=>s+p.amount,0)),'pos'],['Väljaminev',fmt(live.filter(p=>p.direction==='outgoing').reduce((s,p)=>s+p.amount,0)),''],['Ootab konteerimist',String(draftN),draftN?'warn':'']]}
  else{const pend=BATCHES.filter(b=>['sent','uploaded','generated'].includes(b.status));m=[['Maksmisele',fmt(PAYABLE.reduce((s,p)=>s+p.open,0)),''],['Pangas ootel',fmt(pend.reduce((s,b)=>s+bTotal(b),0)),'warn'],['Täidetud 30 p',fmt(BATCHES.filter(b=>b.status==='confirmed').reduce((s,b)=>s+bTotal(b),0)),'pos']]}
  $('metrics').innerHTML=m.map(([k,v,c])=>`<div class="metric ${c}"><span class="k">${k}</span><span class="v mono">${v}</span></div>`).join('');
  $('acts').innerHTML=S.mod==='pay'?`<button class="btn" id="regbtn">${ic('plus')} Registreeri makse</button>`:`<button class="btn primary" id="newbatch">${ic('plus')} Uus maksepakett <kbd>N</kbd></button>`;
}

function renderRail(){
  if(S.mod==='pay'){
    const c=k=>PAYMENTS.filter(p=>k==='all'||p.status===k).length;
    $('railrow').innerHTML=`<div class="search">${ic('search')}<input id="q" value="${esc(S.q)}" placeholder="Otsi partnerit, arvet, summat  /" /></div>
    <div class="tabs">${[['all','Kõik'],['draft','Mustand'],['posted','Konteeritud'],['reversed','Tühistatud']].map(([k,l])=>`<button class="tab ${S.pst===k?'on':''}" data-pst="${k}">${l}<span class="pill ${k==='draft'&&c(k)?'w':''}">${c(k)}</span></button>`).join('')}</div>
    <div class="seg">${[['all','Kõik suunad'],['incoming','Sissetulev'],['outgoing','Väljaminev']].map(([k,l])=>`<button class="${S.dir===k?'on':''}" data-dir="${k}">${l}</button>`).join('')}</div>
    <button class="perbtn">${ic('cal')} Viimased 90 päeva ${ic('chev','font-size:11px')}</button>
    ${S.invChip?`<span class="fchip">Arve ${esc(S.invChip)}<button data-clearinv title="Eemalda filter">×</button></span>`:''}`;
  }else{
    const c=k=>BATCHES.filter(b=>BGROUP[k].includes(b.status)).length;
    $('railrow').innerHTML=`<div class="search">${ic('search')}<input id="q" value="${esc(S.bq)}" placeholder="Otsi paketti või saajat  /" /></div>
    <div class="tabs">${[['active','Pooleli'],['done','Täidetud'],['voided','Tühistatud'],['all','Kõik']].map(([k,l])=>`<button class="tab ${S.bst===k?'on':''}" data-bst="${k}">${l}<span class="pill">${c(k)}</span></button>`).join('')}</div>
    <div class="seg">${[['all','Kõik allikad'],['pinv','Ostuarved'],['payroll','Palk'],['manual','Käsitsi']].map(([k,l])=>`<button class="${S.borig===k?'on':''}" data-borig="${k}">${l}</button>`).join('')}</div>
    <button class="perbtn">Konto: kõik ${ic('chev','font-size:11px')}</button>`;
  }
}

const PCOLS=[['d','Kuupäev','84px'],['p','Partner · arve','minmax(200px,1.7fr)'],['dir','Suund','106px'],['src','Allikas','minmax(140px,1fr)'],['a','Summa','112px','r'],['s','Staatus','118px']];
const BCOLS=[['n','Pakett','minmax(200px,1.6fr)'],['o','Allikas','96px'],['bk','Pangakonto','minmax(130px,1fr)'],['ex','Täitmine','90px'],['ln','Ridu','52px','r'],['a','Summa','112px','r'],['s','Staatus','150px']];
const HIDE={pay:['src','dir'],batch:['bk','ln','o']};
function visCols(){const cols=S.mod==='pay'?PCOLS:BCOLS;const w=$('rows').parentElement.clientWidth;if(!w)return cols;const min=c=>parseInt(c[2].match(/\d+/)[0]);let v=cols.slice();for(const k of HIDE[S.mod]){if(v.reduce((s,c)=>s+min(c),0)+16<=w)break;v=v.filter(c=>c[0]!==k)}return v}

function renderList(){
  const cols=visCols();$('rows').parentElement.style.setProperty('--cols',cols.map(c=>c[2]).join(' '));
  $('thead').innerHTML=cols.map(c=>`<div class="${c[3]||''}">${c[1]}</div>`).join('');
  const ws=$('warnstrip');
  if(S.mod==='pay'){
    const L=payList();const live=L.filter(p=>p.status!=='reversed');const inn=live.filter(p=>p.direction==='incoming').reduce((s,p)=>s+p.amount,0),out=live.filter(p=>p.direction==='outgoing').reduce((s,p)=>s+p.amount,0);
    $('listhead').innerHTML=`<b>${L.length} makset</b><span style="color:var(--text-3)">· sorteeritud kuupäeva järgi</span><div class="r"><span>Sisse <b class="mono" style="color:var(--pos)">${fmt(inn)}</b></span><span>Välja <b class="mono">${fmt(out)}</b></span></div>`;
    const dr=PAYMENTS.filter(p=>p.status==='draft');ws.hidden=!dr.length||S.pst==='draft';
    ws.innerHTML=`${ic('warn')}<span>${dr.length} pangast imporditud makset ootab konteerimist · ${fmt(dr.reduce((s,p)=>s+p.amount,0))}</span><button class="btn sm primary" data-pst="draft">Vaata mustandeid</button>`;
    $('rows').innerHTML=L.length?L.map(p=>{const inc=p.direction==='incoming';const cell={
      d:`<div class="dt mono">${dstr(p.date)}</div>`,
      p:`<div><span class="cust">${av(p.partner)}<span class="nm"><span class="n1">${esc(p.partner)}</span><span class="n2">${p.invoiceType} <span class="mono">${esc(p.invoice)}</span></span></span></span></div>`,
      dir:`<div><span class="dir"><span class="ar ${inc?'in':'out'}">${ic(inc?'down':'up')}</span>${inc?'Sissetulev':'Väljaminev'}</span></div>`,
      src:`<div class="dt">${esc(p.src)}</div>`,
      a:`<div class="num mono ${inc?'in':''} ${p.status==='reversed'?'mut':''}">${inc?'+':'−'}${fmt(p.amount)}</div>`,
      s:`<div>${tag(...PST[p.status])}</div>`};
      return `<div class="trow ${p.id===S.pSel?'on':''}" data-pid="${p.id}">${cols.map(c=>cell[c[0]]).join('')}</div>`}).join(''):`<div class="empty">Selle filtriga makseid pole</div>`;
    $('tfoot').innerHTML=`<span>↑↓ liigu · Enter konteeri mustand</span><div class="r"><button class="btn sm ghost">${ic('dl')} Ekspordi Excel</button></div>`;
  }else{
    const L=batchList();
    $('listhead').innerHTML=`<b>${L.length} paketti</b><div class="r"><span>Kokku <b class="mono">${fmt(L.reduce((s,b)=>s+bTotal(b),0))}</b></span></div>`;
    const rej=BATCHES.filter(b=>b.status==='rejected');ws.hidden=!rej.length;
    ws.innerHTML=`${ic('warn')}<span>Pank lükkas tagasi paketi „${esc(rej[0]?.name)}“ · ${esc(rej[0]?.bankReason)}</span><button class="btn sm primary" data-bid="${rej[0]?.id}">Ava pakett</button>`;
    $('rows').innerHTML=L.length?L.map(b=>{const st=BSTAT[b.status];const cell={
      n:`<div><span class="cust"><span class="nm"><span class="n1">${esc(b.name)}</span><span class="n2">${ORIGIN[b.origin][0]} · ${esc(b.by)} · loodud ${dstr(b.created)}</span></span></span></div>`,
      bk:`<div class="dt">${esc(b.bank.name)}</div>`,
      o:`<div>${otag(b)}</div>`,
      ex:`<div class="dt mono">${dstr(b.exec)}</div>`,
      ln:`<div class="dt mono r">${b.lines.length}</div>`,
      a:`<div class="num mono ${b.status==='voided'?'mut':''}">${fmt(bTotal(b))}</div>`,
      s:`<div>${tag(st[0],st[1])}</div>`};
      return `<div class="trow ${b.id===S.bSel?'on':''}" data-bid="${b.id}">${cols.map(c=>cell[c[0]]).join('')}</div>`}).join(''):`<div class="empty">Siin pakette pole</div>`;
    $('tfoot').innerHTML=`<span>↑↓ liigu · N uus pakett</span><div class="r"><span>${PAYABLE.length} ostuarvet ootab maksmist · <a data-act="newbatch">koosta pakett</a></span></div>`;
  }
}

function navBtns(list,id,key){const i=list.findIndex(x=>x.id===id);return `<button class="btn sm" data-nav="${key}:-1" ${i<=0?'disabled':''} title="Eelmine (↑)">${ic('l')}</button><button class="btn sm" data-nav="${key}:1" ${i<0||i>=list.length-1?'disabled':''} title="Järgmine (↓)">${ic('r')}</button>`}

function renderPayDetail(){
  const p=PAYMENTS.find(x=>x.id===S.pSel);if(!p){$('detail').innerHTML=`<div class="empty">Vali makse</div>`;return}
  const inc=p.direction==='incoming';const pct=Math.min(100,p.invTotal?p.invPaid/p.invTotal*100:0);
  const late=Math.round((p.date-p.due)/864e5);
  const bankAcc=p.bank.code+' '+p.bank.name,arAcc=inc?'1210 Ostjate laekumata arved':'2110 Võlad tarnijatele';
  const jl=inc?[[bankAcc,p.amount,0],[arAcc,0,p.amount]]:[[arAcc,p.amount,0],[bankAcc,0,p.amount]];
  const jtab=(rows,rev)=>`<div class="lines" style="--lc:minmax(0,1fr) 88px 88px"><div class="lhead"><div>Konto</div><div class="r">Deebet</div><div class="r">Kreedit</div></div>${rows.map(r=>`<div class="lrow"><div>${esc(r[0])}</div><div class="a mono">${(rev?r[2]:r[1])?fmtN(rev?r[2]:r[1]):''}</div><div class="a mono">${(rev?r[1]:r[2])?fmtN(rev?r[1]:r[2]):''}</div></div>`).join('')}</div>`;
  const tl=[[dstr(p.date),'done','Makse kuupäev pangas · '+esc(p.bank.name)]];
  if(p.status==='draft')tl.push([dstr(TODAY),'wait','Imporditud, seotud arvega automaatselt']);
  else tl.push([dstr(p.date),'done','Konteeritud · '+esc(p.user)]);
  if(p.status==='reversed')tl.push([dstr(TODAY),'bad','Tühistatud · '+esc(p.reason)]);
  let foot;
  if(p.status==='draft')foot=`<span class="hint">Konteerimisel märgitakse arve ${p.invOpen-p.amount<=0.004?'tasutuks':'osaliselt tasutuks'}</span><div class="r"><button class="btn">Seo teise arvega</button><button class="btn primary" data-act="post">${ic('stamp')} Konteeri <kbd>Enter</kbd></button></div>`;
  else if(p.status==='posted')foot=S.reversing?`<div class="revbox"><input class="inp" id="revr" placeholder="Tühistamise põhjus (nähtav kandes)" /><button class="btn" data-act="revcancel">Loobu</button><button class="btn danger" data-act="revdo" style="border-color:#efc9c4">${ic('undo')} Tühista</button></div>`:`<span class="hint">Tühistamine loob vastupidise kande ja avab arve uuesti</span><div class="r"><button class="btn danger" data-act="rev">${ic('undo')} Tühista makse</button></div>`;
  else foot=`<span class="hint">Tühistatud ${dstr(TODAY)} · ${esc(p.reason)}</span>`;
  $('detail').innerHTML=`<div class="dhead"><div class="drow"><div class="tt"><h2>${esc(p.partner)}</h2><div class="line">${inc?'Sissetulev':'Väljaminev'} · <span class="mono">${dstr(p.date)}</span> · ${esc(p.bank.name)}</div></div><div class="amt"><b class="mono ${inc?'in':''}">${inc?'+':'−'}${fmt(p.amount)}</b></div></div><div class="nav">${tag(...PST[p.status])}${navBtns(payList(),p.id,'p')}</div></div>
  <div class="dbody">
    <div class="sec"><div class="sech">Seotud arve<span class="r"><a data-act="invchip">Kõik selle arve maksed</a></span></div>
      <div class="settle"><div><div class="k">Arve kokku</div><div class="v mono">${fmt(p.invTotal)}</div></div><div><div class="k">Tasutud</div><div class="v mono">${fmt(p.invPaid)}</div></div><div><div class="k">Avatud</div><div class="v mono ${p.invOpen<=0.004?'zero':''}">${fmt(p.invOpen)}</div></div></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="kv"><span>Arve</span><b><a>${p.invoiceType} ${esc(p.invoice)} ${ic('ext','font-size:10px')}</a></b></div>
      <div class="kv"><span>Arve olek</span><b>${esc(p.invStatus)}</b></div>
      <div class="kv"><span>Tähtaeg</span><b class="mono">${dstr(p.due)}${late>0?` <span style="color:var(--warn);font-weight:500">· makstud ${late} p hiljem</span>`:''}</b></div>
      ${p.ref?`<div class="kv"><span>Viitenumber</span><b class="mono">${esc(p.ref)}</b></div>`:''}
      <div class="kv"><span>Selgitus</span><b>${esc(p.desc)}</b></div>
    </div>
    <div class="sec"><div class="sech">Kanne${p.entry?`<span class="r"><a>${esc(p.entry)} ${ic('ext','font-size:10px')}</a></span>`:''}</div>
      ${p.status==='draft'?`<div class="note mut" style="margin-top:0">${ic('info')}<span>Kanne luuakse konteerimisel. Eelvaade:</span></div><div style="margin-top:8px;opacity:.6">${jtab(jl)}</div>`:jtab(jl)}
      ${p.status==='reversed'?`<div class="sech" style="margin-top:10px">Tühistav kanne<span class="r"><a>${esc(p.revEntry)} ${ic('ext','font-size:10px')}</a></span></div>${jtab(jl,true)}<div class="note bad">${ic('undo')}<span>${esc(p.reason)}. Arve on uuesti avatud summas ${fmt(p.invOpen)}.</span></div>`:''}
    </div>
    <div class="sec" style="border-bottom:none"><div class="sech">Ajalugu</div><div class="tl">${tl.map(t=>`<div class="tlrow ${t[1]}"><span class="mono">${t[0]}</span><span class="bul"></span><span>${t[2]}</span></div>`).join('')}</div></div>
  </div>
  <div class="dfoot">${foot}</div>`;
  if(S.reversing)setTimeout(()=>$('revr')?.focus(),0);
}

function steps(b){const lab=['Mustand','Fail loodud','Pangas','Täidetud'];const at={draft:0,generated:1,uploaded:2,sent:2,rejected:2,confirmed:4,voided:-1}[b.status];
  return `<div class="steps">${lab.map((l,i)=>{let c='';if(b.status==='voided')c='';else if(i<at)c='done';else if(i===at)c=b.status==='rejected'?'bad':'cur';return `<div class="step ${c}"><i></i><span>${i===2&&b.status==='rejected'?'Tagasi lükatud':l}</span></div>`}).join('')}</div>`}

function renderBatchDetail(){
  const b=BATCHES.find(x=>x.id===S.bSel);if(!b){$('detail').innerHTML=`<div class="empty">Vali maksepakett</div>`;return}
  const st=BSTAT[b.status];const tot=bTotal(b);const warns=b.lines.filter(l=>l.warn.length).length;
  let note='';
  if(b.status==='sent')note=`<div class="note ok">${ic('ok')}<span>Pank võttis vastu ${dstr(b.bankAt)} 14:22 · ${esc(b.bank.prov)}. Täidetuks märgitakse automaatselt, kui väljavõttel on read olemas.</span></div>`;
  if(b.status==='uploaded')note=`<div class="note warn">${ic('info')}<span>Fail laaditi internetipanka käsitsi üles. Kinnita täidetuks, kui pank on maksed teinud – siis luuakse ${b.lines.length} makset.</span></div>`;
  if(b.status==='rejected')note=`<div class="note bad">${ic('warn')}<span><b>Pank keeldus ${dstr(b.bankAt)}.</b> ${esc(b.bankReason)}</span></div>`;
  if(b.status==='voided')note=`<div class="note mut">${ic('x')}<span>Tühistatud · ${esc(b.voidReason)}</span></div>`;
  if(b.status==='confirmed')note=`<div class="note ok">${ic('ok')}<span>Täidetud ${dstr(b.bankAt)} · ${b.lines.length} makset loodi ja seoti arvetega. <a data-act="gopay">Vaata maksetes</a></span></div>`;
  if(b.status==='draft'&&b.origin==='payroll')note=`<div class="note mut">${ic('info')}<span>Read tulevad palgaarvestusest. Summa muutmiseks paranda palgaarvestust ja koosta pakett uuesti.</span></div>`;
  if(b.status==='draft'&&warns)note=`<div class="note warn">${ic('warn')}<span>${warns} real on hoiatus. Kontrolli enne panka saatmist.</span></div>`;
  const lst={pending:'',paid:tag('Makstud','ok'),rejected:tag('Tagasi','bad')};
  const pay=b.origin==='payroll';const editable=b.status==='draft'&&!pay;
  const nInv=b.lines.filter(l=>l.inv).length;
  const srcKv=pay?`<a data-act="run">${esc(b.run)} ${ic('ext','font-size:10px')}</a>`:b.origin==='pinv'?`<a data-act="pinv">Ostuarved · ${nInv} arvet ${ic('ext','font-size:10px')}</a>`:'Koostatud siin';
  let right='',menu=[];
  if(b.status==='draft'){right=`<button class="btn" data-menu="dl">${ic('dl')} Lae alla ${ic('chev','font-size:11px')}</button><button class="btn primary" data-act="send">${ic('send')} Saada panka</button>`;menu=[pay?['run','Ava palgaarvestus']:['edit','Muuda ridu'],['file','Vaata faili'],'-',['void','Tühista pakett','danger']]}
  else if(b.status==='generated'){right=`<button class="btn" data-act="uploaded">Märgi üles laaditud</button><button class="btn primary" data-act="send">${ic('send')} Saada panka</button>`;menu=[['file','Vaata faili'],['dlx','Lae alla uuesti'],'-',['void','Tühista pakett','danger']]}
  else if(b.status==='uploaded'||b.status==='sent'){right=`<button class="btn primary" data-act="exec">${ic('ok')} Kinnita täidetuks</button>`;menu=[['file','Vaata faili'],'-',['void','Tühista pakett','danger']]}
  else if(b.status==='rejected'){right=pay?`<button class="btn primary" data-act="run">Paranda palgaarvestuses</button>`:`<button class="btn primary" data-act="redo">Paranda ja koosta uuesti</button>`;menu=[['file','Vaata faili'],'-',['void','Tühista pakett','danger']]}
  else if(b.status==='confirmed'){menu=[['file','Vaata faili']]}
  $('detail').innerHTML=`<div class="dhead"><div class="drow"><div class="tt"><h2>${esc(b.name)}</h2><div class="line">${esc(b.bank.name)} · <span class="mono">${ibanS(b.bank.iban)}</span> · täitmine <span class="mono">${dstr(b.exec)}</span></div></div><div class="amt"><b class="mono">${fmt(tot)}</b></div></div><div class="nav">${tag(st[0],st[1])}${navBtns(batchList(),b.id,'b')}</div></div>
  <div class="dbody">
    <div class="sec">${steps(b)}${note}</div>
    <div class="sec"><div class="sech">Andmed</div>
      <div class="kv"><span>Allikas</span><b>${srcKv}</b></div>
      <div class="kv"><span>Pangakonto</span><b class="mono">${ibanF(b.bank.iban)}</b></div>
      <div class="kv"><span>Ühendus</span><b>${esc(b.bank.prov)}</b></div>
      <div class="kv"><span>Faili vorming</span><b>${b.fmt?esc(b.fmt):'<span style="color:var(--text-3);font-weight:500">luuakse saatmisel</span>'}</b></div>
      <div class="kv"><span>Koostas</span><b>${esc(b.by)} · ${dstr(b.created)}</b></div>
    </div>
    <div class="sec" style="border-bottom:none"><div class="sech">Read · ${b.lines.length}${editable?`<span class="r"><a data-act="edit">Muuda</a></span>`:''}</div>
      <div class="lines" style="--lc:minmax(0,1.3fr) minmax(0,1fr) 92px"><div class="lhead"><div>Saaja</div><div>Arve · viide</div><div class="r">Summa</div></div>
      ${b.lines.map(l=>`<div class="lrow ${l.warn.length||l.status==='rejected'?'warn':''}"><div>${esc(l.payee)}<span class="s mono">${ibanS(l.iban)}</span></div><div>${l.inv?`<a>${esc(l.inv)}</a>`:l.emp?'Töötasu':l.tax?'Tööjõumaksud':`<span style="color:var(--text-3)">Käsirida · ${esc(l.acct)}</span>`}<span class="s">${l.ref?'<span class="mono">'+esc(l.ref)+'</span>':(l.warn[0]?'<span style="color:#7d5a13">'+esc(l.warn[0])+'</span>':esc(l.desc))}</span></div><div class="a mono">${fmtN(l.amount)}${lst[l.status]?`<span class="s">${lst[l.status]}</span>`:''}</div></div>`).join('')}
      <div class="ltot"><span>${b.lines.length} rida</span><span>Kokku <b class="mono">${fmt(tot)}</b></span></div></div>
    </div>
  </div>
  <div class="dfoot">${menu.length?`<button class="btn ghost" data-menu="more" title="Veel">${ic('more')}</button>`:''}<div class="r">${right}</div>
  <div class="menu" id="m-more" hidden style="bottom:42px;left:10px">${menu.map(m=>m==='-'?'<div class="msep"></div>':`<button class="mitem ${m[2]||''}" data-act="${m[0]}">${m[1]}</button>`).join('')}</div>
  <div class="menu" id="m-dl" hidden style="bottom:42px;right:120px;width:230px"><button class="mitem" data-act="dlpain"><span>pain.001 XML<span class="d">Laadi internetipanka üles</span></span></button><button class="mitem" data-act="dlcsv"><span>CSV<span class="d">Tabelina ülevaatamiseks</span></span></button></div></div>`;
}

function render(){renderTop();renderRail();renderList();S.mod==='pay'?renderPayDetail():renderBatchDetail();history.replaceState(null,'',S.mod==='batch'?'#paketid':'#maksed')}

function newBatchModal(){
  const sel=new Set(PAYABLE.filter(p=>!p.inBatch&&p.due<=addD(TODAY,7)&&p.iban).map(p=>p.id));const manual=[];
  const draw=()=>{
    const chosen=PAYABLE.filter(p=>sel.has(p.id));const sum=chosen.reduce((s,p)=>s+p.open,0)+manual.reduce((s,m)=>s+(parseFloat(String(m.amount).replace(',','.'))||0),0);
    const wn=chosen.filter(p=>!p.ref).length;
    $('mbox').innerHTML=`<div class="mhead"><div><h3>Uus maksepakett</h3><div class="line">Vali makstavad ostuarved. Summad, saaja ja viitenumber tulevad arvelt.</div></div><button class="btn ghost x" data-close>${ic('x')}</button></div>
    <div class="mfields"><label>Pangakonto<select class="inp" id="nb-bank">${BANKS.map(b=>`<option>${esc(b.name)} · ${ibanS(b.iban)}</option>`).join('')}</select></label><label>Nimi<input class="inp" id="nb-name" value="Ostuarved nädal ${41}" /></label><label>Täitmise kuupäev<input class="inp mono" value="${dstr(addD(TODAY,1))}" /></label></div>
    <div class="mbody">
      <div class="pbh"><div><input type="checkbox" id="nb-all" ${sel.size===PAYABLE.filter(p=>!p.inBatch&&p.iban).length?'checked':''} /></div><div>Saaja · arve</div><div>IBAN</div><div>Tähtaeg</div><div>Viide</div><div class="r">Tasumata</div></div>
      ${PAYABLE.map(p=>{const od=Math.round((TODAY-p.due)/864e5);const dis=!!p.inBatch||!p.iban;return `<div class="pbr ${sel.has(p.id)?'on':''}" data-pi="${p.id}" style="${dis?'opacity:.55;cursor:default':''}"><div><input type="checkbox" ${sel.has(p.id)?'checked':''} ${dis?'disabled':''} /></div><div>${esc(p.payee)}<span class="s"><span class="mono">${esc(p.inv)}</span> · ${esc(p.status)}${p.inBatch?' · juba paketis „'+esc(p.inBatch)+'“':''}</span></div><div class="mono">${p.iban?ibanS(p.iban):'<span class="wf">IBAN puudub</span>'}</div><div class="mono" style="${od>0?'color:var(--neg);font-weight:600':''}">${dstr(p.due)}${od>0?` <span style="font-weight:500">+${od} p</span>`:''}</div><div>${p.ref?'<span style="color:var(--pos)">'+ic('ok')+'</span>':'<span class="wf">puudub</span>'}</div><div class="r mono" style="font-weight:600">${fmtN(p.open)}</div></div>`}).join('')}
      ${manual.map((m,i)=>`<div class="pbr man"><div></div><div><input class="inp" data-man="${i}:payee" value="${esc(m.payee)}" placeholder="Saaja nimi" /></div><div><input class="inp mono" data-man="${i}:iban" value="${esc(m.iban)}" placeholder="IBAN" /></div><div><select class="inp" data-man="${i}:acct"><option>2310 KM võlg</option><option>2330 Tööjõumaksud</option><option>2410 Palgavõlg</option></select></div><div><button class="btn sm ghost" data-rmman="${i}" title="Eemalda">${ic('x')}</button></div><div><input class="inp mono r" data-man="${i}:amount" value="${esc(m.amount)}" placeholder="0,00" /></div></div>`).join('')}
      <div style="padding:8px 14px"><button class="btn sm ghost" data-addman>${ic('plus')} Lisa käsirida (maks, palk, rent)</button></div>
    </div>
    <div class="mfootbar"><span class="sum">Valitud <b>${chosen.length+manual.length}</b> · <b class="mono">${fmt(sum)}</b></span>${wn?`<span class="sum" style="color:#7d5a13">${ic('warn')} ${wn} ilma viitenumbrita – kasutatakse selgitust</span>`:''}<div class="r"><button class="btn" data-close>Loobu</button><button class="btn" data-create="draft" ${!chosen.length&&!manual.length?'disabled':''}>Salvesta mustandina</button><button class="btn primary" data-create="send" ${!chosen.length&&!manual.length?'disabled':''}>${ic('send')} Loo ja saada panka</button></div></div>`;
  };
  $('modal').hidden=false;draw();
  $('mbox').onclick=e=>{const t=e.target;
    if(t.closest('[data-close]')){$('modal').hidden=true;return}
    if(t.id==='nb-all'){const ok=PAYABLE.filter(p=>!p.inBatch&&p.iban);if(t.checked)ok.forEach(p=>sel.add(p.id));else sel.clear();draw();return}
    const r=t.closest('[data-pi]');if(r){const p=PAYABLE.find(x=>x.id===r.dataset.pi);if(p.inBatch||!p.iban)return;sel.has(p.id)?sel.delete(p.id):sel.add(p.id);draw();return}
    if(t.closest('[data-addman]')){manual.push({payee:'',iban:'',acct:'2310 KM võlg',amount:''});draw();return}
    const rm=t.closest('[data-rmman]');if(rm){manual.splice(+rm.dataset.rmman,1);draw();return}
    const cr=t.closest('[data-create]');if(cr){const chosen=PAYABLE.filter(p=>sel.has(p.id));const send=cr.dataset.create==='send';
      const b={id:'mb'+Date.now(),name:$('nb-name').value||'Maksepakett',bank:BANKS[$('nb-bank').selectedIndex],exec:addD(TODAY,1),status:send?'sent':'draft',bankStatus:send?'accepted':null,bankAt:TODAY,fmt:send?'pain.001.001.09':null,created:TODAY,by:'Kadri Tamm',
        lines:[...chosen.map(p=>({inv:p.inv,payee:p.payee,iban:p.iban,bic:p.bic,ref:p.ref,desc:'Arve '+p.inv,amount:p.open,acct:null,warn:p.ref?[]:['Viitenumber puudub, kasutatakse selgitust'],status:'pending'})),...manual.map(m=>({inv:null,payee:m.payee||'Käsirida',iban:m.iban,ref:'',desc:'',amount:parseFloat(String(m.amount).replace(',','.'))||0,acct:m.acct,warn:[],status:'pending'}))]};
      chosen.forEach(p=>p.inBatch=b.name);BATCHES.unshift(b);S.bSel=b.id;S.bst='active';$('modal').hidden=true;render();toast(send?'Pakett saadeti panka ('+b.bank.prov+')':'Mustand salvestatud')}
  };
  $('mbox').oninput=e=>{const m=e.target.dataset.man;if(m){const[i,k]=m.split(':');manual[+i][k]=e.target.value;const s=$('mbox').querySelector('.mfootbar .sum');}};
  $('mbox').onchange=e=>{if(e.target.dataset.man?.endsWith(':amount'))draw()};
}

function fileModal(b){
  const x=`<?xml version="1.0" encoding="UTF-8"?>\n<Document xmlns="urn:iso:std:iso:20022:tech:xsd:${b.fmt||'pain.001.001.09'}">\n <CstmrCdtTrfInitn>\n  <GrpHdr><MsgId>${b.id.toUpperCase()}</MsgId><NbOfTxs>${b.lines.length}</NbOfTxs><CtrlSum>${bTotal(b).toFixed(2)}</CtrlSum></GrpHdr>\n  <PmtInf><ReqdExctnDt>${b.exec.toISOString().slice(0,10)}</ReqdExctnDt><DbtrAcct><Id><IBAN>${b.bank.iban}</IBAN></Id></DbtrAcct>\n`+b.lines.map(l=>`   <CdtTrfTxInf><Amt><InstdAmt Ccy="EUR">${l.amount.toFixed(2)}</InstdAmt></Amt><Cdtr><Nm>${esc(l.payee)}</Nm></Cdtr><CdtrAcct><Id><IBAN>${l.iban}</IBAN></Id></CdtrAcct>${l.ref?`<RmtInf><Strd><CdtrRefInf><Ref>${l.ref}</Ref></CdtrRefInf></Strd></RmtInf>`:`<RmtInf><Ustrd>${esc(l.desc)}</Ustrd></RmtInf>`}</CdtTrfTxInf>`).join('\n')+`\n  </PmtInf>\n </CstmrCdtTrfInitn>\n</Document>`;
  $('mbox').innerHTML=`<div class="mhead"><div><h3>${esc(b.name)}.xml</h3><div class="line">${b.fmt||'pain.001.001.09'} · ${b.lines.length} makset · ${fmt(bTotal(b))}</div></div><button class="btn ghost x" data-close>${ic('x')}</button></div><div class="mbody"><pre class="file">${esc(x)}</pre></div><div class="mfootbar"><div class="r"><button class="btn" data-close>Sulge</button><button class="btn primary" data-close>${ic('dl')} Lae alla</button></div></div>`;
  $('modal').hidden=false;$('mbox').onclick=e=>{if(e.target.closest('[data-close]'))$('modal').hidden=true};$('mbox').oninput=null;
}
function voidModal(b){
  $('mbox').style.width='min(460px,100%)';
  $('mbox').innerHTML=`<div class="mhead"><div><h3>Tühista „${esc(b.name)}“?</h3><div class="line">${b.lines.length} rida · ${fmt(bTotal(b))}. ${b.origin==='payroll'?'Palgaarvestuse saab seejärel uuesti panka saata.':'Arved vabanevad uuesti maksmiseks.'}</div></div><button class="btn ghost x" data-close>${ic('x')}</button></div><div style="padding:12px 14px"><label class="flbl">Põhjus<input class="inp" id="vr" placeholder="nt topelt loodud" /></label>${['sent','uploaded'].includes(b.status)?`<div class="note warn">${ic('warn')}<span>Pakett on juba pangas. Tühista see kindlasti ka internetipangas.</span></div>`:''}</div><div class="mfootbar"><div class="r"><button class="btn" data-close>Loobu</button><button class="btn danger" data-void style="border-color:#efc9c4">Tühista pakett</button></div></div>`;
  $('modal').hidden=false;setTimeout(()=>$('vr').focus(),0);
  $('mbox').onclick=e=>{if(e.target.closest('[data-close]')){$('modal').hidden=true;$('mbox').style.width=''}if(e.target.closest('[data-void]')){if(b.origin==='payroll')toast(b.run+' vabanes uue paketi jaoks');b.status='voided';b.voidReason=$('vr').value||'Põhjus märkimata';$('modal').hidden=true;$('mbox').style.width='';render();toast('Pakett tühistatud')}};
}

function postPay(p){p.status='posted';p.entry='MK-'+(3411+PAYMENTS.indexOf(p));p.user='Kadri Tamm';p.invPaid=Math.round((p.invPaid+p.amount)*100)/100;p.invOpen=Math.max(0,Math.round((p.invTotal-p.invPaid)*100)/100);p.invStatus=p.invOpen<=0.004?'Tasutud':'Osaliselt tasutud';p.src=p.src.replace(' · ootab kinnitust','');toast('Makse konteeritud · '+p.entry)}

document.addEventListener('click',e=>{
  const t=e.target;const d=k=>t.closest(`[data-${k}]`);let el;
  if(!t.closest('[data-menu]')&&!t.closest('.menu'))document.querySelectorAll('.menu').forEach(m=>m.hidden=true);
  if(t.closest('.modal')&&!t.closest('.mbox')){$('modal').hidden=true;$('mbox').style.width='';return}
  if(t.closest('.modal'))return;
  if(el=d('mod')){S.mod=el.dataset.mod;S.reversing=false;render();return}
  if(el=d('pst')){S.pst=el.dataset.pst;const L=payList();if(!L.find(p=>p.id===S.pSel))S.pSel=L[0]?.id;render();return}
  if(el=d('dir')){S.dir=el.dataset.dir;const L=payList();if(!L.find(p=>p.id===S.pSel))S.pSel=L[0]?.id;render();return}
  if(el=d('borig')){S.borig=el.dataset.borig;const L=batchList();if(!L.find(b=>b.id===S.bSel))S.bSel=L[0]?.id;render();return}
  if(el=d('bst')){S.bst=el.dataset.bst;const L=batchList();if(!L.find(b=>b.id===S.bSel))S.bSel=L[0]?.id;render();return}
  if(d('clearinv')){S.invChip=null;render();return}
  if(el=d('pid')){S.pSel=el.dataset.pid;S.reversing=false;render();return}
  if(el=d('bid')){S.bSel=el.dataset.bid;if(!batchList().find(b=>b.id===S.bSel))S.bst='all';render();return}
  if(el=d('nav')){const[k,dlt]=el.dataset.nav.split(':');move(+dlt);return}
  if(el=d('menu')){const m=$('m-'+el.dataset.menu);const h=m.hidden;document.querySelectorAll('.menu').forEach(x=>x.hidden=true);m.hidden=!h;return}
  if(t.id==='newbatch'||(el=d('act'))&&el.dataset.act==='newbatch'){newBatchModal();return}
  if(t.closest('#regbtn')){toast('Avab arve otsingu → summa, kuupäev, makseviis');return}
  if(!(el=d('act')))return;
  const a=el.dataset.act;const p=PAYMENTS.find(x=>x.id===S.pSel),b=BATCHES.find(x=>x.id===S.bSel);
  document.querySelectorAll('.menu').forEach(m=>m.hidden=true);
  if(a==='post'){postPay(p);render()}
  else if(a==='rev'){S.reversing=true;renderPayDetail()}
  else if(a==='revcancel'){S.reversing=false;renderPayDetail()}
  else if(a==='revdo'){p.status='reversed';p.reason=$('revr').value||'Põhjus märkimata';p.revEntry='MK-'+(4200+PAYMENTS.indexOf(p));p.invPaid=Math.max(0,Math.round((p.invPaid-p.amount)*100)/100);p.invOpen=Math.round((p.invTotal-p.invPaid)*100)/100;p.invStatus=p.invPaid>0?'Osaliselt tasutud':'Avatud';S.reversing=false;render();toast('Makse tühistatud · arve avatud')}
  else if(a==='invchip'){S.invChip=p.invoice;S.pst='all';S.dir='all';render()}
  else if(a==='send'){b.status='sent';b.bankStatus='accepted';b.bankAt=TODAY;b.fmt=b.fmt||'pain.001.001.09';render();toast('Saadetud panka · '+b.bank.prov)}
  else if(a==='uploaded'){b.status='uploaded';render();toast('Märgitud üles laadituks')}
  else if(a==='exec'){b.status='confirmed';b.bankAt=TODAY;b.lines.forEach(l=>l.status='paid');render();toast(b.lines.length+' makset loodud ja seotud arvetega')}
  else if(a==='redo'){toast('Avab uue paketi samade ridadega · vigane rida märgitud')}
  else if(a==='void'){voidModal(b)}
  else if(a==='file'){fileModal(b)}
  else if(a==='dlpain'||a==='dlx'){if(b.status==='draft'){b.status='generated';b.fmt='pain.001.001.09';render()}toast('Laaditud alla: '+b.name+'.xml')}
  else if(a==='dlcsv'){toast('Laaditud alla: '+b.name+'.csv')}
  else if(a==='run'){toast('Avab '+b.run+' (palgaarvestuse vaade)')}
  else if(a==='pinv'){toast('Avab Ostuarved filtriga: selle paketi arved')}
  else if(a==='edit'){toast('Avab paketi koostamise akna')}
  else if(a==='gopay'){S.mod='pay';S.pst='all';render()}
});
document.addEventListener('input',e=>{if(e.target.id==='q'){if(S.mod==='pay')S.q=e.target.value;else S.bq=e.target.value;renderList();}});
function move(dl){if(S.mod==='pay'){const L=payList();const i=L.findIndex(p=>p.id===S.pSel);const n=L[Math.max(0,Math.min(L.length-1,i+dl))];if(n){S.pSel=n.id;S.reversing=false}}else{const L=batchList();const i=L.findIndex(b=>b.id===S.bSel);const n=L[Math.max(0,Math.min(L.length-1,i+dl))];if(n)S.bSel=n.id}renderList();S.mod==='pay'?renderPayDetail():renderBatchDetail();const on=document.querySelector('.trow.on');if(on){const r=$('rows');if(on.offsetTop<r.scrollTop||on.offsetTop+on.offsetHeight>r.scrollTop+r.clientHeight)r.scrollTop=on.offsetTop-r.clientHeight/2}}
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')){if(e.key==='Escape')e.target.blur();if(e.key==='Enter'&&e.target.id==='revr')document.querySelector('[data-act=revdo]').click();return}
  if(!$('modal').hidden){if(e.key==='Escape'){$('modal').hidden=true;$('mbox').style.width=''}return}
  if(e.key==='ArrowDown'||e.key==='j'){e.preventDefault();move(1)}else if(e.key==='ArrowUp'||e.key==='k'){e.preventDefault();move(-1)}
  else if(e.key==='/'){e.preventDefault();$('q').focus()}
  else if(e.key==='Enter'&&S.mod==='pay'){const p=PAYMENTS.find(x=>x.id===S.pSel);if(p?.status==='draft'){postPay(p);render()}}
  else if((e.key==='n'||e.key==='N')&&S.mod==='batch')newBatchModal();});
(()=>{const g=$('gutter');let on=false;g.addEventListener('mousedown',e=>{on=true;e.preventDefault()});addEventListener('mousemove',e=>{if(!on)return;const w=Math.max(360,Math.min(innerWidth-560,innerWidth-e.clientX-16));document.documentElement.style.setProperty('--pw',w+'px');renderList()});addEventListener('mouseup',()=>on=false);g.addEventListener('dblclick',()=>{document.documentElement.style.removeProperty('--pw');renderList()})})();
{let lw=-1;const sc=$('rows').parentElement;new ResizeObserver(()=>{if(sc.clientWidth!==lw){lw=sc.clientWidth;renderList()}}).observe(sc)}
render();requestAnimationFrame(()=>renderList());
