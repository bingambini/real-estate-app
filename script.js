// ბაზის (Google Apps Script) ბმული
const API_URL = "https://script.google.com/macros/s/AKfycbyI6Ltb6UKQPJOTucSqzGwF_6GmtW9j0DveaYMzhBplFWbNkeu96GAyq1mwuMxnz6jwHA/exec";
// Telegram WebApp ინსტანცია
const tg = window.Telegram.WebApp;
// მაკლერების მონაცემების გლობალური მასივი
window.allMaklers = []; 
// მონაცემების გლობალური მასივი განცხადებებისთვის
window.allListings = [];
// მომხმარებლის მონაცემები
window.currentUser = null;

/** * ფასის ფორმატირება */
function formatPrice(price) {
    if (!price) return "0";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** * ფოტოს ლინკის გასწორება (Drive-ის თამბნეილისთვის) */
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

/** * მომხმარებლის რეგისტრაცია Google Sheets-ში */
async function registerUser() {
    const user = tg.initDataUnsafe?.user;
    if (user) {
        try {
            const regUrl = `${API_URL}?action=register&chatId=${user.id}&firstName=${encodeURIComponent(user.first_name || '')}&lastName=${encodeURIComponent(user.last_name || '')}`;
            const res = await fetch(regUrl);
            const status = await res.json();
            window.currentUser = status; 
            console.log("User Loaded:", window.currentUser.role, window.currentUser.tier);
        } catch (e) {
            console.error("User registration failed", e);
        }
    }
}

/** * მონაცემების წამოღება - ოპტიმიზირებული */
async function fetchData() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        // 1. პირველ რიგში ვტვირთავთ განცხადებებს და სასწრაფოდ ვხატავთ
        window.allListings = data.listings || data.Listings || [];
        renderProperties(window.allListings); 

        // 2. მაკლერების მონაცემებს ვამუშავებთ შემდეგ, რადგან ისინი მხოლოდ დეტალების გვერდზე გვჭირდება
        let mData = data.Makler || data.makler || [];
        window.allMaklers = Array.isArray(mData) ? mData : [mData];
        
    } catch (e) { 
        console.error("Error fetching data:", e);
        const container = document.getElementById('property-container');
        if (container) container.innerHTML = "<p class='text-center text-red-500'>მონაცემების ჩატვირთვა ვერ მოხერხდა</p>";
    }
}

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
        btn.style.opacity = "0.7";
    }
    try {
        const response = await fetch(`${API_URL}?action=pdf&id=${item.ID}`);
        const pdfUrl = await response.text(); 
        if (pdfUrl && pdfUrl.startsWith("http")) {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) {
                window.Telegram.WebApp.openLink(pdfUrl);
            } else {
                window.open(pdfUrl, '_blank');
            }
        } else {
            alert("სერვერის შეცდომა: " + pdfUrl);
        }
    } catch (err) {
        alert("კავშირის შეცდომა სერვერთან.");
    } finally {
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    }
}

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

