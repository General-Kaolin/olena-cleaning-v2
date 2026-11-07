// State structure conforming to Idaho Pricing Matrix & Client Specs
const state = {
    service: 'standard', // 'standard', 'deep', 'move', 'airbnb', 'closet'
    sqFt: 1400,
    beds: 2,
    baths: 2,
    closetHours: 1, // Часы для отдельной 5-й услуги Closet Organization ($50/час)
    freq: 'onetime', // 'onetime', 'weekly', 'biweekly', 'monthly'
    isWifeCareVip: false,
    addons: {},
    calculatedTotal: 130,
    estimatedHours: 2.8
};

// Pricing config matrix according to TZ (Idaho Region Rates)
const PRICING_CONFIG = {
    standard: { rate: 0.12, minFee: 130 },
    deep: { rate: 0.225, minFee: 225 },
    move: { rate: 0.285, minFee: 285 },
    airbnb: { rate: 0.15, minFee: 120 },
    closet: { rate: 0, minFee: 50 } // 5-я услуга: Closet Organization ($50/час)
};

const FREQ_DISCOUNTS = {
    onetime: 0,
    weekly: 0.20,
    biweekly: 0.15,
    monthly: 0.10
};

// Add-ons list for Standard/Deep
const ADDONS_CATALOG = [
    { id: 'fridge', name: 'Inside Fridge Cleaning', price: 35 },
    { id: 'oven', name: 'Inside Oven Cleaning', price: 45 },
    { id: 'cabinets', name: 'Inside Cabinets', price: 50 },
    { id: 'pets', name: 'Pet Hair Extra Removal', price: 30 },
    { id: 'patio', name: 'Balcony / Patio Sweep', price: 25 }
];

document.addEventListener('DOMContentLoaded', () => {
    initServiceCards();
    initModalEvents();
    renderPanel();
    recalc();
    setupDemoFormSubmissions();
    setMinDate();
    initPaymentToggle();
});

function setMinDate() {
    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }
}

