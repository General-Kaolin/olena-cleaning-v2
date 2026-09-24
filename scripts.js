// Global State
const state = {
    service: 'one-time',
    sqFt: 1500,
    beds: 2,
    baths: 1,
    freq: 'biweekly',
    addons: {},
    calculatedTotal: 350
};

const ADDONS = [
    { id: 'fridge', name: 'Inside Fridge', price: 30 },
    { id: 'oven', name: 'Inside Oven', price: 35 },
    { id: 'sheets', name: 'Change Bedding', price: 10 },
    { id: 'dishes', name: 'Hand Wash Dishes', price: 20 }
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
            state.addons = {};

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
                <label>Home Size: <strong id="sqFtValue">${state.sqFt} sq ft</strong></label>
                <input type="range" id="sqFtSlider" min="1000" max="4000" step="250" value="${state.sqFt}">
            </div>
            <div style="display:flex; gap:10px;">
                <div class="field" style="flex:1;">
                    <label>Bedrooms</label>
                    <select id="bedSelect">
                        ${[1,2,3,4,5].map(n => `<option value="${n}" ${state.beds == n ? 'selected' : ''}>${n} Bed${n > 1 ? 's' : ''}</option>`).join('')}
                    </select>
                </div>
                <div class="field" style="flex:1;">
                    <label>Bathrooms (+$50 / extra bath)</label>
                    <select id="bathSelect">
                        ${[1,2,3,4].map(n => `<option value="${n}" ${state.baths == n ? 'selected' : ''}>${n} Bath${n > 1 ? 's' : ''}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
    }

    if (state.service === 'recurrent') {
        html += `
            <div class="field">
                <label>Frequency Discount</label>
                <select id="freqSelect">
                    <option value="weekly" ${state.freq === 'weekly' ? 'selected' : ''}>Weekly (20% OFF)</option>
                    <option value="biweekly" ${state.freq === 'biweekly' ? 'selected' : ''}>Bi-Weekly (15% OFF)</option>
                    <option value="monthly" ${state.freq === 'monthly' ? 'selected' : ''}>Monthly (10% OFF)</option>
                </select>
            </div>
        `;
    }

    if (state.service === 'airbnb') {
        html += `
            <div class="field">
                <label>Property Layout</label>
                <select id="strLayout">
                    <option value="120">1 Bed / 1 Bath ($120)</option>
                    <option value="150" selected>2 Bed / 2 Bath ($150)</option>
                    <option value="200">3 Bed / 2 Bath ($200)</option>
                    <option value="250">4+ Bed / 3+ Bath ($250)</option>
                </select>
            </div>
        `;
    }

    const isDeepOrMove = (state.service === 'deep' || state.service === 'move');

    html += `<h4 style="margin: 15px 0 5px 0; color: var(--primary-blue);">Add-ons / What's Included:</h4>`;
    
    if (isDeepOrMove) {
        html += `
            <div style="font-size: 0.85rem; background: var(--soft-cyan); color: var(--primary-blue); padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid var(--accent-teal);">
                <strong>✨ All-Inclusive Cleaning:</strong> Inside Oven, Inside Refrigerator & Deep Scrubbing are <u>already included</u> in this package!
            </div>
        `;
    }

    ADDONS.forEach(a => {
        if (isDeepOrMove && (a.id === 'fridge' || a.id === 'oven')) return;

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
            if (sqFtValue) sqFtValue.innerText = `${state.sqFt} sq ft`;
            recalc();
        });
    }

    const bedSelect = document.getElementById('bedSelect');
    if (bedSelect) bedSelect.addEventListener('change', (e) => { state.beds = parseInt(e.target.value); recalc(); });

    const bathSelect = document.getElementById('bathSelect');
    if (bathSelect) bathSelect.addEventListener('change', (e) => { state.baths = parseInt(e.target.value); recalc(); });

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
    let base = 300;
    let discount = 0;

    // ТОЧНА ЛОГІКА ЗА ТАБЛИЦЕЮ ДЛЯ DEEP CLEANING
    // 1000 sq ft = $300, кожні +250 sq ft = +$25
    let deepBase1Bath = 300 + Math.floor((state.sqFt - 1000) / 250) * 25;

    if (state.service === 'deep') {
        base = deepBase1Bath;
    } else if (state.service === 'move') {
        base = deepBase1Bath + 50;
    } else if (state.service === 'one-time' || state.service === 'recurrent') {
        base = Math.round(deepBase1Bath * 0.55);
        if (state.service === 'recurrent') {
            let rate = state.freq === 'weekly' ? 0.20 : (state.freq === 'biweekly' ? 0.15 : 0.10);
            discount = base * rate;
        }
    } else if (state.service === 'airbnb') {
        const select = document.getElementById('strLayout');
        base = select ? parseInt(select.value) : 150;
    }

    // Кожна додаткова ванна кімната додає +$50
    if (state.service !== 'airbnb' && state.baths > 1) {
        base += (state.baths - 1) * 50;
    }

    let addonsSum = Object.values(state.addons).reduce((a, b) => a + b, 0);
    let finalTotal = (base - discount) + addonsSum;
    state.calculatedTotal = finalTotal.toFixed(0);

    document.getElementById('basePrice').innerText = '$' + base.toFixed(0);
    document.getElementById('addonsPrice').innerText = '$' + addonsSum.toFixed(0);
    
    const discRow = document.getElementById('discountRow');
    if (discount > 0) {
        discRow.style.display = 'flex';
        document.getElementById('discountPrice').innerText = '-$' + discount.toFixed(0);
    } else {
        discRow.style.display = 'none';
    }

    document.getElementById('totalPrice').innerText = '$' + state.calculatedTotal;
    document.getElementById('mobileTotal').innerText = '$' + state.calculatedTotal;

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
    const paymentNoticeText = isOnline ? "STATUS: ONLINE PAYMENT" : "STATUS: PAY AT SERVICE";

    const modalSummary = document.getElementById('modalBookingSummary');
    if (modalSummary) {
        modalSummary.innerText = `Selected: ${state.service.toUpperCase()} (${state.sqFt} sq ft, ${state.baths} Bath) | Total: $${state.calculatedTotal} | [${paymentNoticeText}]`;
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
    ['bookingForm', 'vipForm'].forEach(formId => {
        const form = document.getElementById(formId);
        if (!form) return;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('DEMO MODE: Reservation Sent!');
            form.reset();
            closeModal(formId === 'bookingForm' ? 'bookingModal' : 'vipModal');
        });
    });
}