/** * განცხადებების რენდერი - ბანერების აღდგენით */
function renderProperties(items) {
    const container = document.getElementById('property-container');
    if (!container || !Array.isArray(items)) return;
    container.innerHTML = items.map((item, index) => {
        try {
            const rawImgUrl = item.MainPhoto || item.Photos || "";
            const firstImg = rawImgUrl ? fixImageUrl(rawImgUrl.split(',')[0].trim()) : 'https://placehold.co/400x300?text=No+Image';
            const itemJson = JSON.stringify(item).replace(/'/g, "&apos;");
            
            const imgPriority = index === 0 ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"';

            return `
            <div onclick='openDetails(${itemJson})' class="bg-white rounded-[30px] overflow-hidden shadow-sm border border-slate-100 active:scale-[0.98] transition-all mb-4 relative">
                <div class="relative h-60 overflow-hidden">
                    <img src="${firstImg}" ${imgPriority} class="w-full h-full object-cover">
                    <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl text-[10px] font-black text-slate-800 uppercase shadow-sm z-10">${item.DealType || 'იყიდება'}</div>
                    <div class="absolute bottom-3 left-3 bg-blue-600 px-4 py-2 rounded-2xl shadow-lg z-10">
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
    const featList = document.getElementById('features-list');
    if(featList) {
        const allFields = [
            { label: "ქალაქი", val: item.City },
            { label: "რაიონი", val: item.District },
            { label: "ფართი", val: item.TotalArea ? item.TotalArea + " მ²" : null },
            { label: "ოთახები", val: item.Rooms },
            { label: "სართული", val: item.Floor ? `${item.Floor}/${item.TotalFloors || '?'}` : null },
            { label: "მდგომარეობა", val: item.Condition }
        ];
        featList.innerHTML = allFields
            .filter(f => f.val && f.val !== "0" && f.val !== "")
            .map(f => `
                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                    <p class="text-[9px] uppercase font-bold text-slate-400 mb-1">${f.label}</p>
                    <p class="text-xs font-black text-slate-700">${f.val}</p>
                </div>`).join('');
    }
    const wrapper = document.getElementById('slider-wrapper');
    const dotsContainer = document.getElementById('slider-dots');
    let allPhotos = [];
    if (item.MainPhoto) allPhotos.push(item.MainPhoto);
    for (let k = 1; k <= 7; k++) { if (item[`Photo${k}`]) allPhotos.push(item[`Photo${k}`]); }
    if (allPhotos.length === 0 && item.Photos) { allPhotos = item.Photos.split(',').map(p => p.trim()); }
    if (allPhotos.length > 0 && wrapper && dotsContainer) {
        wrapper.innerHTML = allPhotos.map(url => `<div class="slide relative h-full w-full flex-shrink-0"><img src="${fixImageUrl(url)}" class="w-full h-full object-cover"></div>`).join('');
        dotsContainer.innerHTML = allPhotos.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}"></div>`).join('');
        wrapper.onscroll = () => {
            const scrollIndex = Math.round(wrapper.scrollLeft / wrapper.clientWidth);
            document.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === scrollIndex));
        };
        wrapper.scrollLeft = 0;
    }
    document.getElementById('details-page')?.classList.add('active');
}

