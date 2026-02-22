const API_URL = "https://script.google.com/macros/s/AKfycbxta9JUYUMBHeB7w22xQGBF4F0wkeSdSbXeU0hMPnctd8YPl9u5fOnkS3Lx224OWpBf3A/exec";
const tg = window.Telegram.WebApp;
window.allMaklers = []; 

function formatPrice(price) {
    if (!price) return "0";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function init() {
    tg.expand();
    tg.ready();
    setTimeout(() => { 
        const splash = document.getElementById('splash-screen');
        const content = document.getElementById('main-content');
        if (splash) splash.classList.add('hidden-splash'); 
        if (content) content.style.opacity = '1'; 
    }, 2000);
    await fetchData();
}

async function fetchData() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        let mData = data.Makler || data.makler || [];
        window.allMaklers = Array.isArray(mData) ? mData : [mData];
        const listings = data.listings || data.Listings || [];
        renderProperties(listings); 
    } catch (e) { 
        console.error("Error fetching data:", e);
        const container = document.getElementById('property-container');
        if (container) container.innerHTML = "<p class='text-center text-red-500'>მონაცემების ჩატვირთვა ვერ მოხერხდა</p>";
    }
}

// --- პროფესიონალური PDF გენერაცია 10 ხატულით და ყველა სვეტით ---
async function downloadProfessionalPDF(item) {
    const currentMakler = window.allMaklers.find(m => String(m.ID) === String(item.MaklerID)) || window.allMaklers[0];
    const photoList = item.Photos ? item.Photos.split(',') : [];

    // ყველა ველის დინამიური შეგროვება (გარდა სისტემურისა)
    const dynamicFields = Object.entries(item)
        .filter(([key, val]) => val && !['Photos', 'ID', 'MaklerID', 'Description', 'TotalPrice', 'Currency', 'Street', 'City', 'District', 'DealType', 'Phone'].includes(key))
        .map(([key, val]) => `
            <div style="background:#f8fafc; padding:10px 15px; border-radius:12px; border:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:10px; color:#64748b; font-weight:bold; text-transform:uppercase;">${key}</span>
                <span style="font-size:12px; color:#1e293b; font-weight:800;">${val}</span>
            </div>
        `).join('');

    const pdfTemplate = document.createElement('div');
    pdfTemplate.style.cssText = 'width: 800px; padding: 40px; background: #fff; color: #1e293b; font-family: sans-serif;';

    pdfTemplate.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #f1f5f9; padding-bottom:20px; margin-bottom:25px;">
            <img src="${currentMakler?.Logo || ''}" style="height:45px; max-width:160px; object-fit:contain;">
            <div style="text-align:right;">
                <h1 style="margin:0; font-size:28px; color:#1d4ed8;">${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}</h1>
                <p style="margin:2px 0; font-size:11px; color:#64748b; font-weight:800;">PROPERTY ID: ${item.ID}</p>
            </div>
        </div>

        <img src="${photoList[0]?.trim()}" style="width:100%; height:400px; border-radius:24px; object-fit:cover; margin-bottom:25px; box-shadow:0 10px 15px rgba(0,0,0,0.05);">

        <div style="margin-bottom:25px;">
            <h2 style="font-size:22px; margin:0 0 5px; color:#0f172a;">${item.Rooms} ოთახიანი ${item.PropertyType || 'ბინა'}</h2>
            <p style="color:#3b82f6; font-size:14px; font-weight:600; margin:0;">📍 ${item.City}, ${item.District}, ${item.Street}</p>
        </div>

        <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:12px; margin-bottom:30px;">
            ${[
                {i:'fa-vector-square', l:'ფართი', v: (item.TotalArea || 0)+' მ²'},
                {i:'fa-bed', l:'ოთახები', v: item.Rooms || 0},
                {i:'fa-layer-group', l:'სართული', v: (item.Floor || 0)+'/'+(item.TotalFloors || '?')},
                {i:'fa-paint-roller', l:'რემონტი', v: item.Condition || '---'},
                {i:'fa-blueprint', l:'პროექტი', v: item.ProjectType || '---'},
                {i:'fa-fire-flame-simple', l:'გათბობა', v: item.Heating || '---'},
                {i:'fa-car', l:'პარკინგი', v: item.Parking || '---'},
                {i:'fa-arrows-up-down', l:'ჭერი', v: item.CeilingHeight || '---'},
                {i:'fa-cloud-sun', l:'აივანი', v: item.Balcony || '---'},
                {i:'fa-mountain-city', l:'ხედი', v: item.View || '---'}
            ].map(f => `
                <div style="background:#f8fafc; border:1px solid #f1f5f9; padding:12px 5px; border-radius:16px; text-align:center;">
                    <i class="fa-solid ${f.i}" style="color:#3b82f6; font-size:14px; margin-bottom:6px;"></i>
                    <p style="font-size:8px; color:#94a3b8; text-transform:uppercase; margin:0; font-weight:bold;">${f.l}</p>
                    <p style="font-size:11px; color:#1e293b; font-weight:800; margin:3px 0 0;">${f.v}</p>
                </div>
            `).join('')}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:30px;">
            ${dynamicFields}
        </div>

        <div style="margin-bottom:30px;">
            <p style="font-size:13px; line-height:1.6; color:#475569; background:#fff9f0; padding:15px; border-radius:16px; border-left:4px solid #f59e0b;">${item.Description || ''}</p>
        </div>

        <div style="background:#1e293b; padding:25px; border-radius:24px; display:flex; align-items:center; justify-content:space-between; color:#fff;">
            <div style="display:flex; align-items:center; gap:15px;">
                <img src="${currentMakler?.Photo || ''}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.2);">
                <div>
                    <p style="margin:0; font-weight:800; font-size:16px;">${currentMakler?.Name}</p>
                    <p style="margin:2px 0 0; color:#60a5fa; font-size:14px; font-weight:bold;">${item.Phone || ''}</p>
                </div>
            </div>
            <div style="text-align:right; opacity:0.6;">
                <p style="font-size:10px; margin:0;">VERIFIED REAL ESTATE AGENT</p>
                <p style="font-size:10px; margin:0;">DATE: ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
    `;

    html2pdf().set({
        margin: 0,
        filename: `Expose_ID_${item.ID}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
    }).from(pdfTemplate).save();
}

