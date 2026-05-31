// TrendScope Dashboard App
const allCategories=["All","Music","Gaming","Entertainment","Sports","Education","Tech","Food","Travel","News","Comedy","How-to","Vlogs"];
const countries=[{code:"US",name:"United States",flag:"🇺🇸"},{code:"GB",name:"United Kingdom",flag:"🇬🇧"},{code:"IN",name:"India",flag:"🇮🇳"},{code:"JP",name:"Japan",flag:"🇯🇵"},{code:"BR",name:"Brazil",flag:"🇧🇷"},{code:"DE",name:"Germany",flag:"🇩🇪"},{code:"FR",name:"France",flag:"🇫🇷"},{code:"KR",name:"South Korea",flag:"🇰🇷"}];
const growthTips=[{country:"United States",flag:"🇺🇸",tips:["Post between 2-4 PM EST for maximum reach","Use trending hashtags within first 60 mins","Collaborate with US-based creators for algorithm boost","Shorts under 30s get 2x more impressions"],bestCategories:["Entertainment","Tech","How-to"],peakHours:"2 PM - 4 PM EST",avgCPM:"$6 - $12",audienceAge:"18-34 (62%)"},{country:"United Kingdom",flag:"🇬🇧",tips:["British humor & dry wit performs best","Football content peaks during Premier League","Post at 6-8 PM GMT for evening viewers","Documentary-style content has 40% higher retention"],bestCategories:["Sports","Comedy","Education"],peakHours:"6 PM - 8 PM GMT",avgCPM:"$5 - $10",audienceAge:"25-44 (55%)"},{country:"India",flag:"🇮🇳",tips:["Hindi + English mix titles get 3x clicks","Mobile-first thumbnails are critical (95% mobile)","Cricket & Bollywood content trends massively","Post at 7-9 PM IST for prime time"],bestCategories:["Music","Entertainment","Comedy"],peakHours:"7 PM - 9 PM IST",avgCPM:"$0.50 - $2",audienceAge:"18-24 (48%)"},{country:"Japan",flag:"🇯🇵",tips:["Anime & gaming content dominates trending","Polished editing expected - quality over quantity","Japanese-only titles perform 5x better","ASMR & satisfying content has huge audience"],bestCategories:["Gaming","Entertainment","Tech"],peakHours:"8 PM - 11 PM JST",avgCPM:"$4 - $8",audienceAge:"18-34 (58%)"},{country:"Brazil",flag:"🇧🇷",tips:["Portuguese-only - English content barely trends","Music & football are guaranteed viral categories","Energetic, loud presentation style works best","Carnival season = 10x normal engagement"],bestCategories:["Music","Sports","Vlogs"],peakHours:"7 PM - 10 PM BRT",avgCPM:"$1 - $4",audienceAge:"18-34 (65%)"},{country:"Germany",flag:"🇩🇪",tips:["Educational & factual content valued highly","German-language essential for trending tab","Automotive content has dedicated audience","Structured, well-researched videos perform best"],bestCategories:["Education","Tech","News"],peakHours:"6 PM - 9 PM CET",avgCPM:"$5 - $10",audienceAge:"25-44 (52%)"},{country:"France",flag:"🇫🇷",tips:["French-language is mandatory for trending","Fashion, food & lifestyle dominate","Cinematic B-roll increases watch time 30%","Commentary & reaction videos growing fast"],bestCategories:["Entertainment","Food","Vlogs"],peakHours:"7 PM - 10 PM CET",avgCPM:"$4 - $8",audienceAge:"18-34 (60%)"},{country:"South Korea",flag:"🇰🇷",tips:["K-pop fan content gets massive organic reach","Mukbang & food content is uniquely popular","Esports & gaming have premium CPM rates","Aegyo & cute aesthetics boost CTR significantly"],bestCategories:["Music","Gaming","Food"],peakHours:"9 PM - 12 AM KST",avgCPM:"$3 - $7",audienceAge:"18-34 (63%)"}];

let selectedCountry='US', selectedCategory='All', selectedAudience='all', searchQuery='';
let videos=[], isLive=false, isRefreshing=false;
let map=null, marker=null, userLat=null, userLng=null;
let trendChartInst=null, categoryChartInst=null, engageChartInst=null;
let viewsGrowthChartInst=null, viralMomentumChartInst=null, engTimelineChartInst=null, regionPopChartInst=null;
let selectedHistoryDays=1, savedTrendIds=new Set(), currentUserId=null;

