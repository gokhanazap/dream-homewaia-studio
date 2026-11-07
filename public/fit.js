// Waia · "Sığar mı? + Bütçe" modülü
// app.js'e dokunmadan çalışır: ürün listesi ve ürün diyaloğu DOM'a geldiğinde kendini ekler.
// Entegrasyon: index.html <head> içine  <script src="./fit.js" type="module"></script>
// Ürün ölçü/fiyat verisi: public/fit-data.json

const flow = document.querySelector('#flow');
const dialog = document.querySelector('#dialog');
const storageKey = 'waia-fit-v1';

const SOFA_PRESETS = [['Küçük', 160], ['Orta', 200], ['Geniş', 240]];
const CORNER_PRESETS = [['Dar', 30], ['Orta', 45], ['Geniş', 60]];
// Kural: duvar saati çapı, altındaki koltuğun genişliğinin %20–30'u.
const CLOCK_MIN = 0.2;
const CLOCK_MAX = 0.3;
// Koltuk yanında okuma lambası için rahat yükseklik aralığı (cm).
const LAMP_MIN = 145;
const LAMP_MAX = 180;

let data = { currency: '$', defaultBudget: 150, products: {} };
let state = { sofa: 200, corner: 45, budget: null, selected: {} };

try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey));
  if (saved && typeof saved === 'object') state = { ...state, ...saved, selected: { ...(saved.selected || {}) } };
} catch {}

