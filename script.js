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

async function getBase64Image(url) {
    if (!url) return null;
    try {
        const response = await fetch(url, { mode: 'cors' }); 
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("ფოტოს ჩატვირთვა ვერ მოხერხდა (CORS):", url);
        return null;
    }
}

async function downloadProfessionalPDF(item) {
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const currentMakler = window.allMaklers.find(m => String(m.ID) === String(item.MaklerID)) || window.allMaklers[0];
        const photoUrls = item.Photos ? item.Photos.split(',').map(url => url.trim()) : [];
        
        // 1. სურათების ჩატვირთვა
        const [mainPhoto, maklerPhoto, logoImg, ...galleryPhotos] = await Promise.all([
            getBase64Image(photoUrls[0]),
            getBase64Image(currentMakler?.Photo),
            getBase64Image(currentMakler?.Logo),
            ...photoUrls.slice(1, 5).map(url => getBase64Image(url))
        ]);

        // 2. კონტეინერის შექმნა (ხილული, მაგრამ ეკრანის ქვემოთ)
        const pdfContainer = document.createElement('div');
        pdfContainer.id = "rendering-pdf-container";
        pdfContainer.style.cssText = `
            position: absolute;
            top: 5000px; 
            left: 0;
            width: 750px;
            padding: 40px;
            background: white;
            z-index: -1000;
            font-family: Arial, sans-serif;
        `;

        const detailsGrid = [
            { l: 'ფართი', v: item.TotalArea ? item.TotalArea + ' მ²' : null },
            { l: 'ოთახები', v: item.Rooms },
            { l: 'სართული', v: item.Floor && item.TotalFloors ? item.Floor + '/' + item.TotalFloors : item.Floor },
            { l: 'მდგომარეობა', v: item.Condition },
            { l: 'პროექტი', v: item.ProjectType },
            { l: 'გათბობა', v: item.Heating },
            { l: 'ჭერი', v: item.CeilingHeight },
            { l: 'პარკინგი', v: item.Parking }
        ].filter(f => f.v).map(f => `
            <div style="background:#f8fafc; padding:10px; border-radius:12px; border:1px solid #e2e8f0; text-align:center;">
                <p style="margin:0; font-size:10px; color:#64748b; font-weight:bold;">${f.l}</p>
                <p style="margin:2px 0 0; font-size:12px; color:#1e293b; font-weight:bold;">${f.v}</p>
            </div>
        `).join('');

        pdfContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #f1f5f9; padding-bottom:20px; margin-bottom:25px;">
                <div style="height:60px;">${logoImg ? `<img src="${logoImg}" style="height:100%;">` : ''}</div>
                <div style="text-align:right;">
                    <h1 style="margin:0; font-size:32px; color:#2563eb;">${formatPrice(item.TotalPrice)} ${item.Currency === 'USD' ? '$' : '₾'}</h1>
                    <p style="color:#64748b;">ID: ${item.ID}</p>
                </div>
            </div>
            <div style="width:100%; height:400px; border-radius:20px; overflow:hidden; margin-bottom:15px;">
                ${mainPhoto ? `<img src="${mainPhoto}" style="width:100%; height:100%; object-fit:cover;">` : ''}
            </div>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:25px;">
                ${galleryPhotos.filter(img => img).map(img => `<img src="${img}" style="width:100%; height:110px; object-fit:cover; border-radius:15px;">`).join('')}
            </div>
            <div style="margin-bottom:20px;">
                <h2 style="font-size:24px; color:#0f172a;">${item.Rooms} ოთახიანი ${item.PropertyType || 'ბინა'}</h2>
                <p style="color:#3b82f6;">📍 ${item.City}, ${item.District}, ${item.Street}</p>
            </div>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:30px;">
                ${detailsGrid}
            </div>
            <div style="background:#f1f5f9; padding:25px; border-radius:25px; margin-bottom:30px;">
                <p style="line-height:1.6; color:#334155;">${item.Description || ''}</p>
            </div>
            <div style="background:#1e293b; padding:25px; border-radius:30px; display:flex; justify-content:space-between; align-items:center; color:white;">
                <div style="display:flex; align-items:center; gap:20px;">
                    ${maklerPhoto ? `<img src="${maklerPhoto}" style="width:70px; height:70px; border-radius:20px; object-fit:cover;">` : ''}
                    <div><p style="margin:0; font-weight:bold; font-size:20px;">${currentMakler?.Name || ''}</p></div>
                </div>
                <p style="font-size:22px; font-weight:bold; color:#60a5fa;">${item.Phone || ''}</p>
            </div>
        `;

        document.body.appendChild(pdfContainer);

        // 3. ველოდებით, რომ ბრაუზერმა ნამდვილად "დახატოს" DOM
        await new Promise(r => setTimeout(r, 2000));

        const opt = {
            margin: 0,
            filename: `Property_${item.ID}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                allowTaint: false,
                letterRendering: true,
                width: 750,
                windowWidth: 750
            },
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
        };

        // 4. გენერაცია
        await html2pdf().set(opt).from(pdfContainer).save();

    } catch (err) {
        console.error("PDF Error:", err);
        alert("PDF-ის შექმნისას მოხდა შეცდომა.");
    } finally {
        const el = document.getElementById("rendering-pdf-container");
        if (el) el.remove();
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

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

function openDetails(item) {
    if (item.ID) fetch(`${API_URL}?viewId=${item.ID}`).catch(e => console.error(e));
    
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

function closeProfile() { document.getElementById('profile-page')?.classList.remove('active'); }
function closeDetails() { document.getElementById('details-page')?.classList.remove('active'); }
function switchTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId)?.classList.add('active');
    el.classList.add('active');
}

init();