const ICONS={eye:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,heart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,msg:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>`,trend:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,up:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,down:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,fire:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,bookmark:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,bookmarkFilled:`<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`};

document.addEventListener('DOMContentLoaded', () => {
    // Use AuthGate for session verification instead of basic checkAuth
    AuthGate.verifySession().then(() => { loadSavedTrendIds(); });
    renderCountrySelector();
    renderCategoryFilter();
    renderAudienceFilters();
    initCharts();
    fetchData(selectedCountry);
    initMap();
    detectUserLocation();
    initSidebar();
    initThemeToggle();
    initBottomNav();
    initHistorySection();
    initSavedTrendsNav();
    
    // Search listener (debounced)
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.toLowerCase();
            renderVideoGrid();
        }, 300);
    });

    // Toggle map
    const tmb = document.getElementById('toggle-map-btn');
    if(tmb) {
        tmb.addEventListener('click',(e)=>{
            const mc=document.getElementById('map-container');
            mc.classList.toggle('open');
            if(mc.classList.contains('open')){
                e.currentTarget.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Hide Map`;
                if(map)setTimeout(()=>map.invalidateSize(),300);
            }else{
                e.currentTarget.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg> Show Map`;
            }
        });
    }

    // Scroll to bottom
    const sbb = document.getElementById('scroll-bottom-btn');
    if(sbb) {
        sbb.addEventListener('click', () => {
            const aboutSec = document.getElementById('about-us');
            if(aboutSec) aboutSec.scrollIntoView({behavior: 'smooth'});
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isRefreshing) fetchData(selectedCountry);
        });
    }
    
    // Real-time Pulse (Every 3 seconds)
    setInterval(pulseLiveNumbers, 3500);
    
    // Auto-refresh data (Every 2 mins)
    setInterval(()=>fetchData(selectedCountry), 120000);
});

function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if(!btn) return;
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    btn.innerHTML = savedTheme === 'dark' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    
    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        btn.innerHTML = next === 'dark' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        
        // Re-init charts to update colors
        if(trendChartInst) { trendChartInst.destroy(); categoryChartInst.destroy(); engageChartInst.destroy(); initCharts(); updateCharts(); }
    });
}

function initBottomNav() {
    document.querySelectorAll('.b-nav-item[data-section]').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const id = item.dataset.section;
            
            // Restrict Creators and Saved sections to authenticated users on mobile
            if ((id === 'section-saved' || id === 'section-channels') && typeof AuthGate !== 'undefined' && !AuthGate.isAuthenticated()) {
                AuthGate.requireAuth(() => {
                    item.click(); // Re-trigger click after auth
                });
                return;
            }

            const el = document.getElementById(id);
            if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
            document.querySelectorAll('.b-nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function pulseLiveNumbers() {
    if(!videos.length) return;
    // Visually update the views slightly to simulate live tracking
    document.querySelectorAll('.ss-val.views-val').forEach(el => {
        let current = parseInt(el.dataset.val);
        if(!current) return;
        let addition = Math.floor(Math.random() * 50);
        let newVal = current + addition;
        el.dataset.val = newVal;
        el.innerHTML = `${ICONS.eye} ${formatNum(newVal)}`;
        el.parentElement.style.animation = "highlight 1s ease";
        setTimeout(() => el.parentElement.style.animation = "", 1000);
    });
}

function checkAuth(){
    // Delegated to AuthGate.verifySession() — kept for compatibility
    const u = AuthGate.getUser();
    const ll=document.getElementById('login-link'),ud=document.getElementById('user-display');
    if(u&&ll&&ud){
        ll.style.display='none';
        ud.textContent=`👤 ${u.full_name||u.email}`;
        ud.style.display='block';
        ud.onclick=()=>{ AuthGate.logout(); };
        currentUserId = u.id;
    }
}

function initSidebar(){
    const toggle=document.getElementById('sidebar-toggle'),sidebar=document.getElementById('sidebar'),overlay=document.getElementById('sidebar-overlay');
    toggle&&toggle.addEventListener('click',()=>{sidebar.classList.toggle('open');overlay.classList.toggle('active')});
    overlay&&overlay.addEventListener('click',()=>{sidebar.classList.remove('open');overlay.classList.remove('active')});
    
    document.querySelectorAll('.nav-item[data-section]').forEach(item=>{
        item.addEventListener('click',e=>{
            e.preventDefault();
            const id=item.dataset.section;

            // Restrict Creators and Saved sections to authenticated users
            if ((id === 'section-saved' || id === 'section-channels') && typeof AuthGate !== 'undefined' && !AuthGate.isAuthenticated()) {
                AuthGate.requireAuth(() => {
                    item.click(); // Re-trigger click after auth
                });
                return;
            }

            const el=document.getElementById(id);
            if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
            document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
            item.classList.add('active');
            if(window.innerWidth<768){sidebar.classList.remove('open');overlay.classList.remove('active')}
        });
    });
}

function initCharts() {
    Chart.defaults.color = '#a0a0a0';
    Chart.defaults.font.family = 'Inter, sans-serif';
    
    const ctxTrend = document.getElementById('trendChart');
    if(ctxTrend) {
        trendChartInst = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: ['12am', '4am', '8am', '12pm', '4pm', '8pm', 'Now'],
                datasets: [{
                    label: 'Global View Velocity',
                    data: [12, 19, 15, 25, 32, 40, 48],
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4ade80',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { 
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' } }
                },
                scales: {
                    y: { display: false, beginAtZero: true },
                    x: { grid: { color: document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    const ctxCat = document.getElementById('categoryChartCanvas');
    if(ctxCat) {
        categoryChartInst = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: ['Entertainment', 'Gaming', 'Music', 'Others'],
                datasets: [{
                    data: [40, 25, 20, 15],
                    backgroundColor: ['#4ade80', '#38bdf8', '#fb923c', '#f43f5e'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'right', labels: { color: '#f1f1f1', boxWidth: 12 } } } }
        });
    }

    const ctxEng = document.getElementById('engagementChart');
    if(ctxEng) {
        engageChartInst = new Chart(ctxEng, {
            type: 'bar',
            data: {
                labels: ['Likes', 'Comments', 'Shares'],
                datasets: [{
                    data: [75, 15, 10],
                    backgroundColor: ['#4ade80', '#38bdf8', '#fb923c'],
                    borderRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { display: false } } }
        });
    }
}

function initMap(){
    if(!window.L)return;
    map=L.map('leaflet-map',{zoomControl:true,scrollWheelZoom:false});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; CartoDB',maxZoom:19}).addTo(map);
    map.setView([20,0],2);
}

function detectUserLocation(){
    fetch('https://ip-api.com/json/?fields=country,countryCode,city,lat,lon')
      .then(r=>r.json()).then(d=>{
        if(d.lat&&d.lon){
            userLat=d.lat;userLng=d.lon;
            if(map){
                map.setView([d.lat,d.lon],5);
                const icon=L.divIcon({className:'',html:`<div style="width:14px;height:14px;background:#4ade80;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px #4ade80"></div>`,iconSize:[14,14]});
                if(marker)marker.remove();
                marker=L.marker([d.lat,d.lon],{icon}).addTo(map).bindPopup(`<b>${d.city||'Your Location'}</b><br>${d.country}`).openPopup();
            }
            const match=countries.find(c=>c.code===d.countryCode);
            if(match&&selectedCountry==='US'){selectCountry(d.countryCode)}
        }
    }).catch(()=>{});
}

async function fetchData(code, retries = 3){
    if (isRefreshing) return;
    isRefreshing=true;updateRefreshBtn();
    document.getElementById('pulse-text').textContent = "Syncing data...";
    
    const grid = document.getElementById('video-grid');
    if(grid) {
        grid.innerHTML = Array(6).fill(0).map(() => `
            <div class="video-card skeleton" style="min-height: 280px; background: var(--bg2); border-radius: var(--radius); border: 1px solid var(--border);">
                <div style="width: 100%; padding-top: 56.25%; background: var(--bg3); animation: pulse 1.5s infinite;"></div>
                <div style="padding: 16px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="height: 16px; background: var(--bg3); border-radius: 4px; width: 80%; animation: pulse 1.5s infinite;"></div>
                    <div style="height: 16px; background: var(--bg3); border-radius: 4px; width: 60%; animation: pulse 1.5s infinite;"></div>
                </div>
            </div>
        `).join('');
    }

    try {
        let success = false;
        for (let i = 0; i < retries; i++) {
            try {
                const r = await fetch(`https://trendscope-production-3708.up.railway.app/api/trends?country=${code}`);
                if (!r.ok) throw new Error('API Error');
                videos = await r.json();
                isLive = true;
                success = true;
                break;
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(res => setTimeout(res, 1000));
            }
        }
        if (!success) throw new Error('Max retries reached');
        if (retries === 3 && isLive) showToast("Live trends successfully synced.");
    } catch (e) {
        console.error("API failed to fetch real YouTube data", e);
        videos = []; // Zero videos fallback instead of mock images
        isLive = false;
        showToast("Live trends sync failed. Ensure your API Key is valid.", true);
    } finally {
        isRefreshing=false;
        updateRefreshBtn();
        renderAll();
        document.getElementById('pulse-text').textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
        // Refresh history section after new data arrives
        refreshHistorySection();
    }
}

