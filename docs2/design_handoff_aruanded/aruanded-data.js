function rng(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646}}
const R=rng(7);
const r2=n=>Math.round(n*100)/100;
const pad=n=>String(n).padStart(2,'0');
const TODAY=new Date(2026,9,7);
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const dstr=d=>pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear();
const COMPANY={name:'Autofutur OÜ',reg:'12345678',vat:'EE101234567',addr:'Peterburi tee 46, 11415 Tallinn'};
const cf=()=>0.74+R()*0.42;

const PL=[
 {side:'rev',t:'Müügitulu',lines:[['3510','Müügitulu teenustest',184230.50],['3520','Kaupade müük',62418.20]]},
 {side:'rev',t:'Muud äritulud',lines:[['3810','Muud tulud',1240.00],['3820','Põhivara müügikasum',0]]},
 {side:'exp',t:'Kaubad, toore, materjal ja teenused',lines:[['4070','Materjalid',38420.15],['4110','Ostetud kaubad',41230.60],['4120','Allhanketööd',18400.00]]},
 {side:'exp',t:'Mitmesugused tegevuskulud',lines:[['4010','Kontorikulud',3210.44],['4020','Side- ja IT-kulud',6820.10],['4030','Transpordikulud',4120.66],['4040','Kütus',7340.22],['4050','Rent',21600.00],['4060','Kommunaalkulud',4880.31],['4080','Pangatasud',412.80],['4090','Esinduskulud',0]]},
 {side:'exp',t:'Tööjõukulud',lines:[['5010','Palgad',62400.00],['5020','Sotsiaalmaks',20592.00],['5030','Töötuskindlustus',499.20]]},
 {side:'exp',t:'Põhivara kulum',lines:[['5110','Põhivara kulum',9733.33]]},
 {side:'fin',t:'Finantstulud ja -kulud',lines:[['6010','Intressikulud',-1420.50],['6020','Kasum/kahjum valuutakursi muutustest',0]]},
 {side:'tax',t:'Tulumaks',lines:[['6510','Tulumaks',0]]}
];
PL.forEach(g=>g.lines=g.lines.map(([c,n,v])=>{const s=g.side==='exp'||g.side==='tax'?-1:1;const val=g.side==='fin'?v:s*v;return {c,n,v:val,cv:r2(val*cf())}}));

const BS={
 assets:[{t:'Käibevara',lines:[['1010','Kassa',412.50],['1021','Swedbank põhikonto',48230.18],['1022','LHV arvelduskonto',12904.77],['1210','Ostjate laekumata arved',36812.40],['1230','Ebatõenäoliselt laekuvad arved',-1200],['1510','Ettemakstud maksud',3418.22],['1610','Ettemaksed tarnijatele',2150],['1710','Kaubad müügiks',18420],['1720','Lõpetamata tööd',7340],['1730','Ettemaksed varude eest',0]]},
  {t:'Põhivara',lines:[['1810','Masinad ja seadmed',64000],['1819','Masinate akumuleeritud kulum',-21333.33],['1910','Arvutid ja IT-seadmed',8400],['1919','IT-seadmete akumuleeritud kulum',-4200]]}],
 liab:[{t:'Lühiajalised kohustised',lines:[['2110','Võlad tarnijatele',22418.90],['2310','Käibemaksuvõlg',6102.40],['2330','Tööjõumaksude võlg',4812.11],['2410','Palgavõlg',9640],['2510','Lühiajalised laenud',12000],['2520','Saadud ettemaksed',1850]]},
  {t:'Pikaajalised kohustised',lines:[['2610','Pangalaen',38000]]}],
 equity:[{t:'Omakapital',lines:[['2810','Osakapital',2500],['2820','Kohustuslik reservkapital',250],['2830','Eelmiste perioodide jaotamata kasum',0],['','Aruandeaasta kasum',0]]}]
};
for(const k of ['assets','liab','equity'])BS[k].forEach(g=>g.lines=g.lines.map(([c,n,v])=>({c,n,v,cv:(c==='2810'||c==='2820')?v:r2(v*cf())})));
(()=>{const sum=(k,f)=>BS[k].reduce((s,g)=>s+g.lines.reduce((a,l)=>a+l[f],0),0);
 const net=PL.reduce((s,g)=>s+g.lines.reduce((a,l)=>a+l.v,0),0),cnet=r2(PL.reduce((s,g)=>s+g.lines.reduce((a,l)=>a+l.cv,0),0)*1.32);
 const eq=BS.equity[0].lines;eq[3].v=r2(net);eq[3].cv=cnet;eq[3].special=true;
 eq[2].v=r2(sum('assets','v')-sum('liab','v')-2750-net);eq[2].cv=r2(sum('assets','cv')-sum('liab','cv')-2750-cnet)})();

