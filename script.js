// ბაზის (Google Apps Script) ბმული
const API_URL = "https://script.google.com/macros/s/AKfycbzMT5njH3zr3cb1tSBetL3ChqXn6iJGMQDYvkrDWLfr5Qh1qGF6PcXzVDT2daEOEuoB-g/exec";
// Telegram WebApp ინსტანცია
const tg = window.Telegram.WebApp;
// მაკლერების მონაცემების გლობალური მასივი
window.allMaklers = []; 

/**
 * ფასის ფორმატირება: ამატებს გამოყოფებს ციფრებს შორის (მაგ: 100 000)
 */
function formatPrice(price) {
    if (!price) return "0";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * აპლიკაციის საწყისი ინიციალიზაცია
 */
async function init() {
    tg.expand(); // აპლიკაციის სრულ ეკრანზე გაშლა
    tg.ready();  // Telegram-ისთვის სიგნალის მიცემა, რომ აპი მზადაა
    
    // Splash screen-ის გაქრობა 2 წამში
    setTimeout(() => { 
        const splash = document.getElementById('splash-screen');
        const content = document.getElementById('main-content');
        if (splash) splash.classList.add('hidden-splash'); 
        if (content) content.style.opacity = '1'; 
    }, 2000);
    
    await fetchData(); // მონაცემების წამოღება
}

/**
 * მონაცემების წამოღება Google Sheets-იდან API-ს მეშვეობით
 */
async function fetchData() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        // მაკლერების სიის შენახვა
        let mData = data.Makler || data.makler || [];
        window.allMaklers = Array.isArray(mData) ? mData : [mData];
        
        // განცხადებების სიის რენდერი
        const listings = data.listings || data.Listings || [];
        renderProperties(listings); 
    } catch (e) { 
        console.error("Error fetching data:", e);
        const container = document.getElementById('property-container');
        if (container) container.innerHTML = "<p class='text-center text-red-500'>მონაცემების ჩატვირთვა ვერ მოხერხდა</p>";
    }
}

/**
 * სურათის გადაყვანა Base64 ფორმატში (გამოიყენება შიდა დამუშავებისთვის)
 */
async function getBase64Image(url) {
    if (!url || url.includes('placeholder') || url.includes('pngtree')) return null; 
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("CORS Error for URL:", url);
        return null;
    }
}


 * სერვერზე PDF-ის გენერირება და გადმოწერა
 */
async function downloadProfessionalPDF(item) {
    // ღილაკის აღება უსაფრთხოდ
    const btn = window.event ? window.event.currentTarget : null;
    const originalContent = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-blue-500"></i>';
        btn.disabled = true;
    }

    try {
        // 1. სერვერს ვთხოვთ PDF-ის ბმულს
        const response = await fetch(`${API_URL}?action=pdf&id=${item.ID}`);
        const pdfUrl = await response.text(); 

        // 2. ვალიდაცია და გახსნა
        if (pdfUrl && pdfUrl.startsWith("http")) {
            
            // ვამოწმებთ, ვართ თუ არა Telegram-ის გარემოში
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
                // Telegram აპლიკაციისთვის
                tg.openLink(pdfUrl);
            } else {
                // ჩვეულებრივი ბრაუზერისთვის (პოპაპ ბლოკერის ასარიდებლად)
                window.location.href = pdfUrl;
            }
            
        } else {
            console.error("Server Response:", pdfUrl);
            alert("PDF-ის მომზადება ვერ მოხერხდა.");
        }
    } catch (err) {
        console.error("PDF Error:", err);
        alert("კავშირის შეცდომა სერვერთან.");
    } finally {
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
}

/**
 * განცხადების გაზიარების ფუნქცია
 */