function updateRefreshBtn(){
    const btn=document.getElementById('refresh-btn');
    if(!btn)return;
    btn.disabled=isRefreshing;
    btn.querySelector('svg').classList.toggle('spin',isRefreshing);
    if(isRefreshing) {
        btn.style.background = 'var(--green2)';
        btn.style.color = 'var(--green)';
        btn.style.borderColor = 'var(--green)';
    } else {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    }
}

function renderAll(){
    renderTopBar();
    renderStatsCards();
    renderCountrySelector();
    renderVideoGrid();
    renderTopChannels();
    renderKeywords();
    renderGrowthInsights();
    updateCharts();
    updateActivityFeed();
}

function updateCharts() {
    if(!videos.length) return;
    
    // Update Trend Chart
    if(trendChartInst) {
        let newData = [
            randomInt(10,30), randomInt(20,40), randomInt(30,50), 
            randomInt(50,70), randomInt(60,90), randomInt(80,120), randomInt(100,150)
        ];
        trendChartInst.data.datasets[0].data = newData;
        trendChartInst.update();
    }
    
    // Update Category Doughnut
    if(categoryChartInst) {
        const stats = generateCategoryStats(videos);
        const top4 = stats.slice(0, 4);
        categoryChartInst.data.labels = top4.map(s=>s.name);
        categoryChartInst.data.datasets[0].data = top4.map(s=>s.count);
        categoryChartInst.update();
    }
}

function updateActivityFeed() {
    const feed = document.getElementById('activity-feed');
    if(!feed || !videos.length) return;
    
    let itemsHtml = '';
    for(let i=0; i<4; i++) {
        let v = videos[randomInt(0, videos.length-1)];
        let acts = ['crossed 1M views', 'is trending #1 in Gaming', 'spike in comments detected', 'went viral globally'];
        itemsHtml += `
            <div class="activity-item">
                <div class="activity-icon">${ICONS.fire}</div>
                <div>
                    <div class="activity-text"><strong>${v.channel}</strong> ${acts[randomInt(0, acts.length-1)]}</div>
                    <span class="activity-time">${randomInt(1, 59)} mins ago</span>
                </div>
            </div>`;
    }
    feed.innerHTML = itemsHtml;

    // Rising creator
    const topVid = [...videos].sort((a,b)=>b.growthRate-a.growthRate)[0];
    const rc = document.getElementById('top-rising-channel');
    if(rc && topVid) {
        rc.innerHTML = `
            <div class="rc-avatar">${topVid.channel.charAt(0)}</div>
            <div class="rc-info">
                <div class="rc-name">${topVid.channel} <span class="rc-badge">${ICONS.up} HOT</span></div>
                <div class="rc-stats">${formatNum(topVid.views)} views/hr • +${topVid.growthRate}% growth</div>
            </div>`;
    }
}

function renderTopBar(){
    const mn=document.getElementById('market-name');
    const badge=document.getElementById('topbar-live-badge');
    if(mn){const c=countries.find(x=>x.code===selectedCountry);mn.textContent=c?`${c.flag} ${c.name} Market`:'🌍 Global Market'}
    if(badge) badge.style.display=isLive?'flex':'none';
}

function animateValue(el, start, end, duration) {
    if(!el) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // easeOutQuart
        const ease = 1 - Math.pow(1 - progress, 4);
        let current = progress * (end - start) + start;
        el.innerHTML = formatNum(current);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function parseFormattedNum(str) {
    if(typeof str !== 'string') return Number(str)||0;
    let num = parseFloat(str.replace(/[^0-9.]/g, ''));
    if(str.includes('B')) return num * 1e9;
    if(str.includes('M')) return num * 1e6;
    if(str.includes('K')) return num * 1e3;
    return num;
}

function renderStatsCards(){
    const el=document.getElementById('stats-overview');
    if(!el)return;
    const totalViews=videos.reduce((s,v)=>s+v.views,0);
    const hotCount=videos.filter(v=>v.growthRate>80).length;
    const channels=new Set(videos.map(v=>v.channel)).size;
    const subs=videos.reduce((s,v)=>{const n=parseFloat((v.channelSubs||'0').replace(/[^\d.]/g,''));return s+(isNaN(n)?0:n)*1000000},0);
    
    const cards=[
        {label:'Total Daily Views',value:totalViews,pct:'+68.6%',icon:ICONS.eye,up:true},
        {label:'High Velocity Videos',value:hotCount,pct:'+42.8%',icon:ICONS.fire,up:true},
        {label:'Active Creators',value:channels,pct:'+18.1%',icon:ICONS.trend,up:true},
        {label:'Total Reach',value:subs,pct:'+12.4%',icon:ICONS.heart,up:true}
    ];
    
    el.innerHTML=cards.map((c,i)=>`
        <div class="stat-card" style="animation-delay:${i*0.1}s">
            <div class="stat-pct ${c.up?'':'down'}">${c.up?ICONS.up:ICONS.down}${c.pct}</div>
            <div class="stat-icon-wrap">${c.icon}</div>
            <div class="stat-label">${c.label}</div>
            <div class="stat-value" id="stat-val-${i}">0</div>
        </div>`).join('');

    // Trigger animations
    setTimeout(() => {
        cards.forEach((c, i) => animateValue(document.getElementById(`stat-val-${i}`), 0, c.value, 1500));
    }, 100);
}

function renderCountrySelector(){
    const el=document.getElementById('country-selector');
    if(!el)return;
    let html=`<button class="country-btn ${selectedCountry==='GLOBAL'?'active':''}" onclick="selectCountry('GLOBAL')">🌍 Global</button>`;
    countries.forEach(c=>{html+=`<button class="country-btn ${selectedCountry===c.code?'active':''}" onclick="selectCountry('${c.code}')">${c.flag} ${c.name}</button>`});
    el.innerHTML=html;
}

function selectCountry(code){
    selectedCountry=code;selectedCategory='All';
    renderCategoryFilter();
    fetchData(code);
    updateMapForCountry();
}

function renderCategoryFilter(){
    const el=document.getElementById('category-filter');
    if(!el)return;
    el.innerHTML=allCategories.map(c=>`<button class="cat-btn ${selectedCategory===c?'active':''}" onclick="selectCategory('${c}')">${c}</button>`).join('');
}

function renderAudienceFilters(){
    document.querySelectorAll('.audience-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            selectedAudience=btn.dataset.audience;
            document.querySelectorAll('.audience-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            renderVideoGrid();
        });
    });
}

