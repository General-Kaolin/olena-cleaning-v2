// State structure conforming to Idaho Pricing Matrix & Client Specs
const state = {
    service: 'standard', // 'standard', 'deep', 'move', 'airbnb'
    sqFt: 1000,
    beds: 2,
    baths: 2,
    freq: 'onetime', // 'onetime', 'weekly', 'biweekly', 'monthly'
    isWifeCareVip: false,
    addons: {},
    calculatedTotal: 130,
    estimatedHours: 2.0
};

// Pricing config matrix according to TZ (Idaho Region Rates)
const PRICING_CONFIG = {
    standard: { rate: 0.12, minFee: 130 },
    deep: { rate: 0.225, minFee: 225 },
    move: { rate: 0.285, minFee: 285 },
    airbnb: { rate: 0.15, minFee: 120 }
};

const FREQ_DISCOUNTS = {
    onetime: 0,
    weekly: 0.20,
    biweekly: 0.15,
    monthly: 0.10
};

// Add-ons prices aligned with updated specs & feedback
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

    if (state.service === 'airbnb') {
        html += `
            <div class="field">
                <label>Property Size & Layout</label>
                <select id="strLayout">
                    <option value="120">1 Bed / 1 Bath ($120)</option>
                    <option value="150" selected>2 Bed / 2 Bath ($150)</option>
                    <option value="200">3 Bed / 2 Bath ($200)</option>
                    <option value="250">4+ Bed / 3+ Bath ($250)</option>
                </select>
            </div>
            <div style="font-size: 0.85rem; background: var(--soft-cyan); color: var(--primary-blue); padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid var(--accent-teal);">
                <strong>✨ Included for Airbnb:</strong> Bed Linen Change & Turnkey Preparation are already included!
            </div>
        `;
    }

    // Notice for Move-Out
    if (state.service === 'move') {
        html += `
            <div style="font-size: 0.85rem; background: var(--soft-cyan); color: var(--primary-blue); padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid var(--accent-teal);">
                <strong>✨ Move-Out Package:</strong> Inside Cabinets & Deep Cleaning scrub are already <u>included</u>!
            </div>
        `;
    }

    html += `<h4 style="margin: 15px 0 5px 0; color: var(--primary-blue);">Select Extra Add-ons:</h4>`;

    ADDONS_CATALOG.forEach(a => {
        // Hide cabinets add-on for move-out as it is included
        if (state.service === 'move' && a.id === 'cabinets') return;

        const checked = state.addons[a.id] ? 'checked' : '';
        html += `
            <div class="addon-item">
                <span>${a.name} (+$${a.price})</span>
                <input type="checkbox" class="addon-check" data-id="${a.id}" data-price="${a.price}" ${checked}>
            </div>
        `;
    });

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

    const strLayout = document.getElementById('strLayout');
    if (strLayout) strLayout.addEventListener('change', () => recalc());

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
    const cfg = PRICING_CONFIG[state.service] || PRICING_CONFIG.standard;
    
    // Step 1: Base calculation with Minimum threshold
    let rawCost = state.sqFt * cfg.rate;
    let baseCost = Math.max(rawCost, cfg.minFee);

    if (state.service === 'airbnb') {
        const select = document.getElementById('strLayout');
        baseCost = select ? parseInt(select.value) : 150;
    }

    // Step 2: Extra Bathrooms surcharge (+$25 for baths > 2.5 or > 2)
    let extraBathCost = 0;
    if (state.service !== 'airbnb' && state.baths > 2) {
        extraBathCost = (state.baths - 2) * 25;
    }

    // Step 3: Recurring Subscription Discount (Standard Service Only)
    let discount = 0;
    if (state.service === 'standard') {
        const discountRate = FREQ_DISCOUNTS[state.freq] || 0;
        discount = baseCost * discountRate;
    }

    // Step 4: Addons sum
    let addonsSum = Object.values(state.addons).reduce((a, b) => a + b, 0);

    // Step 5: Wife Care Package Surcharge (+ $35 auto included if active)
    let wifeCareFee = state.isWifeCareVip ? 35 : 0;

    // Step 6: Total Calculation
    let finalTotal = (baseCost - discount) + extraBathCost + addonsSum + wifeCareFee;
    state.calculatedTotal = Math.round(finalTotal);

    // Step 7: Estimated Time calculation (Total SqFt / 500 hours per cleaner)
    let hours = (state.sqFt / 500);
    if (state.service === 'deep' || state.service === 'move') hours *= 1.4;
    state.estimatedHours = hours.toFixed(1);

    // Update UI Elements
    const baseEl = document.getElementById('basePrice');
    const bathsEl = document.getElementById('bathsPrice');
    const addonsEl = document.getElementById('addonsPrice');
    const totalEl = document.getElementById('totalPrice');
    const mobileTotalEl = document.getElementById('mobileTotal');
    const timeEl = document.getElementById('estimatedTime');

    if (baseEl) baseEl.innerText = '$' + Math.round(baseCost);
    if (bathsEl) bathsEl.innerText = '$' + extraBathCost;
    if (addonsEl) addonsEl.innerText = '$' + (addonsSum + wifeCareFee);
    if (timeEl) timeEl.innerText = `${state.estimatedHours} hrs`;

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
        modalSummary.innerText = `Selected: ${state.service.toUpperCase()} (${state.sqFt} sq ft, ${state.baths} Bath) | Est. Time: ${state.estimatedHours} hrs | Total: $${state.calculatedTotal}${wifeCareTag} | [${paymentNoticeText}]`;
    }
}

function initModalEvents() {
    document.querySelectorAll('.open-booking-btn').forEach(btn => {
        btn.addEventListener('click', () => { updateFormSummaryData(); openModal('bookingModal'); });
    });

    const vipBtn = document.getElementById('openVipBtn');
    if (vipBtn) vipBtn.addEventListener('click', () => openModal('vipModal'));

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
            alert('Wife Care Package successfully enabled and added to your quote (+ $35 fee)! Proceed with standard booking.');
            closeModal('vipModal');
            vipForm.reset();
        });
    }
}