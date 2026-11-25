{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k,d){try{const v=localStorage.getItem('wr.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('wr.'+k,JSON.stringify(v))}catch(e){}}};
const fmt=n=>Number(n||0).toLocaleString();
const cap=t=>t?t.charAt(0).toUpperCase()+t.slice(1):'';
const I={
 play:'<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M8 5.2v13.6L19 12z" fill="currentColor"/></svg>',
 pause:'<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z" fill="currentColor"/></svg>',
 star:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3.3l2.7 5.5 6 .9-4.4 4.2 1.1 6L12 17l-5.4 2.9 1.1-6-4.4-4.2 6-.9z" fill="var(--fill,none)" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'
};
const LIM=40,WEB=location.protocol==='https:';
const LON=Object.fromEntries('US-98 CA-106 MX-102 GT-90 CU-79 JM-77 DO-70 CO-74 VE-66 EC-78 PE-76 BO-64 BR-52 PY-58 UY-56 AR-64 CL-71 GB-2 IE-8 IS-19 FR2 DE10 ES-4 PT-8 IT12 NL5 BE4 LU6 CH8 AT14 PL19 CZ15 SK19 HU19 RO25 MD28 BG25 GR22 AL20 MK21 RS21 ME19 BA18 HR15 SI15 UA31 BY28 LT24 LV25 EE25 FI26 SE16 NO9 DK10 RU60 TR35 CY33 GE43 AM45 AZ48 IL35 PS35 LB36 JO36 SY38 IQ44 IR53 KW48 SA45 BH50 QA51 AE54 OM57 YE48 EG30 LY17 TN9 DZ3 MA-7 MR-11 SN-14 GM-15 ML-4 BF-2 GH-1 CI-5 LR-9 SL-12 GN-11 NG8 NE8 TD19 CM12 CF21 CD24 CG15 GA11 AO18 SD30 SS31 ET40 ER39 DJ43 SO46 KE38 UG32 RW30 BI30 TZ35 MW34 MZ35 ZM28 ZW30 BW24 NA18 ZA24 MG47 MU57 PK69 AF66 IN79 LK81 NP84 BD90 MM96 TH101 LA103 KH105 VN108 MY102 SG104 ID118 PH122 CN104 HK114 TW121 KR128 JP138 MN104 KZ67 UZ64 TM59 KG75 TJ71 AU134 NZ174 FJ178 PG145'.split(' ').map(p=>{const m=p.match(/^([A-Z]{2})(-?\d+)$/);return[m[1],+m[2]]}));
const CHIPS=[['Top worldwide',{}],['Somalia',{cc:'SO'}],['Kenya',{cc:'KE'}],['United States',{cc:'US'}],['United Kingdom',{cc:'GB'}],['News',{tag:'news'}],['Talk',{tag:'talk'}],['Quran',{tag:'quran'}],['Pop',{tag:'pop'}],['Hip hop',{tag:'hip hop'}],['Afrobeats',{tag:'afrobeat'}],['Jazz',{tag:'jazz'}],['Classical',{tag:'classical'}],['Lo-fi',{tag:'lofi'}],['Sports',{tag:'sport'}],['Somali',{lang:'somali'}],['Swahili',{lang:'swahili'}],['Arabic',{lang:'arabic'}]];

const sv=store.get('filters',{});
const S={tab:'explore',q:sv.q||'',cc:sv.cc||'',lang:sv.lang||'',tag:sv.tag||'',order:sv.order||'clickcount',secure:sv.secure??WEB,
 list:[],seen:new Set(),offset:0,busy:false,done:false,gen:0,cur:null,queue:[],idx:-1,want:false,tries:0};
let favs=store.get('favs',[]),recent=store.get('recent',[]),pool=[],favSet=new Set(favs.map(f=>f.stationuuid));
const setFavs=a=>{favs=a;favSet=new Set(a.map(f=>f.stationuuid));store.set('favs',a);$('#fc').textContent=a.length||''};

/* Sunni Islamic collection: gathered from the directory's tags and names, Shia/Ahmadi-marked and Iranian stations left out */
const ISL_TAGS=['quran','quraan',"qur'an",'koran','coran','kuran','islam','muslim','sunna','nasheed','hadith','dawah','dakwah','salaf','tafsir','religious','religion','قرآن','القرآن','اسلام','إسلام','السلفية','دعوة'];
const ISL_NAMES=['quran','quraan','koran','coran','islam','sunna','nasheed','iqra','salaf','sheikh','shaykh','tafsir','mustaqim','eman','iman','huda','hidaya','furqan','tawheed','masjid','mosque','adhan','قرآن','القرآن','السلفية','الحديث','الإيمان','الايمان','الشيخ','تلاوة','تفسير','السنة','دعوة','التوحيد','الهدى','الفرقان'];
const ISL_CC=['YE','SO','SA'];
const ISL_Q=[...ISL_TAGS.map(v=>['tag',v]),...ISL_NAMES.map(v=>['name',v]),...ISL_CC.map(v=>['countrycode',v])];
const ISL_RX=new RegExp(["qur'?a+n","koran","coran","kuran","islam(?!abad)","muslim","\\bsunn(?:ah?|i)\\b","nasheed","hadith","dawah","dakwah","\\biqra",
 "salaf","tafs[ie]e?r","tilawa","\\badhan\\b","\\baza?an\\b","ruqy","fatwa","\\bsh[ae]i?y?kh\\b","\\bal[\\s-]?[ie]man\\b","mustaqim","hidaya","\\bal[\\s-]?huda\\b","furqan","tawh?ee?d|tawhid","\\bmasjid","\\bmosque",
 "قرآن","القران","اسلام","إسلام","اسلامی","السلف","دار الحديث","السنة النبوية","أهل السنة","اهل السنة","الإيمان","الايمان","الشيخ","تلاوة","تلاوات","تفسير","دعوة","التوحيد","فتاوى","مصحف","الأذان","رقية","ابن القيم","ابن باز","ابن عثيمين","الألباني","الهدى","الفرقان"].join('|'),'i');
const SHIA_RX=/shi'?a\b|shia|shiite|shi'ite|ahl.?(?:ul|e|al).?ba[iy]t|hussain|husain|hussein|husayn|hossein|karbala|ashura|noha|nauha|marsiya|zahra|imam.?(?:ali|reza|riza|husain|mahdi)|mahdi|ahmadi|al.?kawthar|ja'?fari|twelver|عاشوراء|الحسين|كربلاء|أهل البيت|اهل البيت|شيعة|الكوثر/i;
let islCat='',islCC='',islFrom='',islAuto=null,islAll=null,islView=[],islBusy=false,islErr=false,extra={add:[],hide:[]};
let islMine=store.get('islMine',[]),islHide=new Set(store.get('islHide',[]));
const norm=t=>String(t||'').toLowerCase().replace(/[\s'’`\-_.·,()]+/g,'');

/* ---------- directory API (Radio Browser, with mirror fallback) ---------- */
let servers=['de1.api.radio-browser.info','de2.api.radio-browser.info','fi1.api.radio-browser.info','nl1.api.radio-browser.info'].sort(()=>Math.random()-.5),si=0;
const timed=(u,ms)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);return fetch(u,{signal:c.signal}).finally(()=>clearTimeout(t))};
async function api(path){
 for(let i=0;i<servers.length;i++){const k=(si+i)%servers.length;
  try{const r=await timed('https://'+servers[k]+'/json/'+path,10000);if(!r.ok)throw r.status;si=k;return await r.json()}catch(e){}}
 throw new Error('offline');
}
async function discover(){try{const r=await timed('https://all.api.radio-browser.info/json/servers',4000);const j=await r.json();
 const n=[...new Set(j.map(x=>x&&x.name).filter(x=>typeof x==='string'&&/^[\w.-]+$/.test(x)))];if(n.length){servers=n.sort(()=>Math.random()-.5);si=0}}catch(e){}}

/* ---------- helpers ---------- */
const nm=s=>(s.name||'').trim()||'Unnamed station';
const ini=s=>nm(s).replace(/[^\p{L}\p{N} ]/gu,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>[...w][0]).join('').toUpperCase()||'FM';
const hue=s=>{let h=7;for(const c of String(s.stationuuid||nm(s)))h=(h*31+c.charCodeAt(0))%360;return h};
const logoIn=s=>(/^https?:\/\//i.test(s.favicon||'')?`<img src="${esc(s.favicon)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'')+`<i>${esc(ini(s))}</i>`;
const lang1=s=>(s.language||'').split(',')[0].trim();
const tagsOf=s=>(s.tags||'').split(',').map(t=>t.trim()).filter(t=>t&&t.length<30).slice(0,3);
const quality=s=>[s.bitrate>0?s.bitrate+' kbps':'',s.codec&&s.codec!=='UNKNOWN'?s.codec:''].filter(Boolean).join(' ');
const info=s=>[s.countrycode||s.country,cap(lang1(s)),quality(s)].filter(Boolean).join(' · ');
const isFav=s=>!!s&&favSet.has(s.stationuuid);
const slim=s=>({stationuuid:s.stationuuid,name:s.name,aka:s.aka,about:s.about,category:s.category,url:s.url,url_resolved:s.url_resolved,homepage:s.homepage,favicon:s.favicon,tags:s.tags,country:s.country,countrycode:s.countrycode,language:s.language,codec:s.codec,bitrate:s.bitrate,hls:s.hls,geo_long:s.geo_long});
const rows=()=>S.tab==='explore'?S.list:S.tab==='islamic'?islView:S.tab==='favs'?favs:recent;
let tt=0;const toast=t=>{const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>el.classList.remove('show'),2800)};
const count=t=>{$('#count').textContent=t};
const setStatus=(t,k)=>{for(const el of[$('#nStatus'),$('#dStatus')]){el.className='sig '+k;el.querySelector('.t').textContent=t}};

/* ---------- list rendering ---------- */
const sub2=s=>s.about||(S.tab==='islamic'&&s.category?[s.category,...tagsOf(s)].join(' · '):tagsOf(s).join(', '));
const row=(s,i)=>`<li class="st${S.cur&&S.cur.stationuuid===s.stationuuid?' on':''}" data-u="${esc(s.stationuuid)}"><button class="hit" data-i="${i}"><span class="logo" style="--h:hsl(${hue(s)} 46% 40%)">${logoIn(s)}</span><span class="tx"><b>${esc(nm(s))}</b><small>${esc(info(s))}</small>${sub2(s)?`<small class="tg">${esc(sub2(s))}</small>`:''}</span></button><button class="star${isFav(s)?' is':''}" data-f="${i}" aria-label="${isFav(s)?'Remove from':'Add to'} favorites">${I.star}</button></li>`;
function describe(){const p=[];if(S.q)p.push(`“${S.q}”`);if(S.cc){const o=$('#cc').selectedOptions[0];p.push(o?o.textContent.replace(/\s*\([\d,.\s]+\)$/,''):S.cc)}if(S.lang)p.push(cap(S.lang));if(S.tag)p.push(cap(S.tag));return p.length?' for '+p.join(', '):''}
function countExplore(){
 if(S.busy&&!S.list.length)return count('Tuning in…');
 if(!S.list.length){$('#count').innerHTML='No stations match that. <button class="lnk" id="clear" type="button">Clear search and filters</button>';return}
 count(`${fmt(S.list.length)} station${S.list.length===1?'':'s'}${describe()}${S.done?'':', more load as you scroll'}`);
}
function render(){
 const r=rows();$('#list').innerHTML=r.map(row).join('');$('#more').hidden=S.tab!=='explore'||S.done||!r.length;
 if(S.tab==='islamic')islMeta();
 else if(S.tab==='favs')count(r.length?`${r.length} favorite station${r.length>1?'s':''}`:'No favorites yet. Tap the star on any station to keep it here.');
 else if(S.tab==='recent')count(r.length?'Recently played on this device':'Stations you play will show up here.');
 else countExplore();
}
function islMeta(){
 const r=islView,all=islAll||[],q=$('#iq').value.trim(),on=r.length>0&&r.every(isFav);
 $('#starAll').textContent=on?'Unstar all':'Star all';$('#starAll').hidden=!r.length;
 if(!islAuto)return count(islErr?"Couldn't reach the radio directory. Check your connection, then open this tab again.":'Gathering Sunni Islamic stations…');
 else if(!r.length)count(q?'No Islamic stations match that filter.':'No Islamic stations found right now.');
 else{const nc=new Set(all.map(x=>x.countrycode||'--')).size;count(`${q||islCat||islCC?`${fmt(r.length)} of `:''}${fmt(all.length)} Sunni Islamic stations from ${fmt(nc)} countries, A to Z · ${fmt(r.filter(isFav).length)} starred`)}
}
async function load(reset){
 if(reset){S.gen++;S.list=[];S.seen=new Set();S.offset=0;S.done=false;S.busy=false;if(S.tab==='explore'){$('#list').innerHTML='';$('#more').hidden=true}
  if(S.q){const q=norm(S.q);for(const s of[...extra.add,...islMine]){if(S.seen.has(s.stationuuid)||!norm([s.name,s.aka].join(' ')).includes(q)||(S.cc&&s.countrycode!==S.cc))continue;S.seen.add(s.stationuuid);S.seen.add((s.url_resolved||s.url||'').replace(/\/+$/,''));S.list.push(s)}
   if(S.list.length&&S.tab==='explore')$('#list').innerHTML=S.list.map(row).join('')}}
 if(S.busy||S.done)return;
 const g=S.gen;S.busy=true;if(S.tab==='explore'&&!S.list.length)count('Tuning in…');
 const p=new URLSearchParams({limit:LIM,offset:S.offset,hidebroken:'true',order:S.order,reverse:S.order==='name'?'false':'true'});
 if(S.q)p.set('name',S.q);if(S.cc)p.set('countrycode',S.cc);if(S.lang)p.set('language',S.lang);if(S.tag)p.set('tag',S.tag);if(S.secure)p.set('is_https','true');
 try{
  const r=await api('stations/search?'+p);if(g!==S.gen)return;
  S.offset+=r.length;if(r.length<LIM)S.done=true;
  const add=r.filter(s=>{const k=(s.url_resolved||s.url||'').replace(/\/+$/,'');if(!s.stationuuid||S.seen.has(s.stationuuid)||S.seen.has(k))return false;S.seen.add(s.stationuuid);S.seen.add(k);return true}).map(slim);
  const at=S.list.length;S.list.push(...add);S.busy=false;
  if(S.tab==='explore'){$('#list').insertAdjacentHTML('beforeend',add.map((s,j)=>row(s,at+j)).join(''));$('#more').hidden=S.done||!S.list.length;countExplore()}
  if(!add.length&&!S.done)load(false);
 }catch(e){if(g!==S.gen)return;S.busy=false;if(S.tab==='explore'){count("Couldn't reach the radio directory. Check your connection, then search again.");$('#more').hidden=!S.list.length}}
}
const coll=new Intl.Collator(undefined,{sensitivity:'base',numeric:true});
const sortKey=s=>nm(s).replace(/^[^\p{L}\p{N}]+/u,'')||nm(s);
function filterIsl(){const q=norm($('#iq').value),a=islAll||[];
 islView=a.filter(s=>(!q||norm([s.name,s.aka,s.about,s.country,s.language,s.tags,s.category].join(' ')).includes(q))&&(!islCat||(s.category||'Islamic talk')===islCat)&&(!islCC||(s.countrycode||'--')===islCC))}
const CATS=['Quran','Lectures & dawah','Nasheed','Mosque live','Islamic talk'];
function islControls(){const a=islAll||[],cc=new Map(),cat=new Map();
 for(const s of a){const k=s.countrycode||'--';const o=cc.get(k)||{n:0,name:k==='--'?'Online (Quran reciters)':(s.country||k)};o.n++;cc.set(k,o);const c=s.category||'Islamic talk';cat.set(c,(cat.get(c)||0)+1)}
 $('#icats').innerHTML=[['',`All (${fmt(a.length)})`],...CATS.filter(c=>cat.get(c)).map(c=>[c,`${c} (${fmt(cat.get(c))})`])].map(([v,l])=>`<button class="chip${v===islCat?' on':''}" type="button" data-v="${esc(v)}">${esc(l)}</button>`).join('');
 const el=$('#icc');el.innerHTML='<option value="">All countries</option>'+[...cc].sort((x,y)=>x[1].name.localeCompare(y[1].name)).map(([k,o])=>`<option value="${esc(k)}">${esc(o.name)} (${fmt(o.n)})</option>`).join('');
 if(islCC&&!cc.has(islCC))islCC='';el.value=islCC}
function buildIsl(){
 if(!islAuto&&!extra.add.length&&!islMine.length){islAll=null;islView=[];return}
 const hide=new Set([...islHide,...extra.hide]),ids=new Set(),urls=new Set(),out=[];
 const push=s=>{if(!s||!s.stationuuid||hide.has(s.stationuuid)||hide.has(nm(s)))return;const u=(s.url_resolved||s.url||'').replace(/\/+$/,'');
  if(ids.has(s.stationuuid)||(u&&urls.has(u)))return;ids.add(s.stationuuid);if(u)urls.add(u);out.push(s)};
 extra.add.forEach(push);islMine.forEach(push);(islAuto||[]).forEach(push);
 islAll=out.map(s=>[sortKey(s),s]).sort((a,b)=>coll.compare(a[0],b[0])).map(x=>x[1]);islControls();filterIsl();
}
const inIsl=s=>!!s&&(islAll||[]).some(x=>x.stationuuid===s.stationuuid);
async function loadExtra(){try{const r=await fetch('islamic-extra.json',{cache:'no-cache'});if(!r.ok)return;const j=await r.json();
 extra={add:(Array.isArray(j.add)?j.add:[]).filter(x=>x&&typeof x.stationuuid==='string'&&/^https:\/\//i.test(x.url||'')),hide:(Array.isArray(j.hide)?j.hide:[]).map(String)};
 buildIsl();if(S.tab==='islamic')render();paint()}catch(e){}}
async function loadIsl(force){
 if(islBusy||(!force&&islFrom==='file'&&islAuto))return;
 islBusy=true;islErr=false;
 try{const r=await fetch('data/islamic.json',{cache:'no-cache'});if(r.ok){const j=await r.json();
  if(Array.isArray(j.stations)&&j.stations.length){islFrom='file';islAuto=j.stations.filter(x=>x&&typeof x.stationuuid==='string'&&/^https?:\/\//i.test(x.url_resolved||'')&&(!S.secure||/^https:/i.test(x.url_resolved)));
   islBusy=false;buildIsl();if(S.tab==='islamic')render();paint();return}}}catch(e){}
 islBusy=false;return gatherIsl(force)}
async function gatherIsl(force){
 if(islBusy)return;
 const c=store.get('isl2',null);
 if(!force&&!islAuto&&c&&c.secure===S.secure&&Array.isArray(c.list)){islAuto=c.list;buildIsl();if(S.tab==='islamic')render()}
 if(!force&&islAuto&&c&&c.secure===S.secure&&Date.now()-c.t<864e5)return;
 islBusy=true;islErr=false;
 const best=new Map(),urls=new Set(),jobs=ISL_Q.slice();let done=0,fails=0;
 const add=s=>{
  if(!s||!s.stationuuid)return;const txt=(s.name||'')+' '+(s.tags||'');
  if(!ISL_RX.test(txt)||SHIA_RX.test(txt)||String(s.countrycode).toUpperCase()==='IR')return;
  const u=(s.url_resolved||s.url||'').replace(/\/+$/,'');if(urls.has(u))return;urls.add(u);
  const k=sortKey(s).toLowerCase()+'|'+(s.countrycode||'');const o=best.get(k);
  if(!o||(s.clickcount||0)>(o.clickcount||0))best.set(k,s);
 };
 const work=async()=>{while(jobs.length){const[k,v]=jobs.shift();
  const p=new URLSearchParams({[k]:v,limit:'500',hidebroken:'true',order:'clickcount',reverse:'true'});if(S.secure)p.set('is_https','true');
  try{(await api('stations/search?'+p)).forEach(add)}catch(e){fails++}
  done++;if(!islAuto&&S.tab==='islamic')count(`Gathering Sunni Islamic stations… ${Math.round(done/ISL_Q.length*100)}%`)}};
 await Promise.all([work(),work(),work(),work()]);
 islBusy=false;
 if(fails===ISL_Q.length){islErr=!islAuto;if(S.tab==='islamic')render();return}
 const list=[...best.values()].map(slim);
 try{localStorage.removeItem('wr.isl')}catch(e){}
 store.set('isl2',{t:Date.now(),secure:S.secure,list});islAuto=list;buildIsl();if(S.tab==='islamic')render();paint();
}
async function meta(){
 api('stats').then(st=>{$('#stat').textContent=`${fmt(st.stations)} stations · ${fmt(st.countries)} countries · ${fmt(st.languages)} languages`}).catch(()=>{$('#stat').textContent='Station directory is not reachable right now'});
 api('countries?hidebroken=true').then(c=>{const m=new Map();for(const x of c){const k=String(x.iso_3166_1||'').toUpperCase();if(!/^[A-Z]{2}$/.test(k)||!x.stationcount)continue;const o=m.get(k);if(o)o.n+=x.stationcount;else m.set(k,{name:x.name||k,n:x.stationcount})}
  fill('cc','All countries',[...m].sort((a,b)=>a[1].name.localeCompare(b[1].name)).map(([k,o])=>[k,o.name,o.n]),S.cc)}).catch(()=>{});
 api('languages?order=stationcount&reverse=true&hidebroken=true&limit=400').then(l=>fill('lang','All languages',l.filter(x=>x.name&&x.stationcount>=3).sort((a,b)=>a.name.localeCompare(b.name)).map(x=>[x.name,cap(x.name),x.stationcount]),S.lang)).catch(()=>{});
 api('tags?order=stationcount&reverse=true&hidebroken=true&limit=300').then(t=>fill('tag','All genres',t.filter(x=>x.name&&x.name.length<30).map(x=>[x.name,cap(x.name),x.stationcount]),S.tag)).catch(()=>{});
}
function fill(id,all,items,val){const el=$('#'+id);el.innerHTML=`<option value="">${all}</option>`+items.map(([v,t,n])=>`<option value="${esc(v)}">${esc(t)} (${fmt(n)})</option>`).join('');setSel(el,val)}
function setSel(el,v){if(v&&![...el.options].some(o=>o.value===v))el.insertAdjacentHTML('beforeend',`<option value="${esc(v)}">${esc(el.id==='cc'?v:cap(v))}</option>`);el.value=v||''}
function markChips(){$$('.chip').forEach(b=>{const f=CHIPS[+b.dataset.c][1];b.classList.toggle('on',!S.q&&(f.cc||'')===S.cc&&(f.lang||'')===S.lang&&(f.tag||'')===S.tag)})}
function sync(){$('#q').value=S.q;setSel($('#cc'),S.cc);setSel($('#lang'),S.lang);setSel($('#tag'),S.tag);$('#order').value=S.order;$('#secure').checked=S.secure;markChips()}
const saveF=()=>store.set('filters',{q:S.q,cc:S.cc,lang:S.lang,tag:S.tag,order:S.order,secure:S.secure});
function apply(f){S.q=f.q||'';S.cc=f.cc||'';S.lang=f.lang||'';S.tag=f.tag||'';sync();saveF();load(true)}

/* ---------- player: keeps the stream alive ---------- */
const au=new Audio();au.preload='none';au.volume=+store.get('vol',1);$('#vol').value=au.volume;
let hls=null,hlsLib=null,switching=false,pending=false,lastT=-1,stuck=0,rt=0,shown='';
const needHls=()=>hlsLib||(hlsLib=new Promise((ok,no)=>{const sc=document.createElement('script');sc.src='vendor/hls-1.7.4.min.js';sc.integrity='sha384-p9vgU/7IYJWd3I4STrtqxqR/2cAQlhIX7D/HrTnIMEjjcUox165b7se7sxmm3zDg';sc.onload=()=>ok(window.Hls);sc.onerror=()=>{hlsLib=null;no()};document.head.appendChild(sc)}));
const streamUrl=s=>{let u=s.url_resolved||s.url||'';if(WEB&&/^http:/i.test(u))u='https:'+u.slice(5);return u};
async function start(){
 const s=S.cur;if(!s)return;clearTimeout(rt);pending=false;switching=true;lastT=-1;stuck=0;setStatus('Connecting…','wait');
 if(hls){hls.destroy();hls=null}
 const u=streamUrl(s),isH=s.hls==1||/\.m3u8($|\?)/i.test(u);
 try{
  if(isH&&!au.canPlayType('application/vnd.apple.mpegurl')){
   const H=await needHls();if(S.cur!==s)return;
   if(H&&H.isSupported()){hls=new H();hls.on(H.Events.ERROR,(e,d)=>{if(d&&d.fatal)fail()});hls.loadSource(u);hls.attachMedia(au)}else au.src=u;
  }else au.src=u;
  await au.play();switching=false;if(!S.want)stop();
 }catch(err){
  switching=false;if(S.cur!==s||!S.want)return;
  if(err&&err.name==='NotAllowedError'){S.want=false;setStatus('Tap play to listen','idle');paint()}
  else if(!(err&&err.name==='AbortError'))fail();
 }
 media();
}
function fail(){
 if(!S.want||!S.cur||pending)return;switching=false;S.tries++;
 if(S.tries<=3){pending=true;setStatus(`Signal lost, reconnecting (${S.tries} of 3)…`,'wait');clearTimeout(rt);rt=setTimeout(start,1200*S.tries);return}
 if($('#skip').checked&&S.queue.length>1){toast(`${nm(S.cur)} is off air. Moving to the next station.`);step(1);return}
 stop();setStatus('This station is off air right now. Try another one.','err');
}
function stop(){S.want=false;pending=false;clearTimeout(rt);switching=true;au.pause();if(hls){hls.destroy();hls=null}au.removeAttribute('src');au.load();switching=false;paint()}
au.addEventListener('playing',()=>{S.tries=0;setStatus('Live','live');paint()});
au.addEventListener('waiting',()=>{if(S.want&&!pending)setStatus('Buffering…','wait')});
au.addEventListener('error',()=>{if(!switching&&au.getAttribute('src'))fail()});
au.addEventListener('ended',()=>{if(S.want)fail()});
au.addEventListener('pause',()=>{if(!switching&&!pending&&S.want&&!au.ended&&!au.error){
 S.want=false;
 if(document.hidden&&$('#resume').checked){resumeAfter=true;setStatus('Paused by another app · resumes when you come back','idle')}
 else setStatus('Paused','idle');
 paint()}});
/* Another app (video, call, voice note) took the sound while World Radio was in the background:
   phones don't let a web page restart sound from the background, so pick up as soon as you're back. */
let resumeAfter=false;
function comeBack(){if(document.hidden||!resumeAfter||!S.cur||S.want)return;resumeAfter=false;S.want=true;S.tries=0;pending=false;paint();start()}
document.addEventListener('visibilitychange',comeBack);window.addEventListener('focus',comeBack);window.addEventListener('pageshow',comeBack);
setInterval(()=>{if(!S.want||switching||pending)return;const t=au.currentTime;if(!au.paused&&t>lastT+.05){lastT=t;stuck=0;return}if(++stuck>=4){stuck=0;fail()}},4000);

function play(s,q,i){
 resumeAfter=false;S.cur=s;S.queue=q&&q.length?q:[s];S.idx=i??S.queue.findIndex(x=>x.stationuuid===s.stationuuid);S.want=true;S.tries=0;pending=false;
 recent=[slim(s),...recent.filter(x=>x.stationuuid!==s.stationuuid)].slice(0,50);store.set('recent',recent);store.set('last',slim(s));
 api('url/'+encodeURIComponent(s.stationuuid)).catch(()=>{});
 paint();start();
 if(S.tab==='recent')render();
 if(S.queue===S.list&&S.idx>=S.list.length-3)load(false);
}
function step(d){const q=S.queue;if(!S.cur||!q.length)return toggle();const i=((S.idx<0?0:S.idx)+d+q.length)%q.length;play(q[i],q,i)}
function toggle(){
 resumeAfter=false;
 if(!S.cur){const r=rows();return r.length?play(r[0],r,0):surprise()}
 if(S.want){stop();setStatus('Paused','idle')}else{S.want=true;S.tries=0;pending=false;paint();start()}
}
async function refill(){try{const p=new URLSearchParams({order:'random',limit:'30',hidebroken:'true'});if(S.secure)p.set('is_https','true');pool=(await api('stations/search?'+p)).map(slim)}catch(e){pool=[]}}
async function surprise(){
 if(pool.length){const q=pool;pool=[];play(q[0],q,0);refill();return}
 toast('Spinning the globe…');await refill();if(pool.length){const q=pool;pool=[];play(q[0],q,0);refill()}else toast("Couldn't reach the radio directory")
}
function fav(s){
 if(!s)return;const on=isFav(s);
 setFavs(on?favs.filter(f=>f.stationuuid!==s.stationuuid):[slim(s),...favs]);toast(on?'Removed from favorites':'Saved to favorites');
 if(S.tab==='favs')render();else{$$('.st').forEach(li=>{if(li.dataset.u===s.stationuuid){const b=li.querySelector('.star');b.classList.toggle('is',!on);b.setAttribute('aria-label',(on?'Add to':'Remove from')+' favorites')}});if(S.tab==='islamic')islMeta()}
 paint();
}
function media(){
 if(!('mediaSession' in navigator)||!S.cur)return;const s=S.cur;
 try{navigator.mediaSession.metadata=new MediaMetadata({title:nm(s),artist:[s.country,cap(lang1(s))].filter(Boolean).join(' · ')||'Live radio',album:'World Radio',artwork:/^https:/i.test(s.favicon||'')?[{src:s.favicon,sizes:'512x512'}]:[]})}catch(e){}
}
if('mediaSession' in navigator){const h=(a,f)=>{try{navigator.mediaSession.setActionHandler(a,f)}catch(e){}};
 h('play',()=>{if(!S.want)toggle()});h('pause',()=>{if(S.want)toggle()});h('stop',()=>{if(S.want)toggle()});h('nexttrack',()=>step(1));h('previoustrack',()=>step(-1))}

/* ---------- receiver paint ---------- */
const lonOf=s=>{const g=parseFloat(s.geo_long);if(Number.isFinite(g)&&g!==0&&Math.abs(g)<=180)return[g,false];const c=LON[String(s.countrycode||'').toUpperCase()];return c==null?null:[c,true]};
let rxVis=true;const dockShow=()=>$('#dock').classList.toggle('show',!rxVis&&!!S.cur);
function paint(){
 const s=S.cur,on=S.want,f=isFav(s);
 $$('.js-play').forEach(b=>{b.innerHTML=on?I.pause:I.play;b.setAttribute('aria-label',on?'Pause':'Play')});
 $$('.js-fav').forEach(b=>{b.innerHTML=I.star;b.classList.toggle('is',f);b.setAttribute('aria-label',f?'Remove from favorites':'Add to favorites')});
 try{if('mediaSession' in navigator)navigator.mediaSession.playbackState=on?'playing':'paused'}catch(e){}
 dockShow();$('#islBtn').hidden=!s;if(!s)return;
 $('#islBtn').textContent=inIsl(s)?'Remove from Islamic list':'Add to Islamic list';
 if(shown!==s.stationuuid){shown=s.stationuuid;
  $('#nName').textContent=nm(s);$('#dName').textContent=nm(s);
  $('#nSub').textContent=[s.country,cap(lang1(s)),quality(s),tagsOf(s).join(', ')].filter(Boolean).join(' · ');
  for(const el of[$('#nLogo'),$('#dLogo')]){el.style.setProperty('--h',`hsl(${hue(s)} 46% 36%)`);el.innerHTML=logoIn(s)}
  const L=lonOf(s),nd=$('#needle');nd.style.left=L?((L[0]+180)/360*100)+'%':'50%';nd.classList.toggle('lost',!L);
  $('#dcap').textContent=L?`${s.country||'Tuned in'} · ${L[1]?'about ':''}${Math.round(Math.abs(L[0]))}°${L[0]<0?'W':'E'}`:'Location not listed for this station';
  const w=$('#nWeb'),hp=s.homepage||'';if(/^https?:\/\//i.test(hp)){w.href=hp;w.hidden=false}else w.hidden=true;
  $('#copy').hidden=!(s.url_resolved||s.url);
  document.title=nm(s)+' · World Radio';
  $$('.st').forEach(li=>li.classList.toggle('on',li.dataset.u===s.stationuuid));
 }
}
const dial=$('#dial');
function drawDial(){
 const W=dial.clientWidth,H=dial.clientHeight;if(!W)return;const x=l=>((l+180)/360*W).toFixed(1);let g='';
 for(let l=-180;l<=180;l+=5){const M=l%30===0;g+=`<line x1="${x(l)}" x2="${x(l)}" y1="${H-(M?22:12)}" y2="${H-5}" stroke="currentColor" stroke-opacity="${M?.8:.4}" stroke-width="${M?1.5:1}"/>`}
 [[-98,'Americas'],[14,W<520?'Eur · Africa':'Europe · Africa'],[92,'Asia'],[150,'Oceania']].forEach(([l,t])=>g+=`<text x="${x(l)}" y="21" text-anchor="middle" fill="currentColor" font-size="13" font-family="Righteous, Archivo, sans-serif">${t}</text>`);
 if(W>=520)[-120,-60,0,60,120].forEach(l=>g+=`<text x="${x(l)}" y="${H-28}" text-anchor="middle" fill="currentColor" fill-opacity=".65" font-size="11" font-weight="600">${Math.abs(l)}°${l<0?' W':l>0?' E':''}</text>`);
 dial.innerHTML=g;
}
const dro=new ResizeObserver(drawDial);dro.observe(dial);

/* ---------- events ---------- */
$('#play').onclick=$('#dPlay').onclick=toggle;
$('#next').onclick=$('#dNext').onclick=()=>step(1);
$('#prev').onclick=()=>step(-1);
$('#nFav').onclick=$('#dFav').onclick=()=>fav(S.cur);
$('#rand').onclick=surprise;
$('#islBtn').onclick=()=>{const s=S.cur;if(!s)return;
 if(inIsl(s)){islMine=islMine.filter(x=>x.stationuuid!==s.stationuuid);islHide.add(s.stationuuid);toast('Removed from your Islamic list')}
 else{islHide.delete(s.stationuuid);if(!islMine.some(x=>x.stationuuid===s.stationuuid))islMine=[slim(s),...islMine];toast('Added to your Islamic list')}
 store.set('islMine',islMine);store.set('islHide',[...islHide]);buildIsl();if(S.tab==='islamic')render();paint()};
$('#copy').onclick=()=>{const u=S.cur&&(S.cur.url_resolved||S.cur.url);if(!u)return;try{navigator.clipboard.writeText(u).then(()=>toast('Stream link copied'),()=>toast(u))}catch(e){toast(u)}};
$('#resume').checked=store.get('resume',true);$('#resume').onchange=e=>{store.set('resume',e.target.checked);if(!e.target.checked)resumeAfter=false};
$('#vol').oninput=e=>{au.volume=+e.target.value;store.set('vol',au.volume)};
$('#list').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const r=rows();
 if(b.dataset.f!=null)return fav(r[+b.dataset.f]);
 if(b.dataset.i!=null){const i=+b.dataset.i,s=r[i];if(!s)return;if(S.cur&&S.cur.stationuuid===s.stationuuid&&S.want)return;if(S.cur&&S.cur.stationuuid===s.stationuuid)return toggle();play(s,r,i)}});
$('#count').addEventListener('click',e=>{if(e.target.id==='clear')apply({})});
$('#form').addEventListener('submit',e=>{e.preventDefault();S.q=$('#q').value.trim();saveF();markChips();load(true);$('#q').blur()});
$('#q').addEventListener('search',()=>{if(!$('#q').value&&S.q){S.q='';saveF();markChips();load(true)}});
for(const k of['cc','lang','tag'])$('#'+k).addEventListener('change',e=>{S[k]=e.target.value;saveF();markChips();load(true)});
$('#order').addEventListener('change',e=>{S.order=e.target.value;saveF();load(true)});
$('#secure').addEventListener('change',e=>{S.secure=e.target.checked;saveF();load(true);refill();islAuto=null;islFrom='';buildIsl();loadIsl()});
$('#chips').innerHTML=CHIPS.map(([l],i)=>`<button class="chip" type="button" data-c="${i}">${l}</button>`).join('');
$('#chips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(b)apply(CHIPS[+b.dataset.c][1])});
const HASH={explore:'',islamic:'islamic',favs:'favorites',recent:'recent'};
function setTab(t){
 if(!(t in HASH))t='explore';S.tab=t;store.set('tab',t);
 $$('.tab').forEach(x=>x.setAttribute('aria-selected',String(x.dataset.t===t)));
 $('#finder').hidden=t!=='explore';$('#isl').hidden=t!=='islamic';
 try{history.replaceState(null,'',location.pathname+location.search+(HASH[t]?'#'+HASH[t]:''))}catch(e){}
 render();if(t==='islamic')loadIsl();
}
$$('.tab').forEach(t=>t.addEventListener('click',()=>setTab(t.dataset.t)));
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);const t=Object.keys(HASH).find(k=>HASH[k]===h);if(t&&t!==S.tab)setTab(t)});
$('#iq').addEventListener('input',()=>{filterIsl();render()});
$('#icats').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;islCat=b.dataset.v;$$('#icats .chip').forEach(x=>x.classList.toggle('on',x===b));filterIsl();render()});
$('#icc').addEventListener('change',e=>{islCC=e.target.value;filterIsl();render()});
$('#starAll').addEventListener('click',()=>{
 const v=islView;if(!v.length)return;const on=v.every(isFav);
 if(on){const drop=new Set(v.map(s=>s.stationuuid));setFavs(favs.filter(f=>!drop.has(f.stationuuid)));toast(`Removed ${fmt(v.length)} stations from favorites`)}
 else{const add=v.filter(s=>!isFav(s)).map(slim);setFavs([...add,...favs]);toast(`Starred ${fmt(add.length)} stations`)}
 render();paint();
});
$('#more').onclick=()=>load(false);
const io=new IntersectionObserver(es=>{if(es[0].isIntersecting&&S.tab==='explore')load(false)},{rootMargin:'700px 0px'});io.observe($('#more'));
const kio=new IntersectionObserver(es=>{rxVis=es[0].isIntersecting;dockShow()});kio.observe($('#keys'));
document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea')||e.metaKey||e.ctrlKey||e.altKey)return;
 if(e.key===' '){e.preventDefault();toggle()}else if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowLeft')step(-1);else if(e.key==='f')fav(S.cur)});

document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.closest('.logo'))t.remove()},true);

/* ---------- start ---------- */
$('#secHint').hidden=!WEB;$('#fc').textContent=favs.length||'';sync();paint();
const last=store.get('last',null);
if(last&&last.stationuuid){S.cur=last;S.queue=[last];S.idx=0;paint();setStatus('Tap play to pick up where you left off','idle')}
{const h=location.hash.slice(1),t=Object.keys(HASH).find(k=>HASH[k]===h&&h);setTab(t||store.get('tab','explore'))}
{const c=store.get('isl2',null);if(c&&c.secure===S.secure&&Array.isArray(c.list))islAuto=c.list;buildIsl();paint()}
Promise.all([discover(),loadExtra()]).then(()=>{meta();load(true);refill();loadIsl()});
}