/** * პროფილის გახსნა - გასუფთავებული და დახვეწილი ვიზუალით */
function openProfile(maklerId) {
    const tierBadge = document.getElementById('user-tier-badge');
    const roleBadge = document.getElementById('user-role-badge');
    const profileCard = document.getElementById('user-profile-card');
    const headerTitle = document.getElementById('profile-header-title');
    const user = tg.initDataUnsafe?.user;
    
    const nameEl = document.getElementById('m-name');
    const photoEl = document.getElementById('m-photo');
    const floatingBadges = profileCard.querySelector('.absolute.-bottom-4');
    
    let targetId = null;
    let m = null;
    let isAgentMode = false;

    // 1. მონაცემების იდენტიფიკაცია
    if (maklerId && maklerId !== "undefined") {
        m = window.allMaklers.find(makler => String(makler.ID) === String(maklerId)) || window.allMaklers[0];
        targetId = String(m.ID).trim();
        nameEl.innerText = m.Name || "აგენტი";
        photoEl.src = fixImageUrl(m.Photo);
        roleBadge.innerText = "AGENT";
        isAgentMode = true;
        if(headerTitle) headerTitle.innerText = "აგენტის პროფილი";
        if(tierBadge) tierBadge.classList.add('hidden');
    } else {
        const role = window.currentUser?.role || "Client";
        const tier = window.currentUser?.tier || "Free";
        if(headerTitle) headerTitle.innerText = "ჩემი პროფილი";
        roleBadge.innerText = role.toUpperCase();
        
        if (role === "Agent" && window.currentUser?.maklerId) {
            m = window.allMaklers.find(makler => String(makler.ID) === String(window.currentUser.maklerId));
            targetId = String(window.currentUser.maklerId).trim();
            nameEl.innerText = m?.Name || user?.first_name || "აგენტი";
            photoEl.src = m?.Photo ? fixImageUrl(m.Photo) : (user?.photo_url || 'https://placehold.co/100x100?text=User');
            isAgentMode = true;
        } else {
            nameEl.innerText = (user?.first_name || "მომხმარებელი") + " " + (user?.last_name || "");
            photoEl.src = user?.photo_url || 'https://placehold.co/100x100?text=User';
            targetId = user?.id || "---";
            isAgentMode = false;
        }

        // Tier styling (Premium/Pro/Free)
        if(tierBadge && profileCard) {
            tierBadge.classList.remove('hidden');
            tierBadge.innerText = tier.toUpperCase();
            tierBadge.className = "absolute -top-2 -right-2 px-2 py-1 rounded-lg text-[8px] font-black shadow-lg border-2 border-white uppercase z-10 ";
            if(tier === "Premium") { tierBadge.className += "bg-amber-400 text-white"; profileCard.style.borderColor = "#fbbf24"; }
            else if(tier === "Pro") { tierBadge.className += "bg-purple-500 text-white"; profileCard.style.borderColor = "#a855f7"; }
            else { tierBadge.className += "bg-slate-400 text-white"; profileCard.style.borderColor = "#e2e8f0"; }
        }
    }

    // 2. ტექსტური ბლოკის გასუფთავება ("---" მოცილება)
    const infoContainer = nameEl.parentElement;
    infoContainer.className = "flex flex-col gap-1.5 pt-1"; 
    
    // ვასუფთავებთ აბსოლუტურად ყველაფერს სახელის გარდა, რომ ნარჩენები არ დარჩეს
    Array.from(infoContainer.children).forEach(child => {
        if(child.id !== 'm-name') child.remove();
    });

    // ID ბეიჯის ჩამატება
    const idHtml = `<div id="m-id-display" class="w-fit bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 text-[8px] font-black text-slate-400 uppercase">ID: ${targetId}</div>`;
    nameEl.insertAdjacentHTML('afterend', idHtml);

    // Agency-ს ჩამატება (მხოლოდ თუ არსებობს)
    if(m?.Agency) {
        const agencyHtml = `<p id="m-agency-display" class="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none">${m.Agency}</p>`;
        document.getElementById('m-id-display').insertAdjacentHTML('afterend', agencyHtml);
    }

    // 3. მცურავი ბეიჯების ლოგიკა (მხოლოდ აგენტისთვის)
    if(floatingBadges) {
        if(isAgentMode && m) {
            floatingBadges.innerHTML = `
                <a href="tel:${m.Phone || ''}" class="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(59,130,246,0.3)] border-2 border-blue-50 active:scale-90 transition-all">
                    <i class="fa-solid fa-phone text-blue-600 text-xs"></i>
                </a>
                <div class="w-12 h-12 rounded-full bg-white overflow-hidden shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] border-4 border-blue-50 active:scale-90 transition-all">
                    <img src="${fixImageUrl(m.Logo)}" class="w-full h-full object-cover">
                </div>
            `;
        } else {
            floatingBadges.innerHTML = ""; 
        }
    }

    // 4. ისტორიის ბარათები (აწეული და ლამაზი ჩრდილებით)
    const historyBlock = document.getElementById('profile-history-block');
    if (historyBlock) {
        const maklerListings = window.allListings?.filter(item => String(item.MaklerID || "").trim() === String(targetId)) || [];
        
        historyBlock.innerHTML = `
            <div class="-mt-4 px-1"> <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">განცხადებები (${maklerListings.length})</h3>
                <div class="grid grid-cols-3 gap-3">
                    ${maklerListings.map((item) => {
                        const img = item.MainPhoto ? fixImageUrl(item.MainPhoto) : 'https://placehold.co/150x150?text=Home';
                        return `
                            <div onclick='openDetailsById("${item.ID}")' class="bg-white rounded-[18px] overflow-hidden border border-slate-50 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08)] active:scale-95 active:shadow-none transition-all flex flex-col h-full">
                                <div class="h-20 w-full relative">
                                    <img src="${img}" class="w-full h-full object-cover">
                                    <div class="absolute top-1 left-1 bg-white/90 backdrop-blur-sm px-1 py-0.5 rounded text-[6px] font-black text-slate-800 uppercase shadow-sm">
                                        ${item.DealType || 'იყიდება'}
                                    </div>
                                </div>
                                <div class="p-1.5 flex flex-col justify-between flex-grow">
                                    <p class="text-[7px] font-black text-slate-800 truncate mb-0.5">${item.District || item.City}</p>
                                    <div class="flex items-center justify-between mt-auto">
                                        <span class="text-[7px] font-extrabold text-slate-400">${item.TotalArea || 0} მ²</span>
                                        <p class="text-[8px] font-black text-blue-600">${formatPrice(item.TotalPrice)}${item.Currency === 'USD' ? '$' : '₾'}</p>
                                    </div>
                                </div>
                            </div>`;
                    }).join('') || `<p class="col-span-3 text-center text-slate-300 text-[10px] py-10 font-bold">განცხადებები არ არის</p>`}
                </div>
            </div>`;
    }

    document.getElementById('profile-page')?.classList.add('active');
}

/** * განცხადების გახსნა ID-ით (აპლიკაციიდან გამოუსვლელად) */
function openDetailsById(id) {
    const item = window.allListings.find(l => String(l.ID) === String(id));
    if (item) openDetails(item);
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