function selectCategory(cat){selectedCategory=cat;renderCategoryFilter();renderVideoGrid()}

function getAudienceFiltered(vids){
    if(selectedAudience==='all')return vids;
    const catMap={kids:['Kids','Education'],teens:['Music','Gaming','Comedy'],adults:['Tech','News','Travel','Food']};
    const cats=catMap[selectedAudience]||[];
    return vids.filter(v=>cats.some(c=>v.category.includes(c)));
}

function renderVideoGrid(){
    const el=document.getElementById('video-grid');
    const vc=document.getElementById('video-count');
    if(!el)return;
    
    // Filters (Category + Audience)
    let filtered=selectedCategory==='All'?videos:videos.filter(v=>v.category===selectedCategory);
    filtered=getAudienceFiltered(filtered);
    
    // Search Query
    if(searchQuery.trim() !== '') {
        const sq = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(v => 
            v.title.toLowerCase().includes(sq) || 
            v.channel.toLowerCase().includes(sq) ||
            v.category.toLowerCase().includes(sq) ||
            (v.country && v.country.toLowerCase().includes(sq)) ||
            fuzzyMatch(v.title, sq) ||
            fuzzyMatch(v.channel, sq)
        );
    }
    
    // ONLY SHOW TOP 10 VIDEOS
    filtered = filtered.slice(0, 10);
    
    if(vc)vc.textContent=`${filtered.length} trending videos`;
    if(!filtered.length){el.innerHTML=`<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text2); background: var(--bg2); border: 1px dashed var(--border); border-radius: var(--radius);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
        <h3 style="color: var(--text); margin-bottom: 8px;">No analytics found</h3>
        <p>Try adjusting your search or filters.</p>
    </div>`;return}
    
    el.innerHTML=filtered.map((v,i)=>{
        const engPct = ((v.likes + v.comments) / Math.max(v.views, 1) * 100).toFixed(1);
        const viralProb = Math.min(99, Math.floor((v.growthRate||10) / 1.5 + (engPct * 3)));
        const trendScore = Math.floor(v.views/50000 + (v.growthRate||0));
        
        let smartBadge = '';
        if (viralProb > 85 && v.views > 1000000) smartBadge = `<span class="smart-badge exploding">Exploding</span>`;
        else if (v.growthRate > 100) smartBadge = `<span class="smart-badge">Trending Fast</span>`;
        else if (v.views < 50000 && engPct > 15) smartBadge = `<span class="smart-badge undervalued">Undervalued</span>`;
        
        // Instead of ui-avatars.com, we use the REAL YouTube Channel Avatar fetched from the backend.
        // If channelAvatar is empty/fails, we fallback to a simple initial avatar inline.
        const avatarImg = v.channelAvatar ? `<img src="${v.channelAvatar}" class="channel-avatar" alt="Avatar" onerror="this.outerHTML='<div class=\\'channel-avatar\\' style=\\'display:flex;align-items:center;justify-content:center;background:#444;color:#fff;font-weight:bold;font-size:12px;border-radius:50%;\\'>${v.channel.charAt(0).toUpperCase()}</div>'">` : `<div class="channel-avatar" style="display:flex;align-items:center;justify-content:center;background:#444;color:#fff;font-weight:bold;font-size:12px;border-radius:50%;">${v.channel.charAt(0).toUpperCase()}</div>`;

        return `
        <div class="video-card" style="animation-delay:${i*0.05}s" onclick="window.open('https://youtube.com/watch?v=${v.id}', '_blank')">
            <div class="video-thumbnail-wrap">
                ${smartBadge}
                <button class="bookmark-btn ${savedTrendIds.has(v.id)?'saved':''}" onclick="event.stopPropagation();toggleSaveTrend('${v.id}',this)" title="${savedTrendIds.has(v.id)?'Remove from saved':'Save trend'}">${savedTrendIds.has(v.id)?ICONS.bookmarkFilled:ICONS.bookmark}</button>
                <img src="${v.thumbnail}" class="video-thumbnail" alt="Thumbnail" loading="lazy" decoding="async">
                <span class="viral-prob">${ICONS.fire} ${viralProb}% Viral Prob</span>
                <span class="video-duration">${v.duration || '10:00'}</span>
            </div>
            
            <div class="video-info">
                <div class="video-title" title="${v.title.replace(/"/g, '&quot;')}">${v.title}</div>
                
                <div class="channel-row">
                    ${avatarImg.replace('channel-avatar', 'vid-ch-avatar').replace('channel-avatar', 'vid-ch-avatar')}
                    <div class="vid-ch-info">
                        <span class="channel-name" title="${v.channel.replace(/"/g, '&quot;')}">${v.channel} <svg class="verified-badge" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-7.9 7.9z"/></svg></span>
                        <span class="upload-time">${v.publishedAt || 'Recently'} • ${v.channelSubs || '1M'} subs</span>
                    </div>
                    <button class="subscribe-btn" onclick="event.stopPropagation(); window.open('https://youtube.com/results?search_query='+encodeURIComponent('${v.channel.replace(/'/g, "\\'")}'),'_blank')">Subscribe</button>
                </div>
                
                <div class="video-smart-stats">
                    <div class="ss-item">
                        <span class="ss-label">Views</span>
                        <span class="ss-val views-val" data-val="${v.views}">${ICONS.eye} ${formatNum(v.views)}</span>
                    </div>
                    <div class="ss-item">
                        <span class="ss-label">Eng Rate</span>
                        <span class="ss-val green">${ICONS.heart} ${engPct}%</span>
                    </div>
                    <div class="ss-item">
                        <span class="ss-label">1H Growth</span>
                        <span class="ss-val orange">${ICONS.up} +${randomInt(2,15)}%</span>
                    </div>
                </div>
                
                <div class="video-meta">
                    <span class="video-category" title="${v.category}">${v.category}</span>
                    <span class="video-trend-score">Score: ${formatNum(trendScore)}</span>
                </div>
            </div>
        </div>`
    }).join('');
}

