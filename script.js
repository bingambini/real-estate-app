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

// პაგინაციის პარამეტრები
let displayedItemsCount = 10;
const itemsPerLoad = 10;

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
    
    // ოპტიმიზაცია: პარალელური გაშვება
    Promise.all([registerUser(), fetchData()]);
    
    setTimeout(() => { 
        const splash = document.getElementById('splash-screen');
        const content = document.getElementById('main-content');
        if (splash) splash.style.display = 'none'; 
        if (content) content.style.opacity = '1'; 
    }, 1000);
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

async function fetchData() {
    const container = document.getElementById('property-container');
    
    const cachedData = localStorage.getItem('real_estate_cache');
    if (cachedData) {
        const parsed = JSON.parse(cachedData);
        window.allListings = parsed.listings;
        window.allMaklers = parsed.maklers;
        renderProperties(window.allListings.slice(0, displayedItemsCount));
    } else {
        container.innerHTML = Array(4).fill(0).map(() => `
            <div class="animate-pulse bg-slate-200 rounded-[30px] h-64 mb-4"></div>
        `).join('');
    }

    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        const newListings = data.listings || data.Listings || [];
        const newMaklers = data.Makler || data.makler || [];

        localStorage.setItem('real_estate_cache', JSON.stringify({
            listings: newListings,
            maklers: newMaklers,
            time: Date.now()
        }));

        window.allListings = newListings;
        window.allMaklers = Array.isArray(newMaklers) ? newMaklers : [newMaklers];
        
        renderProperties(window.allListings.slice(0, displayedItemsCount));
        
    } catch (e) {
        console.error("Fetch failed", e);
        if (!cachedData) container.innerHTML = "შეცდომაა...";
    }
}

/** * დამატებითი ელემენტების ჩატვირთვა სქროლისას */
function loadMore() {
    if (displayedItemsCount >= window.allListings.length) return;
    
    const nextBatch = window.allListings.slice(displayedItemsCount, displayedItemsCount + itemsPerLoad);
    displayedItemsCount += itemsPerLoad;
    renderProperties(nextBatch, true);
}

