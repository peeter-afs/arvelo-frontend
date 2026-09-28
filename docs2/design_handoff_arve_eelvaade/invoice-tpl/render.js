(function(){
const LI={et:0,en:1,fi:2,sv:3},LOC={et:'et-EE',en:'en-IE',fi:'fi-FI',sv:'sv-SE'};
const r2=v=>Math.round(v*100)/100;
const SELLER={name:'Stuudio Lillemets OÜ',reg:'14582931',vat:'EE102938475',street:'Pärnu mnt 141',city:'11314 Tallinn',cc:'EE',email:'arved@lillemets.ee',phone:'+372 5555 1234',banks:[{b:'Swedbank',iban:'EE38 2200 2210 1234 5678',bic:'HABAEE2X'},{b:'LHV Pank',iban:'EE71 7700 7710 0123 4567',bic:'LHVBEE22'}]};
const B_EE={name:'Stuudio Veski OÜ',reg:'12345678',vat:'EE101234567',street:'Veski 12',city:'51005 Tartu',cc:'EE',email:'arved@stuudioveski.ee'};
const B_FI={name:'Kivi Design Oy',reg:'2345678-9',vat:'FI23456789',street:'Mannerheimintie 12 B',city:'00100 Helsinki',cc:'FI',email:'laskut@kividesign.fi'};
const DOCS={invoice:{no:'2026-0091',date:'2026-05-20',due:'2026-06-03'},credit:{no:'KR-2026-0007',date:'2026-05-27'},prepay:{no:'EA-2026-0012',date:'2026-05-20',due:'2026-05-27'},quote:{no:'HP-2026-0034',date:'2026-05-20',due:'2026-06-19'},reminder:{no:'M-2026-0003',date:'2026-06-16',due:'2026-06-23'}};
const REF='2026 0091 3';
const docUrl=no=>`https://arvelo.ee/d/${no.toLowerCase()}-${[...no].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7).toString(36)}`;
const dlink=no=>`<a class="dl" href="${docUrl(no)}" data-doc-no="${no}">${no}</a>`;
const APPLY={unpaid:['invoice','prepay'],disc:['invoice','credit','prepay','quote'],multivat:['invoice','credit','prepay','quote'],rc:['invoice','credit','prepay','quote'],note:['invoice','credit','prepay','quote','reminder'],multipage:['invoice','credit','prepay','quote']};
const days=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);

function ctx(s){
  const l=s.lang,t=k=>{const e=window.INV_I18N[k];return e?e[LI[l]]:k};
  const money=v=>new Intl.NumberFormat(LOC[l],{style:'currency',currency:'EUR'}).format(v).replace('-','−');
  const num=v=>new Intl.NumberFormat(LOC[l],{maximumFractionDigits:2}).format(v).replace('-','−');
  const date=iso=>{const[y,m,d]=iso.split('-');if(l==='sv')return iso;if(l==='en')return new Date(iso+'T12:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});return d+'.'+m+'.'+y};
  return{l,t,money,num,date};
}
const on=(s,k)=>!!s[k]&&APPLY[k].includes(s.doc);

function model(s){
  const c=ctx(s),{t}=c,d=DOCS[s.doc],rc=on(s,'rc'),buyer=rc?B_FI:B_EE;
  const m={s,c,d,buyer,rc,title:t('t_'+s.doc)};
  if(s.doc==='reminder'){
    const R=[{no:'2026-0082',d:'2026-04-28',due:'2026-05-12',a:1840},{no:'2026-0089',d:'2026-05-13',due:'2026-05-27',a:6420},{no:'2026-0091',d:'2026-05-20',due:'2026-06-03',a:4476.4}];
    R.forEach(r=>{r.od=days(r.due,d.date);r.pen=r2(r.a*.0015*r.od)});
    const tot=r2(R.reduce((a,r)=>a+r.a,0)),pen=r2(R.reduce((a,r)=>a+r.pen,0));
    Object.assign(m,{rem:R,grand:r2(tot+pen),totRows:[[t('overdue_tot'),tot],[t('penalty'),pen]],gLabel:t('g_due')});
    return m;
  }
  const dsc=on(s,'disc'),mv=on(s,'multivat'),sign=s.doc==='credit'?-1:1;
  const I=[{k:'i1',q:1,u:'pcs',p:2400,d:dsc?10:0,v:24},{k:'i2',q:12,u:'h',p:85,d:0,v:24},{k:'i3',q:2,u:'h',p:95,d:dsc?15:0,v:24}];
  if(mv)I.push({k:'i4',q:5,u:'pcs',p:38,d:0,v:9});
  if(on(s,'multipage'))for(let w=1;w<=26;w++)I.push({k:'sup',w,q:[3,4,6,5,2,4][w%6],u:'h',p:75,d:0,v:24});
  I.forEach(i=>{i.q*=sign;if(rc)i.v=0;i.gross=r2(i.q*i.p);i.net=r2(i.gross*(1-i.d/100))});
  const gross=r2(I.reduce((a,i)=>a+i.gross,0)),net=r2(I.reduce((a,i)=>a+i.net,0)),G={};
  I.forEach(i=>{G[i.v]=r2((G[i.v]||0)+i.net)});
  const rates=Object.keys(G).map(Number).sort((a,b)=>b-a),vats=rates.map(v=>({v,base:G[v],vat:r2(G[v]*v/100)}));
  const total=r2(net+vats.reduce((a,x)=>a+x.vat,0));
  const rows=[];
  if(dsc){rows.push([t('gross'),gross]);rows.push([t('disctot'),r2(net-gross)])}
  rows.push([t('subtotal'),net]);
  vats.forEach(x=>rows.push([`${t('vatl')} ${x.v}%`+(vats.length>1||rc?` <em>${t('of')} ${c.money(x.base)}</em>`:''),x.vat]));
  let grand=total,gl=t('g_due');
  if(s.doc==='credit')gl=t('g_credit');
  if(s.doc==='quote')gl=t('g_quote');
  if(s.doc==='prepay'){rows.push([t('total'),total]);grand=r2(total/2);rows.push([t('prepay50'),grand]);gl=t('g_prepay')}
  Object.assign(m,{items:I,disc:dsc,totRows:rows,grand,gLabel:gl});
  return m;
}

function blocks(m){
  const{s,c,d,buyer}=m,{t,money,num,date}=c,S=SELLER,B=[];
  const logo=s.logo?`<img class="lg" src="${s.logo}" alt="">`:`<div class="mg">${S.name[0]}</div>`;
  B.push({html:`<div class="b-head"><div class="brand">${logo}<div class="bn"><div class="nm">${S.name}</div><div class="tg">${t('tagline')}</div><div class="ad">${S.street}, ${S.city} · ${S.email} · ${S.phone}</div></div></div><div class="doc"><div class="dt">${m.title}</div><div class="dn"><span>${t('no')}</span> <b class="num">${d.no}</b></div></div></div>`});
  const pty=(cls,lab,p)=>`<div class="pty ${cls}"><div class="lb">${lab}</div><div class="pn">${p.name}</div><div class="pr"><span class="k">${t('regno')}</span><span class="num">${p.reg}</span></div><div class="pr"><span class="k">${t('vatno')}</span><span class="num">${p.vat}</span></div><div class="pr"><span class="k">${t('address')}</span><span>${p.street}, ${p.city}, ${t('c_'+p.cc)}</span></div><div class="pr"><span class="k">${t('email')}</span><span>${p.email}</span></div></div>`;
  const M={invoice:[[t('date'),date(d.date)],[t('due'),date(d.due),1],[t('ref'),REF],[t('terms'),t('d14')]],
    credit:[[t('date'),date(d.date)],[t('credited'),dlink('2026-0091'),1],[t('reason'),t('reason_v')]],
    prepay:[[t('date'),date(d.date)],[t('due'),date(d.due),1],[t('ref'),REF],[t('terms'),t('d7')]],
    quote:[[t('date'),date(d.date)],[t('valid'),date(d.due),1],[t('delivery'),t('w4')]],
    reminder:[[t('date'),date(d.date)],[t('payby'),date(d.due),1]]}[s.doc];
  const dd={invoice:`${t('due')} ${date(d.due)}`,credit:`${t('credited')} 2026-0091`,prepay:`${t('due')} ${date(d.due)}`,quote:`${t('valid')} ${date(d.due)}`,reminder:`${t('payby')} ${date(d.due)}`}[s.doc];
  B.push({html:`<div class="b-info">${pty('seller',t('seller'),S)}${pty('buyer',t(s.doc==='quote'?'client':'buyer'),buyer)}<div class="meta">${M.map(x=>`<div class="mi${x[2]?' hl':''}"><div class="lb">${x[0]}</div><div class="mv num">${x[1]}</div></div>`).join('')}</div><div class="due"><div class="lb">${m.gLabel}</div><div class="amt">${money(m.grand)}</div><div class="dd">${dd}</div></div></div>`});
  if(on(s,'note'))B.push({html:`<div class="b-note"><div class="lb">${t('note_h')}</div><div>${t('note_x')}</div></div>`});
  const table=cols=>`<div class="b-tbl"><table class="it"><thead><tr>${cols.map(x=>`<th class="${x[1]||''}"${x[2]?` style="width:${x[2]}px"`:''}>${x[0]}</th>`).join('')}</tr></thead><tbody></tbody></table></div>`;
  const tr=(cells,cols)=>`<tr>${cells.map((v,i)=>`<td class="${cols[i][1]||''}">${v}</td>`).join('')}</tr>`;
  if(s.doc==='reminder'){
    B.push({html:`<div class="b-intro">${t('rem_intro')}</div>`});
    const cols=[[t('inv_no'),'l'],[t('date'),'',96],[t('due'),'',96],[t('days_over'),'',96],[t('open'),'',110]],tb=table(cols);
    m.rem.forEach(r=>B.push({table:tb,row:tr([`<b>${dlink(r.no)}</b>`,date(r.d),date(r.due),`<span class="neg">${r.od}</span>`,money(r.a)],cols)}));
  }else{
    const cols=[['#','l ix',22],[t('desc'),'l'],[t('qty'),'',64],[t('price'),'',88]];
    if(m.disc)cols.push([t('disc'),'',46]);
    cols.push([t('vat'),'',42],[t('amount'),'',100]);
    const tb=table(cols);
    m.items.forEach((i,n)=>{
      const nm=i.k==='sup'?t('sup'):t(i.k),sub=i.k==='sup'?`${t('week')} ${i.w}`:t(i.k+'s');
      const cells=[n+1,`<span class="ds">${nm}</span> <span class="sub">${sub}</span>`,`${num(i.q)} ${t('u_'+i.u)}`,money(i.p)];
      if(m.disc)cells.push(i.d?`−${i.d}%`:'');
      cells.push(i.v+'%',money(i.net));
      B.push({table:tb,row:tr(cells,cols)});
    });
  }
  B.push({html:`<div class="b-tot"><div class="tt">${m.totRows.map(r=>`<div class="tr"><span>${r[0]}</span><span>${money(r[1])}</span></div>`).join('')}<div class="gr"><span>${m.gLabel}</span><span class="amt">${money(m.grand)}</span></div></div></div>`});
  if(m.rc)B.push({html:`<div class="b-rc"><b>${t('rc_t')}.</b> ${t('rc_x')}</div>`});
  if(s.doc==='quote')B.push({html:`<div class="b-acc"><div class="lb">${t('accept_h')}</div><div class="sig"><div>${t('sign')}</div><div>${t('date')}</div></div></div>`});
  if(s.doc!=='reminder')B.push({html:`<div class="b-txt">${t('x_'+s.doc)}</div>`});
  if(on(s,'unpaid')){
    const U=[['2026-0089','2026-05-13','2026-05-27',6420,0],['2026-0082','2026-04-28','2026-05-12',1840,8]];
    B.push({bottom:1,html:`<div class="b-unpaid"><div class="uh"><div class="lb">${t('unpaid_h')}</div><span class="uhint">${t('link_hint')}</span></div><table><thead><tr><th class="l">${t('inv_no')}</th><th>${t('date')}</th><th>${t('due')}</th><th>${t('open')}</th></tr></thead><tbody>${U.map(u=>`<tr><td class="l">${dlink(u[0])}</td><td>${date(u[1])}</td><td${u[4]?' class="neg"':''}>${date(u[2])}${u[4]?` · ${u[4]} ${t('over_d')}`:''}</td><td>${money(u[3])}</td></tr>`).join('')}</tbody></table><div class="uf"><span>${t('unpaid_tot')}</span><b>${money(8260)}</b></div></div>`});
  }
  if(['invoice','prepay','reminder'].includes(s.doc))B.push({bottom:1,html:`<div class="b-pay"><div class="lb">${t('pay_h')}</div><div class="pgrid"><span class="k">${t('benef')}</span><span class="v">${S.name}</span>${S.banks.map(b=>`<span class="k">${b.b}</span><span class="v num">${b.iban} · ${b.bic}</span>`).join('')}<span class="k">${t('ref')}</span><span class="v num">${REF}</span><span class="k">${t('amount')}</span><span class="v big">${money(m.grand)}</span></div></div>`});
  return B;
}

function paginate(host,s,opt={}){
  const m=model(s),B=blocks(m),{t}=m.c,S=SELLER,pages=[];
  host.innerHTML='';
  const mk=h=>{const x=document.createElement('div');x.innerHTML=h.trim();return x.firstElementChild};
  const mkRow=h=>{const x=document.createElement('tbody');x.innerHTML=h.trim();return x.firstElementChild};
  const foot=`<div class="pfoot"><div class="f1">${S.name} · ${t('regno')} ${S.reg} · ${t('vatno')} ${S.vat} · ${S.street}, ${S.city}, ${t('c_EE')} · ${S.email} · ${S.phone}</div><div class="fcols"><div><b>${S.name}</b><br>${t('regno')} ${S.reg}<br>${t('vatno')} ${S.vat}</div><div>${S.street}<br>${S.city}, ${t('c_EE')}<br>${S.email} · ${S.phone}</div><div>${S.banks.map(b=>`${b.b} ${b.iban}<br>`).join('')}BIC ${S.banks.map(b=>b.bic).join(' / ')}</div></div><div class="pno"></div></div>`;
  const cont=`<div class="b-cont"><span>${m.title} ${m.d.no}</span><span>${m.buyer.name}</span><span>${t('cont')}</span></div>`;
  let flow,tbody;
  const newPage=()=>{if(opt.max&&pages.length>=opt.max)return false;const pg=mk(`<div class="pg t-${s.tpl}" style="--ac:${s.accent}"><div class="pg-in"><div class="flow"></div>${foot}</div></div>`);host.appendChild(pg);pages.push(pg);flow=pg.querySelector('.flow');tbody=null;if(pages.length>1)flow.appendChild(mk(cont));return true};
  const over=()=>flow.scrollHeight>flow.clientHeight+1;
  const base=()=>pages.length>1?1:0;
  const openTable=h=>{const tb=mk(h);flow.appendChild(tb);tbody=tb.querySelector('tbody')};
  newPage();
  for(const b of B){
    if(b.row){
      if(!tbody)openTable(b.table);
      const r=mkRow(b.row);tbody.appendChild(r);
      if(over()){r.remove();if(!tbody.children.length)tbody.closest('.b-tbl').remove();if(!newPage())break;openTable(b.table);tbody.appendChild(r)}
    }else{
      tbody=null;const el=mk(b.html);if(b.bottom&&!flow.querySelector('.bot')){el.classList.add('bot');el.style.marginTop='auto'}flow.appendChild(el);
      if(over()&&flow.children.length>base()+1){el.remove();if(!newPage())break;flow.appendChild(el)}
    }
  }
  pages.forEach((p,i)=>p.querySelector('.pno').textContent=`${t('page')} ${i+1} / ${pages.length}`);
  return{pages,m};
}

function email(s){
  const m=model(s),{t,money,date}=m.c;
  const body=t('m_'+s.doc).replace('{n}',m.d.no).replace('{sum}',money(m.grand)).replace('{due}',m.d.due?date(m.d.due):'');
  return{from:`${SELLER.name} <${SELLER.email}>`,to:`${m.buyer.name} <${m.buyer.email}>`,subject:`${m.title} ${m.d.no} · ${SELLER.name}`,hello:t('m_hello'),body,bye:t('m_bye'),sender:'Liis Lillemets',company:SELLER.name,file:`${m.title.replace(/\s+/g,'_')}_${m.d.no}.pdf`};
}
window.INV={paginate,email,APPLY,docUrl};
})();