function renderProperties(items) {
    const container = document.getElementById('property-container');
    if (!container || !Array.isArray(items)) return;
    container.innerHTML = items.map(item => {
        try {
            const firstImg = item.Photos ? item.Photos.split(',')[0].trim() : 'https://placehold.co/400x300?text=No+Image';
            let currentMakler = (window.allMaklers && window.allMaklers.length > 0) ? (window.allMaklers.find(m => String(m.ID) === String(item.MaklerID)) || window.allMaklers[0]) : null;
            const maklerImg = currentMakler?.Photo || 'https://placehold.co/100x100?text=Agent';
            
            return `
            <div onclick='openDetails(${JSON.stringify(item)})' class="group bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 active:scale-[0.97] transition-all duration-300 mb-2 relative">
                <div class="relative h-64 overflow-hidden">
                    <img src="${firstImg}" class="w-full h-full object-cover">
                    <div class="id-on-photo">ID: ${item.ID}</div>
                    <div class="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase text-slate-800">${item.DealType || 'იყიდება'}</div>
                    <div class="absolute bottom-4 left-4 bg-blue-600 px-4 py-2 rounded-2xl shadow-lg">
                        <p class="text-white font-black text-lg leading-none">${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}</p>
                    </div>
                </div>
                <div class="p-5 relative">
                    <h4 class="font-black text-slate-800 text-lg truncate w-[80%]">${item.Street || item.PropertyType || 'ბინა'}</h4>
                    <p class="text-slate-400 text-[11px] mb-4">📍 ${item.District || ''}, ${item.City || ''}</p>
                    
                    <div class="grid grid-cols-2 gap-y-2 gap-x-4 border-t border-slate-50 pt-4">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-vector-square text-blue-500 text-[10px]"></i>
                            <span class="text-xs font-bold text-slate-600">${item.TotalArea || 0} მ²</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-bed text-blue-500 text-[10px]"></i>
                            <span class="text-xs font-bold text-slate-600">${item.Rooms || 0} ოთახი</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-layer-group text-blue-500 text-[10px]"></i>
                            <span class="text-xs font-bold text-slate-600">${item.Floor || 0}/${item.TotalFloors || '?'} სართ.</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-paint-roller text-blue-500 text-[10px]"></i>
                            <span class="text-xs font-bold text-slate-600 truncate">${item.Condition || 'რემონტით'}</span>
                        </div>
                    </div>

                    <div onclick="event.stopPropagation(); openProfile('${item.MaklerID}');" class="absolute bottom-4 right-5 w-12 h-12 rounded-full border-4 border-white shadow-lg overflow-hidden active:scale-90 transition-transform cursor-pointer z-20">
                        <img src="${maklerImg}" class="w-full h-full object-cover">
                    </div>
                </div>
            </div>`;
        } catch (err) { return ""; }
    }).join('');
}

