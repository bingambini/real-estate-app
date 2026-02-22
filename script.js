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

function renderProperties(items) {
    const container = document.getElementById('property-container');
    if (!container || !Array.isArray(items)) return;
    
    container.innerHTML = items.map(item => {
        try {
            const firstImg = item.Photos ? item.Photos.split(',')[0].trim() : 'https://placehold.co/400x300?text=No+Image';
            
            let currentMakler = null;
            if (window.allMaklers && window.allMaklers.length > 0) {
                currentMakler = window.allMaklers.find(m => String(m.ID) === String(item.MaklerID)) || window.allMaklers[0];
            }
            const maklerImg = (currentMakler && currentMakler.Photo) ? currentMakler.Photo : 'https://placehold.co/100x100?text=Agent';

            return `
            <div onclick='openDetails(${JSON.stringify(item)})' class="group bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 active:scale-[0.97] transition-all duration-300 mb-2 relative">
                <div class="relative h-64 overflow-hidden">
                    <img src="${firstImg}" class="w-full h-full object-cover">
                    <div class="id-on-photo">ID: ${item.ID}</div>
                    <div class="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase text-slate-800">
                        ${item.DealType || 'იყიდება'}
                    </div>
                    <div class="absolute bottom-4 left-4 bg-blue-600 px-4 py-2 rounded-2xl shadow-lg">
                        <p class="text-white font-black text-lg leading-none">${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}</p>
                    </div>
                </div>
                <div class="p-5 relative">
                    <h4 class="font-black text-slate-800 text-lg truncate w-[80%]">${item.Street || item.PropertyType || 'ბინა'}</h4>
                    <p class="text-slate-400 text-xs mb-3"><i class="fa-solid fa-location-dot text-blue-500"></i> ${item.District || ''}, ${item.City || ''}</p>
                    
                    <div class="flex items-center gap-4 border-t border-slate-50 pt-3">
                        <div class="flex items-center gap-1.5"><i class="fa-solid fa-bed text-slate-300 text-xs"></i><span class="text-xs font-bold text-slate-600">${item.Rooms || 0}</span></div>
                        <div class="flex items-center gap-1.5"><i class="fa-solid fa-vector-square text-slate-300 text-xs"></i><span class="text-xs font-bold text-slate-600">${item.TotalArea || 0} მ²</span></div>
                    </div>

                    <div onclick="event.stopPropagation(); openProfile('${item.MaklerID}');" class="absolute bottom-4 right-5 w-12 h-12 rounded-full border-4 border-white shadow-lg overflow-hidden active:scale-90 transition-transform cursor-pointer z-20">
                        <img src="${maklerImg}" class="w-full h-full object-cover">
                    </div>
                </div>
            </div>`;
        } catch (err) {
            return ""; 
        }
    }).join('');
}

document.addEventListener('click', function(e) {
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        navItem.classList.add('active');
        const label = navItem.querySelector('.nav-label')?.innerText;
        if (label && label.includes("პროფილი")) {
            openProfile(); 
        }
    }
});

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
            <div class="bg-slate-50 p-3 rounded-2xl">
                <p class="text-[9px] uppercase font-bold text-slate-400">${f.label}</p>
                <p class="text-xs font-black text-slate-700">${f.val}</p>
            </div>`).join('');
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
                
                <div class="absolute bottom-16 right-6 flex items-center gap-4 bg-white/5 backdrop-blur-md px-6 py-3 rounded-[24px] border border-white/10 shadow-lg pointer-events-none opacity-80 animate-in fade-in duration-700">
                    <div class="flex items-center justify-center w-10 h-10">
                        ${logoUrl ? 
                            `<img src="${logoUrl}" class="w-full h-full object-contain">` : 
                            `<i class="fa-solid fa-house-chimney text-white/50 text-sm"></i>`
                        }
                    </div>
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