function save() {
  try { sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
}

const num = value => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const money = value => data.currency + value.toFixed(2);
const moneyRound = value => data.currency + Math.round(value);
const budget = () => state.budget ?? data.defaultBudget;
const clockRange = () => [Math.round(state.sofa * CLOCK_MIN), Math.round(state.sofa * CLOCK_MAX)];
const maxBase = () => Math.max(0, state.corner - 5);

function verdict(spec) {
  if (!spec) return null;
  if (spec.type === 'clock') {
    const d = num(spec.diameterCm);
    if (d === null) return { tone: 'unknown', text: 'Çapı ürün sayfasında kontrol et' };
    const [min, max] = clockRange();
    if (d < min) return { tone: 'warn', text: `Ø ${d} cm · bu duvarda küçük kalabilir` };
    if (d > max) return { tone: 'warn', text: `Ø ${d} cm · bu duvar için büyük olabilir` };
    return { tone: 'ok', text: `Ø ${d} cm · duvarına uygun` };
  }
  if (spec.type === 'lamp') {
    const h = num(spec.heightCm);
    const b = num(spec.baseCm);
    if (h === null && b === null) return { tone: 'unknown', text: 'Ölçüyü ürün sayfasında kontrol et' };
    if (b !== null && b > maxBase()) return { tone: 'warn', text: `Taban ${b} cm · köşeye sığmayabilir` };
    if (h !== null && (h < LAMP_MIN || h > LAMP_MAX)) return { tone: 'warn', text: `${h} cm · okuma için ${h < LAMP_MIN ? 'alçak' : 'yüksek'}` };
    return { tone: 'ok', text: [h && `${h} cm`, b && `taban ${b} cm`].filter(Boolean).join(' · ') + ' · köşene uygun' };
  }
  return null;
}

function selectedTotal() {
  let total = 0;
  let missing = 0;
  for (const asin of Object.values(state.selected)) {
    const price = num(data.products[asin]?.price);
    if (price === null) missing++;
    else total += price;
  }
  return { total, missing, count: Object.keys(state.selected).length };
}

// ---------- Panel (ürün listesinin üstünde) ----------

function chips(name, presets, current) {
  return presets.map(([label, value]) =>
    `<button type="button" class="fit-chip" data-fit="${name}" data-value="${value}" aria-pressed="${current === value}">${label}<small>${value} cm</small></button>`).join('');
}

function panelSummary() {
  const [min, max] = clockRange();
  return `Saat Ø ${min}–${max} cm · lamba tabanı ≤ ${maxBase()} cm`;
}

function budgetBar() {
  const { total, missing, count } = selectedTotal();
  const limit = budget();
  const pct = limit > 0 ? Math.min(100, Math.round((total / limit) * 100)) : 0;
  const over = total > limit;
  const label = count
    ? `${money(total)} / ${moneyRound(limit)}${missing ? ` · ${missing} ürünün fiyatı eksik` : ''}`
    : `Bütçe ${moneyRound(limit)} · kartlarda “Seç”e dokun`;
  return `<div class="fit-budget${over ? ' over' : ''}">
    <div class="fit-budget-row"><span>${over ? 'Bütçeyi aşıyor' : count ? 'Seçtiklerin' : 'Bütçen'}</span><strong>${label}</strong></div>
    <div class="fit-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Bütçe kullanımı"><span style="width:${pct}%"></span></div>
  </div>`;
}

function panelHTML() {
  return `<details class="fit-panel">
    <summary><span class="fit-ruler" aria-hidden="true">📏</span><span><strong>Sığar mı? Odana göre ayarla</strong><small class="fit-summary">${panelSummary()}</small></span><span class="fit-caret" aria-hidden="true">▾</span></summary>
    <div class="fit-body">
      <div class="fit-field"><span class="fit-label">Koltuk genişliği</span><div class="fit-chips">${chips('sofa', SOFA_PRESETS, state.sofa)}</div>
        <label class="fit-input">veya <input type="number" inputmode="numeric" min="80" max="400" data-fit-input="sofa" value="${state.sofa}"> cm</label></div>
      <div class="fit-field"><span class="fit-label">Koltuk yanındaki boşluk</span><div class="fit-chips">${chips('corner', CORNER_PRESETS, state.corner)}</div></div>
      <div class="fit-field"><span class="fit-label">Bütçe</span>
        <label class="fit-input">${data.currency} <input type="number" inputmode="numeric" min="0" max="100000" data-fit-input="budget" value="${budget()}"></label></div>
      <p class="fit-rule">Kural: duvar saati koltuk genişliğinin %20–30’u kadar olmalı. Lamba tabanı köşeye 5 cm pay bırakmalı.</p>
    </div>
  </details>
  <div class="fit-budget-slot">${budgetBar()}</div>`;
}

function ensurePanel() {
  for (const list of flow.querySelectorAll('.product-list')) {
    if (list.previousElementSibling?.classList.contains('fit-budget-slot')) continue;
    list.insertAdjacentHTML('beforebegin', panelHTML());
  }
}

function refreshPanels() {
  for (const el of document.querySelectorAll('.fit-summary')) el.textContent = panelSummary();
  for (const slot of document.querySelectorAll('.fit-budget-slot')) slot.innerHTML = budgetBar();
  for (const chip of document.querySelectorAll('.fit-chip')) {
    chip.setAttribute('aria-pressed', String(Number(chip.dataset.value) === state[chip.dataset.fit]));
  }
  for (const input of document.querySelectorAll('[data-fit-input="sofa"]')) {
    if (document.activeElement !== input) input.value = state.sofa;
  }
  enhanceDialog(true);
}

// ---------- Ürün diyaloğu ----------

function asinOf(card) {
  const link = card.querySelector('a[href*="/dp/"]');
  return link?.getAttribute('href').match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? null;
}

function enhanceDialog(force = false) {
  for (const card of dialog.querySelectorAll('.product-card')) {
    const asin = asinOf(card);
    if (!asin) continue;
    const spec = data.products[asin];
    let meta = card.querySelector('.fit-meta');
    if (meta && !force) continue;
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'fit-meta';
      card.querySelector('div')?.append(meta);
    }
    const v = verdict(spec);
    const price = num(spec?.price);
    const type = spec?.type;
    const picked = type && state.selected[type] === asin;
    meta.innerHTML = `${v ? `<span class="fit-badge ${v.tone}">${v.tone === 'ok' ? '✓ ' : v.tone === 'warn' ? '⚠ ' : ''}${v.text}</span>` : ''}
      ${price !== null ? `<span class="fit-price">${money(price)}</span>` : ''}
      ${type ? `<button type="button" class="fit-pick" data-pick="${asin}" data-type="${type}" aria-pressed="${picked}">${picked ? '✓ Seçildi' : 'Seç'}</button>` : ''}`;
  }
  const slot = dialog.querySelector('.fit-dialog-budget');
  if (dialog.querySelector('.product-card')) {
    if (slot) slot.innerHTML = budgetBar();
    else dialog.querySelector('.shopping-note')?.insertAdjacentHTML('beforebegin', `<div class="fit-dialog-budget">${budgetBar()}</div>`);
  }
}

// ---------- Olaylar ----------

