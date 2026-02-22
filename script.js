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
        
        // ვინახავთ მაკლერებს (ამოწმებს ორივე ვარიანტს: Makler და makler)
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
            const firstImg = item.Photos ? item.Photos.split(',')[0].trim() : 'https://via.placeholder.com/400x300?text=No+Image';
            
            // მაკლერის ლოგიკა: ვეძებთ MaklerID-ს მიხედვით
            let currentMakler = null;
            if (window.allMaklers && window.allMaklers.length > 0) {
                currentMakler = window.allMaklers.find(m => String(m.ID) === String(item.MaklerID)) || window.allMaklers[0];
            }
            const maklerImg = (currentMakler && currentMakler.Photo) ? currentMakler.Photo : 'https://via.placeholder.com/100';

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
            console.error("Error rendering item:", err);
            return ""; 
        }
    }).join('');
}

// ნავიგაციის ფიქსი
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
    
    document.getElementById('det-title').innerText = `${item.Rooms || 0} ოთახიანი ${item.PropertyType || 'ბინა'}`;
    document.getElementById('det-loc').innerText = `${item.City || ''}, ${item.District || ''}, ${item.Street || ''}`;
    document.getElementById('det-price').innerText = `${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}`;
    document.getElementById('det-id').innerText = item.ID;
    document.getElementById('det-rooms').innerText = item.Rooms || "0";
    document.getElementById('det-floor').innerText = `${item.Floor || 0}/${item.TotalFloors || '?'}`;
    document.getElementById('det-sq').innerText = item.TotalArea || "0";
    document.getElementById('tab-desc').innerText = item.Description || "აღწერა არ არის მითითებული";

    const features = [
        { label: "მდგომარეობა", val: item.Condition },
        { label: "პროექტი", val: item.ProjectType },
        { label: "გათბობა", val: item.Heating },
        { label: "ჭერი", val: item.CeilingHeight },
        { label: "პარკინგი", val: item.Parking }
    ];
    
    document.getElementById('features-list').innerHTML = features.filter(f => f.val).map(f => `
        <div class="bg-slate-50 p-3 rounded-2xl">
            <p class="text-[9px] uppercase font-bold text-slate-400">${f.label}</p>
            <p class="text-xs font-black text-slate-700">${f.val}</p>
        </div>`).join('');

    document.getElementById('det-phone').innerText = item.Phone || "---";
    document.getElementById('call-btn').href = `tel:${item.Phone}`;

    const wrapper = document.getElementById('slider-wrapper');
    const dotsContainer = document.getElementById('slider-dots');
    
    if (item.Photos) {
        const photoList = item.Photos.split(',');
        wrapper.innerHTML = photoList.map(url => `<div class="slide"><img src="${url.trim()}" onerror="this.src='https://via.placeholder.com/400x300?text=Image+Error'"></div>`).join('');
        dotsContainer.innerHTML = photoList.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}"></div>`).join('');
        wrapper.onscroll = () => {
            const scrollIndex = Math.round(wrapper.scrollLeft / wrapper.clientWidth);
            document.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === scrollIndex));
        };
        wrapper.scrollLeft = 0;
    }
    document.getElementById('details-page').classList.add('active');
}

function openProfile(maklerId) {
    if (!window.allMaklers || window.allMaklers.length === 0) return;

    const m = maklerId 
        ? window.allMaklers.find(makler => String(makler.ID) === String(maklerId)) 
        : window.allMaklers[0];

    if (!m) return;
    
    document.getElementById('m-name').innerText = m.Name || "მაკლერი";
    document.getElementById('m-photo').src = m.Photo || 'https://via.placeholder.com/100';
    document.getElementById('m-wm').innerText = m.WatermarkText || "Agent";
    document.getElementById('m-id').innerText = m.ID || "---";
    document.getElementById('m-call').href = `tel:${m.Phone}`;
    document.getElementById('profile-page').classList.add('active');
}

function closeProfile() { document.getElementById('profile-page').classList.remove('active'); }
function closeDetails() { document.getElementById('details-page').classList.remove('active'); }

function switchTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    el.classList.add('active');
}

init();