function shareProperty(item) {
    const shareData = {
        title: `${item.Rooms} ოთახიანი ბინა - ${item.City}`,
        text: `ნახეთ ეს განცხადება: ${item.Rooms} ოთახიანი ბინა ${item.District}-ში. ფასი: ${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}`,
        url: window.location.href
    };
    if (navigator.share) {
        navigator.share(shareData).catch(console.error);
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert("ბმული დაკოპირებულია!");
    }
}

/**
 * მთავარ გვერდზე განცხადებების ბარათების აწყობა
 */
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
                        <div class="flex items-center gap-1.5"><i class="fa-solid fa-vector-square text-blue-500 text-[9px]"></i><span class="text-[11px] font-extrabold text-slate-600">${item.TotalArea || 0} მ²</span></div>
                        <div class="flex items-center gap-1.5"><i class="fa-solid fa-bed text-blue-500 text-[9px]"></i><span class="text-[11px] font-extrabold text-slate-600">${item.Rooms || 0} ოთ.</span></div>
                        <div class="flex items-center gap-1.5"><i class="fa-solid fa-layer-group text-blue-500 text-[9px]"></i><span class="text-[11px] font-extrabold text-slate-600">${item.Floor || 0}/${item.TotalFloors || '?'} ს.</span></div>
                        <div class="flex items-center gap-1.5 max-w-[85px]"><i class="fa-solid fa-paint-roller text-blue-500 text-[9px]"></i><span class="text-[11px] font-extrabold text-slate-600 truncate">${item.Condition || 'სუფთა'}</span></div>
                    </div>
                </div>
            </div>`;
        } catch (err) { return ""; }
    }).join('');
}

/**
 * დეტალური გვერდის გახსნა და მონაცემების შევსება
 */
function openDetails(item) {
    // ნახვების რაოდენობის აღრიცხვა სერვერზე
    if (item.ID) fetch(`${API_URL}?viewId=${item.ID}`).catch(e => console.error(e));
    
    const setEl = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    setEl('det-title', `${item.Rooms || 0} ოთახიანი ${item.PropertyType || 'ბინა'}`);
    setEl('det-loc', `${item.City || ''}, ${item.District || ''}, ${item.Street || ''}`);
    setEl('det-price', `${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}`);
    setEl('det-id', item.ID);
    setEl('tab-desc', item.Description || "აღწერა არ არის მითითებული");

    // საკონტაქტო ჩანართის და მაკლერის ინფორმაციის აწყობა
    const contactTab = document.getElementById('tab-contact'); 
    if (contactTab) {
        let currentMakler = (window.allMaklers && window.allMaklers.length > 0) 
            ? (window.allMaklers.find(m => String(m.ID) === String(item.MaklerID)) || window.allMaklers[0]) 
            : null;
        
        contactTab.innerHTML = `
            <div class="flex flex-col gap-5 py-2">
                <div onclick="openProfile('${currentMakler?.ID}')" class="bg-slate-50 rounded-[24px] p-4 flex items-center gap-4 border border-slate-100 active:scale-95 transition-all cursor-pointer">
                    <div class="relative">
                        <img src="${currentMakler?.Photo || 'https://placehold.co/100x100?text=Agent'}" class="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm">
                        <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[9px] font-bold text-blue-500 uppercase tracking-tight">მაკლერი</span>
                        <h4 class="font-black text-slate-800 text-base leading-tight">${currentMakler?.Name || 'პროფესიონალი აგენტი'}</h4>
                        <p class="text-slate-400 text-[10px] font-bold mt-0.5">პროფილის ნახვა <i class="fa-solid fa-chevron-right text-[8px]"></i></p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick='downloadProfessionalPDF(${JSON.stringify(item)})' class="flex-1 bg-white border border-slate-200 py-4 rounded-[20px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm">
                        <i class="fa-solid fa-file-pdf text-red-500 text-base"></i>
                        <span class="text-slate-700 font-black text-[9px] uppercase">PDF</span>
                    </button>
                    <button onclick='shareProperty(${JSON.stringify(item)})' class="flex-1 bg-white border border-slate-200 py-4 rounded-[20px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm">
                        <i class="fa-solid fa-share-nodes text-blue-500 text-base"></i>
                        <span class="text-slate-700 font-black text-[9px] uppercase">გაზიარება</span>
                    </button>
                    <a href="tel:${item.Phone || ''}" class="flex-1 bg-blue-600 py-4 rounded-[20px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-lg shadow-blue-100">
                        <i class="fa-solid fa-phone text-white text-base"></i>
                        <span class="text-white font-black text-[9px] uppercase">დარეკვა</span>
                    </a>
                </div>
            </div>
        `;
    }

    // მახასიათებლების სიის შევსება
    const featList = document.getElementById('features-list');
    if(featList) {
        const allFields = [
            { label: "ქალაქი", val: item.City },
            { label: "რაიონი", val: item.District },
            { label: "ქუჩა", val: item.Street },
            { label: "ტიპი", val: item.PropertyType },
            { label: "გარიგება", val: item.DealType },
            { label: "ფართი", val: item.TotalArea ? item.TotalArea + " მ²" : null },
            { label: "ოთახები", val: item.Rooms },
            { label: "სართული", val: item.Floor ? `${item.Floor}/${item.TotalFloors || '?'}` : null },
            { label: "მდგომარეობა", val: item.Condition },
            { label: "პროექტი", val: item.ProjectType },
            { label: "გათბობა", val: item.Heating },
            { label: "ჭერი", val: item.CeilingHeight },
            { label: "პარკინგი", val: item.Parking }
        ];
        featList.innerHTML = allFields
            .filter(f => f.val && f.val !== "0" && f.val !== "")
            .map(f => `
                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                    <p class="text-[9px] uppercase font-bold text-slate-400 mb-1">${f.label}</p>
                    <p class="text-xs font-black text-slate-700">${f.val}</p>
                </div>
            `).join('');
    }

    // ფოტოების სლაიდერის აწყობა
    const wrapper = document.getElementById('slider-wrapper');
    const dotsContainer = document.getElementById('slider-dots');
    if (item.Photos && wrapper && dotsContainer) {
        const photoList = item.Photos.split(',');
        wrapper.innerHTML = photoList.map(url => `<div class="slide relative h-full w-full flex-shrink-0"><img src="${url.trim()}" class="w-full h-full object-cover"></div>`).join('');
        dotsContainer.innerHTML = photoList.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}"></div>`).join('');
        wrapper.onscroll = () => {
            const scrollIndex = Math.round(wrapper.scrollLeft / wrapper.clientWidth);
            document.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === scrollIndex));
        };
        wrapper.scrollLeft = 0;
    }
    document.getElementById('details-page')?.classList.add('active');
}

/**
 * მაკლერის პროფილის გვერდის გახსნა
 */
function openProfile(maklerId) {
    if (!window.allMaklers || window.allMaklers.length === 0) return;
    const m = maklerId ? window.allMaklers.find(makler => String(makler.ID) === String(maklerId)) : window.allMaklers[0];
    if (!m) return;
    document.getElementById('m-name').innerText = m.Name || "მაკლერი";
    document.getElementById('m-photo').src = m.Photo || 'https://placehold.co/100x100?text=Agent';
    document.getElementById('m-id').innerText = m.ID || "---";
    document.getElementById('m-call').href = `tel:${m.Phone}`;
    document.getElementById('profile-page')?.classList.add('active');
}

/**
 * პროფილის და დეტალების გვერდების დახურვა
 */
function closeProfile() { document.getElementById('profile-page')?.classList.remove('active'); }
function closeDetails() { document.getElementById('details-page')?.classList.remove('active'); }

/**
 * ტაბებს (აღწერა/კონტაქტი) შორის გადართვა
 */
function switchTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId)?.classList.add('active');
    el.classList.add('active');
}

// აპლიკაციის გაშვება
init();