document.addEventListener('click', event => {
  const chip = event.target.closest('.fit-chip');
  if (chip) {
    state[chip.dataset.fit] = Number(chip.dataset.value);
    save();
    refreshPanels();
    return;
  }
  const pick = event.target.closest('.fit-pick');
  if (pick) {
    const { type, pick: asin } = pick.dataset;
    if (state.selected[type] === asin) delete state.selected[type];
    else state.selected[type] = asin;
    save();
    refreshPanels();
  }
});

document.addEventListener('input', event => {
  const input = event.target.closest('[data-fit-input]');
  if (!input) return;
  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0) return;
  if (input.dataset.fitInput === 'sofa' && (value < 80 || value > 400)) return;
  state[input.dataset.fitInput] = value;
  save();
  refreshPanels();
});

// ---------- Stil ----------

const css = `
.fit-panel { margin-top: 12px; border: 1px solid var(--line, #e8ddd0); border-radius: 12px; background: var(--card, #fffdf8); }
.fit-panel summary { list-style: none; display: grid; grid-template-columns: 32px minmax(0,1fr) auto; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; }
.fit-panel summary::-webkit-details-marker { display: none; }
.fit-ruler { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--blush, #f8ebe2); font-size: 15px; }
.fit-panel summary strong { display: block; font-size: 13px; }
.fit-panel summary small { display: block; color: var(--muted, #6c655a); font-size: 11px; }
.fit-caret { color: var(--rust-dark, #913722); transition: transform .2s; }
.fit-panel[open] .fit-caret { transform: rotate(180deg); }
.fit-body { padding: 0 12px 12px; display: grid; gap: 10px; }
.fit-label { display: block; font-size: 10px; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; color: var(--rust-dark, #913722); margin-bottom: 5px; }
.fit-chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.fit-chip { border: 1px solid var(--line, #e8ddd0); background: var(--paper, #f9f5ee); border-radius: 10px; padding: 6px 4px; font-size: 12px; font-weight: 650; line-height: 1.2; }
.fit-chip small { display: block; font-weight: 400; color: var(--muted, #6c655a); font-size: 10px; }
.fit-chip[aria-pressed="true"] { border-color: var(--rust, #ad462f); background: var(--blush, #f8ebe2); color: var(--rust-dark, #913722); }
.fit-input { display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 12px; color: var(--muted, #6c655a); }
.fit-input input { width: 84px; padding: 5px 8px; border: 1px solid var(--line, #e8ddd0); border-radius: 8px; background: #fff; color: var(--ink, #25251d); }
.fit-rule { margin: 0; font-size: 11px; color: var(--muted, #6c655a); }
.fit-budget { margin-top: 8px; padding: 9px 12px; border-radius: 12px; background: var(--blush, #f8ebe2); border: 1px solid #efd9cd; }
.fit-budget-row { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: #593d33; }
.fit-budget-row strong { font-size: 12px; text-align: right; }
.fit-track { height: 6px; margin-top: 6px; border-radius: 99px; background: #f0d6c8; overflow: hidden; }
.fit-track span { display: block; height: 100%; border-radius: inherit; background: var(--rust, #ad462f); transition: width .3s; }
.fit-budget.over .fit-track span { background: #c0392b; }
.fit-budget.over .fit-budget-row { color: #c0392b; }
.fit-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 8px; margin-top: 5px; }
.fit-badge { font-size: 10.5px; font-weight: 650; padding: 2px 7px; border-radius: 99px; }
.fit-badge.ok { background: #e3f1e4; color: #2f6b36; }
.fit-badge.warn { background: #fdf0d8; color: #8a5a00; }
.fit-badge.unknown { background: #efeae2; color: var(--muted, #6c655a); }
.fit-price { font-size: 12px; font-weight: 750; }
.fit-pick { border: 1px solid var(--rust, #ad462f); color: var(--rust-dark, #913722); background: transparent; border-radius: 99px; padding: 1px 10px; font-size: 11px; font-weight: 700; }
.fit-pick[aria-pressed="true"] { background: var(--rust, #ad462f); color: #fff; }
.fit-dialog-budget .fit-budget { margin-top: 10px; }
`;
document.head.insertAdjacentHTML('beforeend', `<style id="fit-style">${css}</style>`);

// ---------- Başlat ----------

new MutationObserver(ensurePanel).observe(flow, { childList: true, subtree: true });
new MutationObserver(() => enhanceDialog()).observe(dialog, { childList: true });

try {
  const response = await fetch(new URL('./fit-data.json', import.meta.url), { cache: 'no-store' });
  if (response.ok) data = { ...data, ...(await response.json()) };
} catch {}
ensurePanel();
refreshPanels();