/** * განცხადებების რენდერი - ოპტიმიზირებული */
function renderProperties(items, append = false) {
    const container = document.getElementById('property-container');
    if (!container || !Array.isArray(items)) return;

    const html = items.map((item, index) => {
        try {
            const rawImgUrl = item.MainPhoto || item.Photos || "";
            const firstImg = rawImgUrl ? fixImageUrl(rawImgUrl.split(',')[0].trim()) : 'https://placehold.co/400x300?text=No+Image';
            const itemJson = JSON.stringify(item).replace(/'/g, "&apos;");
            
            const imgPriority = (!append && index < 2) ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"';

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

    if (append) {
        container.insertAdjacentHTML('beforeend', html);
    } else {
        container.innerHTML = html;
        window.onscroll = () => {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
                loadMore();
            }
        };
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
    }
    try {
        const response = await fetch(`${API_URL}?action=pdf&id=${item.ID}`);
        const pdfUrl = await response.text(); 
        if (pdfUrl && pdfUrl.startsWith("http")) {
            tg.openLink(pdfUrl);
        } else {
            alert("სერვერის შეცდომა");
        }
    } catch (err) {
        alert("შეცდომა");
    } finally {
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
}

function shareProperty(item) {
    const shareData = {
        title: `${item.Rooms} ოთახიანი ბინა`,
        text: `ნახეთ ეს განცხადება: ${item.Rooms} ოთახიანი ბინა ${item.District}-ში.`,
        url: window.location.href
    };
    if (navigator.share) {
        navigator.share(shareData).catch(console.error);
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert("ბმული დაკოპირებულია!");
    }
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
            .map(f => `<div class="bg-slate-50 p-3 rounded-2xl border border-slate-100/50"><p class="text-[9px] uppercase font-bold text-slate-400 mb-1">${f.label}</p><p class="text-xs font-black text-slate-700">${f.val}</p></div>`).join('');
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

function openProfile(maklerId) {
    const tierBadge = document.getElementById('user-tier-badge');
    const roleBadge = document.getElementById('user-role-badge');
    const profileCard = document.getElementById('user-profile-card');
    const headerTitle = document.getElementById('profile-header-title');
    const user = tg.initDataUnsafe?.user;
    
    const nameEl = document.getElementById('m-name');
    const photoEl = document.getElementById('m-photo');
    const floatingBadges = profileCard?.querySelector('.absolute.-bottom-4');
    
    let targetId = null;
    let m = null;
    let isAgentMode = false;

    // თუ სხვა აგენტის პროფილს ვხსნით (მაგალითად განცხადებიდან)
    if (maklerId && maklerId !== "undefined") {
        m = window.allMaklers.find(makler => String(makler.ID) === String(maklerId)) || window.allMaklers[0];
        targetId = String(m.ID).trim();
        nameEl.innerText = m.Name || "აგენტი";
        photoEl.src = fixImageUrl(m.Photo);
        roleBadge.innerText = "AGENT";
        isAgentMode = true;
        if(headerTitle) headerTitle.innerText = "აგენტის პროფილი";
        if(tierBadge) tierBadge.classList.add('hidden');
        
        // თუ აგენტის გვერდია, გვერდი უნდა გამოჩნდეს (Overlay რეჟიმი)
        document.getElementById('profile-page')?.classList.add('active');
    } else {
        // საკუთარი პროფილის რეჟიმი (ტაბის რეჟიმი)
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
        }

        if(tierBadge && profileCard) {
            tierBadge.classList.remove('hidden');
            tierBadge.innerText = tier.toUpperCase();
            tierBadge.className = "absolute -top-2 -right-2 px-2 py-1 rounded-lg text-[8px] font-black shadow-lg border-2 border-white uppercase z-10 ";
            if(tier === "Premium") { tierBadge.className += "bg-amber-400 text-white"; profileCard.style.borderColor = "#fbbf24"; }
            else if(tier === "Pro") { tierBadge.className += "bg-purple-500 text-white"; profileCard.style.borderColor = "#a855f7"; }
            else { tierBadge.className += "bg-slate-400 text-white"; profileCard.style.borderColor = "#e2e8f0"; }
        }
    }

    const infoContainer = nameEl.parentElement;
    Array.from(infoContainer.children).forEach(child => { if(child.id !== 'm-name' && !child.classList.contains('flex')) child.remove(); });
    nameEl.insertAdjacentHTML('afterend', `<div id="m-id-display" class="w-fit bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 text-[8px] font-black text-slate-400 uppercase">ID: ${targetId}</div>`);

    if(m?.Agency) {
        document.getElementById('m-id-display').insertAdjacentHTML('afterend', `<p id="m-agency-display" class="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none">${m.Agency}</p>`);
    }

    if(floatingBadges) {
        if(isAgentMode && m) {
            floatingBadges.innerHTML = `
                <a href="tel:${m.Phone || ''}" class="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(59,130,246,0.3)] border-2 border-blue-50 active:scale-90 transition-all"><i class="fa-solid fa-phone text-blue-600 text-xs"></i></a>
                <div class="w-12 h-12 rounded-full bg-white overflow-hidden shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] border-4 border-blue-50"><img src="${fixImageUrl(m.Logo)}" class="w-full h-full object-cover"></div>`;
        } else {
            floatingBadges.innerHTML = "";
        }
    }

    const historyBlock = document.getElementById('profile-history-block');
    if (historyBlock) {
        const maklerListings = window.allListings?.filter(item => String(item.MaklerID || "").trim() === String(targetId)) || [];
        historyBlock.innerHTML = `
            <div class="-mt-4 px-1"> 
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">განცხადებები (${maklerListings.length})</h3>
                <div class="grid grid-cols-3 gap-3">
                    ${maklerListings.map(item => `
                        <div onclick='openDetailsById("${item.ID}")' class="bg-white rounded-[18px] overflow-hidden border border-slate-50 shadow-sm active:scale-95 transition-all cursor-pointer">
                            <div class="h-20 w-full"><img src="${item.MainPhoto ? fixImageUrl(item.MainPhoto) : 'https://placehold.co/150x150'}" class="w-full h-full object-cover"></div>
                            <div class="p-1.5"><p class="text-[7px] font-black text-slate-800 truncate">${item.District || item.City}</p></div>
                        </div>`).join('') || '<p class="col-span-3 text-center text-slate-300 py-10 text-[10px]">ცარიელია</p>'}
                </div>
            </div>`;
    }
}

function openDetailsById(id) {
    const item = window.allListings.find(l => String(l.ID) === String(id));
    if (item) { 
        // თუ აგენტის პროფილი Overlay-დ იყო გახსნილი, ვხურავთ
        document.getElementById('profile-page')?.classList.remove('active');
        openDetails(item); 
    }
}

function closeDetails() { document.getElementById('details-page')?.classList.remove('active'); }

function switchTab(tabId, el) {
    closeDetails();

    // ვმალავთ ტაბებს
    const pages = ['home-tab', 'profile-tab-content'];
    pages.forEach(id => {
        const pg = document.getElementById(id);
        if (pg) {
            pg.classList.remove('active');
            pg.style.display = 'none';
        }
    });

    // ვაჩენთ არჩეულს
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active'), 10);
        
        if (tabId === 'profile-tab-content') {
            openProfile(); 
        }
    }

    // ნავიგაციის ვიზუალი
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.add('opacity-50');
        item.classList.remove('active');
    });
    if (el) {
        el.classList.remove('opacity-50');
        el.classList.add('active');
    }

    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function closeProfile() {
    // ეს ფუნქცია გამოიყენება მხოლოდ აგენტის Overlay პროფილის დასახურავად
    document.getElementById('profile-page')?.classList.remove('active');
}

init();