function renderTopChannels(){
    const el=document.getElementById('top-channels');
    if(!el)return;
    const map={};
    videos.forEach(v=>{if(!map[v.channel])map[v.channel]={name:v.channel,subs:v.channelSubs,views:0,count:0};map[v.channel].views+=v.views;map[v.channel].count++});
    const sorted=Object.values(map).sort((a,b)=>b.views-a.views).slice(0,5);
    const growths=['+12.4%','+9.8%','+7.1%','+5.4%','+4.8%'];
    el.innerHTML=`<h3 class="panel-title">Creator Leaderboard</h3><p class="panel-sub">Highest performing channels</p>
        <div class="channel-list">${sorted.map((c,i)=>`
            <div class="channel-item">
                <div class="ch-avatar">${c.name.charAt(0).toUpperCase()}</div>
                <div class="ch-info">
                    <div class="ch-name">${c.name}</div>
                    <div class="ch-meta">${c.subs} • ${formatNum(c.views)} views</div>
                </div>
                <span class="ch-growth">${ICONS.up}${growths[i]}</span>
            </div>`).join('')}</div>`;
}

function renderKeywords(){
    const el=document.getElementById('trending-keywords');
    if(!el)return;
    const kwData=[
        {term:'AI Agents 2026',vol:'840K',heat:'HIGH',pct:'+343%'},
        {term:'Quantum Computing',vol:'420K',heat:'MEDIUM',pct:'+215%'},
        {term:'Mars Colony Update',vol:'920K',heat:'HIGH',pct:'+413%'},
        {term:'Crypto Bull Run',vol:'1.2M',heat:'HIGH',pct:'+525%'}
    ];
    el.innerHTML=`<h3 class="panel-title">Trending Search Terms</h3><p class="panel-sub">High-momentum keywords</p>
        <div class="keyword-list">${kwData.map(k=>`
            <div class="kw-item">
                <span class="kw-hash">#</span>
                <div class="kw-info">
                    <div class="kw-term">${k.term}</div>
                    <div class="kw-meta">
                        <span class="kw-vol">${k.vol} searches</span>
                        <span class="kw-heat ${k.heat.toLowerCase()}">${k.heat}</span>
                    </div>
                </div>
                <span class="kw-pct">${ICONS.up}${k.pct}</span>
            </div>`).join('')}</div>`;
}

function renderGrowthInsights(){
    const el=document.getElementById('growth-insights');
    if(!el)return;
    let tips=growthTips;
    if(selectedCountry!=='GLOBAL'){const c=countries.find(x=>x.code===selectedCountry);const found=growthTips.find(t=>t.country===c?.name);tips=found?[found]:growthTips.slice(0,3)}
    el.innerHTML=`<h2 class="section-title" style="margin-bottom:16px">${ICONS.trend} Strategic Analytics Insights</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
        ${tips.map(t=>`
            <div class="panel-card" style="background:var(--bg3);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h4 style="font-family:'Space Grotesk',sans-serif;font-size:18px;color:var(--text);">${t.flag} ${t.country} Market</h4>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;background:var(--bg2);padding:12px;border-radius:8px;">
                    <div style="display:flex;flex-direction:column;gap:2px;"><span style="font-size:10px;color:var(--text3);text-transform:uppercase;">Peak Hours</span><strong style="font-size:12px;color:var(--text);">${t.peakHours}</strong></div>
                    <div style="display:flex;flex-direction:column;gap:2px;"><span style="font-size:10px;color:var(--text3);text-transform:uppercase;">Avg CPM</span><strong style="font-size:12px;color:var(--green);">${t.avgCPM}</strong></div>
                    <div style="display:flex;flex-direction:column;gap:2px;"><span style="font-size:10px;color:var(--text3);text-transform:uppercase;">Core Demo</span><strong style="font-size:12px;color:var(--text);">${t.audienceAge}</strong></div>
                </div>
                <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">
                    ${t.tips.map(tip=>`<li style="font-size:13px;color:var(--text2);display:flex;gap:8px;"><span style="color:var(--green);">•</span> ${tip}</li>`).join('')}
                </ul>
            </div>
        `).join('')}</div>`;
}

function updateMapForCountry(){
    if(!map)return;
    const coordMap={US:[37.09,-95.71],GB:[55.37,-3.43],IN:[20.59,78.96],JP:[36.20,138.25],BR:[-14.23,-51.92],DE:[51.16,10.45],FR:[46.22,2.21],KR:[35.90,127.76],GLOBAL:[20,0]};
    const coords=coordMap[selectedCountry]||[20,0];
    const zoom=selectedCountry==='GLOBAL'?2:5;
    map.flyTo(coords,zoom,{duration:1.2});
}

function formatNum(n){
    if(!n||isNaN(n))return'0';
    if(n>=1e9)return(n/1e9).toFixed(1)+'B';
    if(n>=1e6)return(n/1e6).toFixed(1)+'M';
    if(n>=1e3)return(n/1e3).toFixed(1)+'K';
    return n.toLocaleString();
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function showToast(msg) {
    let toast = document.getElementById('toast-msg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-msg';
        toast.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--red);color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.4);opacity:0;transition:opacity 0.3s;pointer-events:none;";
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 3000);
}

function fuzzyMatch(str, query) {
    if (!str || !query) return false;
    str = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    query = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    return str.includes(query);
}