function initServiceCards() {
    const cards = document.querySelectorAll('.service-select-card');
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            cards.forEach(c => c.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            
            state.service = target.dataset.service;
            state.addons = {}; // reset add-ons on service switch

            renderPanel();
            recalc();

            document.getElementById('calculator-anchor')?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

function renderPanel() {
    const panel = document.getElementById('optionsPanel');
    if (!panel) return;

    let html = '';

    // Если выбрана 5-я услуга "Closet Organization"
    if (state.service === 'closet') {
        html += `
            <div class="service-inclusions-box" style="border-left-color: var(--accent-teal);">
                <strong>👗 Closet Organization & Decluttering:</strong>
                <ul>
                    <li>Professional closet sorting, folding & hanging</li>
                    <li>Seasonal clothing swap & space optimization</li>
                    <li>Organization by color, type & priority</li>
                </ul>
            </div>
            <div class="field">
                <label>Estimated Hours Needed: <strong id="closetHoursVal">${state.closetHours} hour(s) ($${state.closetHours * 50})</strong></label>
                <select id="closetHoursSelect">
                    ${[1, 2, 3, 4, 5, 6, 8].map(h => `<option value="${h}" ${state.closetHours == h ? 'selected' : ''}>${h} Hour${h > 1 ? 's' : ''} ($${h * 50})</option>`).join('')}
                </select>
            </div>
        `;
    } else {
        // Стандартные услуги уборки
        if (state.service !== 'airbnb') {
            html += `
                <div class="field">
                    <label>Home Area: <strong id="sqFtValue">${state.sqFt} sq. ft.</strong></label>
                    <input type="range" id="sqFtSlider" min="500" max="5000" step="50" value="${state.sqFt}">
                </div>
                <div style="display:flex; gap:10px;">
                    <div class="field" style="flex:1;">
                        <label>Bedrooms</label>
                        <select id="bedSelect">
                            ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${state.beds == n ? 'selected' : ''}>${n} Bed${n > 1 ? 's' : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div class="field" style="flex:1;">
                        <label>Bathrooms</label>
                        <select id="bathSelect">
                            ${[1,1.5,2,2.5,3,3.5,4,5].map(n => `<option value="${n}" ${state.baths == n ? 'selected' : ''}>${n} Bath${n > 1 ? 's' : ''}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `;
        }

        if (state.service === 'standard') {
            html += `
                <div class="field">
                    <label>Cleaning Frequency (Discounts)</label>
                    <select id="freqSelect">
                        <option value="onetime" ${state.freq === 'onetime' ? 'selected' : ''}>One-Time (Full Price)</option>
                        <option value="weekly" ${state.freq === 'weekly' ? 'selected' : ''}>Weekly (Save 20%)</option>
                        <option value="biweekly" ${state.freq === 'biweekly' ? 'selected' : ''}>Bi-Weekly (Save 15%)</option>
                        <option value="monthly" ${state.freq === 'monthly' ? 'selected' : ''}>Monthly (Save 10%)</option>
                    </select>
                </div>
            `;
        }

        // Блоки описаний услуг (Inclusions)
        if (state.service === 'standard') {
            html += `
                <div class="service-inclusions-box">
                    <strong>🧹 Standard Cleaning Includes:</strong>
                    <ul>
                        <li>Dusting all surfaces, furniture & decor</li>
                        <li>Wiping baseboards & window sills</li>
                        <li>Vacuuming & mopping all floors</li>
                        <li>Full kitchen cleaning (countertops, sink, exterior appliances)</li>
                        <li>Complete bathrooms disinfection & sanitization</li>
                    </ul>
                </div>
            `;
        } else if (state.service === 'deep') {
            html += `
                <div class="service-inclusions-box">
                    <strong>✨ Deep Cleaning Includes (All Standard + Detailed Scrub):</strong>
                    <ul>
                        <li>Thorough baseboards & door frames washing</li>
                        <li>Detailed scrubbing of tile grout & bathroom fixtures</li>
                        <li>High & low dusting (vents, light fixtures, corners)</li>
                        <li>Thorough sanitization of all living areas & kitchen surfaces</li>
                    </ul>
                </div>
            `;
        } else if (state.service === 'move') {
            html += `
                <div class="service-inclusions-box" style="border-left-color: #2c6875;">
                    <strong>📦 Move-In / Move-Out (All-Inclusive Package):</strong>
                    <ul>
                        <li><strong>Inside Cabinets & Drawers</strong> fully cleaned</li>
                        <li><strong>Inside Oven & Inside Refrigerator</strong> included</li>
                        <li>Deep scrubbing of empty rooms, baseboards & closets</li>
                        <li>Complete sanitization ready for new residents or inspection</li>
                    </ul>
                </div>
            `;
        } else if (state.service === 'airbnb') {
            html += `
                <div class="service-inclusions-box">
                    <strong>🏨 Airbnb / STR Turnkey Service:</strong>
                    <ul>
                        <li>Bed linen change & bed making</li>
                        <li>Restocking essential supplies & guest amenities</li>
                        <li>Thorough turnover cleaning & staging inspection</li>
                    </ul>
                </div>
            `;
        }

        // Выводим аддоны только для Standard и Deep
        if (state.service !== 'move' && state.service !== 'airbnb') {
            html += `<h4 style="margin: 15px 0 5px 0; color: var(--primary-blue);">Select Extra Add-ons:</h4>`;

            ADDONS_CATALOG.forEach(a => {
                const checked = state.addons[a.id] ? 'checked' : '';
                html += `
                    <div class="addon-item">
                        <span>${a.name} (+$${a.price})</span>
                        <input type="checkbox" class="addon-check" data-id="${a.id}" data-price="${a.price}" ${checked}>
                    </div>
                `;
            });
        }
    }

    panel.innerHTML = html;
    bindDynamicEvents();
}

function bindDynamicEvents() {
    const slider = document.getElementById('sqFtSlider');
    const sqFtValue = document.getElementById('sqFtValue');

    if (slider) {
        slider.addEventListener('input', (e) => {
            state.sqFt = parseInt(e.target.value);
            if (sqFtValue) sqFtValue.innerText = `${state.sqFt} sq. ft.`;
            recalc();
        });
    }

    const bedSelect = document.getElementById('bedSelect');
    if (bedSelect) bedSelect.addEventListener('change', (e) => { state.beds = parseInt(e.target.value); recalc(); });

    const bathSelect = document.getElementById('bathSelect');
    if (bathSelect) bathSelect.addEventListener('change', (e) => { state.baths = parseFloat(e.target.value); recalc(); });

    const freqSelect = document.getElementById('freqSelect');
    if (freqSelect) freqSelect.addEventListener('change', (e) => { state.freq = e.target.value; recalc(); });

    const closetSelect = document.getElementById('closetHoursSelect');
    if (closetSelect) {
        closetSelect.addEventListener('change', (e) => {
            state.closetHours = parseInt(e.target.value);
            const valEl = document.getElementById('closetHoursVal');
            if (valEl) valEl.innerText = `${state.closetHours} hour(s) ($${state.closetHours * 50})`;
            recalc();
        });
    }

    document.querySelectorAll('.addon-check').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const price = parseInt(e.target.dataset.price);
            if (e.target.checked) state.addons[id] = price;
            else delete state.addons[id];
            recalc();
        });
    });
}

function recalc() {
    const bathsRow = document.getElementById('bathsRow');
    const addonsRow = document.getElementById('addonsRow');
    
    let baseCost = 0;
    let extraBathCost = 0;
    let discount = 0;
    let addonsSum = 0;
    let hours = 0;

    if (state.service === 'closet') {
        baseCost = state.closetHours * 50;
        hours = state.closetHours;
        if (bathsRow) bathsRow.style.display = 'none';
        if (addonsRow) addonsRow.style.display = 'none';
    } else {
        if (bathsRow) bathsRow.style.display = 'flex';
        if (addonsRow) addonsRow.style.display = 'flex';

        const cfg = PRICING_CONFIG[state.service] || PRICING_CONFIG.standard;
        let rawCost = state.sqFt * cfg.rate;
        baseCost = Math.max(rawCost, cfg.minFee);

        if (state.service === 'airbnb') {
            baseCost = 150;
        }

        if (state.service !== 'airbnb' && state.baths > 2) {
            extraBathCost = (state.baths - 2) * 25;
        }

        if (state.service === 'standard') {
            const discountRate = FREQ_DISCOUNTS[state.freq] || 0;
            discount = baseCost * discountRate;
        }

        addonsSum = Object.values(state.addons).reduce((a, b) => a + b, 0);

        hours = (state.sqFt / 500);
        if (state.service === 'deep' || state.service === 'move') hours *= 1.4;
    }

    let wifeCareFee = state.isWifeCareVip ? 35 : 0;
    let finalTotal = (baseCost - discount) + extraBathCost + addonsSum + wifeCareFee;
    
    state.calculatedTotal = Math.round(finalTotal);
    state.estimatedHours = parseFloat(hours).toFixed(1);

    // Update UI Elements
    const baseEl = document.getElementById('basePrice');
    const bathsEl = document.getElementById('bathsPrice');
    const addonsEl = document.getElementById('addonsPrice');
    const totalEl = document.getElementById('totalPrice');
    const mobileTotalEl = document.getElementById('mobileTotal');
    const timeEl = document.getElementById('estimatedTime');
    const vipRow = document.getElementById('vipSummaryRow');
    const vipCardBox = document.getElementById('vipCardBox');
    const openVipBtn = document.getElementById('openVipBtn');
    const cancelVipBtn = document.getElementById('cancelVipBtn');

    if (baseEl) baseEl.innerText = '$' + Math.round(baseCost);
    if (bathsEl) bathsEl.innerText = '$' + extraBathCost;
    if (addonsEl) addonsEl.innerText = '$' + addonsSum;
    if (timeEl) timeEl.innerText = `${state.estimatedHours} hrs`;

    if (vipRow) {
        if (state.isWifeCareVip) {
            vipRow.style.display = 'flex';
            if (vipCardBox) vipCardBox.classList.add('active-vip');
            if (openVipBtn) openVipBtn.innerText = '✓ Wife Care Active (Click to Edit)';
            if (cancelVipBtn) cancelVipBtn.style.display = 'block';
        } else {
            vipRow.style.display = 'none';
            if (vipCardBox) vipCardBox.classList.remove('active-vip');
            if (openVipBtn) openVipBtn.innerText = 'Customize Wife Care Package ->';
            if (cancelVipBtn) cancelVipBtn.style.display = 'none';
        }
    }

    const discRow = document.getElementById('discountRow');
    if (discRow) {
        if (discount > 0) {
            discRow.style.display = 'flex';
            document.getElementById('discountPrice').innerText = '-$' + Math.round(discount);
        } else {
            discRow.style.display = 'none';
        }
    }

    if (totalEl) totalEl.innerText = '$' + state.calculatedTotal;
    if (mobileTotalEl) mobileTotalEl.innerText = '$' + state.calculatedTotal;

    updateFormSummaryData();
}

function initPaymentToggle() {
    const payOnsiteRadio = document.getElementById('payOnsiteRadio');
    const payOnlineRadio = document.getElementById('payOnlineRadio');
    const cardBlock = document.getElementById('cardFieldsBlock');

    if (payOnsiteRadio && payOnlineRadio && cardBlock) {
        payOnsiteRadio.addEventListener('change', () => { if (payOnsiteRadio.checked) { cardBlock.style.display = 'none'; updateFormSummaryData(); } });
        payOnlineRadio.addEventListener('change', () => { if (payOnlineRadio.checked) { cardBlock.style.display = 'block'; updateFormSummaryData(); } });
    }
}

function updateFormSummaryData() {
    const isOnline = document.getElementById('payOnlineRadio')?.checked;
    const paymentNoticeText = isOnline ? "ONLINE PAYMENT" : "PAY AT SERVICE";
    const wifeCareTag = state.isWifeCareVip ? " + [Wife Care VIP Active]" : "";

    const modalSummary = document.getElementById('modalBookingSummary');
    if (modalSummary) {
        if (state.service === 'closet') {
            modalSummary.innerText = `Selected: CLOSET ORGANIZATION (${state.closetHours} hrs) | Total: $${state.calculatedTotal}${wifeCareTag} | [${paymentNoticeText}]`;
        } else {
            modalSummary.innerText = `Selected: ${state.service.toUpperCase()} (${state.sqFt} sq ft, ${state.baths} Bath) | Est. Time: ${state.estimatedHours} hrs | Total: $${state.calculatedTotal}${wifeCareTag} | [${paymentNoticeText}]`;
        }
    }
}

function initModalEvents() {
    document.querySelectorAll('.open-booking-btn').forEach(btn => {
        btn.addEventListener('click', () => { updateFormSummaryData(); openModal('bookingModal'); });
    });

    const vipBtn = document.getElementById('openVipBtn');
    if (vipBtn) vipBtn.addEventListener('click', () => openModal('vipModal'));

    const cancelVipBtn = document.getElementById('cancelVipBtn');
    if (cancelVipBtn) {
        cancelVipBtn.addEventListener('click', () => {
            state.isWifeCareVip = false;
            recalc();
            closeModal('vipModal');
            alert('Wife Care Package has been removed from your booking.');
        });
    }

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => closeModal(e.target.dataset.modal));
    });

    window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) e.target.classList.remove('open'); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); });
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

function setupDemoFormSubmissions() {
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert(`Thank you for your reservation! Total estimate: $${state.calculatedTotal}. We will contact you shortly to confirm your booking date.`);
            closeModal('bookingModal');
            bookingForm.reset();
        });
    }

    const vipForm = document.getElementById('vipForm');
    if (vipForm) {
        vipForm.addEventListener('submit', (e) => {
            e.preventDefault();
            state.isWifeCareVip = true;
            recalc();
            alert('Wife Care Package successfully activated and added to your quote (+ $35 fee)!');
            closeModal('vipModal');
        });
    }
}