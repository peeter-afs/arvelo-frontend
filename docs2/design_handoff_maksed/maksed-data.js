const CUST=[['Startax AS','10293847'],['Milworks OÜ','12837465'],['Timberston OÜ','14820193'],['Nordhaus Ehitus OÜ','12093847'],['Kaldapere Puit OÜ','11928374'],['Veskimäe Talu OÜ','10928475'],['Lumetek AS','10394857'],['Pärnu Sadam OÜ','12740938']];
const SUP=[['Elektrilevi OÜ','EE422200221011131489','HABAEE2X'],['Telia Eesti AS','EE551010220016645011','EEUHEE2X'],['Circle K Eesti AS','EE301010022002456014','EEUHEE2X'],['Office Day OÜ','EE602200221034512278','HABAEE2X'],['Würth OÜ','EE391010220023578018','EEUHEE2X'],['Ramirent Baltic AS','EE151010220034572014','EEUHEE2X'],['Kinnisvarahaldus Kesklinn OÜ','EE877700771001234567','LHVBEE22'],['DPD Eesti AS','EE421010220005678019','EEUHEE2X'],['Tallinna Vesi AS','EE702200221012345678','HABAEE2X'],['Rehvid Pluss OÜ','EE482200221055512341','HABAEE2X']];
const BANKS=[{id:'b1',name:'Swedbank põhikonto',iban:'EE382200221020145685',prov:'Swedbank Gateway',code:'1021'},{id:'b2',name:'LHV arvelduskonto',iban:'EE717700771002345678',prov:'LHV Connect',code:'1022'}];
const USERS=['Kadri Tamm','Peeter Saar','Automaatne sidumine'];
const PALET=[['#ffe7df','#b8330f'],['#e2efe9','#0e7b5a'],['#eaf0ff','#2c5cf6'],['#f5ecd6','#7d5a13'],['#efe9fb','#6b3fc4'],['#f0ede5','#4a4946']];
function rng(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646}}
const R=rng(42);
const pick=a=>a[Math.floor(R()*a.length)];
const pad=n=>String(n).padStart(2,'0');
const TODAY=new Date(2026,9,7);
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const dstr=d=>pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear();
const r2=n=>Math.round(n*100)/100;

const PAYMENTS=[];
let inv=25790,jn=3410;
for(let i=0;i<46;i++){
  const incoming=R()<0.62;
  const d=addD(TODAY,-Math.floor(i*2.1+R()*2));
  const total=r2(incoming?120+R()*2600:18+R()*1400);
  const partial=R()<0.14;
  const amount=partial?r2(total*(0.3+R()*0.4)):total;
  const prevPaid=partial&&R()<0.5?r2((total-amount)*0.5):0;
  let status=i<4?'draft':(R()<0.06?'reversed':'posted');
  const p=incoming?pick(CUST):pick(SUP);
  const bank=R()<0.75?BANKS[0]:BANKS[1];
  const invNo=incoming?String(inv+=1+Math.floor(R()*3)):(['AR-','','INV-','2026/'][Math.floor(R()*4)]+(1000+Math.floor(R()*9000)));
  const paid=status==='posted'?r2(amount+prevPaid):prevPaid;
  const open=r2(total-paid);
  const src=status==='draft'?'Pangaimport · ootab kinnitust':(R()<0.7?'Pangaimport · '+bank.name:(incoming?'Käsitsi registreeritud · kaart':'Maksepakett'));
  PAYMENTS.push({id:'p'+i,direction:incoming?'incoming':'outgoing',date:d,amount,currency:'EUR',partner:p[0],invoice:invNo,invoiceType:incoming?'Müügiarve':'Ostuarve',invTotal:total,invPaid:paid,invOpen:open,
    invStatus:open<=0.004?'Tasutud':(paid>0?'Osaliselt tasutud':(status==='reversed'?'Avatud':'Avatud')),
    due:addD(d,incoming?(R()<0.5?0:-7):3),ref:incoming?invNo+'00'+Math.floor(1000+R()*8999):'',desc:incoming?'Arve '+invNo:'Arve '+invNo+' tasumine',
    bank,status,entry:status==='draft'?null:'MK-'+(jn--),src,user:status==='draft'?null:pick(USERS),
    reason:status==='reversed'?pick(['Vale arvega seotud','Topeltimport','Pank tagastas makse']):null,revEntry:status==='reversed'?'MK-'+(4100+i):null});
}

const BSTAT={draft:['Mustand','draft'],generated:['Fail loodud','info'],uploaded:['Panka üles laaditud','pend'],sent:['Saadetud panka','pend'],confirmed:['Täidetud','ok'],rejected:['Pank keeldus','bad'],voided:['Tühistatud','void']};
function mkLines(n,seed){const out=[];for(let i=0;i<n;i++){const s=SUP[(seed+i*3)%SUP.length];const a=r2(40+R()*1800);const manual=i===n-1&&seed%3===0;
  out.push({inv:manual?null:(['AR-','','INV-'][i%3]+(4000+Math.floor(R()*5000))),payee:manual?'Maksu- ja Tolliamet':s[0],iban:manual?'EE522200221023241783':s[1],bic:manual?'HABAEE2X':s[2],ref:manual?'10293847':(R()<0.6?String(Math.floor(1e9+R()*8e9)):''),desc:manual?'Käibemaks 09.2026':'Arve tasumine',amount:a,acct:manual?'2310 KM võlg':null,warn:(!manual&&R()<0.12)?['Viitenumber puudub, kasutatakse selgitust']:[],status:'pending'})}return out}