function openDetails(item) {
    if (item.ID) fetch(`${API_URL}?viewId=${item.ID}`).catch(e => console.error(e));
    const setEl = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    setEl('det-title', `${item.Rooms || 0} ოთახიანი ${item.PropertyType || 'ბინა'}`);
    setEl('det-loc', `${item.City || ''}, ${item.District || ''}, ${item.Street || ''}`);
    setEl('det-price', `${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}`);
    setEl('det-id', item.ID);
    setEl('det-rooms', item.Rooms || "0");
    setEl('det-floor', `${item.Floor || 0}/${item.TotalFloors || '?'}`);
    setEl('det-sq', item.TotalArea || "0");
    setEl('tab-desc', item.Description || "აღწერა არ არის მითითებული");

    const pdfBtn = document.getElementById('download-pdf-btn');
    if(pdfBtn) pdfBtn.onclick = () => downloadProfessionalPDF(item);

    const featList = document.getElementById('features-list');
    if(featList) {
        const features = [
            { label: "მდგომარეობა", val: item.Condition }, 
            { label: "პროექტი", val: item.ProjectType }, 
            { label: "გათბობა", val: item.Heating }, 
            { label: "ჭერი", val: item.CeilingHeight }, 
            { label: "პარკინგი", val: item.Parking }
        ];
        featList.innerHTML = features.filter(f => f.val).map(f => `<div class="bg-slate-50 p-3 rounded-2xl"><p class="text-[9px] uppercase font-bold text-slate-400">${f.label}</p><p class="text-xs font-black text-slate-700">${f.val}</p></div>`).join('');
    }

    const phoneEl = document.getElementById('det-phone');
    if(phoneEl) phoneEl.innerText = item.Phone || "---";
    const callBtn = document.getElementById('call-btn');
    if(callBtn) callBtn.href = `tel:${item.Phone}`;

    const wrapper = document.getElementById('slider-wrapper');
    const dotsContainer = document.getElementById('slider-dots');
    if (item.Photos && wrapper && dotsContainer) {
        let currentMakler = window.allMaklers.find(m => String(m.ID) === String(item.MaklerID)) || window.allMaklers[0];
        const wmText = currentMakler?.WatermarkText || "Real Estate";
        const logoUrl = currentMakler?.Logo || "";
        const photoList = item.Photos.split(',');
        wrapper.innerHTML = photoList.map(url => `
            <div class="slide relative h-full w-full flex-shrink-0 overflow-hidden">
                <img src="${url.trim()}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/400x300?text=No+Image'">
                <div class="absolute bottom-16 right-6 flex items-center gap-4 bg-white/5 backdrop-blur-md px-6 py-3 rounded-[24px] border border-white/10 shadow-lg pointer-events-none opacity-80">
                    <div class="flex items-center justify-center w-10 h-10">${logoUrl ? `<img src="${logoUrl}" class="w-full h-full object-contain">` : `<i class="fa-solid fa-house-chimney text-white/50 text-sm"></i>`}</div>
                    <div class="flex flex-col justify-center">
                        <span class="text-white/90 text-xs font-black leading-tight tracking-tight">${wmText}</span>
                        <div class="flex items-center gap-1.5 mt-1">
                            <div class="w-1.5 h-1.5 bg-green-500/60 rounded-full animate-pulse"></div>
                            <span class="text-white/40 text-[8px] font-bold uppercase tracking-[0.15em]">Verified Partner</span>
                        </div>
                    </div>
                </div>
            </div>`).join('');
        dotsContainer.innerHTML = photoList.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}"></div>`).join('');
        wrapper.onscroll = () => {
            const scrollIndex = Math.round(wrapper.scrollLeft / wrapper.clientWidth);
            document.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === scrollIndex));
        };
        wrapper.scrollLeft = 0;
    }
    document.getElementById('details-page')?.classList.add('active');
}

function openProfile(maklerId) {
    if (!window.allMaklers || window.allMaklers.length === 0) return;
    const m = maklerId ? window.allMaklers.find(makler => String(makler.ID) === String(maklerId)) : window.allMaklers[0];
    if (!m) return;
    const elName = document.getElementById('m-name');
    if(elName) elName.innerText = m.Name || "მაკლერი";
    const elPhoto = document.getElementById('m-photo');
    if(elPhoto) elPhoto.src = m.Photo || 'https://placehold.co/100x100?text=Agent';
    const elWm = document.getElementById('m-wm');
    if(elWm) elWm.innerText = m.WatermarkText || "Agent";
    const elId = document.getElementById('m-id');
    if(elId) elId.innerText = m.ID || "---";
    const elCall = document.getElementById('m-call');
    if(elCall) elCall.href = `tel:${m.Phone}`;
    document.getElementById('profile-page')?.classList.add('active');
}

function closeProfile() { document.getElementById('profile-page')?.classList.remove('active'); }
function closeDetails() { document.getElementById('details-page')?.classList.remove('active'); }
function switchTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId)?.classList.add('active');
    el.classList.add('active');
}

init();
