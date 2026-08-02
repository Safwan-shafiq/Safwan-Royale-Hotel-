/* ============================================================
   SAFWAN ROYALE — HOTEL RESERVATION & MANAGEMENT SYSTEM
   Application logic — data layer, router, pages
   ============================================================ */
(function(){
"use strict";

/* ===================== CONSTANTS ===================== */
const TOTAL_ROOMS = 50;
const FLOORS = 5;
const ROOMS_PER_FLOOR = 10;
const PRICES = { Simple: 5000, Double: 8000, Delux: 12000 };
const ROOM_TYPE_CYCLE = ["Simple","Double","Delux","Simple","Double","Delux","Double","Delux","Simple","Double"];
const FLOOR_DESC = {
  1: "Cool and well furnished rooms, each with an attached washroom.",
  2: "Airy and light-filled rooms with a private balcony and washroom.",
  3: "Airy and light-filled rooms with a private balcony and washroom.",
  4: "Airy and light-filled rooms with a private balcony and washroom.",
  5: "Our top-tier floor — airy rooms with a balcony, washroom and skyline views."
};
/* ===================== DATA LAYER ===================== */
let DB = null;

function seedData(){
  const rooms = [];
  for(let n = 1; n <= TOTAL_ROOMS; n++){
    const floor = Math.ceil(n / ROOMS_PER_FLOOR);
    const type = ROOM_TYPE_CYCLE[(n-1) % ROOM_TYPE_CYCLE.length];
    rooms.push({ number: n, floor, type, price: PRICES[type], status: "available" });
  }
  return {
    rooms,
    reservations: [],
    feedback: [
      { id: fid(), name:"Ayesha Khan", rating:5, comment:"Beautiful property, the staff at the front desk were incredibly attentive. Will absolutely return on my next Lahore trip.", date: daysAgo(6) },
      { id: fid(), name:"Bilal Ahmed", rating:4, comment:"Great rooms and a wonderful rooftop pool. Check-in took a little longer than expected but overall a lovely stay.", date: daysAgo(14) }
    ],
    activity: [{ id: fid(), icon:"fa-solid fa-circle-info", text:"System initialized — 50 rooms across 5 floors ready.", time: Date.now() - 1000*60*60*3 }],
    subscribers: [],
    contactMessages: [],
    seq: 1000
  };
}

const STORE_KEY = "srh_data_v1";

/* ===================== GOOGLE SHEETS DATABASE ===================== */
const GS_URL = 'https://script.google.com/macros/s/AKfycbx8OMQ0gPkEBPQUyw-MO3nJeJbRGcb4tiyf0ZKYzPeCeCjLOVXBtp8KGbEhaT3kBz6T/exec';

// Save to both localStorage (instant) and Google Sheets (sync)
function saveData(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }catch(e){}
  // Sync to Google Sheets in background
  fetch(GS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'saveAll',
      rooms: DB.rooms,
      reservations: DB.reservations,
      feedback: DB.feedback,
      seq: DB.seq
    })
  }).catch(() => {});
}

// Load from Google Sheets first, fallback to localStorage
function loadData(){
  // Show loading screen while fetching
  showAppLoader(true);
  fetch(GS_URL + '?t=' + Date.now())
    .then(r => r.json())
    .then(data => {
      if(data && data.rooms && data.rooms.length > 0){
        // Got fresh data from Google Sheets
        const local = getLocalData();
        DB = {
          rooms: data.rooms.map(normalizeRoom),
          reservations: data.reservations.map(normalizeReservation),
          feedback: data.feedback || [],
          activity: local ? (local.activity || []) : [],
          subscribers: local ? (local.subscribers || []) : [],
          contactMessages: local ? (local.contactMessages || []) : [],
          seq: Number(data.seq) || 1000
        };
        // Ensure activity log exists
        if(!DB.activity.length){
          DB.activity = [{ id: fid(), icon:"fa-solid fa-circle-info", text:"System initialized — 50 rooms across 5 floors ready.", time: Date.now() - 1000*60*60*3 }];
        }
        try{ localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }catch(e){}
      } else {
        // Sheet empty or error — use localStorage or seed
        loadFromLocal();
      }
    })
    .catch(() => {
      // Network error — use localStorage
      loadFromLocal();
    })
    .finally(() => {
      showAppLoader(false);
      renderRoute();
    });
}

