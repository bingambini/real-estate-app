// ბაზის (Google Apps Script) ბმული
const API_URL = "https://script.google.com/macros/s/AKfycbycf2AZcQKWimJU-vPNDUejjJ3LIbM0QLDudXN3jnmilJbTynf8fvYwrkT-3aJaH-Ieww/exec";
// Telegram WebApp ინსტანცია
const tg = window.Telegram.WebApp;
// მონაცემების გლობალური მასივები
window.allMaklers = []; 
window.allListings = []; // დავამატეთ ყველა განცხადების შესანახად
// მომხმარებლის მონაცემები
window.currentUser = null;

/** * ფასის ფორმატირება */
function formatPrice(price) {
    if (!price) return "0";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** * ფოტოს ლინკის გასწორება */
function fixImageUrl(url) {
    if (!url || !url.includes("drive.google.com")) return url || 'https://placehold.co/400x300?text=No+Image';
    const parts = url.split(/\/view|\?id=|d\//);
    if (parts.length > 1) {
        const fileId = parts[1].split(/[?&/]/)[0];
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
    return url;
}

/** * აპლიკაციის საწყისი ინიციალიზაცია */
async function init() {
    tg.expand();
    tg.ready();
    
    await registerUser();
    
    setTimeout(() => { 
        const splash = document.getElementById('splash-screen');
        const content = document.getElementById('main-content');
        if (splash) splash.classList.add('hidden-splash'); 
        if (content) content.style.opacity = '1'; 
    }, 2000);
    
    await fetchData();
}

/** * მომხმარებლის რეგისტრაცია */
async function registerUser() {
    const user = tg.initDataUnsafe?.user;
    if (user) {
        try {
            const regUrl = `${API_URL}?action=register&chatId=${user.id}&firstName=${encodeURIComponent(user.first_name || '')}&lastName=${encodeURIComponent(user.last_name || '')}`;
            const res = await fetch(regUrl);
            const status = await res.json();
            window.currentUser = status; 
        } catch (e) {
            console.error("User registration failed", e);
        }
    }
}

/** * მონაცემების წამოღება */
async function fetchData() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        let mData = data.Makler || data.makler || [];
        window.allMaklers = Array.isArray(mData) ? mData : [mData];
        
        window.allListings = data.listings || data.Listings || []; // ვინახავთ გლობალურად
        renderProperties(window.allListings); 
    } catch (e) { 
        console.error("Error fetching data:", e);
        const container = document.getElementById('property-container');
        if (container) container.innerHTML = "<p class='text-center text-red-500'>მონაცემების ჩატვირთვა ვერ მოხერხდა</p>";
    }
}

/** * PDF ჩამოტვირთვა */
async function downloadProfessionalPDF(item) {
    if (window.currentUser && window.currentUser.tier === "Free") {
        tg.showAlert("PDF-ის ჩამოტვირთვა ხელმისაწვდომია მხოლოდ Premium წევრებისთვის.");
        return;
    }
    const btn = window.event ? window.event.currentTarget : null;
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }
    try {
        const response = await fetch(`${API_URL}?action=pdf&id=${item.ID}`);
        const pdfUrl = await response.text(); 
        if (pdfUrl && pdfUrl.startsWith("http")) {
            tg.openLink(pdfUrl);
        } else {
            alert("სერვერის შეცდომა: " + pdfUrl);
        }
    } catch (err) {
        alert("კავშირის შეცდომა.");
    } finally {
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
}

/** * გაზიარება */
function shareProperty(item) {
    const shareData = {
        title: `${item.Rooms} ოთახიანი ბინა`,
        text: `ნახეთ ეს განცხადება: ${item.Rooms} ოთახიანი ბინა ${item.District}-ში. ფასი: ${formatPrice(item.TotalPrice)}`,
        url: window.location.href
    };
    if (navigator.share) {
        navigator.share(shareData).catch(console.error);
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert("ბმული დაკოპირებულია!");
    }
}

/** * მთავარი გვერდის რენდერი */
function renderProperties(items) {
    const container = document.getElementById('property-container');
    if (!container || !Array.isArray(items)) return;
    container.innerHTML = items.map(item => {
        try {
            const rawImgUrl = item.MainPhoto || item.Photos || "";
            const firstImg = rawImgUrl ? fixImageUrl(rawImgUrl.split(',')[0].trim()) : 'https://placehold.co/400x300?text=No+Image';
            const itemJson = JSON.stringify(item).replace(/'/g, "&apos;");
            return `
            <div onclick='openDetails(${itemJson})' class="bg-white rounded-[30px] overflow-hidden shadow-sm border border-slate-100 active:scale-[0.98] transition-all mb-4">
                <div class="relative h-60 overflow-hidden">
                    <img src="${firstImg}" class="w-full h-full object-cover" loading="lazy">
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
                    </div>
                </div>
            </div>`;
        } catch (err) { return ""; }
    }).join('');
}

/** * დეტალების გვერდის გახსნა */
function openDetails(item) {
    if (item.ID) fetch(`${API_URL}?viewId=${item.ID}`).catch(e => {});
    const setEl = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    setEl('det-title', `${item.Rooms || 0} ოთახიანი ${item.PropertyType || 'ბინა'}`);
    setEl('det-loc', `${item.City || ''}, ${item.District || ''}, ${item.Street || ''}`);
    setEl('det-price', `${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}`);
    setEl('det-id', item.ID);
    setEl('tab-desc', item.Description || "აღწერა არ არის მითითებული");

    const contactTab = document.getElementById('tab-contact'); 
    if (contactTab) {
        let currentMakler = (window.allMaklers && window.allMaklers.length > 0) 
            ? (window.allMaklers.find(m => String(m.ID) === String(item.MaklerID)) || window.allMaklers[0]) 
            : null;
        const itemJson = JSON.stringify(item).replace(/'/g, "&apos;");
        contactTab.innerHTML = `
            <div class="flex flex-col gap-5 py-2">
                <div onclick="openProfile('${currentMakler?.ID}')" class="bg-slate-50 rounded-[24px] p-4 flex items-center gap-4 border border-slate-100 active:scale-95 transition-all cursor-pointer">
                    <img src="${fixImageUrl(currentMakler?.Photo)}" class="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm">
                    <div class="flex flex-col">
                        <span class="text-[9px] font-bold text-blue-500 uppercase tracking-tight">მაკლერი</span>
                        <h4 class="font-black text-slate-800 text-base leading-tight">${currentMakler?.Name || 'პროფესიონალი აგენტი'}</h4>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick='downloadProfessionalPDF(${itemJson})' class="flex-1 bg-white border border-slate-200 py-4 rounded-[20px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm">
                        <i class="fa-solid fa-file-pdf text-red-500 text-base"></i>
                        <span class="text-slate-700 font-black text-[9px] uppercase">PDF</span>
                    </button>
                    <button onclick='shareProperty(${itemJson})' class="flex-1 bg-white border border-slate-200 py-4 rounded-[20px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm">
                        <i class="fa-solid fa-share-nodes text-blue-500 text-base"></i>
                        <span class="text-slate-700 font-black text-[9px] uppercase">გაზიარება</span>
                    </button>
                    <a href="tel:${item.Phone || ''}" class="flex-1 bg-blue-600 py-4 rounded-[20px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-lg shadow-blue-100">
                        <i class="fa-solid fa-phone text-white text-base"></i>
                        <span class="text-white font-black text-[9px] uppercase">დარეკვა</span>
                    </a>
                </div>
            </div>`;
    }
    document.getElementById('details-page')?.classList.add('active');
}

/** * პროფილის გახსნა + STAGGER ანიმაცია */
function openProfile(maklerId) {
    const tierBadge = document.getElementById('user-tier-badge');
    const roleBadge = document.getElementById('user-role-badge');
    const profileCard = document.getElementById('user-profile-card');
    const user = tg.initDataUnsafe?.user;
    
    const nameEl = document.getElementById('m-name');
    const photoEl = document.getElementById('m-photo');
    const idEl = document.getElementById('m-id');

    const isRequestingSpecific = maklerId && maklerId !== "undefined";
    const role = window.currentUser?.role || "Client";
    const tier = window.currentUser?.tier || "Free";
    
    let targetId = null;

    if (isRequestingSpecific) {
        let targetMakler = window.allMaklers.find(m => String(m.ID) === String(maklerId));
        if (targetMakler) {
            nameEl.innerText = targetMakler.Name;
            photoEl.src = fixImageUrl(targetMakler.Photo);
            idEl.innerHTML = `<span class="text-blue-600 font-bold uppercase text-[10px]">${targetMakler.Agency || 'AGENT'}</span>`;
            targetId = String(maklerId).trim();
        }
    } else {
        nameEl.innerText = (user?.first_name || "მომხმარებელი");
        photoEl.src = user?.photo_url || 'https://placehold.co/100x100?text=User';
        idEl.innerHTML = `<span class="text-slate-400 text-xs">ID: ${user?.id || '---'}</span>`;
        
        // თუ მაკლერი ხარ, ვიღებთ შენს ID-ს (მაგ. M1) window.currentUser-დან
        if (role === "Agent" && window.currentUser?.maklerId) {
            targetId = String(window.currentUser.maklerId).trim();
        }
    }

    roleBadge.innerText = (isRequestingSpecific ? "AGENT" : role).toUpperCase();

    // განცხადებების ისტორია
    const historyBlock = document.getElementById('profile-history-block');
    if (historyBlock) {
        // ვფილტრავთ MaklerID სვეტის მიხედვით
        const maklerListings = window.allListings?.filter(item => {
            const itemMaklerId = String(item.MaklerID || "").trim();
            return itemMaklerId === targetId && targetId !== null;
        }) || [];
        
        historyBlock.innerHTML = `
            <div class="mt-8">
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">განცხადებების ისტორია (${maklerListings.length})</h3>
                <div class="grid grid-cols-3 gap-3">
                    ${maklerListings.length > 0 ? maklerListings.map((item, index) => {
                        const img = item.MainPhoto ? fixImageUrl(item.MainPhoto) : 'https://placehold.co/100x100?text=Home';
                        return `
                            <div onclick='openDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})' 
                                 class="aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm active:scale-95 transition-all history-stagger"
                                 style="animation-delay: ${index * 0.1}s">
                                <img src="${img}" class="w-full h-full object-cover">
                            </div>`;
                    }).join('') : `<p class="col-span-3 text-center text-slate-300 text-[10px] py-10 font-bold">განცხადებები ვერ მოიძებნა</p>`}
                </div>
            </div>`;
    }

    document.getElementById('profile-page')?.classList.add('active');
}

function closeProfile() { document.getElementById('profile-page')?.classList.remove('active'); }
function closeDetails() { document.getElementById('details-page')?.classList.remove('active'); }

init();