function generateCategoryStats(vids) {
    const counts = {};
    vids.forEach(v => { const c = v.category || 'Entertainment'; counts[c] = (counts[c] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HISTORICAL TREND TRACKING SYSTEM
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function initHistorySection() {
    const filterBar = document.getElementById('time-filter-bar');
    if (!filterBar) return;

    filterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.time-btn');
        if (!btn) return;
        
        const days = parseInt(btn.dataset.days) || 1;
        
        // Restrict advanced history (3+ days) to authenticated users
        if (days > 1 && typeof AuthGate !== 'undefined' && !AuthGate.isAuthenticated()) {
            AuthGate.requireAuth(() => {
                btn.click(); // Re-trigger click after auth
            });
            return;
        }

        filterBar.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedHistoryDays = days;
        showHistorySkeletons();
        refreshHistorySection();
    });

    // Initialize history charts
    initHistoryCharts();
}

function showHistorySkeletons() {
    const compGrid = document.getElementById('comparison-grid');
    if (compGrid) {
        compGrid.innerHTML = Array(4).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-circle"></div>
                <div class="skeleton-bar w60" style="margin:0 auto 8px"></div>
                <div class="skeleton-bar w80" style="margin:0 auto 6px;height:28px"></div>
                <div class="skeleton-bar w40" style="margin:0 auto"></div>
            </div>
        `).join('');
    }
}

async function refreshHistorySection() {
    const region = selectedCountry === 'GLOBAL' ? 'US' : selectedCountry;

    try {
        const [historyRes, compareRes] = await Promise.all([
            AuthGate.authFetch(`https://trendscope-production-3708.up.railway.app/api/trends/history?region=${region}&days=${selectedHistoryDays}`),
            AuthGate.authFetch(`https://trendscope-production-3708.up.railway.app/api/trends/compare?region=${region}`)
        ]);

        if (historyRes.status === 401 || compareRes.status === 401) {
            renderComparisonCardsFallback();
            updateHistoryChartsFallback();
            return;
        }

        const historyData = await historyRes.json();
        const compareData = await compareRes.json();

        renderComparisonCards(compareData);
        updateHistoryCharts(historyData);
    } catch (err) {
        console.error('History fetch error:', err);
        renderComparisonCardsFallback();
        updateHistoryChartsFallback();
    }
}

function renderComparisonCards(data) {
    const summary = data.summary || {};

    // Growth card
    const growthVal = document.getElementById('comp-growth-val');
    const growthDelta = document.getElementById('comp-growth-delta');
    if (growthVal) {
        const pct = summary.views_change_pct || 0;
        growthVal.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
        growthVal.className = 'comp-value ' + (pct >= 0 ? 'positive' : 'negative');
        growthDelta.innerHTML = `${pct >= 0 ? ICONS.up : ICONS.down} vs previous day`;
        growthDelta.className = 'comp-delta ' + (pct >= 0 ? 'up' : 'down');
    }

    // Ranking card
    const rankVal = document.getElementById('comp-ranking-val');
    const rankDelta = document.getElementById('comp-ranking-delta');
    if (rankVal) {
        const todayCount = summary.today_count || 0;
        const yesterdayCount = summary.yesterday_count || 0;
        rankVal.textContent = '#' + Math.max(1, todayCount);
        const diff = yesterdayCount - todayCount;
        rankDelta.innerHTML = `${diff >= 0 ? ICONS.up : ICONS.down} ${Math.abs(diff)} position${Math.abs(diff) !== 1 ? 's' : ''}`;
        rankDelta.className = 'comp-delta ' + (diff >= 0 ? 'up' : 'down');
    }

    // Movement card
    const moveVal = document.getElementById('comp-movement-val');
    const moveDelta = document.getElementById('comp-movement-delta');
    if (moveVal) {
        const movement = summary.trend_movement || 'stable';
        const emoji = movement === 'rising' ? '🚀' : movement === 'falling' ? '📉' : 'âž¡ï¸';
        moveVal.textContent = emoji + ' ' + movement.charAt(0).toUpperCase() + movement.slice(1);
        moveVal.className = 'comp-value ' + (movement === 'rising' ? 'positive' : movement === 'falling' ? 'negative' : '');
        const viralPct = summary.viral_change_pct || 0;
        moveDelta.innerHTML = `${viralPct >= 0 ? ICONS.up : ICONS.down} ${viralPct.toFixed(1)}% viral shift`;
        moveDelta.className = 'comp-delta ' + (viralPct >= 0 ? 'up' : 'down');
    }

    // Engagement card
    const engVal = document.getElementById('comp-engagement-val');
    const engDelta = document.getElementById('comp-engagement-delta');
    if (engVal) {
        const engPct = summary.engagement_change_pct || 0;
        engVal.textContent = (engPct >= 0 ? '+' : '') + engPct.toFixed(1) + '%';
        engVal.className = 'comp-value ' + (engPct >= 0 ? 'positive' : 'negative');
        engDelta.innerHTML = `${engPct >= 0 ? ICONS.up : ICONS.down} engagement rate`;
        engDelta.className = 'comp-delta ' + (engPct >= 0 ? 'up' : 'down');
    }
}

function renderComparisonCardsFallback() {
    // Use live video data to populate cards when API has no history yet
    if (!videos.length) return;
    const totalViews = videos.reduce((s, v) => s + v.views, 0);
    const avgEng = videos.reduce((s, v) => {
        return s + (v.views > 0 ? (v.likes + v.comments) / v.views * 100 : 0);
    }, 0) / videos.length;
    const avgViral = videos.reduce((s, v) => {
        const eng = v.views > 0 ? (v.likes + v.comments) / v.views * 100 : 0;
        return s + Math.min(99, Math.floor((v.growthRate || 10) / 1.5 + eng * 3));
    }, 0) / videos.length;

    const el = (id) => document.getElementById(id);
    if (el('comp-growth-val')) { el('comp-growth-val').textContent = '+' + formatNum(totalViews); el('comp-growth-val').className = 'comp-value positive'; el('comp-growth-delta').innerHTML = ICONS.up + ' live data'; el('comp-growth-delta').className = 'comp-delta up'; }
    if (el('comp-ranking-val')) { el('comp-ranking-val').textContent = '#' + videos.length; el('comp-ranking-delta').innerHTML = ICONS.up + ' trending now'; el('comp-ranking-delta').className = 'comp-delta up'; }
    if (el('comp-movement-val')) { el('comp-movement-val').textContent = '🚀 Rising'; el('comp-movement-val').className = 'comp-value positive'; el('comp-movement-delta').innerHTML = ICONS.up + ' ' + avgViral.toFixed(0) + '% viral avg'; el('comp-movement-delta').className = 'comp-delta up'; }
    if (el('comp-engagement-val')) { el('comp-engagement-val').textContent = avgEng.toFixed(1) + '%'; el('comp-engagement-val').className = 'comp-value positive'; el('comp-engagement-delta').innerHTML = ICONS.up + ' avg engagement'; el('comp-engagement-delta').className = 'comp-delta up'; }
}

