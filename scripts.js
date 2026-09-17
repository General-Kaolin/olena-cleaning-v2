// Global State
const state = {
    service: 'one-time',
    sqFt: 1300,
    beds: 2,
    baths: 2,
    freq: 'biweekly',
    addons: {},
    calculatedTotal: 130
};

const ADDONS = [
    { id: 'fridge', name: 'Inside Fridge', price: 30 },
    { id: 'oven', name: 'Inside Oven', price: 35 },
    { id: 'sheets', name: 'Change Bedding', price: 10 },
    { id: 'dishes', name: 'Hand Wash Dishes', price: 20 }
];

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
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

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            state.service = e.target.dataset.service;
            state.addons = {};
            renderPanel();
            recalc();
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
                <input type="range" id="sqFtSlider" min="600" max="4000" step="100" value="${state.sqFt}" aria-label="Home size in square feet">
            </div>
            <div style="display:flex; gap:10px;">
                <div class="field" style="flex:1;">
                    <label>Beds</label>
                    <select id="bedSelect">
                        ${[1,2,3,4,5].map(n => `<option value="${n}" ${state.beds == n ? 'selected' : ''}>${n}</option>`).join('')}
                    </select>
                </div>
                <div class="field" style="flex:1;">
                    <label>Baths</label>
                    <select id="bathSelect">
                        ${[1,2,3].map(n => `<option value="${n}" ${state.baths == n ? 'selected' : ''}>${n}</option>`).join('')}
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
                    <option value="100">1 Bed / 1 Bath ($100)</option>
                    <option value="130" selected>2 Bed / 2 Bath ($130)</option>
                    <option value="175">3 Bed / 2 Bath ($175)</option>
                    <option value="225">4+ Bed / 3+ Bath ($225)</option>
                </select>
            </div>
        `;
    }

    html += `<h4 style="margin: 15px 0 5px 0; color: var(--primary-blue);">Select Add-ons:</h4>`;
    ADDONS.forEach(a => {
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
    let base = 130;
    let discount = 0;

    if (state.service === 'one-time' || state.service === 'recurrent') {
        base = Math.max(state.sqFt * 0.10, 130);
        if (state.service === 'recurrent') {
            let rate = state.freq === 'weekly' ? 0.20 : (state.freq === 'biweekly' ? 0.15 : 0.10);
            discount = base * rate;
        }
    } else if (state.service === 'deep') {
        base = Math.max(state.sqFt * 0.18, 200);
    } else if (state.service === 'move') {
        base = Math.max(state.sqFt * 0.20, 220);
    } else if (state.service === 'airbnb') {
        const select = document.getElementById('strLayout');
        base = select ? parseInt(select.value) : 130;
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
    const paymentNoticeText = isOnline 
        ? "STATUS: ONLINE PAYMENT SELECTED" 
        : "STATUS: PAY AT SERVICE";

    const modalSummary = document.getElementById('modalBookingSummary');
    if (modalSummary) {
        modalSummary.innerText = `Selected: ${state.service.toUpperCase()} (${state.sqFt} sq ft) | Total: $${state.calculatedTotal} | [${paymentNoticeText}]`;
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
            alert('DEMO MODE: Form submission successful!');
            form.reset();
            closeModal(formId === 'bookingForm' ? 'bookingModal' : 'vipModal');
        });
    });
}