function getLocalData(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

function loadFromLocal(){
  const local = getLocalData();
  if(local && local.rooms){
    DB = local;
  } else {
    DB = seedData();
    saveData();
  }
}

// Normalize types from sheet (numbers come as strings)
function normalizeRoom(r){
  return {
    number: Number(r.number),
    floor: Number(r.floor),
    type: r.type,
    price: Number(r.price),
    status: r.status || 'available'
  };
}
function normalizeReservation(r){
  return {
    id: r.id, roomNumber: Number(r.roomNumber), roomType: r.roomType,
    rate: Number(r.rate), guestName: r.guestName, guestEmail: r.guestEmail || '',
    guestPhone: r.guestPhone || '', checkIn: r.checkIn, checkOut: r.checkOut,
    nights: Number(r.nights), total: Number(r.total),
    paymentMethod: r.paymentMethod || 'Cash', paymentStatus: r.paymentStatus || 'Pending',
    notes: r.notes || '', status: r.status || 'Reserved',
    createdAt: Number(r.createdAt) || Date.now()
  };
}

// Loading overlay
function showAppLoader(show){
  let loader = document.getElementById('app-loader');
  if(show){
    if(!loader){
      loader = document.createElement('div');
      loader.id = 'app-loader';
      loader.innerHTML = `
        <div style="text-align:center;">
          <div style="width:48px;height:48px;border:3px solid rgba(201,162,75,0.2);border-top-color:var(--brass);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 20px;"></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--brass-light);letter-spacing:0.1em;">LOADING DATA…</div>
          <div style="font-size:12px;color:var(--parchment-dim);margin-top:8px;">Syncing with server</div>
        </div>`;
      loader.style.cssText = 'position:fixed;inset:0;background:var(--ink);z-index:9999;display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(loader);
      // Add spin animation
      if(!document.getElementById('spin-style')){
        const s = document.createElement('style');
        s.id = 'spin-style';
        s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
      }
    }
  } else {
    if(loader) loader.remove();
  }
}
function fid(){ return 'id' + Math.random().toString(36).slice(2,10); }
function nextRes(){ DB.seq += 1; return 'RES-' + DB.seq; }
function daysAgo(n){ return Date.now() - n*24*60*60*1000; }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function addDays(iso, n){ const d = new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function fmtDate(iso){ if(!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtDateTime(ts){ const d = new Date(ts); return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) + ' · ' + d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
function fmtMoney(n){ return 'Rs ' + Math.round(n).toLocaleString('en-PK'); }
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function nightsBetween(a,b){ const d1=new Date(a), d2=new Date(b); return Math.max(1, Math.round((d2-d1)/86400000)); }

function getRoom(n){ return DB.rooms.find(r => r.number === Number(n)); }
function getReservation(id){ return DB.reservations.find(r => r.id === id); }
function activeReservationForRoom(n){
  return DB.reservations.find(r => r.roomNumber === Number(n) && (r.status === 'Reserved' || r.status === 'Checked-In'));
}
function logActivity(icon, text){
  DB.activity.unshift({ id: fid(), icon, text, time: Date.now() });
  DB.activity = DB.activity.slice(0, 40);
}

/* ===================== ROUTER ===================== */
const routes = {};
function route(path, render){ routes[path] = render; }
function currentHash(){ return location.hash.replace(/^#\/?/, '') || 'home'; }

function navigate(path){
  if(location.hash === '#/' + path){ renderRoute(); }
  else location.hash = '#/' + path;
}
window.srhNavigate = navigate;

function parseRoute(raw){
  const [p, qs] = raw.split('?');
  const parts = p.split('/').filter(Boolean);
  const query = {};
  if(qs) qs.split('&').forEach(kv => { const [k,v] = kv.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v||''); });
  // Join parts[1] onwards as the id (handles IDs with dashes like RES-1001)
  const id = parts.length > 1 ? parts.slice(1).join('/') : null;
  return { base: parts[0] || 'home', id, query };
}

function startLoader(){
  const bar = document.getElementById('route-loader');
  bar.classList.remove('done'); bar.classList.add('active');
}
function finishLoader(){
  const bar = document.getElementById('route-loader');
  requestAnimationFrame(()=>{
    bar.classList.remove('active'); bar.classList.add('done');
    setTimeout(()=>{ bar.style.width='0%'; bar.classList.remove('done'); }, 350);
  });
}

function renderRoute(){
  const modalRoot = document.getElementById('modal-root');
  if(modalRoot && modalRoot.classList.contains('open')){ modalRoot.classList.remove('open'); modalRoot.innerHTML=''; document.body.style.overflow=''; }
  startLoader();
  const raw = currentHash();
  const { base, id, query } = parseRoute(raw);
  const view = document.getElementById('view');
  const fn = routes[base] || routes['notfound'];
  window.scrollTo({ top: 0, behavior:'auto' });
  setTimeout(()=>{
    view.innerHTML = fn(id, query);
    afterRender(base, id, query);
    finishLoader();
    updateNavActive(base);
    closeMobileMenu();
  }, 90);
}

function updateNavActive(base){
  document.querySelectorAll('.navlinks a, .mobile-menu a').forEach(a => {
    // exact match on route
    const routeVal = a.dataset.route;
    a.classList.toggle('active', routeVal === base);
  });
}

/* ===================== UI HELPERS ===================== */
function toast(type, title, msg){
  const stack = document.getElementById('toast-stack');
  const icons = { success:'fa-solid fa-circle-check', error:'fa-solid fa-circle-exclamation', info:'fa-solid fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<i class="ti ${icons[type]||icons.info}"></i><div><div class="tt">${escapeHtml(title)}</div>${msg?`<div class="tm">${escapeHtml(msg)}</div>`:''}</div>`;
  stack.appendChild(el);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(), 300); }, 3800);
}
window.srhToast = toast;

function openModal(html, opts){
  opts = opts || {};
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-close="1"></div>
    <div class="modal-box ${opts.wide?'wide':''}" role="dialog" aria-modal="true">${html}</div>`;
  root.classList.add('open');
  document.body.style.overflow = 'hidden';
  root.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
  const box = root.querySelector('.modal-box');
  const focusable = box.querySelector('input,select,textarea,button');
  if(focusable) setTimeout(()=>focusable.focus(), 60);
}
function closeModal(){
  const root = document.getElementById('modal-root');
  root.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(()=>{ root.innerHTML=''; }, 200);
}
window.srhCloseModal = closeModal;

function confirmDialog(opts, onConfirm){
  openModal(`
    <div class="modal-head"><h3>${escapeHtml(opts.title||'Please confirm')}</h3><button class="modal-close" data-close="1"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body"><p style="color:var(--parchment-dim); font-size:14.5px; line-height:1.6;">${opts.message||''}</p></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close="1">Cancel</button>
      <button class="btn ${opts.danger?'btn-danger':'btn-primary'}" id="confirmYes">${escapeHtml(opts.confirmLabel||'Confirm')}</button>
    </div>
  `);
  document.getElementById('confirmYes').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){
    const root = document.getElementById('modal-root');
    if(root.classList.contains('open')) closeModal();
  }
});

/* ripple effect */
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn, .icon-btn, .qa-btn, .floor-tabs button');
  if(!btn) return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height) * 1.4;
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
  btn.appendChild(ripple);
  setTimeout(()=>ripple.remove(), 650);
});

/* 3D tilt */
function initTilt(root){
  (root||document).querySelectorAll('.tilt-card').forEach(card => {
    if(card._tiltBound) return;
    card._tiltBound = true;
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateX(${(-py*7).toFixed(2)}deg) rotateY(${(px*7).toFixed(2)}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

/* scroll reveal */
let revealObserver = null;
function initReveal(root){
  if(!revealObserver){
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in'); revealObserver.unobserve(en.target); } });
    }, { threshold: 0.12 });
  }
  (root||document).querySelectorAll('.reveal:not(.in)').forEach(el => revealObserver.observe(el));
}

/* counters */
function initCounters(root){
  (root||document).querySelectorAll('[data-counter]').forEach(el => {
    const target = parseFloat(el.dataset.counter);
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
    const suffix = el.dataset.suffix || '';
    const dur = 900;
    const start = performance.now();
    function tick(now){
      const p = Math.min(1, (now-start)/dur);
      const eased = 1 - Math.pow(1-p, 3);
      el.textContent = (target*eased).toFixed(decimals) + suffix;
      if(p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function afterRenderCommon(root){
  initTilt(root); initReveal(root); initCounters(root);
}

/* ===================== BREADCRUMBS ===================== */
function crumbs(items){
  const parts = [`<a data-route="home">Home</a>`];
  items.forEach((it,i) => {
    parts.push(`<span class="sep">/</span>`);
    if(it.href && i < items.length-1) parts.push(`<a data-route="${it.href}">${escapeHtml(it.label)}</a>`);
    else parts.push(`<span class="current">${escapeHtml(it.label)}</span>`);
  });
  return `<div class="breadcrumbs">${parts.join('')}</div>`;
}

/* ===================== STAT CALCULATIONS ===================== */
function computeStats(){
  const rooms = DB.rooms;
  const available = rooms.filter(r=>r.status==='available').length;
  const reserved = rooms.filter(r=>r.status==='reserved').length;
  const occupied = rooms.filter(r=>r.status==='occupied').length;
  const cleaning = rooms.filter(r=>r.status==='cleaning').length;
  const maintenance = rooms.filter(r=>r.status==='maintenance').length;
  const checkedInCount = DB.reservations.filter(r=>r.status==='Checked-In').length;
  const checkedOutCount = DB.reservations.filter(r=>r.status==='Checked-Out').length;
  const revenue = DB.reservations.filter(r=>r.status!=='Cancelled').reduce((s,r)=>s+r.total,0);
  const occupancyRate = ((reserved+occupied)/TOTAL_ROOMS*100);
  return { total: TOTAL_ROOMS, available, reserved, occupied, cleaning, maintenance, checkedInCount, checkedOutCount, revenue, occupancyRate };
}

/* ===================== HOME / MARKETING PAGE ===================== */
routes['home'] = function(){
  return `
  <section class="hero" style="padding-top:70px;">
    <div class="wrap hero-grid">
      <div class="reveal in">
        <div class="eyebrow">Luxury Hospitality · Lahore</div>
        <h1><span class="script">Safwan</span>Royale, <em>Lahore</em>.</h1>
        <p class="lede">A complete reservation and front-desk management system for a five-floor, fifty-room luxury hotel — book, manage, and oversee every stay from one elegant dashboard.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" data-route="reserve">Reserve a room <i class="fa-solid fa-arrow-right"></i></a>
          <a class="btn btn-ghost" data-route="dashboard">Open dashboard</a>
        </div>
        <div class="stat-row">
          <div class="stat"><b data-counter="50">0</b><span>ROOMS</span></div>
          <div class="stat"><b data-counter="5">0</b><span>FLOORS</span></div>
          <div class="stat"><b data-counter="3">0</b><span>ROOM TIERS</span></div>
          <div class="stat">24/7<span>FRONT DESK</span></div>
        </div>
      </div>
      <div class="keytag-hero">
        <div>
          <div class="peg"></div>
          <div class="keytag">
            <div class="hole"></div>
            <div class="num">01</div>
            <div class="lbl">Safwan Royale</div>
            <div class="floor">1st Floor · Simple</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="overview">
    <div class="wrap">
      <div class="section-head reveal">
        <div>
          <div class="eyebrow">Welcome</div>
          <h2>One front desk,<br>every comfort.</h2>
        </div>
        <p>Featuring 50 premium rooms across five floors, the system provides a seamless stay from first booking to final check-out — comfort, style, and full operational control at every step.</p>
      </div>
      <div class="overview-grid">
        <button class="ov-card tilt-card glow-border reveal" data-route="reserve">
          <div class="num">01 / BOOK <i class="fa-solid fa-arrow-right arrow"></i></div>
          <h3>Reserve a room</h3>
          <p>Pick a room, enter guest details, choose Simple, Double, or Delux, and confirm — the total is calculated automatically.</p>
        </button>
        <button class="ov-card tilt-card glow-border reveal" data-route="reservations">
          <div class="num">02 / MANAGE <i class="fa-solid fa-arrow-right arrow"></i></div>
          <h3>Manage reservations</h3>
          <p>Search, filter, edit, cancel, or print any reservation. The front desk releases rooms instantly and keeps every record current.</p>
        </button>
        <button class="ov-card tilt-card glow-border reveal" data-route="availability">
          <div class="num">03 / AVAILABILITY <i class="fa-solid fa-arrow-right arrow"></i></div>
          <h3>Real-time availability</h3>
          <p>See exactly which of our 50 rooms are open right now across all five floors — updated the moment a booking changes.</p>
        </button>
      </div>
    </div>
  </section>

  <section id="modules">
    <div class="wrap">
      <div class="section-head reveal">
        <div><div class="eyebrow">Full system</div><h2>Every module,<br>one click away.</h2></div>
        <p>Every card below opens a complete, working page — not a preview.</p>
      </div>
      <div class="card-grid reveal">
        ${moduleCardsHtml()}
      </div>
    </div>
  </section>

  <section id="architecture">
    <div class="wrap">
      <div class="section-head reveal">
        <div><div class="eyebrow">Behind the desk</div><h2>How Safwan Royale<br>keeps every room in sync.</h2></div>
        <p>From reservation to check-out, every room is managed through one connected system — click any card below to open it.</p>
      </div>
      <div class="class-grid">
        <button class="class-card tilt-card glow-border reveal" data-route="reservations">
          <div class="ctag">Every Stay, On Record</div>
          <h3>The Reservation Record</h3>
          <ul>
            <li>Guest name &amp; contact <span>who's staying</span></li>
            <li>Room number <span>which key tag</span></li>
            <li>Room type <span>Simple, Double or Delux</span></li>
            <li>Stay dates <span>check-in → check-out</span></li>
            <li>Total bill <span>calculated automatically</span></li>
            <li>Status <span>reserved, in-house, out</span></li>
          </ul>
        </button>
        <button class="class-card tilt-card glow-border reveal" data-route="rooms">
          <div class="ctag">Running The Floor</div>
          <h3>The Reservation System</h3>
          <ul>
            <li>Books a room for a guest</li>
            <li>Cancels a reservation instantly</li>
            <li>Shows every current reservation</li>
            <li>Tracks 50 rooms across 5 floors</li>
            <li>Recalls records the moment you need them</li>
          </ul>
        </button>
        <button class="class-card tilt-card glow-border reveal" data-route="dashboard">
          <div class="ctag">Front Of House</div>
          <h3>The Front Desk Manager</h3>
          <ul>
            <li>Takes every booking request</li>
            <li>Keeps one live record for all 50 rooms</li>
            <li>Runs the front desk from open to close</li>
          </ul>
        </button>
      </div>
      <div class="flow-note">Every stay is logged &nbsp;→&nbsp; tracked by the reservation system &nbsp;→&nbsp; overseen by the front desk manager</div>
    </div>
  </section>
  `;
};

function moduleCardsHtml(){
  const mods = [
    ['dashboard','fa-gauge-high','Dashboard','Live KPIs, recent activity & quick actions'],
    ['reserve','fa-bed','Reserve Room','Book a room with automatic pricing'],
    ['reservations','fa-clipboard-list','Reservations','Search, sort, edit, cancel, print'],
    ['checkin','fa-right-to-bracket','Check-In','Move guests into their rooms'],
    ['checkout','fa-right-from-bracket','Check-Out','Settle bills & free the room'],
    ['availability','fa-building','Room Availability','All 50 rooms grouped by floor'],
    ['guests','fa-users','Guests','Guest profiles & stay history'],
    ['rooms','fa-door-closed','Rooms','Manage room type, price & status'],
    ['reports','fa-chart-line','Reports','Occupancy, revenue & trends'],
    ['feedback','fa-star','Feedback','Ratings, reviews & suggestions'],
    ['about','fa-circle-info','About System','What this system does'],
    ['contact','fa-envelope','Contact','Reach the front desk']
  ];
  return mods.map(([r,icon,title,desc]) => `
    <button class="module-card tilt-card reveal" data-route="${r}">
      <i class="goto fa-solid fa-arrow-right"></i>
      <div class="icon"><i class="fa-solid ${icon}"></i></div>
      <h4>${title}</h4><p>${desc}</p>
    </button>`).join('');
}

/* ===================== DASHBOARD ===================== */
routes['dashboard'] = function(){
  const s = computeStats();
  const recent = DB.activity.slice(0,7);
  return `<div class="page"><div class="wrap">
    ${crumbs([{label:'Dashboard'}])}
    <div class="page-head">
      <div><h1>Front desk dashboard</h1><p>A live snapshot of every room, reservation, and guest across the property.</p></div>
      <div class="hero-cta">
        <button class="btn btn-primary" data-route="reserve"><i class="fa-solid fa-plus"></i> New reservation</button>
      </div>
    </div>

    <div class="kpi-grid">
      ${kpi('fa-door-open','Total Rooms', s.total,'','')}
      ${kpi('fa-circle-check','Available', s.available,'good','')}
      ${kpi('fa-bookmark','Reserved', s.reserved,'','')}
      ${kpi('fa-bed','Occupied', s.occupied,'','')}
      ${kpi('fa-right-to-bracket','Checked In', s.checkedInCount,'','')}
      ${kpi('fa-right-from-bracket','Checked Out', s.checkedOutCount,'','')}
      ${kpi('fa-sack-dollar','Revenue', s.revenue,'good','Rs ',true)}
      ${kpi('fa-chart-pie','Occupancy Rate', s.occupancyRate,'','',false,'%',1)}
    </div>

    <div class="dash-grid">
      <div class="panel reveal">
        <h3>Recent activity</h3>
        <ul class="activity-list">
          ${recent.length ? recent.map(a=>`<li><div class="a-icon"><i class="${a.icon}"></i></div><div><div class="a-text">${escapeHtml(a.text)}</div><div class="a-time">${fmtDateTime(a.time)}</div></div></li>`).join('') : `<li class="a-text">No activity yet.</li>`}
        </ul>
      </div>
      <div class="panel reveal">
        <h3>Quick actions</h3>
        <div class="quick-actions">
          <button class="qa-btn" data-route="reserve"><span class="qi"><i class="fa-solid fa-bed"></i></span><span class="qt">Reserve room</span></button>
          <button class="qa-btn" data-route="checkin"><span class="qi"><i class="fa-solid fa-right-to-bracket"></i></span><span class="qt">Check-in guest</span></button>
          <button class="qa-btn" data-route="checkout"><span class="qi"><i class="fa-solid fa-right-from-bracket"></i></span><span class="qt">Check-out guest</span></button>
          <button class="qa-btn" data-route="reports"><span class="qi"><i class="fa-solid fa-chart-line"></i></span><span class="qt">View reports</span></button>
          <button class="qa-btn" data-route="availability"><span class="qi"><i class="fa-solid fa-building"></i></span><span class="qt">Check availability</span></button>
          <button class="qa-btn" data-route="reservations"><span class="qi"><i class="fa-solid fa-clipboard-list"></i></span><span class="qt">All reservations</span></button>
        </div>
      </div>
    </div>
  </div></div>`;
};
function kpi(icon,label,val,cls,prefix,isMoney,suffix,decimals){
  suffix = suffix||''; decimals = decimals||0;
  const display = isMoney ? fmtMoney(val) : null;
  return `<div class="kpi-card ${cls} reveal">
    <div class="kicon" style="background:rgba(201,162,75,.14); color:var(--brass-light);"><i class="fa-solid ${icon}"></i></div>
    ${isMoney ? `<div class="kval">${display}</div>` : `<div class="kval"><span data-counter="${val}" data-decimals="${decimals}" data-suffix="${suffix}">0${suffix}</span></div>`}
    <div class="klabel">${label}</div>
  </div>`;
}

/* ===================== RESERVE ROOM ===================== */
routes['reserve'] = function(id, query){
  const preselect = query.room ? Number(query.room) : null;
  const available = DB.rooms.filter(r=>r.status==='available').sort((a,b)=>a.number-b.number);
  return `<div class="page"><div class="wrap-narrow">
    ${crumbs([{label:'Reserve Room'}])}
    <div class="page-head"><div><h1>Reserve a room</h1><p>Fill in guest details, choose a room, and confirm — pricing is calculated automatically from room type and length of stay.</p></div></div>

    <div class="card">
      <form id="reserveForm" novalidate>
        <div class="form-grid">
          <div class="field full"><label>Guest full name</label><input type="text" id="rGuestName" placeholder="e.g. Ayesha Khan" required><div class="errmsg">Please enter the guest's name.</div></div>
          <div class="field"><label>Email address</label><input type="email" id="rGuestEmail" placeholder="guest@email.com"><div class="errmsg">Enter a valid email.</div></div>
          <div class="field"><label>Phone number</label><input type="tel" id="rGuestPhone" placeholder="+92 3XX XXXXXXX" required><div class="errmsg">Please enter a phone number.</div></div>
          <div class="field"><label>Check-in date</label><input type="date" id="rCheckIn" value="${todayISO()}" min="${todayISO()}" required></div>
          <div class="field"><label>Check-out date</label><input type="date" id="rCheckOut" value="${addDays(todayISO(),1)}" min="${addDays(todayISO(),1)}" required></div>
          <div class="field"><label>Room type</label>
            <select id="rRoomType">
              <option value="">All types</option>
              <option value="Simple">Simple — Rs 5,000 / night</option>
              <option value="Double">Double — Rs 8,000 / night</option>
              <option value="Delux">Delux — Rs 12,000 / night</option>
            </select>
          </div>
          <div class="field"><label>Available room</label>
            <select id="rRoomNumber" required></select>
            <div class="hint" id="rRoomHint"></div>
          </div>
          <div class="field"><label>Payment method</label>
            <select id="rPayMethod">
              <option>Cash</option><option>Credit / Debit Card</option><option>Bank Transfer</option><option>Mobile Wallet</option>
            </select>
          </div>
          <div class="field"><label>Payment status</label>
            <select id="rPayStatus"><option>Pending</option><option>Paid</option><option>Partially Paid</option></select>
          </div>
          <div class="field full"><label>Special requests (optional)</label><textarea id="rNotes" placeholder="Late check-in, extra pillows, airport pickup…"></textarea></div>
        </div>

        <div class="price-summary">
          <div class="price-row"><span>Room</span><span id="sumRoom">—</span></div>
          <div class="price-row"><span>Rate / night</span><span id="sumRate">Rs 0</span></div>
          <div class="price-row"><span>Nights</span><span id="sumNights">1</span></div>
          <div class="price-row total"><span>Total bill</span><span id="sumTotal">Rs 0</span></div>
        </div>

        <div style="margin-top:22px; display:flex; gap:12px; flex-wrap:wrap;">
          <button type="submit" class="btn btn-primary" id="confirmReserveBtn"><i class="fa-solid fa-check"></i> Confirm reservation</button>
          <button type="button" class="btn btn-ghost" data-route="availability">Browse availability instead</button>
        </div>
      </form>
    </div>
  </div></div>`;
};

function initReservePage(query){
  const typeSel = document.getElementById('rRoomType');
  const roomSel = document.getElementById('rRoomNumber');
  const inDate = document.getElementById('rCheckIn');
  const outDate = document.getElementById('rCheckOut');
  const hint = document.getElementById('rRoomHint');

  function refreshRoomOptions(){
    const type = typeSel.value;
    let avail = DB.rooms.filter(r=>r.status==='available');
    if(type) avail = avail.filter(r=>r.type===type);
    avail.sort((a,b)=>a.number-b.number);
    const preselect = query && query.room ? Number(query.room) : null;
    roomSel.innerHTML = avail.length
      ? avail.map(r=>`<option value="${r.number}" ${preselect===r.number?'selected':''}>Room ${String(r.number).padStart(2,'0')} · Floor ${r.floor} · ${r.type} — ${fmtMoney(r.price)}/night</option>`).join('')
      : `<option value="">No available rooms for this type</option>`;
    hint.textContent = avail.length + ' room(s) currently available' + (type?` in ${type}`:'') + '.';
    recalc();
  }
  function recalc(){
    const roomNum = roomSel.value;
    const room = roomNum ? getRoom(roomNum) : null;
    const nights = nightsBetween(inDate.value, outDate.value);
    document.getElementById('sumRoom').textContent = room ? ('Room ' + String(room.number).padStart(2,'0') + ' · ' + room.type) : '—';
    document.getElementById('sumRate').textContent = room ? fmtMoney(room.price) : 'Rs 0';
    document.getElementById('sumNights').textContent = nights;
    document.getElementById('sumTotal').textContent = room ? fmtMoney(room.price * nights) : 'Rs 0';
  }
  typeSel.addEventListener('change', refreshRoomOptions);
  roomSel.addEventListener('change', recalc);
  inDate.addEventListener('change', () => {
    if(outDate.value <= inDate.value){ outDate.value = addDays(inDate.value,1); }
    outDate.min = addDays(inDate.value,1);
    recalc();
  });
  outDate.addEventListener('change', recalc);
  refreshRoomOptions();

  document.getElementById('reserveForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('rGuestName');
    const phone = document.getElementById('rGuestPhone');
    let ok = true;
    [ [name, name.value.trim().length>1], [phone, phone.value.trim().length>5], [roomSel, !!roomSel.value] ].forEach(([el,valid]) => {
      el.classList.toggle('err', !valid);
      el.closest('.field').classList.toggle('has-err', !valid);
      if(!valid) ok = false;
    });
    if(!ok){ toast('error','Missing information','Please complete the required fields.'); return; }
    const room = getRoom(roomSel.value);
    const nights = nightsBetween(inDate.value, outDate.value);
    const total = room.price * nights;
    const res = {
      id: nextRes(), roomNumber: room.number, roomType: room.type, rate: room.price,
      guestName: name.value.trim(), guestEmail: document.getElementById('rGuestEmail').value.trim(),
      guestPhone: phone.value.trim(), checkIn: inDate.value, checkOut: outDate.value, nights, total,
      paymentMethod: document.getElementById('rPayMethod').value, paymentStatus: document.getElementById('rPayStatus').value,
      notes: document.getElementById('rNotes').value.trim(), status: 'Reserved', createdAt: Date.now()
    };
    DB.reservations.unshift(res);
    room.status = 'reserved';
    logActivity('fa-solid fa-bookmark', `${res.guestName} reserved Room ${String(room.number).padStart(2,'0')} (${res.roomType})`);
    saveData();
    toast('success','Reservation confirmed', res.id + ' — Room ' + String(room.number).padStart(2,'0'));
    openModal(reservationDetailHtml(res.id), {});
    e.target.reset();
    document.getElementById('rCheckIn').value = todayISO();
    document.getElementById('rCheckOut').value = addDays(todayISO(),1);
    typeSel.value = '';
    refreshRoomOptions();
  });
}

/* ===================== RESERVATIONS LIST ===================== */
let resState = { search:'', status:'', type:'', sort:'createdAt', dir:-1, page:1 };
routes['reservations'] = function(){
  return `<div class="page"><div class="wrap">
    ${crumbs([{label:'Reservations'}])}
    <div class="page-head"><div><h1>Reservation management</h1><p>Search, filter, sort, edit, cancel, or print any reservation on record.</p></div>
      <button class="btn btn-primary" data-route="reserve"><i class="fa-solid fa-plus"></i> New reservation</button>
    </div>
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-box"><i class="fa-solid fa-magnifying-glass si"></i><input id="resSearch" placeholder="Search guest, room, phone…" value="${escapeHtml(resState.search)}"></div>
        <select class="select-filter" id="resFilterStatus">
          <option value="">All statuses</option>
          ${['Reserved','Checked-In','Checked-Out','Cancelled'].map(s=>`<option ${resState.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <select class="select-filter" id="resFilterType">
          <option value="">All room types</option>
          ${['Simple','Double','Delux'].map(t=>`<option ${resState.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-ghost btn-sm" id="resPrintAll"><i class="fa-solid fa-print"></i> Print list</button>
    </div>
    <div id="resTableHolder"></div>
  </div></div>`;
};
function renderReservationTable(){
  const holder = document.getElementById('resTableHolder');
  if(!holder) return;
  let list = DB.reservations.filter(r => {
    const q = resState.search.toLowerCase();
    const matchQ = !q || r.guestName.toLowerCase().includes(q) || String(r.roomNumber).includes(q) || (r.guestPhone||'').includes(q) || r.id.toLowerCase().includes(q);
    const matchS = !resState.status || r.status === resState.status;
    const matchT = !resState.type || r.roomType === resState.type;
    return matchQ && matchS && matchT;
  });
  list.sort((a,b) => {
    let av=a[resState.sort], bv=b[resState.sort];
    if(typeof av === 'string') av = av.toLowerCase();
    if(typeof bv === 'string') bv = bv.toLowerCase();
    return av>bv ? resState.dir : av<bv ? -resState.dir : 0;
  });
  const perPage = 8;
  const pages = Math.max(1, Math.ceil(list.length/perPage));
  resState.page = Math.min(resState.page, pages);
  const pageList = list.slice((resState.page-1)*perPage, resState.page*perPage);

  if(list.length === 0){
    holder.innerHTML = `<div class="table-wrap"><div class="empty-state"><div class="ei"><i class="fa-solid fa-inbox"></i></div><h4>No reservations found</h4><p>Try clearing your search or filters, or create a new reservation.</p></div></div>`;
    return;
  }
  const sortArrow = (key) => resState.sort===key ? `<span class="sort-ind">${resState.dir===1?'▲':'▼'}</span>` : '';
  holder.innerHTML = `<div class="table-wrap"><table class="data">
    <thead><tr>
      <th data-sort="id">Res. ID ${sortArrow('id')}</th>
      <th data-sort="guestName">Guest ${sortArrow('guestName')}</th>
      <th data-sort="roomNumber">Room ${sortArrow('roomNumber')}</th>
      <th data-sort="checkIn">Dates ${sortArrow('checkIn')}</th>
      <th data-sort="total">Total ${sortArrow('total')}</th>
      <th data-sort="status">Status ${sortArrow('status')}</th>
      <th>Actions</th>
    </tr></thead>
    <tbody>
      ${pageList.map(r => `<tr>
        <td data-label="Res. ID">${r.id}</td>
        <td data-label="Guest">${escapeHtml(r.guestName)}<div class="sub">${escapeHtml(r.guestPhone||'')}</div></td>
        <td data-label="Room">${String(r.roomNumber).padStart(2,'0')}<div class="sub">${r.roomType}</div></td>
        <td data-label="Dates"><span style="white-space:nowrap;">${fmtDate(r.checkIn)}</span><span style="opacity:.5; margin:0 4px;">→</span><span style="white-space:nowrap;">${fmtDate(r.checkOut)}</span><div class="sub">${r.nights}n</div></td>
        <td data-label="Total">${fmtMoney(r.total)}</td>
        <td data-label="Status"><span class="badge ${r.status.toLowerCase().replace(' ','-')}">${r.status}</span></td>
        <td><div class="row-actions">
          <button class="icon-btn" data-tip="View" data-view="${r.id}"><i class="fa-solid fa-eye"></i></button>
          <button class="icon-btn" data-tip="Modify" data-modify="${r.id}" ${r.status==='Cancelled'||r.status==='Checked-Out'?'disabled':''}><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn danger" data-tip="Cancel" data-cancel="${r.id}" ${r.status==='Cancelled'||r.status==='Checked-Out'?'disabled':''}><i class="fa-solid fa-ban"></i></button>
          <button class="icon-btn" data-tip="Print" data-print="${r.id}"><i class="fa-solid fa-print"></i></button>
        </div></td>
      </tr>`).join('')}
    </tbody>
  </table></div>
  <div class="pagination">${Array.from({length:pages},(_,i)=>`<button class="${resState.page===i+1?'active':''}" data-page="${i+1}">${i+1}</button>`).join('')}</div>`;

  holder.querySelectorAll('thead th[data-sort]').forEach(th => th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if(resState.sort === key) resState.dir *= -1; else { resState.sort = key; resState.dir = 1; }
    renderReservationTable();
  }));
  holder.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>openModal(reservationDetailHtml(b.dataset.view))));
  holder.querySelectorAll('[data-modify]').forEach(b=>b.addEventListener('click',()=>navigate('modify/'+b.dataset.modify)));
  holder.querySelectorAll('[data-cancel]').forEach(b=>b.addEventListener('click',()=>navigate('cancel/'+b.dataset.cancel)));
  holder.querySelectorAll('[data-print]').forEach(b=>b.addEventListener('click',()=>printReservation(b.dataset.print)));
  holder.querySelectorAll('.pagination button').forEach(b=>b.addEventListener('click',()=>{ resState.page=Number(b.dataset.page); renderReservationTable(); }));
}
function initReservationsPage(){
  resState.page = 1;
  renderReservationTable();
  document.getElementById('resSearch').addEventListener('input', e => { resState.search = e.target.value; resState.page=1; renderReservationTable(); });
  document.getElementById('resFilterStatus').addEventListener('change', e => { resState.status = e.target.value; resState.page=1; renderReservationTable(); });
  document.getElementById('resFilterType').addEventListener('change', e => { resState.type = e.target.value; resState.page=1; renderReservationTable(); });
  document.getElementById('resPrintAll').addEventListener('click', () => window.print());
}
function reservationDetailHtml(id){
  const r = getReservation(id);
  if(!r) return `<div class="modal-head"><h3>Not found</h3><button class="modal-close" data-close="1"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body">This reservation no longer exists.</div>`;
  return `
    <div class="modal-head"><h3>Reservation ${r.id}</h3><button class="modal-close" data-close="1"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body">
      <div class="price-row"><span>Guest</span><span>${escapeHtml(r.guestName)}</span></div>
      <div class="price-row"><span>Contact</span><span>${escapeHtml(r.guestPhone||'—')} ${r.guestEmail?(' · '+escapeHtml(r.guestEmail)):''}</span></div>
      <div class="price-row"><span>Room</span><span>${String(r.roomNumber).padStart(2,'0')} · Floor ${getRoom(r.roomNumber).floor} · ${r.roomType}</span></div>
      <div class="price-row"><span>Stay</span><span>${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)} (${r.nights}n)</span></div>
      <div class="price-row"><span>Payment</span><span>${r.paymentMethod} · ${r.paymentStatus}</span></div>
      <div class="price-row"><span>Status</span><span><span class="badge ${r.status.toLowerCase().replace(' ','-')}">${r.status}</span></span></div>
      ${r.notes?`<div class="price-row"><span>Notes</span><span>${escapeHtml(r.notes)}</span></div>`:''}
      <div class="price-row total"><span>Total bill</span><span>${fmtMoney(r.total)}</span></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost btn-sm" data-close="1" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
      ${r.status!=='Cancelled'&&r.status!=='Checked-Out' ? `<button class="btn btn-ghost btn-sm" onclick="srhCloseModal(); srhNavigate('modify/${r.id}')">Modify</button>
      <button class="btn btn-danger btn-sm" onclick="srhCloseModal(); srhNavigate('cancel/${r.id}')">Cancel</button>` : ''}
      <button class="btn btn-primary btn-sm" data-close="1">Close</button>
    </div>`;
}
function printReservation(id){ openModal(reservationDetailHtml(id)); setTimeout(()=>window.print(), 200); }

/* ===================== MODIFY RESERVATION ===================== */
routes['modify'] = function(id){
  if(!id){
    // Show only reservations that can be modified (Reserved or Checked-In)
    const list = DB.reservations.filter(r => r.status === 'Reserved' || r.status === 'Checked-In');
    return `<div class="page"><div class="wrap">
      ${crumbs([{label:'Modify Reservation'}])}
      <div class="page-head"><div><h1>Modify a reservation</h1><p>Select a reservation below to modify its details.</p></div></div>
      ${list.length === 0
        ? `<div class="table-wrap"><div class="empty-state"><div class="ei"><i class="fa-solid fa-pen"></i></div><h4>No reservations to modify</h4><p>There are no active reservations available for modification.</p></div></div>`
        : `<div class="table-wrap"><table class="data"><thead><tr>
            <th>Res. ID</th><th>Guest</th><th>Room</th><th>Dates</th><th>Status</th><th>Action</th>
          </tr></thead><tbody>
            ${list.map(r=>`<tr>
              <td data-label="Res. ID">${r.id}</td>
              <td data-label="Guest">${escapeHtml(r.guestName)}<div class="sub">${escapeHtml(r.guestPhone||'')}</div></td>
              <td data-label="Room">${String(r.roomNumber).padStart(2,'0')}<div class="sub">${r.roomType}</div></td>
              <td data-label="Dates"><span style="white-space:nowrap;">${fmtDate(r.checkIn)}</span> → <span style="white-space:nowrap;">${fmtDate(r.checkOut)}</span></td>
              <td data-label="Status"><span class="badge ${r.status.toLowerCase().replace(' ','-')}">${r.status}</span></td>
              <td><button class="btn btn-ghost btn-sm" data-modify="${r.id}"><i class="fa-solid fa-pen"></i> Modify</button></td>
            </tr>`).join('')}
          </tbody></table></div>`
      }
    </div></div>`;
  }
  const r = getReservation(id);
  if(!r) return notFoundBlock('Reservation not found', 'reservations');
  if(r.status==='Cancelled' || r.status==='Checked-Out'){
    return `<div class="page"><div class="wrap-narrow">${crumbs([{label:'Reservations',href:'reservations'},{label:'Modify'}])}
    <div class="empty-state"><div class="ei"><i class="fa-solid fa-lock"></i></div><h4>This reservation can't be modified</h4><p>Its status is "${r.status}". Cancelled or checked-out stays are locked for record-keeping.</p></div></div></div>`;
  }
  const otherAvailable = DB.rooms.filter(rm => rm.status==='available' || rm.number===r.roomNumber);
  return `<div class="page"><div class="wrap-narrow">
    ${crumbs([{label:'Reservations',href:'reservations'},{label:'Modify '+r.id}])}
    <div class="page-head"><div><h1>Modify reservation</h1><p>Update stay dates, room, or guest details for ${escapeHtml(r.guestName)}. Room availability updates automatically.</p></div></div>
    <div class="card">
      <form id="modifyForm">
        <div class="form-grid">
          <div class="field full"><label>Guest full name</label><input type="text" id="mGuestName" value="${escapeHtml(r.guestName)}" required></div>
          <div class="field"><label>Email</label><input type="email" id="mGuestEmail" value="${escapeHtml(r.guestEmail||'')}"></div>
          <div class="field"><label>Phone</label><input type="tel" id="mGuestPhone" value="${escapeHtml(r.guestPhone||'')}" required></div>
          <div class="field"><label>Check-in date</label><input type="date" id="mCheckIn" value="${r.checkIn}"></div>
          <div class="field"><label>Check-out date</label><input type="date" id="mCheckOut" value="${r.checkOut}"></div>
          <div class="field"><label>Room</label>
            <select id="mRoomNumber">${otherAvailable.sort((a,b)=>a.number-b.number).map(rm=>`<option value="${rm.number}" data-price="${rm.price}" data-type="${rm.type}" ${rm.number===r.roomNumber?'selected':''}>Room ${String(rm.number).padStart(2,'0')} · Floor ${rm.floor} · ${rm.type} — ${fmtMoney(rm.price)}/night</option>`).join('')}</select>
          </div>
          <div class="field"><label>Payment status</label>
            <select id="mPayStatus">${['Pending','Paid','Partially Paid'].map(s=>`<option ${r.paymentStatus===s?'selected':''}>${s}</option>`).join('')}</select>
          </div>
        </div>
        <div class="price-summary">
          <div class="price-row"><span>Rate / night</span><span id="mSumRate">${fmtMoney(r.rate)}</span></div>
          <div class="price-row"><span>Nights</span><span id="mSumNights">${r.nights}</span></div>
          <div class="price-row total"><span>New total</span><span id="mSumTotal">${fmtMoney(r.total)}</span></div>
        </div>
        <div style="margin-top:22px; display:flex; gap:12px; flex-wrap:wrap;">
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save changes</button>
          <button type="button" class="btn btn-ghost" data-route="reservations">Discard</button>
        </div>
      </form>
    </div>
  </div></div>`;
};
function initModifyPage(id){
  const r = getReservation(id);
  if(!r || r.status==='Cancelled' || r.status==='Checked-Out') return;
  const roomSel = document.getElementById('mRoomNumber');
  const inDate = document.getElementById('mCheckIn');
  const outDate = document.getElementById('mCheckOut');
  function recalc(){
    const opt = roomSel.selectedOptions[0];
    const price = Number(opt.dataset.price);
    const nights = nightsBetween(inDate.value, outDate.value);
    document.getElementById('mSumRate').textContent = fmtMoney(price);
    document.getElementById('mSumNights').textContent = nights;
    document.getElementById('mSumTotal').textContent = fmtMoney(price*nights);
  }
  roomSel.addEventListener('change', recalc);
  inDate.addEventListener('change', recalc);
  outDate.addEventListener('change', recalc);
  document.getElementById('modifyForm').addEventListener('submit', e => {
    e.preventDefault();
    confirmDialog({
      title:'Save changes?',
      message:'This will update the reservation and adjust room availability accordingly.',
      confirmLabel:'Save changes'
    }, () => {
      const newRoomNum = Number(roomSel.value);
      const opt = roomSel.selectedOptions[0];
      const oldRoom = getRoom(r.roomNumber);
      const newRoom = getRoom(newRoomNum);
      if(newRoomNum !== r.roomNumber){
        if(oldRoom.status === 'reserved') oldRoom.status = 'available';
        else if(oldRoom.status === 'occupied') oldRoom.status = 'available';
        newRoom.status = (r.status === 'Checked-In') ? 'occupied' : 'reserved';
      }
      r.guestName = document.getElementById('mGuestName').value.trim();
      r.guestEmail = document.getElementById('mGuestEmail').value.trim();
      r.guestPhone = document.getElementById('mGuestPhone').value.trim();
      r.checkIn = inDate.value; r.checkOut = outDate.value;
      r.nights = nightsBetween(inDate.value, outDate.value);
      r.roomNumber = newRoomNum; r.roomType = opt.dataset.type; r.rate = Number(opt.dataset.price);
      r.total = r.rate * r.nights;
      r.paymentStatus = document.getElementById('mPayStatus').value;
      logActivity('fa-solid fa-pen', `Reservation ${r.id} modified for ${r.guestName}`);
      saveData();
      toast('success','Reservation updated', r.id + ' saved successfully.');
      navigate('reservations');
    });
  });
}

function initModifyListPage(){
  document.querySelectorAll('[data-modify]').forEach(b => {
    b.addEventListener('click', () => navigate('modify/' + b.dataset.modify));
  });
}

function initCancelListPage(){
  document.querySelectorAll('[data-cancel]').forEach(b => {
    b.addEventListener('click', () => navigate('cancel/' + b.dataset.cancel));
  });
}

/* ===================== CANCEL RESERVATION ===================== */
routes['cancel'] = function(id){
  if(!id){
    // Show only Reserved status — Checked-In rooms cannot be cancelled directly
    const list = DB.reservations.filter(r => r.status === 'Reserved');
    return `<div class="page"><div class="wrap">
      ${crumbs([{label:'Cancel Reservation'}])}
      <div class="page-head"><div><h1>Cancel a reservation</h1><p>Select a reserved booking below to cancel it. Checked-in guests must be checked out first.</p></div></div>
      ${list.length === 0
        ? `<div class="table-wrap"><div class="empty-state"><div class="ei"><i class="fa-solid fa-ban"></i></div><h4>No reservations to cancel</h4><p>There are no pending reservations available for cancellation.</p></div></div>`
        : `<div class="table-wrap"><table class="data"><thead><tr>
            <th>Res. ID</th><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Action</th>
          </tr></thead><tbody>
            ${list.map(r=>`<tr>
              <td data-label="Res. ID">${r.id}</td>
              <td data-label="Guest">${escapeHtml(r.guestName)}<div class="sub">${escapeHtml(r.guestPhone||'')}</div></td>
              <td data-label="Room">${String(r.roomNumber).padStart(2,'0')}<div class="sub">${r.roomType}</div></td>
              <td data-label="Dates"><span style="white-space:nowrap;">${fmtDate(r.checkIn)}</span> → <span style="white-space:nowrap;">${fmtDate(r.checkOut)}</span></td>
              <td data-label="Total">${fmtMoney(r.total)}</td>
              <td><button class="btn btn-danger btn-sm" data-cancel="${r.id}"><i class="fa-solid fa-ban"></i> Cancel</button></td>
            </tr>`).join('')}
          </tbody></table></div>`
      }
    </div></div>`;
  }
  const r = getReservation(id);
  if(!r) return notFoundBlock('Reservation not found', 'reservations');
  if(r.status === 'Cancelled') return `<div class="page"><div class="wrap-narrow">${crumbs([{label:'Reservations',href:'reservations'},{label:'Cancel'}])}<div class="empty-state"><div class="ei"><i class="fa-solid fa-ban"></i></div><h4>Already cancelled</h4><p>Reservation ${r.id} was already cancelled.</p></div></div></div>`;
  return `<div class="page"><div class="wrap-narrow">
    ${crumbs([{label:'Reservations',href:'reservations'},{label:'Cancel '+r.id}])}
    <div class="page-head"><div><h1>Cancel reservation</h1><p>Review the details below before cancelling. This will free Room ${String(r.roomNumber).padStart(2,'0')} for new bookings.</p></div></div>
    <div class="card">
      <div class="price-row"><span>Guest</span><span>${escapeHtml(r.guestName)}</span></div>
      <div class="price-row"><span>Room</span><span>${String(r.roomNumber).padStart(2,'0')} · ${r.roomType}</span></div>
      <div class="price-row"><span>Stay</span><span>${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)}</span></div>
      <div class="price-row"><span>Status</span><span><span class="badge ${r.status.toLowerCase().replace(' ','-')}">${r.status}</span></span></div>
      <div class="price-row total"><span>Total bill</span><span>${fmtMoney(r.total)}</span></div>
      <div style="margin-top:22px; display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn-danger" id="doCancelBtn"><i class="fa-solid fa-ban"></i> Cancel this reservation</button>
        <button class="btn btn-ghost" data-route="reservations">Go back</button>
      </div>
    </div>
  </div></div>`;
};
function initCancelPage(id){
  const btn = document.getElementById('doCancelBtn');
  if(!btn) return;
  btn.addEventListener('click', () => {
    confirmDialog({
      title:'Cancel this reservation?',
      message:'This action will release the room and mark the reservation as cancelled. This cannot be undone.',
      confirmLabel:'Yes, cancel it', danger:true
    }, () => {
      const r = getReservation(id);
      const room = getRoom(r.roomNumber);
      const wasOccupied = r.status === 'Checked-In';
      r.status = 'Cancelled';
      room.status = wasOccupied ? 'cleaning' : 'available';
      logActivity('fa-solid fa-ban', `Reservation ${r.id} for ${r.guestName} was cancelled — Room ${String(room.number).padStart(2,'0')} released.`);
      saveData();
      toast('success','Reservation cancelled', r.id + ' has been cancelled.');
      navigate('reservations');
    });
  });
}

/* ===================== CHECK-IN ===================== */
routes['checkin'] = function(){
  const list = DB.reservations.filter(r=>r.status==='Reserved');
  return `<div class="page"><div class="wrap">
    ${crumbs([{label:'Check-In'}])}
    <div class="page-head"><div><h1>Guest check-in</h1><p>Reservations awaiting arrival. Confirm to move the guest into their room.</p></div></div>
    <div class="toolbar"><div class="search-box"><i class="fa-solid fa-magnifying-glass si"></i><input id="ciSearch" placeholder="Search guest or room…"></div></div>
    <div id="ciHolder">${renderActionList(list,'checkin')}</div>
  </div></div>`;
};
routes['checkout'] = function(){
  const list = DB.reservations.filter(r=>r.status==='Checked-In');
  return `<div class="page"><div class="wrap">
    ${crumbs([{label:'Check-Out'}])}
    <div class="page-head"><div><h1>Guest check-out</h1><p>Guests currently in-house. Confirm to settle the bill and free the room.</p></div></div>
    <div class="toolbar"><div class="search-box"><i class="fa-solid fa-magnifying-glass si"></i><input id="coSearch" placeholder="Search guest or room…"></div></div>
    <div id="coHolder">${renderActionList(list,'checkout')}</div>
  </div></div>`;
};
function renderActionList(list, mode){
  if(list.length===0){
    const msg = mode==='checkin' ? 'No reservations are currently awaiting check-in.' : 'No guests are currently checked in.';
    return `<div class="table-wrap"><div class="empty-state"><div class="ei"><i class="fa-solid ${mode==='checkin'?'fa-door-open':'fa-door-closed'}"></i></div><h4>All clear</h4><p>${msg}</p></div></div>`;
  }
  return `<div class="table-wrap"><table class="data"><thead><tr>
    <th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Actions</th>
  </tr></thead><tbody>
    ${list.map(r=>`<tr>
      <td data-label="Guest">${escapeHtml(r.guestName)}<div class="sub">${escapeHtml(r.guestPhone||'')}</div></td>
      <td data-label="Room">${String(r.roomNumber).padStart(2,'0')}<div class="sub">${r.roomType}</div></td>
      <td data-label="Dates"><span style="white-space:nowrap;">${fmtDate(r.checkIn)}</span> → <span style="white-space:nowrap;">${fmtDate(r.checkOut)}</span></td>
      <td data-label="Total">${fmtMoney(r.total)}</td>
      <td><button class="btn ${mode==='checkin'?'btn-primary':'btn-sage'} btn-sm" data-act="${r.id}"><i class="fa-solid ${mode==='checkin'?'fa-right-to-bracket':'fa-right-from-bracket'}"></i> ${mode==='checkin'?'Check in':'Check out'}</button></td>
    </tr>`).join('')}
  </tbody></table></div>`;
}
function initCheckInOutPage(mode){
  const holderId = mode==='checkin' ? 'ciHolder' : 'coHolder';
  const searchId = mode==='checkin' ? 'ciSearch' : 'coSearch';
  function refresh(q){
    q = (q||'').toLowerCase();
    let list = DB.reservations.filter(r=>r.status === (mode==='checkin'?'Reserved':'Checked-In'));
    if(q) list = list.filter(r=>r.guestName.toLowerCase().includes(q) || String(r.roomNumber).includes(q));
    document.getElementById(holderId).innerHTML = renderActionList(list, mode);
    document.querySelectorAll(`#${holderId} [data-act]`).forEach(btn => btn.addEventListener('click', () => {
      const r = getReservation(btn.dataset.act);
      confirmDialog({
        title: mode==='checkin' ? 'Confirm check-in' : 'Confirm check-out',
        message: mode==='checkin'
          ? `Check in ${escapeHtml(r.guestName)} to Room ${String(r.roomNumber).padStart(2,'0')} now?`
          : `Check out ${escapeHtml(r.guestName)} from Room ${String(r.roomNumber).padStart(2,'0')}? The bill total is ${fmtMoney(r.total)}.`,
        confirmLabel: mode==='checkin' ? 'Check in' : 'Check out'
      }, () => {
        const room = getRoom(r.roomNumber);
        if(mode==='checkin'){
          r.status='Checked-In'; room.status='occupied';
          logActivity('fa-solid fa-right-to-bracket', `${r.guestName} checked in to Room ${String(room.number).padStart(2,'0')}`);
          toast('success','Checked in', r.guestName + ' is now in Room ' + String(room.number).padStart(2,'0'));
        } else {
          r.status='Checked-Out'; room.status='cleaning';
          logActivity('fa-solid fa-right-from-bracket', `${r.guestName} checked out of Room ${String(room.number).padStart(2,'0')}`);
          toast('success','Checked out', r.guestName + ' has checked out. Room marked for cleaning.');
        }
        saveData();
        refresh(document.getElementById(searchId).value);
      });
    }));
  }
  document.getElementById(searchId).addEventListener('input', e => refresh(e.target.value));
  refresh('');
}

/* ===================== ROOM AVAILABILITY ===================== */
let availState = { floor: 1, status:'', type:'', search:'' };
routes['availability'] = function(){
  return `<div class="page"><div class="wrap">
    ${crumbs([{label:'Room Availability'}])}
    <div class="page-head"><div><h1>Room availability</h1><p>All 50 rooms across five floors — filter by status or type, or search by room number.</p></div></div>
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-box"><i class="fa-solid fa-magnifying-glass si"></i><input id="avSearch" placeholder="Search room number…"></div>
        <select class="select-filter" id="avStatus">
          <option value="">All statuses</option>
          ${['available','reserved','occupied','cleaning','maintenance'].map(s=>`<option value="${s}">${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
        <select class="select-filter" id="avType">
          <option value="">All types</option>
          ${['Simple','Double','Delux'].map(t=>`<option>${t}</option>`).join('')}
        </select>
      </div>
      <div class="legend">
        <span><i class="dot available"></i> Available</span>
        <span><i class="dot reserved"></i> Reserved</span>
        <span><i class="dot occupied"></i> Occupied</span>
        <span><i class="dot cleaning"></i> Cleaning</span>
        <span><i class="dot maintenance"></i> Maintenance</span>
      </div>
    </div>
    <div class="floor-tabs" id="avFloorTabs" role="tablist">
      ${Array.from({length:FLOORS},(_,i)=>`<button class="${i+1===availState.floor?'active':''}" data-floor="${i+1}">Floor ${i+1}</button>`).join('')}
      <button class="${availState.floor==='all'?'active':''}" data-floor="all">All floors</button>
    </div>
    <div id="avHolder" style="margin-top:22px;"></div>
  </div></div>`;
};
function renderAvailability(){
  const holder = document.getElementById('avHolder');
  if(!holder) return;
  const floors = availState.floor === 'all' ? [1,2,3,4,5] : [availState.floor];
  let html = '';
  floors.forEach(f => {
    let rooms = DB.rooms.filter(r=>r.floor===f);
    if(availState.status) rooms = rooms.filter(r=>r.status===availState.status);
    if(availState.type) rooms = rooms.filter(r=>r.type===availState.type);
    if(availState.search) rooms = rooms.filter(r=>String(r.number).includes(availState.search));
    if(rooms.length===0) return;
    html += `<div class="floor-panel"><div class="floor-title"><span>Floor ${f}</span><div class="line"></div><span style="color:var(--parchment-dim); text-transform:none; letter-spacing:0;">${rooms.length} room(s)</span></div>
      <div class="room-grid">${rooms.map(r=>roomCellHtml(r)).join('')}</div></div>`;
  });
  if(!html){
    html = `<div class="empty-state"><div class="ei"><i class="fa-solid fa-magnifying-glass"></i></div><h4>No rooms match your filters</h4><p>Try a different status, type, or floor.</p></div>`;
  }
  holder.innerHTML = html;
  holder.querySelectorAll('.room[data-room]').forEach(el => el.addEventListener('click', () => openRoomDetail(Number(el.dataset.room))));
}
function roomCellHtml(r){
  const statusLabel = r.status[0].toUpperCase()+r.status.slice(1);
  return `<button class="room ${r.status}" data-room="${r.number}" data-tip="Room ${String(r.number).padStart(2,'0')} — ${statusLabel}">
    <span class="rn">${String(r.number).padStart(2,'0')}</span><span class="rs">${r.type}<br>${statusLabel}</span>
  </button>`;
}
function initAvailabilityPage(){
  renderAvailability();
  document.getElementById('avFloorTabs').addEventListener('click', e => {
    const btn = e.target.closest('button[data-floor]'); if(!btn) return;
    availState.floor = btn.dataset.floor === 'all' ? 'all' : Number(btn.dataset.floor);
    document.querySelectorAll('#avFloorTabs button').forEach(b=>b.classList.toggle('active', b===btn));
    renderAvailability();
  });
  document.getElementById('avStatus').addEventListener('change', e => { availState.status = e.target.value; renderAvailability(); });
  document.getElementById('avType').addEventListener('change', e => { availState.type = e.target.value; renderAvailability(); });
  document.getElementById('avSearch').addEventListener('input', e => { availState.search = e.target.value; renderAvailability(); });
}

/* ===================== ROOM DETAIL MODAL ===================== */
function openRoomDetail(n){
  const room = getRoom(n);
  const active = activeReservationForRoom(n);
  const history = DB.reservations.filter(r=>r.roomNumber===n).sort((a,b)=>b.createdAt-a.createdAt);
  const statusLabel = room.status[0].toUpperCase()+room.status.slice(1);
  openModal(`
    <div class="modal-head"><h3>Room ${String(n).padStart(2,'0')} · Floor ${room.floor}</h3><button class="modal-close" data-close="1"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body">
      <div class="price-row"><span>Type</span><span>${room.type} — ${fmtMoney(room.price)}/night</span></div>
      <div class="price-row"><span>Status</span><span><span class="badge ${room.status}">${statusLabel}</span></span></div>
      ${active ? `
        <div class="price-row"><span>Guest</span><span>${escapeHtml(active.guestName)}</span></div>
        <div class="price-row"><span>Contact</span><span>${escapeHtml(active.guestPhone||'—')}</span></div>
        <div class="price-row"><span>Stay</span><span>${fmtDate(active.checkIn)} → ${fmtDate(active.checkOut)}</span></div>
        <div class="price-row total"><span>Bill</span><span>${fmtMoney(active.total)}</span></div>
      ` : `<p class="hint" style="margin-top:10px;">${FLOOR_DESC[room.floor]}</p>`}

      <h4 style="margin-top:24px; font-size:14px; color:var(--parchment);">Booking history</h4>
      ${history.length ? `<ul class="activity-list">${history.slice(0,5).map(h=>`<li><div class="a-icon"><i class="fa-solid fa-clock-rotate-left"></i></div><div><div class="a-text">${escapeHtml(h.guestName)} · ${fmtDate(h.checkIn)}→${fmtDate(h.checkOut)}</div><div class="a-time"><span class="badge ${h.status.toLowerCase().replace(' ','-')}">${h.status}</span></div></div></li>`).join('')}</ul>`
      : `<p class="hint">No previous bookings for this room.</p>`}
    </div>
    <div class="modal-foot">
      ${roomDetailActions(room, active)}
    </div>
  `, { wide:false });
  wireRoomDetailActions(room, active);
}
function roomDetailActions(room, active){
  let btns = '';
  if(room.status === 'available'){
    btns += `<button class="btn btn-primary btn-sm" id="rdReserve"><i class="fa-solid fa-bed"></i> Reserve</button>`;
    btns += `<button class="btn btn-ghost btn-sm" id="rdMaintenance">Mark maintenance</button>`;
  }
  if(room.status === 'reserved' && active){
    btns += `<button class="btn btn-primary btn-sm" id="rdCheckin"><i class="fa-solid fa-right-to-bracket"></i> Check-in</button>`;
    btns += `<button class="btn btn-ghost btn-sm" id="rdEdit">Edit</button>`;
    btns += `<button class="btn btn-danger btn-sm" id="rdCancel">Cancel</button>`;
  }
  if(room.status === 'occupied' && active){
    btns += `<button class="btn btn-sage btn-sm" id="rdCheckout"><i class="fa-solid fa-right-from-bracket"></i> Check-out</button>`;
    btns += `<button class="btn btn-ghost btn-sm" id="rdEdit">Edit</button>`;
  }
  if(room.status === 'cleaning'){
    btns += `<button class="btn btn-primary btn-sm" id="rdMarkAvailable">Mark available</button>`;
    btns += `<button class="btn btn-ghost btn-sm" id="rdMaintenance">Mark maintenance</button>`;
  }
  if(room.status === 'maintenance'){
    btns += `<button class="btn btn-primary btn-sm" id="rdMarkAvailable">Mark available</button>`;
  }
  btns += `<button class="btn btn-ghost btn-sm" data-close="1">Close</button>`;
  return btns;
}
function wireRoomDetailActions(room, active){
  const byId = id => document.getElementById(id);
  if(byId('rdReserve')) byId('rdReserve').addEventListener('click', ()=>{ closeModal(); navigate('reserve?room='+room.number); });
  if(byId('rdMaintenance')) byId('rdMaintenance').addEventListener('click', ()=>{ room.status='maintenance'; saveData(); logActivity('fa-solid fa-screwdriver-wrench',`Room ${String(room.number).padStart(2,'0')} marked for maintenance`); toast('info','Room updated','Marked for maintenance.'); closeModal(); reRenderIfOnAvailability(); });
  if(byId('rdMarkAvailable')) byId('rdMarkAvailable').addEventListener('click', ()=>{ room.status='available'; saveData(); logActivity('fa-solid fa-broom',`Room ${String(room.number).padStart(2,'0')} is now available`); toast('success','Room updated','Room is now available.'); closeModal(); reRenderIfOnAvailability(); });
  if(byId('rdCheckin')) byId('rdCheckin').addEventListener('click', ()=>{ closeModal(); navigate('checkin'); });
  if(byId('rdCheckout')) byId('rdCheckout').addEventListener('click', ()=>{ closeModal(); navigate('checkout'); });
  if(byId('rdEdit')) byId('rdEdit').addEventListener('click', ()=>{ closeModal(); navigate('modify/'+active.id); });
  if(byId('rdCancel')) byId('rdCancel').addEventListener('click', ()=>{ closeModal(); navigate('cancel/'+active.id); });
}
function reRenderIfOnAvailability(){ if(currentHash().startsWith('availability')) renderAvailability(); if(currentHash().startsWith('rooms')) renderRoomsTable(); }

/* ===================== GUESTS ===================== */
let guestState = { search:'' };
function buildGuestIndex(){
  const map = new Map();
  DB.reservations.forEach(r => {
    const key = (r.guestPhone||r.guestEmail||r.guestName).toLowerCase();
    if(!map.has(key)) map.set(key, { name:r.guestName, phone:r.guestPhone, email:r.guestEmail, stays:[] });
    map.get(key).stays.push(r);
  });
  return Array.from(map.values());
}
routes['guests'] = function(){
  return `<div class="page"><div class="wrap">
    ${crumbs([{label:'Guests'}])}
    <div class="page-head"><div><h1>Guests</h1><p>Every guest who has booked at Safwan Royale, with full stay history.</p></div></div>
    <div class="toolbar"><div class="search-box"><i class="fa-solid fa-magnifying-glass si"></i><input id="gSearch" placeholder="Search guest name or phone…"></div></div>
    <div id="guestHolder"></div>
  </div></div>`;
};
function renderGuests(){
  const holder = document.getElementById('guestHolder');
  if(!holder) return;
  let guests = buildGuestIndex();
  if(guestState.search){
    const q = guestState.search.toLowerCase();
    guests = guests.filter(g => g.name.toLowerCase().includes(q) || (g.phone||'').includes(q));
  }
  if(guests.length===0){ holder.innerHTML = `<div class="table-wrap"><div class="empty-state"><div class="ei"><i class="fa-solid fa-users"></i></div><h4>No guests yet</h4><p>Guests will appear here once reservations are made.</p></div></div>`; return; }
  holder.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>Guest</th><th>Contact</th><th>Total stays</th><th>Total spent</th><th>Last stay</th><th></th></tr></thead><tbody>
    ${guests.map(g => {
      const totalSpent = g.stays.filter(s=>s.status!=='Cancelled').reduce((s,r)=>s+r.total,0);
      const last = g.stays.reduce((a,b)=>a.createdAt>b.createdAt?a:b);
      return `<tr><td>${escapeHtml(g.name)}</td><td>${escapeHtml(g.phone||'—')}<div class="sub">${escapeHtml(g.email||'')}</div></td><td>${g.stays.length}</td><td>${fmtMoney(totalSpent)}</td><td>${fmtDate(last.checkIn)}</td>
      <td><button class="icon-btn" data-guest="${escapeHtml(g.name)}|${escapeHtml(g.phone||'')}" data-tip="View history"><i class="fa-solid fa-eye"></i></button></td></tr>`;
    }).join('')}
  </tbody></table></div>`;
  holder.querySelectorAll('[data-guest]').forEach(b => b.addEventListener('click', () => {
    const [name, phone] = b.dataset.guest.split('|');
    const g = guests.find(x=>x.name===name && (x.phone||'')===phone);
    openModal(`<div class="modal-head"><h3>${escapeHtml(g.name)}</h3><button class="modal-close" data-close="1"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="modal-body">
        <div class="price-row"><span>Phone</span><span>${escapeHtml(g.phone||'—')}</span></div>
        <div class="price-row"><span>Email</span><span>${escapeHtml(g.email||'—')}</span></div>
        <h4 style="margin-top:20px; font-size:14px; color:var(--parchment);">Stay history</h4>
        <ul class="activity-list">${g.stays.sort((a,b)=>b.createdAt-a.createdAt).map(s=>`<li><div class="a-icon"><i class="fa-solid fa-bed"></i></div><div><div class="a-text">Room ${String(s.roomNumber).padStart(2,'0')} · ${s.roomType} · ${fmtDate(s.checkIn)}→${fmtDate(s.checkOut)}</div><div class="a-time">${fmtMoney(s.total)} · <span class="badge ${s.status.toLowerCase().replace(' ','-')}">${s.status}</span></div></div></li>`).join('')}</ul>
      </div><div class="modal-foot"><button class="btn btn-primary btn-sm" data-close="1">Close</button></div>`);
  }));
}
function initGuestsPage(){
  renderGuests();
  document.getElementById('gSearch').addEventListener('input', e=>{ guestState.search = e.target.value; renderGuests(); });
}

/* ===================== ROOMS MANAGEMENT ===================== */
let roomsState = { search:'', status:'', type:'' };
routes['rooms'] = function(){
  return `<div class="page"><div class="wrap">
    ${crumbs([{label:'Rooms'}])}
    <div class="page-head"><div><h1>Room management</h1><p>Manage type, price and status for all 50 rooms.</p></div></div>
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-box"><i class="fa-solid fa-magnifying-glass si"></i><input id="rmSearch" placeholder="Search room number…"></div>
        <select class="select-filter" id="rmStatus"><option value="">All statuses</option>${['available','reserved','occupied','cleaning','maintenance'].map(s=>`<option value="${s}">${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select>
        <select class="select-filter" id="rmType"><option value="">All types</option>${['Simple','Double','Delux'].map(t=>`<option>${t}</option>`).join('')}</select>
      </div>
    </div>
    <div id="roomsTableHolder"></div>
  </div></div>`;
};
function renderRoomsTable(){
  const holder = document.getElementById('roomsTableHolder');
  if(!holder) return;
  let rooms = DB.rooms.slice().sort((a,b)=>a.number-b.number);
  if(roomsState.search) rooms = rooms.filter(r=>String(r.number).includes(roomsState.search));
  if(roomsState.status) rooms = rooms.filter(r=>r.status===roomsState.status);
  if(roomsState.type) rooms = rooms.filter(r=>r.type===roomsState.type);
  if(rooms.length===0){ holder.innerHTML = `<div class="table-wrap"><div class="empty-state"><div class="ei"><i class="fa-solid fa-door-closed"></i></div><h4>No rooms match</h4><p>Adjust your filters.</p></div></div>`; return; }
  holder.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>Room</th><th>Floor</th><th>Type</th><th>Price / night</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${rooms.map(r=>`<tr>
      <td>${String(r.number).padStart(2,'0')}</td><td>${r.floor}</td>
      <td><select class="select-filter" data-room-type="${r.number}"><option ${r.type==='Simple'?'selected':''}>Simple</option><option ${r.type==='Double'?'selected':''}>Double</option><option ${r.type==='Delux'?'selected':''}>Delux</option></select></td>
      <td>${fmtMoney(r.price)}</td>
      <td><span class="badge ${r.status}">${r.status[0].toUpperCase()+r.status.slice(1)}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" data-tip="View room" data-view-room="${r.number}"><i class="fa-solid fa-eye"></i></button>
        <button class="icon-btn" data-tip="Mark cleaning" data-set-status="${r.number}|cleaning" ${r.status==='occupied'||r.status==='reserved'?'disabled':''}><i class="fa-solid fa-broom"></i></button>
        <button class="icon-btn" data-tip="Mark maintenance" data-set-status="${r.number}|maintenance" ${r.status==='occupied'||r.status==='reserved'?'disabled':''}><i class="fa-solid fa-screwdriver-wrench"></i></button>
        <button class="icon-btn" data-tip="Mark available" data-set-status="${r.number}|available" ${r.status==='occupied'||r.status==='reserved'?'disabled':''}><i class="fa-solid fa-check"></i></button>
      </div></td>
    </tr>`).join('')}
  </tbody></table></div>`;
  holder.querySelectorAll('[data-view-room]').forEach(b=>b.addEventListener('click',()=>openRoomDetail(Number(b.dataset.viewRoom))));
  holder.querySelectorAll('[data-set-status]').forEach(b=>b.addEventListener('click',()=>{
    const [num,status] = b.dataset.setStatus.split('|');
    const room = getRoom(num);
    room.status = status;
    saveData();
    logActivity('fa-solid fa-rotate', `Room ${String(room.number).padStart(2,'0')} status set to ${status}`);
    toast('success','Room updated', 'Room ' + String(room.number).padStart(2,'0') + ' → ' + status);
    renderRoomsTable();
  }));
  holder.querySelectorAll('[data-room-type]').forEach(sel=>sel.addEventListener('change', ()=>{
    const room = getRoom(sel.dataset.roomType);
    room.type = sel.value; room.price = PRICES[sel.value];
    saveData();
    toast('info','Room updated', 'Room ' + String(room.number).padStart(2,'0') + ' type set to ' + sel.value);
    renderRoomsTable();
  }));
}
function initRoomsPage(){
  renderRoomsTable();
  document.getElementById('rmSearch').addEventListener('input', e=>{ roomsState.search=e.target.value; renderRoomsTable(); });
  document.getElementById('rmStatus').addEventListener('change', e=>{ roomsState.status=e.target.value; renderRoomsTable(); });
  document.getElementById('rmType').addEventListener('change', e=>{ roomsState.type=e.target.value; renderRoomsTable(); });
}

/* ===================== REPORTS ===================== */
routes['reports'] = function(){
  const s = computeStats();
  const cancelled = DB.reservations.filter(r=>r.status==='Cancelled').length;
  const totalRes = DB.reservations.length;
  const cancelRate = totalRes ? (cancelled/totalRes*100).toFixed(1) : '0.0';
  return `<div class="page"><div class="wrap">
    ${crumbs([{label:'Reports'}])}
    <div class="page-head"><div><h1>Reports &amp; analytics</h1><p>Occupancy, revenue, booking trends and cancellations at a glance.</p></div>
      <button class="btn btn-ghost btn-sm" onclick="window.print()"><i class="fa-solid fa-print"></i> Print report</button>
    </div>
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);">
      ${kpi('fa-sack-dollar','Total Revenue', s.revenue,'good','',true)}
      ${kpi('fa-chart-pie','Occupancy Rate', s.occupancyRate,'','',false,'%',1)}
      ${kpi('fa-clipboard-list','Total Bookings', totalRes,'','')}
      ${kpi('fa-ban','Cancellation Rate', Number(cancelRate),'warn','',false,'%',1)}
    </div>
    <div class="report-grid">
      <div class="chart-card"><h4>Occupancy by floor</h4><canvas id="chartFloor" height="220"></canvas></div>
      <div class="chart-card"><h4>Revenue by room type</h4><canvas id="chartType" height="220"></canvas></div>
    </div>
    <div class="report-grid">
      <div class="chart-card"><h4>Booking trend (last 14 days)</h4><canvas id="chartTrend" height="220"></canvas></div>
      <div class="chart-card"><h4>Reservation status breakdown</h4><canvas id="chartStatus" height="220"></canvas></div>
    </div>
  </div></div>`;
};
function initReportsPage(){
  if(typeof Chart === 'undefined') return;
  Chart.defaults.color = '#CFC5AC';
  Chart.defaults.font.family = 'Inter, sans-serif';
  Chart.defaults.borderColor = 'rgba(239,230,211,0.14)';

  const byFloor = [1,2,3,4,5].map(f => DB.rooms.filter(r=>r.floor===f && (r.status==='occupied'||r.status==='reserved')).length);
  new Chart(document.getElementById('chartFloor'), {
    type:'bar',
    data:{ labels:['Floor 1','Floor 2','Floor 3','Floor 4','Floor 5'], datasets:[{ label:'Occupied/Reserved rooms', data:byFloor, backgroundColor:'#C9A24B', borderRadius:6 }] },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true, max:10, ticks:{stepSize:2} } } }
  });

  const types = ['Simple','Double','Delux'];
  const revByType = types.map(t => DB.reservations.filter(r=>r.roomType===t && r.status!=='Cancelled').reduce((s,r)=>s+r.total,0));
  new Chart(document.getElementById('chartType'), {
    type:'doughnut',
    data:{ labels:types, datasets:[{ data:revByType, backgroundColor:['#7C9A82','#6FA9C9','#C9A24B'], borderColor:'#16281F', borderWidth:2 }] },
    options:{ plugins:{legend:{position:'bottom'}} }
  });

  const days = Array.from({length:14},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(13-i)); return d; });
  const trendData = days.map(d => {
    const key = d.toISOString().slice(0,10);
    return DB.reservations.filter(r=>new Date(r.createdAt).toISOString().slice(0,10)===key).length;
  });
  new Chart(document.getElementById('chartTrend'), {
    type:'line',
    data:{ labels: days.map(d=>d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})), datasets:[{ label:'Bookings', data:trendData, borderColor:'#E7CD82', backgroundColor:'rgba(201,162,75,0.15)', fill:true, tension:.35, pointRadius:3 }] },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true, ticks:{stepSize:1} } } }
  });

  const statuses = ['Reserved','Checked-In','Checked-Out','Cancelled'];
  const statusData = statuses.map(s => DB.reservations.filter(r=>r.status===s).length);
  new Chart(document.getElementById('chartStatus'), {
    type:'pie',
    data:{ labels:statuses, datasets:[{ data:statusData, backgroundColor:['#6FA9C9','#C9A24B','#7C9A82','#B5482F'], borderColor:'#16281F', borderWidth:2 }] },
    options:{ plugins:{legend:{position:'bottom'}} }
  });
}