function initHistoryCharts() {
    const chartOpts = {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeInOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true, labels: { color: '#a0a0a0', boxWidth: 10, font: { family: 'Inter', size: 11 } } }, tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' }, padding: 12, cornerRadius: 8 } },
        scales: { y: { display: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5a5a5a', font: { size: 10 } } }, x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5a5a5a', font: { size: 10 } } } }
    };

    const ctx1 = document.getElementById('viewsGrowthChart');
    if (ctx1) {
        viewsGrowthChartInst = new Chart(ctx1, {
            type: 'line',
            data: { labels: ['Day 1'], datasets: [{ label: 'Total Views', data: [0], borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.08)', borderWidth: 2.5, fill: true, tension: 0.4, pointBackgroundColor: '#4ade80', pointRadius: 4, pointHoverRadius: 6 }] },
            options: chartOpts
        });
    }

    const ctx2 = document.getElementById('viralMomentumChart');
    if (ctx2) {
        viralMomentumChartInst = new Chart(ctx2, {
            type: 'line',
            data: { labels: ['Day 1'], datasets: [{ label: 'Viral Probability', data: [0], borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.08)', borderWidth: 2.5, fill: true, tension: 0.4, pointBackgroundColor: '#f43f5e', pointRadius: 4, pointHoverRadius: 6 }] },
            options: chartOpts
        });
    }

    const ctx3 = document.getElementById('engagementTimelineChart');
    if (ctx3) {
        engTimelineChartInst = new Chart(ctx3, {
            type: 'bar',
            data: { labels: ['Day 1'], datasets: [
                { label: 'Likes', data: [0], backgroundColor: 'rgba(74,222,128,0.7)', borderRadius: 4 },
                { label: 'Comments', data: [0], backgroundColor: 'rgba(56,189,248,0.7)', borderRadius: 4 }
            ] },
            options: { ...chartOpts, scales: { ...chartOpts.scales, x: { ...chartOpts.scales.x, stacked: false }, y: { ...chartOpts.scales.y, stacked: false } } }
        });
    }

    const ctx4 = document.getElementById('regionPopularityChart');
    if (ctx4) {
        regionPopChartInst = new Chart(ctx4, {
            type: 'bar',
            data: { labels: ['US'], datasets: [{ label: 'Views', data: [0], backgroundColor: ['#4ade80','#38bdf8','#fb923c','#f43f5e','#c084fc','#22d3ee','#facc15','#a78bfa'], borderRadius: 6 }] },
            options: { ...chartOpts, indexAxis: 'y', plugins: { ...chartOpts.plugins, legend: { display: false } } }
        });
    }
}

function updateHistoryCharts(data) {
    if (!data) return;
    const dailyStats = data.dailyStats || [];
    const regionPop = data.regionPopularity || [];

    // Format day labels
    const dayLabels = dailyStats.map(d => {
        const date = new Date(d.day);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Views Growth Chart
    if (viewsGrowthChartInst && dailyStats.length > 0) {
        viewsGrowthChartInst.data.labels = dayLabels;
        viewsGrowthChartInst.data.datasets[0].data = dailyStats.map(d => Number(d.total_views));
        viewsGrowthChartInst.update('active');
    }

    // Viral Momentum Chart
    if (viralMomentumChartInst && dailyStats.length > 0) {
        viralMomentumChartInst.data.labels = dayLabels;
        viralMomentumChartInst.data.datasets[0].data = dailyStats.map(d => Number(d.avg_viral_prob).toFixed(1));
        viralMomentumChartInst.update('active');
    }

    // Engagement Timeline Chart
    if (engTimelineChartInst && dailyStats.length > 0) {
        engTimelineChartInst.data.labels = dayLabels;
        engTimelineChartInst.data.datasets[0].data = dailyStats.map(d => Number(d.total_likes));
        engTimelineChartInst.data.datasets[1].data = dailyStats.map(d => Number(d.total_comments));
        engTimelineChartInst.update('active');
    }

    // Region Popularity Chart
    if (regionPopChartInst && regionPop.length > 0) {
        const regionNames = { US: '🇺🇸 US', GB: '🇬🇧 UK', IN: '🇮🇳 India', JP: '🇯🇵 Japan', BR: '🇧🇷 Brazil', DE: '🇩🇪 Germany', FR: '🇫🇷 France', KR: '🇰🇷 Korea' };
        regionPopChartInst.data.labels = regionPop.map(r => regionNames[r.region] || r.region);
        regionPopChartInst.data.datasets[0].data = regionPop.map(r => Number(r.total_views));
        regionPopChartInst.update('active');
    }
}

function updateHistoryChartsFallback() {
    // Populate charts with current live data when no historical data exists
    if (!videos.length) return;
    const now = new Date();
    const labels = [now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })];
    const totalViews = videos.reduce((s, v) => s + v.views, 0);
    const totalLikes = videos.reduce((s, v) => s + v.likes, 0);
    const totalComments = videos.reduce((s, v) => s + v.comments, 0);
    const avgViral = videos.reduce((s, v) => {
        const eng = v.views > 0 ? (v.likes + v.comments) / v.views * 100 : 0;
        return s + Math.min(99, Math.floor((v.growthRate || 10) / 1.5 + eng * 3));
    }, 0) / videos.length;

    if (viewsGrowthChartInst) { viewsGrowthChartInst.data.labels = labels; viewsGrowthChartInst.data.datasets[0].data = [totalViews]; viewsGrowthChartInst.update('active'); }
    if (viralMomentumChartInst) { viralMomentumChartInst.data.labels = labels; viralMomentumChartInst.data.datasets[0].data = [avgViral.toFixed(1)]; viralMomentumChartInst.update('active'); }
    if (engTimelineChartInst) { engTimelineChartInst.data.labels = labels; engTimelineChartInst.data.datasets[0].data = [totalLikes]; engTimelineChartInst.data.datasets[1].data = [totalComments]; engTimelineChartInst.update('active'); }

    // Region chart from current country
    const c = countries.find(x => x.code === selectedCountry);
    if (regionPopChartInst && c) { regionPopChartInst.data.labels = [c.flag + ' ' + c.name]; regionPopChartInst.data.datasets[0].data = [totalViews]; regionPopChartInst.update('active'); }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SAVE / BOOKMARK TREND SYSTEM
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function loadSavedTrendIds() {
    const user = AuthGate.getUser();
    if (!user) { currentUserId = null; savedTrendIds = new Set(); return; }
    currentUserId = user.id;

    AuthGate.authFetch('https://trendscope-production-3708.up.railway.app/api/saved-trends/mine/ids')
        .then(r => { if (!r.ok) throw new Error('Auth'); return r.json(); })
        .then(ids => {
            savedTrendIds = new Set(ids);
            renderVideoGrid();
        })
        .catch(() => { savedTrendIds = new Set(); });
}

async function toggleSaveTrend(videoId, btnEl) {
    if (!AuthGate.isAuthenticated()) {
        AuthGate.requireAuth(() => toggleSaveTrend(videoId, btnEl));
        return;
    }
    currentUserId = AuthGate.getUser()?.id;

    const isSaved = savedTrendIds.has(videoId);

    if (isSaved) {
        // Unsave — need to find the saved_trend id first
        try {
            const res = await AuthGate.authFetch('https://trendscope-production-3708.up.railway.app/api/saved-trends/mine');
            const saved = await res.json();
            const found = saved.find(s => s.video_youtube_id === videoId);
            if (found) {
                await AuthGate.authFetch(`https://trendscope-production-3708.up.railway.app/api/saved-trends/${found.id}`, { method: 'DELETE' });
                savedTrendIds.delete(videoId);
                btnEl.classList.remove('saved');
                btnEl.innerHTML = ICONS.bookmark;
                btnEl.title = 'Save trend';
                showToast('Trend removed from saved');
            }
        } catch (err) { console.error('Unsave error:', err); }
    } else {
        // Save
        const video = videos.find(v => v.id === videoId);
        if (!video) return;

        try {
            await AuthGate.authFetch('https://trendscope-production-3708.up.railway.app/api/saved-trends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    video_youtube_id: video.id,
                    video_title: video.title,
                    channel_name: video.channel,
                    thumbnail_url: video.thumbnail,
                    views: video.views,
                    likes: video.likes,
                    category: video.category,
                    region: selectedCountry
                })
            });
            savedTrendIds.add(videoId);
            btnEl.classList.add('saved');
            btnEl.innerHTML = ICONS.bookmarkFilled;
            btnEl.title = 'Remove from saved';
            showToast('Trend saved! âœ¨');
        } catch (err) { console.error('Save error:', err); }
    }

    // Refresh saved section if visible
    const savedSection = document.getElementById('section-saved');
    if (savedSection && savedSection.style.display !== 'none') {
        renderSavedTrends();
    }
}

async function renderSavedTrends() {
    const grid = document.getElementById('saved-trends-grid');
    const countEl = document.getElementById('saved-count');
    if (!grid) return;

    if (!AuthGate.isAuthenticated()) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text2);background:var(--bg2);border:1px dashed var(--border);border-radius:var(--radius)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px;margin-bottom:16px;opacity:0.4"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
            <h3 style="color:var(--text);margin-bottom:8px">Login Required</h3>
            <p>Please <a href="#" onclick="event.preventDefault();AuthGate.showModal()" style="color:var(--green)">sign in</a> to save and view your bookmarked trends.</p>
        </div>`;
        if (countEl) countEl.textContent = '0 saved';
        return;
    }
    currentUserId = AuthGate.getUser()?.id;

    // Show loading skeletons
    grid.innerHTML = Array(3).fill(0).map(() => `<div class="skeleton-card" style="height:80px"><div class="skeleton-bar w80"></div><div class="skeleton-bar w60"></div></div>`).join('');

    try {
        const res = await AuthGate.authFetch('https://trendscope-production-3708.up.railway.app/api/saved-trends/mine');
        const savedList = await res.json();

        if (countEl) countEl.textContent = savedList.length + ' saved';

        if (savedList.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text2);background:var(--bg2);border:1px dashed var(--border);border-radius:var(--radius)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px;margin-bottom:16px;opacity:0.4"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                <h3 style="color:var(--text);margin-bottom:8px">No saved trends yet</h3>
                <p>Click the bookmark icon on any video to save it here.</p>
            </div>`;
            return;
        }

        grid.innerHTML = savedList.map(s => `
            <div class="saved-trend-card" onclick="window.open('https://youtube.com/watch?v=${s.video_youtube_id}','_blank')">
                <img src="${s.thumbnail_url}" class="saved-trend-thumb" alt="thumb" loading="lazy" onerror="this.style.background='var(--bg3)'">
                <div class="saved-trend-info">
                    <div class="saved-trend-title" title="${(s.video_title||'').replace(/"/g,'&quot;')}">${s.video_title}</div>
                    <div class="saved-trend-channel">${s.channel_name}</div>
                    <div class="saved-trend-stats">
                        <span>${ICONS.eye} ${formatNum(Number(s.views))}</span>
                        <span>${ICONS.heart} ${formatNum(Number(s.likes))}</span>
                        <span>${s.category}</span>
                    </div>
                </div>
                <button class="saved-trend-remove" onclick="event.stopPropagation();removeSavedTrend(${s.id},'${s.video_youtube_id}')" title="Remove">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `).join('');
    } catch (err) {
        console.error('Load saved trends error:', err);
        grid.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px">Failed to load saved trends.</p>';
    }
}

