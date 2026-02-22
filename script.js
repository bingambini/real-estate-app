const API_URL = "https://script.google.com/macros/s/AKfycbxta9JUYUMBHeB7w22xQGBF4F0wkeSdSbXeU0hMPnctd8YPl9u5fOnkS3Lx224OWpBf3A/exec";
const tg = window.Telegram.WebApp;
window.maklerInfo = null;

// --- დამხმარე ფუნქციები ---

// თანხის ფორმატირება (მაგ: 1 000 000)
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
        renderProperties(data.listings);
        window.maklerInfo = data.makler;
    } catch (e) { 
        console.error("Error fetching data:", e);
        const container = document.getElementById('property-container');
        if (container) container.innerHTML = "<p class='text-center text-red-500'>მონაცემების ჩატვირთვა ვერ მოხერხდა</p>";
    }
}

function renderProperties(items) {
    const container = document.getElementById('property-container');
    if (!container) return;
    
    container.innerHTML = items.map(item => {
        const firstImg = item.Photos ? item.Photos.split(',')[0].trim() : 'https://via.placeholder.com/400x300?text=No+Image';
        const formattedPrice = formatPrice(item.TotalPrice);
        // მაკლერის ფოტო (თუ არ არის, placeholder)
        const maklerImg = window.maklerInfo ? window.maklerInfo.Photo : 'https://via.placeholder.com/100';

        return `
        <div onclick='openDetails(${JSON.stringify(item)})' class="group bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 active:scale-[0.97] transition-all duration-300 mb-2 relative">
            <div class="relative h-64 overflow-hidden">
                <img src="${firstImg}" class="w-full h-full object-cover">
                <div class="id-on-photo">ID: ${item.ID}</div>
                <div class="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase text-slate-800 shadow-sm">
                    ${item.DealType || 'იყიდება'}
                </div>
                <div class="absolute bottom-4 left-4 bg-blue-600 px-4 py-2 rounded-2xl shadow-lg">
                    <p class="text-white font-black text-lg leading-none">${formattedPrice} ${item.Currency === 'USD' ? '$' : '₾'}</p>
                </div>
            </div>
            <div class="p-5 relative">
                <div class="flex justify-between items-start mb-1">
                    <h4 class="font-black text-slate-800 text-lg leading-tight truncate w-full">${item.Street || item.PropertyType}</h4>
                </div>
                <p class="text-slate-400 text-xs font-medium mb-3 flex items-center gap-1">
                    <i class="fa-solid fa-location-dot text-blue-500"></i> ${item.District}, ${item.City}
                </p>
                
                <div class="flex items-center gap-4 border-t border-slate-50 pt-3">
                    <div class="flex items-center gap-1.5"><i class="fa-solid fa-bed text-slate-300 text-xs"></i><span class="text-xs font-bold text-slate-600">${item.Rooms}</span></div>
                    <div class="flex items-center gap-1.5"><i class="fa-solid fa-vector-square text-slate-300 text-xs"></i><span class="text-xs font-bold text-slate-600">${item.TotalArea} მ²</span></div>
                    <div class="flex items-center gap-1.5"><i class="fa-solid fa-stairs text-slate-300 text-xs"></i><span class="text-xs font-bold text-slate-600">${item.Floor} სართ.</span></div>
                </div>

                <div onclick="event.stopPropagation(); openProfile();" class="absolute bottom-4 right-5 w-12 h-12 rounded-full border-4 border-white shadow-lg overflow-hidden active:scale-90 transition-transform">
                    <img src="${maklerImg}" class="w-full h-full object-cover">
                </div>
            </div>
        </div>`;
    }).join('');
}

// ნავიგაციის აქტივაციის ფუნქცია (დაამატე ფაილის ბოლოში)
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});

function openDetails(item) {
    if (item.ID) fetch(`${API_URL}?viewId=${item.ID}`).catch(e => console.error(e));
    
    document.getElementById('det-title').innerText = `${item.Rooms} ოთახიანი ${item.PropertyType}`;
    document.getElementById('det-loc').innerText = `${item.City}, ${item.District}, ${item.Street || ''}`;
    document.getElementById('det-price').innerText = `${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}`;
    document.getElementById('det-id').innerText = item.ID;
    document.getElementById('det-rooms').innerText = item.Rooms || "0";
    document.getElementById('det-floor').innerText = `${item.Floor}/${item.TotalFloors || '?'}`;
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

    document.getElementById('det-phone').innerText = item.Phone || "არ არის მითითებული";
    document.getElementById('call-btn').href = `tel:${item.Phone}`;

    const wrapper = document.getElementById('slider-wrapper');
    const dotsContainer = document.getElementById('slider-dots');
    
    if (item.Photos) {
        const photoList = item.Photos.split(',');
        wrapper.innerHTML = photoList.map(url => `<div class="slide"><img src="${url.trim()}" onerror="this.src='https://via.placeholder.com/400x300?text=Error'"></div>`).join('');
        dotsContainer.innerHTML = photoList.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}"></div>`).join('');
        
        wrapper.onscroll = () => {
            const scrollIndex = Math.round(wrapper.scrollLeft / wrapper.clientWidth);
            document.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === scrollIndex));
        };
        wrapper.scrollLeft = 0;
    }
    document.getElementById('details-page').classList.add('active');
}

function openProfile() {
    const m = window.maklerInfo;
    if (!m) return;
    document.getElementById('m-name').innerText = m.Name;
    document.getElementById('m-photo').src = m.Photo;
    document.getElementById('m-wm').innerText = m.WatermarkText || "---";
    document.getElementById('m-id').innerText = m.ID;
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
