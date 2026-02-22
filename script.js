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
            
            return `
            <div onclick='openDetails(${JSON.stringify(item)})' class="bg-white rounded-[30px] overflow-hidden shadow-sm border border-slate-100 active:scale-[0.98] transition-all mb-4">
                <div class="relative h-60 overflow-hidden">
                    <img src="${firstImg}" class="w-full h-full object-cover">
                    
                    <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black text-slate-800 uppercase shadow-sm">${item.DealType || 'იყიდება'}</div>
                    
                    <div class="absolute bottom-3 left-3 bg-blue-600 px-4 py-2 rounded-xl shadow-lg">
                        <p class="text-white font-black text-base leading-none">${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}</p>
                    </div>
                </div>

                <div class="px-5 pt-3 pb-3">
                    <h4 class="font-black text-slate-800 text-base leading-tight truncate">${item.Street || item.PropertyType || 'ბინა'}</h4>
                    <p class="text-slate-400 text-[10px] font-bold mt-0.5 flex items-center gap-1">
                        <i class="fa-solid fa-location-dot text-blue-500/70"></i> ${item.District || ''}, ${item.City || ''}
                    </p>
                    
                    <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                        <div class="flex items-center gap-1.5">
                            <i class="fa-solid fa-vector-square text-blue-500 text-[9px]"></i>
                            <span class="text-[11px] font-extrabold text-slate-600">${item.TotalArea || 0} მ²</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <i class="fa-solid fa-bed text-blue-500 text-[9px]"></i>
                            <span class="text-[11px] font-extrabold text-slate-600">${item.Rooms || 0} ოთ.</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <i class="fa-solid fa-layer-group text-blue-500 text-[9px]"></i>
                            <span class="text-[11px] font-extrabold text-slate-600">${item.Floor || 0}/${item.TotalFloors || '?'} ს.</span>
                        </div>
                        <div class="flex items-center gap-1.5 max-w-[85px]">
                            <i class="fa-solid fa-paint-roller text-blue-500 text-[9px]"></i>
                            <span class="text-[11px] font-extrabold text-slate-600 truncate">${item.Condition || 'სუფთა'}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        } catch (err) { return ""; }
    }).join('');
}

function openDetails(item) {
    if (item.ID) fetch(`${API_URL}?viewId=${item.ID}`).catch(e => console.error(e));
    
    // ძირითადი ინფორმაციის შევსება
    const setEl = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    setEl('det-title', `${item.Rooms || 0} ოთახიანი ${item.PropertyType || 'ბინა'}`);
    setEl('det-loc', `${item.City || ''}, ${item.District || ''}, ${item.Street || ''}`);
    setEl('det-price', `${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}`);
    setEl('det-id', item.ID);
    setEl('det-rooms', item.Rooms || "0");
    setEl('det-floor', `${item.Floor || 0}/${item.TotalFloors || '?'}`);
    setEl('det-sq', item.TotalArea || "0");
    setEl('tab-desc', item.Description || "აღწერა არ არის მითითებული");

    // --- კონტაქტის და PDF სექციის განახლება ---
    const contactContainer = document.getElementById('contact-section-wrapper'); 
    if (contactContainer) {
        let currentMakler = (window.allMaklers && window.allMaklers.length > 0) 
            ? (window.allMaklers.find(m => String(m.ID) === String(item.MaklerID)) || window.allMaklers[0]) 
            : null;
        
        contactContainer.innerHTML = `
            <div class="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50">
                <div class="flex items-center gap-4 mb-6">
                    <div class="relative">
                        <img src="${currentMakler?.Photo || 'https://placehold.co/100x100?text=Agent'}" class="w-16 h-16 rounded-2xl object-cover border-2 border-blue-50">
                        <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                        <h4 class="font-black text-slate-800 text-base leading-none">${currentMakler?.Name || 'აგენტი'}</h4>
                        <p class="text-slate-400 text-[10px] font-bold mt-1.5 uppercase tracking-wider">ვერიფიცირებული პარტნიორი</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <a href="tel:${item.Phone}" class="flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl active:scale-95 transition-transform shadow-lg shadow-slate-200">
                        <i class="fa-solid fa-phone text-xs"></i>
                        <span class="text-xs font-black">დარეკვა</span>
                    </a>
                    
                    <button onclick="downloadProfessionalPDF(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-4 rounded-2xl active:scale-95 transition-transform border border-blue-100">
                        <i class="fa-solid fa-file-pdf text-xs"></i>
                        <span class="text-xs font-black">PDF კატალოგი</span>
                    </button>
                </div>
            </div>
        `;
    }

    // მახასიათებლების სია (Features)
    const featList = document.getElementById('features-list');
    if(featList) {
        const features = [
            { label: "მდგომარეობა", val: item.Condition }, 
            { label: "პროექტი", val: item.ProjectType }, 
            { label: "გათბობა", val: item.Heating }, 
            { label: "ჭერი", val: item.CeilingHeight }, 
            { label: "პარკინგი", val: item.Parking }
        ];
        featList.innerHTML = features.filter(f => f.val).map(f => `
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                <p class="text-[9px] uppercase font-bold text-slate-400 mb-1">${f.label}</p>
                <p class="text-xs font-black text-slate-700">${f.val}</p>
            </div>`).join('');
    }

    // სლაიდერი (Photos) - უცვლელად ვტოვებთ
    const wrapper = document.getElementById('slider-wrapper');
    const dotsContainer = document.getElementById('slider-dots');
    if (item.Photos && wrapper && dotsContainer) {
        const photoList = item.Photos.split(',');
        wrapper.innerHTML = photoList.map(url => `
            <div class="slide relative h-full w-full flex-shrink-0">
                <img src="${url.trim()}" class="w-full h-full object-cover">
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