async function removeSavedTrend(id, videoYoutubeId) {
    try {
        await AuthGate.authFetch(`https://trendscope-production-3708.up.railway.app/api/saved-trends/${id}`, { method: 'DELETE' });
        savedTrendIds.delete(videoYoutubeId);
        showToast('Trend removed');
        renderSavedTrends();
        renderVideoGrid(); // Update bookmark icons
    } catch (err) { console.error('Remove error:', err); }
}

function initSavedTrendsNav() {
    // Handle clicking saved nav items to show/hide saved section
    const navSaved = document.getElementById('nav-saved');
    const allSectionNavs = document.querySelectorAll('.nav-item[data-section], .b-nav-item[data-section]');

    allSectionNavs.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;
            const savedSection = document.getElementById('section-saved');
            const historySection = document.getElementById('section-history');

            if (sectionId === 'section-saved') {
                AuthGate.requireAuth(() => {
                    if (savedSection) { savedSection.style.display = 'block'; renderSavedTrends(); }
                    if (historySection) historySection.style.display = 'none';
                }); return;
            } else if (sectionId === 'section-history') {
                if (savedSection) savedSection.style.display = 'none';
                if (historySection) historySection.style.display = 'block';
            } else {
                // Any other nav — hide saved, show history
                if (savedSection) savedSection.style.display = 'none';
                if (historySection) historySection.style.display = 'block';
            }
        });
    });
}