/* ===================== FEEDBACK ===================== */

// -------------------------------------------------------
// GOOGLE SHEETS INTEGRATION
// Steps to connect your own Google Sheet:
//   1. Open your Google Sheet
//   2. Extensions → Apps Script → paste the doPost script below
//   3. Deploy → New Deployment → Web App → Anyone can access
//   4. Copy the Web App URL and replace GOOGLE_SHEET_URL below
// -------------------------------------------------------
// Apps Script code to paste (for reference):
// function doPost(e) {
//   var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
//   var data = JSON.parse(e.postData.contents);
//   sheet.appendRow([new Date(), data.name, data.email, data.rating, data.comment]);
//   return ContentService.createTextOutput("OK");
// }
// -------------------------------------------------------
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyxUOSj1VnAYW57RZgu1N8BALycTKrdD5z6K48gu1aNavD4mu18UncwI2RJJmda8s0o/exec';

function sendFeedbackToSheet(data){
  if(!GOOGLE_SHEET_URL) return Promise.resolve(); // URL nahi diya toh skip
  return fetch(GOOGLE_SHEET_URL, {
    method: 'POST',
    mode: 'no-cors', // Google Apps Script ke saath zaroori hai
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(() => {}); // silently fail — local data preserve rehta hai
}

routes['feedback'] = function(){
  const avg = DB.feedback.length ? (DB.feedback.reduce((s,f)=>s+f.rating,0)/DB.feedback.length).toFixed(1) : '0.0';
  return `<div class="page"><div class="wrap-narrow">
    ${crumbs([{label:'Feedback'}])}
    <div class="page-head"><div><h1>Guest feedback</h1><p>Share your experience — ratings, reviews and suggestions help us improve.</p></div></div>

    ${GOOGLE_SHEET_URL ? `<div style="background:rgba(124,154,130,0.12); border:1px solid rgba(124,154,130,0.3); border-radius:8px; padding:12px 16px; margin-bottom:24px; font-size:13px; color:var(--sage); display:flex; gap:10px; align-items:center;"><i class="fa-solid fa-table-cells-large"></i> Feedback is being synced to Google Sheets automatically.</div>` : ''}

    <div class="card" style="margin-bottom:32px;">
      <form id="feedbackForm">
        <div class="form-grid">
          <div class="field"><label>Your name</label><input type="text" id="fbName" required><div class="errmsg">Please enter your name.</div></div>
          <div class="field"><label>Email (optional)</label><input type="email" id="fbEmail"></div>
          <div class="field full"><label>Your rating</label>
            <div class="star-input" id="fbStars">
              ${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}" aria-label="${n} star"><i class="fa-solid fa-star"></i></button>`).join('')}
            </div>
            <input type="hidden" id="fbRating" value="0">
            <div class="hint" id="fbRatingHint" style="color:var(--rust); font-size:11.5px; display:none;">Please select a star rating.</div>
          </div>
          <div class="field full"><label>Review, suggestion or recommendation</label><textarea id="fbComment" placeholder="Tell us about your stay…" required></textarea><div class="errmsg">Please write a review.</div></div>
        </div>
        <button type="submit" class="btn btn-primary" id="fbSubmitBtn" style="margin-top:18px;"><i class="fa-solid fa-paper-plane"></i> Submit feedback</button>
      </form>
    </div>
    <div class="section-head" style="margin-bottom:24px;">
      <div><div class="eyebrow">Guest voices</div><h2>What guests are saying</h2></div>
      <p>Average rating: <strong style="color:var(--brass-light);">${avg} / 5</strong> from ${DB.feedback.length} review(s)</p>
    </div>
    <div id="feedbackList"></div>
  </div></div>`;
};
function renderFeedbackList(){
  const holder = document.getElementById('feedbackList');
  if(!holder) return;
  if(DB.feedback.length===0){ holder.innerHTML = `<div class="empty-state"><div class="ei"><i class="fa-solid fa-star"></i></div><h4>No feedback yet</h4><p>Be the first to share your experience.</p></div>`; return; }
  holder.innerHTML = DB.feedback.slice().sort((a,b)=>b.date-a.date).map(f=>`
    <div class="feedback-item reveal in">
      <div class="fhead"><span class="fname">${escapeHtml(f.name)}</span><span class="fdate">${fmtDate(new Date(f.date).toISOString().slice(0,10))}</span></div>
      <div class="fstars">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)}</div>
      <div class="fbody">${escapeHtml(f.comment)}</div>
    </div>`).join('');
}
function initFeedbackPage(){
  renderFeedbackList();
  let rating = 0;
  const stars = document.querySelectorAll('#fbStars button');
  const ratingHint = document.getElementById('fbRatingHint');
  stars.forEach(btn => btn.addEventListener('click', () => {
    rating = Number(btn.dataset.star);
    document.getElementById('fbRating').value = rating;
    stars.forEach(b => b.classList.toggle('active', Number(b.dataset.star) <= rating));
    if(ratingHint) ratingHint.style.display = 'none';
  }));
  document.getElementById('feedbackForm').addEventListener('submit', e => {
    e.preventDefault();
    const nameEl = document.getElementById('fbName');
    const commentEl = document.getElementById('fbComment');
    const name = nameEl.value.trim();
    const comment = commentEl.value.trim();
    let ok = true;
    if(!name){ nameEl.classList.add('err'); nameEl.closest('.field').classList.add('has-err'); ok = false; }
    else { nameEl.classList.remove('err'); nameEl.closest('.field').classList.remove('has-err'); }
    if(!comment){ commentEl.classList.add('err'); commentEl.closest('.field').classList.add('has-err'); ok = false; }
    else { commentEl.classList.remove('err'); commentEl.closest('.field').classList.remove('has-err'); }
    if(rating === 0){ if(ratingHint) ratingHint.style.display = 'block'; ok = false; }
    if(!ok){ toast('error','Incomplete form','Please add your name, a rating, and a comment.'); return; }
    const entry = { id: fid(), name, email: document.getElementById('fbEmail').value.trim(), rating, comment, date: Date.now() };
    DB.feedback.unshift(entry);
    saveData();
    // Google Sheet ko bhi bhejo
    const submitBtn = document.getElementById('fbSubmitBtn');
    if(submitBtn){ submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…'; }
    sendFeedbackToSheet({ name: entry.name, email: entry.email, rating: entry.rating, comment: entry.comment, date: new Date(entry.date).toLocaleString('en-PK') }).finally(() => {
      if(submitBtn){ submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit feedback'; }
      toast('success','Thank you!','Your feedback has been submitted.');
      e.target.reset();
      rating = 0;
      stars.forEach(b=>b.classList.remove('active'));
      renderFeedbackList();
    });
  });
}

/* ===================== ABOUT ===================== */
routes['about'] = function(){
  return `<div class="page"><div class="wrap-narrow">
    ${crumbs([{label:'About System'}])}
    <div class="page-head"><div><h1>About this system</h1><p>What Safwan Royale's reservation &amp; management platform does, and how it's built.</p></div></div>
    <div class="card" style="margin-bottom:20px;">
      <h3 style="margin-bottom:14px;">Overview</h3>
      <p style="color:var(--parchment-dim); line-height:1.7; font-size:14.5px;">Safwan Royale's Hotel Reservation &amp; Management System is a single-page application that runs the entire front desk: booking, modifying and cancelling reservations, checking guests in and out, tracking all 50 rooms across five floors, managing guest profiles, and reporting on occupancy and revenue — all from one connected interface.</p>
    </div>
    <div class="card-grid" style="margin-bottom:20px;">
      <div class="module-card"><div class="icon"><i class="fa-solid fa-bolt"></i></div><h4>Live data</h4><p>Every action updates room status and dashboard stats instantly.</p></div>
      <div class="module-card"><div class="icon"><i class="fa-solid fa-shield-halved"></i></div><h4>Safe changes</h4><p>Cancel and modify actions require confirmation before applying.</p></div>
      <div class="module-card"><div class="icon"><i class="fa-solid fa-mobile-screen"></i></div><h4>Fully responsive</h4><p>Works on desktop, tablet and mobile devices alike.</p></div>
      <div class="module-card"><div class="icon"><i class="fa-solid fa-database"></i></div><h4>Persistent storage</h4><p>Reservations, rooms and feedback are saved in your browser.</p></div>
    </div>
    <div class="card">
      <h3 style="margin-bottom:14px;">Modules included</h3>
      <div class="stack">
        ${['Dashboard','Reserve Room','Reservations','Modify Reservation','Cancel Reservation','Check-In','Check-Out','Room Availability','Guests','Rooms','Reports','Feedback','Contact'].map(m=>`<span class="chip">${m}</span>`).join('')}
      </div>
    </div>
  </div></div>`;
};

/* ===================== CONTACT ===================== */

// -------------------------------------------------------
// EMAILJS CONFIG
// -------------------------------------------------------
const EMAILJS_PUBLIC_KEY  = 'Y5NKrBmGZNPsvHDfG';
const EMAILJS_SERVICE_ID  = 'service_pbumg0m';
const EMAILJS_TEMPLATE_ID = 'template_w9sd3v8';

// -------------------------------------------------------
// GOOGLE SHEET — CONTACT MESSAGES
// Same Apps Script URL as feedback (sheet handles both)
// Agar alag sheet chahiye toh naya URL paste karein
// -------------------------------------------------------
const CONTACT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyJCJ4iS2on3_fVeynwLe7zEIGPecnSLGhoUnjH-kA_i2BJoWgjIAoO5mRk6KvkQ32cpQ/exec';

function sendContactToSheet(data){
  if(!CONTACT_SHEET_URL) return Promise.resolve();
  return fetch(CONTACT_SHEET_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(() => {});
}

routes['contact'] = function(){
  return `<div class="page"><div class="wrap-narrow">
    ${crumbs([{label:'Contact'}])}
    <div class="page-head"><div><h1>Contact the front desk</h1><p>Reach out for reservations, events, or any question about your stay.</p></div></div>
    <div class="form-grid">
      <div class="card">
        <h3 style="margin-bottom:16px;">Send a message</h3>
        <form id="contactForm" novalidate>
          <div class="field full" style="margin-bottom:14px;">
            <label>Your name</label>
            <input type="text" id="cName" placeholder="e.g. Ahmed Ali" required>
            <div class="errmsg">Please enter your name.</div>
          </div>
          <div class="field full" style="margin-bottom:14px;">
            <label>Email</label>
            <input type="email" id="cEmail" placeholder="you@example.com" required>
            <div class="errmsg">Please enter a valid email.</div>
          </div>
          <div class="field full" style="margin-bottom:14px;">
            <label>Message</label>
            <textarea id="cMessage" placeholder="How can we help you?" required></textarea>
            <div class="errmsg">Please write a message.</div>
          </div>
          <button class="btn btn-primary btn-block" type="submit" id="contactSubmitBtn">
            <i class="fa-solid fa-paper-plane"></i> Send message
          </button>
        </form>
      </div>
      <div class="card">
        <h3 style="margin-bottom:16px;">Visit us</h3>
        <p style="color:var(--parchment-dim); font-size:14px; line-height:1.8;">
          <i class="fa-solid fa-location-dot" style="color:var(--brass-light); width:18px;"></i> Main Boulevard, Gulberg III, Lahore, Pakistan<br>
          <i class="fa-solid fa-phone" style="color:var(--brass-light); width:18px;"></i> +92 320 7165167<br>
          <i class="fa-solid fa-envelope" style="color:var(--brass-light); width:18px;"></i> safwanshafiq123@gmail.com<br>
          <i class="fa-solid fa-clock" style="color:var(--brass-light); width:18px;"></i> Front desk open 24/7
        </p>
        <div style="margin-top:20px; padding-top:20px; border-top:1px solid var(--line);">
          <p style="font-size:13px; color:var(--parchment-dim); margin-bottom:12px;">Or reach us directly:</p>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a href="https://wa.me/923207165167?text=Hello%20Sir%2C%20How%20can%20I%20help%20you%3F" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm"><i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> WhatsApp</a>
            <a href="mailto:safwanshafiq123@gmail.com" class="btn btn-ghost btn-sm"><i class="fa-solid fa-envelope"></i> Email</a>
          </div>
        </div>
      </div>
    </div>
  </div></div>`;
};

function initContactPage(){
  // EmailJS initialize
  if(typeof emailjs !== 'undefined'){
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  document.getElementById('contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const nameEl    = document.getElementById('cName');
    const emailEl   = document.getElementById('cEmail');
    const messageEl = document.getElementById('cMessage');
    const name    = nameEl.value.trim();
    const email   = emailEl.value.trim();
    const message = messageEl.value.trim();

    // Validation
    let ok = true;
    [[nameEl, name.length > 1], [emailEl, /\S+@\S+\.\S+/.test(email)], [messageEl, message.length > 2]].forEach(([el, valid]) => {
      el.classList.toggle('err', !valid);
      el.closest('.field').classList.toggle('has-err', !valid);
      if(!valid) ok = false;
    });
    if(!ok){ toast('error', 'Missing information', 'Please fill in all fields correctly.'); return; }

    const submitBtn = document.getElementById('contactSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';

    const payload = { name, email, message, date: new Date().toLocaleString('en-PK') };

    // 1. EmailJS — tumhari email pe aayega
    const emailPromise = (typeof emailjs !== 'undefined')
      ? emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          from_name:    name,
          from_email:   email,
          message:      message,
          reply_to:     email
        })
      : Promise.resolve();

    // 2. Google Sheet — record save hoga
    const sheetPromise = sendContactToSheet(payload);

    // 3. Local storage backup
    DB.contactMessages.push({ ...payload, date: Date.now() });
    saveData();

    Promise.allSettled([emailPromise, sheetPromise]).then(results => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send message';
      const emailOk = results[0].status === 'fulfilled';
      if(emailOk){
        toast('success', 'Message sent!', 'We will get back to you shortly.');
      } else {
        toast('success', 'Message received!', 'Saved successfully. We will be in touch.');
      }
      e.target.reset();
      [nameEl, emailEl, messageEl].forEach(el => {
        el.classList.remove('err');
        el.closest('.field').classList.remove('has-err');
      });
    });
  });
}

/* ===================== NOT FOUND ===================== */
function notFoundBlock(msg, back){
  return `<div class="page"><div class="wrap-narrow"><div class="empty-state"><div class="ei"><i class="fa-solid fa-triangle-exclamation"></i></div><h4>${escapeHtml(msg)}</h4><p><button class="btn btn-ghost btn-sm" data-route="${back||'home'}">Go back</button></p></div></div></div>`;
}
routes['notfound'] = () => notFoundBlock('Page not found');

/* ===================== AFTER RENDER DISPATCH ===================== */
function afterRender(base, id, query){
  afterRenderCommon(document.getElementById('view'));
  if(base==='reserve') initReservePage(query);
  else if(base==='reservations') initReservationsPage();
  else if(base==='modify') { if(id) initModifyPage(id); else initModifyListPage(); }
  else if(base==='cancel') { if(id) initCancelPage(id); else initCancelListPage(); }
  else if(base==='checkin') initCheckInOutPage('checkin');
  else if(base==='checkout') initCheckInOutPage('checkout');
  else if(base==='availability') initAvailabilityPage();
  else if(base==='guests') initGuestsPage();
  else if(base==='rooms') initRoomsPage();
  else if(base==='reports') initReportsPage();
  else if(base==='feedback') initFeedbackPage();
  else if(base==='contact') initContactPage();
}

/* ===================== GLOBAL NAV / DELEGATION ===================== */
document.addEventListener('click', e => {
  const nav = e.target.closest('[data-route]');
  if(nav){ e.preventDefault(); navigate(nav.dataset.route); }
  const ext = e.target.closest('a[href^="http"]');
  if(ext && !ext.dataset.route){ /* allow default browser navigation */ }
});

function closeMobileMenu(){
  const m = document.getElementById('mobileMenu');
  if(m) m.classList.remove('open');
}

/* ===================== INIT ===================== */
function initShell(){
  document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.toggle('open');
  });
  document.getElementById('brandHome').addEventListener('click', () => navigate('home'));

  const backToTop = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('show', window.scrollY > 500);
  });
  backToTop.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));

  const newsletterForm = document.getElementById('newsletterForm');
  if(newsletterForm) newsletterForm.addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('newsletterEmail');
    if(!input.value.trim()){ toast('error','Enter an email','Please enter a valid email address.'); return; }
    DB.subscribers.push({ email:input.value.trim(), date:Date.now() });
    saveData();
    toast('success','Subscribed', 'You\'re on the list for Safwan Royale updates.');
    input.value = '';
  });

  window.addEventListener('hashchange', renderRoute);
  // renderRoute is now called by loadData() after sheets sync
}

loadData();
document.addEventListener('DOMContentLoaded', initShell);

})();