function mkPayroll(){const E=['Mari Kask','Jaan Lepp','Kristi Mägi','Andres Põld','Liis Saar'];const L=E.map((n,i)=>({inv:null,emp:true,payee:n,iban:'EE'+(20+i*7)+'22002210'+(12345678+i*1111),bic:'HABAEE2X',ref:'',desc:'Töötasu 09/2026',amount:r2(1100+R()*1600),acct:'2410 Palgavõlg',warn:[],status:'pending'}));L.push({inv:null,tax:true,payee:'Maksu- ja Tolliamet',iban:'EE522200221023241783',bic:'HABAEE2X',ref:'10293847',desc:'Tööjõumaksud 09/2026',amount:r2(L.reduce((s,l)=>s+l.amount,0)*0.62),acct:'2330 Tööjõumaksud',warn:[],status:'pending'});return L}
const ORIGIN={pinv:['Ostuarvetest','Ostuarved'],payroll:['Palgast','Palk'],manual:['Käsitsi','Käsitsi']};
const BATCHES=[
 {id:'mb1',name:'Palgad ja arved 08.10',bank:BANKS[0],exec:addD(TODAY,1),status:'draft',lines:mkLines(7,1),created:addD(TODAY,0),by:'Kadri Tamm'},
 {id:'mb2',name:'Ostuarved nädal 41',bank:BANKS[1],exec:TODAY,status:'sent',bankStatus:'accepted',bankAt:addD(TODAY,0),lines:mkLines(5,2),created:addD(TODAY,-1),by:'Kadri Tamm',fmt:'pain.001.001.09'},
 {id:'mb3',name:'Rent ja kommunaal 10/2026',bank:BANKS[0],exec:addD(TODAY,-2),status:'uploaded',lines:mkLines(4,3),created:addD(TODAY,-3),by:'Peeter Saar',fmt:'pain.001.001.03'},
 {id:'mb4',name:'Ostuarved nädal 40',bank:BANKS[1],exec:addD(TODAY,-6),status:'confirmed',bankStatus:'settled',bankAt:addD(TODAY,-6),lines:mkLines(9,4),created:addD(TODAY,-7),by:'Kadri Tamm',fmt:'pain.001.001.09'},
 {id:'mb5',name:'Tarnijad 30.09',bank:BANKS[0],exec:addD(TODAY,-8),status:'rejected',bankStatus:'rejected',bankAt:addD(TODAY,-8),bankReason:'Rida 3: saaja IBAN kontrollsumma ei klapi (EE15…2014)',lines:mkLines(6,5),created:addD(TODAY,-9),by:'Peeter Saar',fmt:'pain.001.001.03'},
 {id:'mb6',name:'Ostuarved nädal 39',bank:BANKS[0],exec:addD(TODAY,-13),status:'confirmed',bankStatus:'settled',bankAt:addD(TODAY,-13),lines:mkLines(11,6),created:addD(TODAY,-14),by:'Kadri Tamm',fmt:'pain.001.001.03'},
 {id:'mb9',name:'Töötasud 09/2026',origin:'payroll',run:'Palgaarvestus 09/2026',bank:BANKS[0],exec:addD(TODAY,2),status:'draft',lines:mkPayroll(),created:addD(TODAY,0),by:'Peeter Saar'},
 {id:'mb10',name:'Töötasud 08/2026',origin:'payroll',run:'Palgaarvestus 08/2026',bank:BANKS[0],exec:addD(TODAY,-27),status:'confirmed',bankStatus:'settled',bankAt:addD(TODAY,-27),lines:mkPayroll(),created:addD(TODAY,-28),by:'Peeter Saar',fmt:'pain.001.001.09'},
 {id:'mb7',name:'Test',bank:BANKS[1],exec:addD(TODAY,-20),status:'voided',voidReason:'Loodud kogemata',lines:mkLines(2,7),created:addD(TODAY,-20),by:'Peeter Saar'},
 {id:'mb8',name:'Ostuarved nädal 38',bank:BANKS[1],exec:addD(TODAY,-20),status:'confirmed',bankStatus:'settled',bankAt:addD(TODAY,-20),lines:mkLines(8,8),created:addD(TODAY,-21),by:'Kadri Tamm',fmt:'pain.001.001.09'}
];
BATCHES.forEach(b=>{if(!b.origin)b.origin=b.id==='mb3'||b.id==='mb7'?'manual':'pinv';if(b.status==='confirmed')b.lines.forEach(l=>l.status='paid');if(b.status==='rejected')b.lines[2].status='rejected'});
const PAYABLE=[];
for(let i=0;i<14;i++){const s=SUP[i%SUP.length];const due=addD(TODAY,Math.floor(-9+R()*24));const tot=r2(30+R()*2200);const part=i%6===2;
  PAYABLE.push({id:'pi'+i,inv:(['AR-','','INV-','2026/'][i%4]+(5000+Math.floor(R()*4000))),payee:s[0],iban:i===5?'':s[1],bic:s[2],due,total:tot,open:part?r2(tot*0.4):tot,status:part?'Osaliselt tasutud':'Kinnitatud',ref:i%4===1?'':String(Math.floor(1e9+R()*8e9)),inBatch:i===3?'Ostuarved nädal 41':null})}
BATCHES.sort((a,b)=>b.created-a.created);
PAYABLE.sort((a,b)=>a.due-b.due);