const CUST=['Startax AS','Milworks OÜ','Timberston OÜ','Nordhaus Ehitus OÜ','Kaldapere Puit OÜ','Veskimäe Talu OÜ','Lumetek AS','Pärnu Sadam OÜ','Rae Vallavalitsus','Kuusiku Mõis OÜ'];
const SUPP=['Elektrilevi OÜ','Telia Eesti AS','Würth OÜ','Ramirent Baltic AS','Kinnisvarahaldus Kesklinn OÜ','Circle K Eesti AS','Office Day OÜ','DPD Eesti AS','Rehvid Pluss OÜ'];
function mkAging(names,pref){let n=25800;return names.map((p,pi)=>{const k=1+Math.floor(R()*4);const inv=[];for(let i=0;i<k;i++){const od=R()<0.45?-Math.floor(R()*20):Math.floor(R()*(pi%4===3?130:70));const amt=r2(80+R()*3200);const due=addD(TODAY,-od);inv.push({nr:pref?pref+(1000+Math.floor(R()*9000)):String(n+=1+Math.floor(R()*7)),date:addD(due,-14),due,od,amt:R()<0.2?r2(amt*0.4):amt})}
 const b=[0,0,0,0,0];inv.forEach(v=>{const i=v.od<=0?0:v.od<=30?1:v.od<=60?2:v.od<=90?3:4;b[i]+=v.amt});return {id:pref+pi,name:p,b:b.map(r2),total:r2(b.reduce((s,x)=>s+x,0)),inv:inv.sort((a,b)=>b.od-a.od)}}).sort((a,b)=>b.total-a.total)}
const AGING={receivable:mkAging(CUST,''),payable:mkAging(SUPP,'AR-')};

const DIM={
 cost_centers:[
  {id:'cc1',code:'TLN',name:'Tallinna kontor',rev:142300.40,costs:118204.22,drev:4200,dcost:1830},
  {id:'cc2',code:'TRT',name:'Tartu kontor',rev:68420.10,costs:61005.90,drev:0,dcost:640},
  {id:'cc3',code:'TOOT',name:'Tootmine',rev:36000.00,costs:44128.41,drev:2100,dcost:3220},
  {id:'cc4',code:'ADM',name:'Üldkulud',rev:0,costs:16321.28,drev:0,dcost:410}],
 projects:[
  {id:'pr1',code:'P-014',name:'Viimsi eramu',partner:'Nordhaus Ehitus OÜ',status:'in_progress',rev:48200,costs:39410.55,wip:7340,drev:6000,dcost:2210},
  {id:'pr2',code:'P-016',name:'Pärnu sadama kai remont',partner:'Pärnu Sadam OÜ',status:'in_progress',rev:21400,costs:24890.12,wip:5120,drev:0,dcost:1840},
  {id:'pr3',code:'P-011',name:'Kaldapere ladu',partner:'Kaldapere Puit OÜ',status:'completed',done:new Date(2026,7,15),rev:36850,costs:28104.30,wip:0,drev:0,dcost:0},
  {id:'pr4',code:'P-009',name:'Hooldusleping 2026',partner:'Lumetek AS',status:'in_progress',rev:14400,costs:6120.44,wip:0,drev:1200,dcost:0},
  {id:'pr5',code:'P-012',name:'Sisemine IT-arendus',partner:null,status:'in_progress',rev:0,costs:8740.00,wip:0,drev:0,dcost:520},
  {id:'pr6',code:'P-007',name:'Rae koolimaja fassaad',partner:'Rae Vallavalitsus',status:'completed',done:new Date(2026,4,30),rev:58300,costs:51290.80,wip:0,drev:0,dcost:0}]
};
const DACC={rev:[['3510','Müügitulu teenustest'],['3520','Kaupade müük']],cost:[['4070','Materjalid'],['4120','Allhanketööd'],['5010','Palgad'],['4030','Transpordikulud'],['4050','Rent']]};
[...DIM.cost_centers,...DIM.projects].forEach(d=>{const split=(tot,acc)=>{let left=tot;return acc.map(([c,n],i)=>{const v=i===acc.length-1?left:r2(tot*(0.15+R()*0.35));left=r2(left-v);return {c,n,v}}).filter(x=>x.v>0.004)};
 d.byRev=d.rev?split(d.rev,DACC.rev):[];d.byCost=split(d.costs,DACC.cost.slice(0,3+Math.floor(R()*3)));
 d.lines=[];const k=4+Math.floor(R()*5);for(let i=0;i<k;i++){const rev=d.rev&&i%2===0;d.lines.push({date:addD(TODAY,-Math.floor(R()*240)),nr:rev?String(25600+Math.floor(R()*300)):'AR-'+(1000+Math.floor(R()*9000)),partner:rev?(d.partner||CUST[i%CUST.length]):SUPP[i%SUPP.length],amt:r2(200+R()*6000),kind:rev?'rev':'cost'})}d.lines.sort((a,b)=>b.date-a.date)});
