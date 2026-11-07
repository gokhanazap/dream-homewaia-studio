// Chat-led room design, product results and saved rooms for the three app tabs.
import { buyPlan, isPro, planPrices } from './billing.js';
import { FREE_DESIGNS } from './config.js';

const STORE_KEY = 'waia-room-state-v1';
const MAX_SIDE = 1024;
const REQUEST_CHIPS = ['Add a wall clock and floor lamp', 'Fill the empty wall', 'Improve the lighting', 'Make it feel cozier'];
const BUDGET_CHIPS = ['Under $100', 'Under $250', 'Under $500', 'No limit'];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function loadStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    return { rooms: Array.isArray(saved?.rooms) ? saved.rooms : [], saved: Array.isArray(saved?.saved) ? saved.saved : [], designs: Number(saved?.designs) || 0 };
  } catch {
    return { rooms: [], saved: [], designs: 0 };
  }
}

const store = loadStore();
const state = {
  photo: null,
  current: null,
  design: null,
  showBefore: false,
  budget: '',
  pending: '',
  loading: false,
  pro: false,
  retry: null,
  messages: [{ from: 'waia', text: 'Hi! Add a photo of your room, or start with our sample living room.' }],
};

let root;
let preferences = '';
let paywallDialog;

function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

function say(from, text) {
  state.messages.push({ from, text });
}

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That photo could not be opened.'));
    };
    image.src = url;
  });
}

function startRoom(photo) {
  Object.assign(state, { photo, current: photo, design: null, showBefore: false, pending: '', budget: '' });
  say('waia', 'Great room. What would you like to change?');
  render();
}

function stage() {
  if (!state.photo) {
    return `<div class="room-start">
      <label class="primary room-upload"><input type="file" accept="image/*" data-room="photo">Add a room photo</label>
      <button type="button" class="quiet" data-room="sample">Use the sample living room</button>
    </div>`;
  }
  const image = state.design && !state.showBefore ? state.design.imageUrl : state.photo;
  const toggle = state.design ? `<div class="demo-switch" role="group" aria-label="Room before and after">
    <button data-room="before" aria-pressed="${state.showBefore}">Before</button>
    <button data-room="after" aria-pressed="${!state.showBefore}">After</button>
  </div>` : '';
  return `${toggle}<div class="shop-image"><img src="${escapeHtml(image)}" alt="${state.design && !state.showBefore ? 'Your redesigned room' : 'Your room'}">
    ${state.loading ? '<span class="room-working" role="status">Designing your room…</span>' : ''}</div>`;
}

function chips() {
  if (state.loading || !state.photo) return '';
  const options = state.pending ? BUDGET_CHIPS : state.design ? [] : REQUEST_CHIPS;
  return options.length ? `<div class="room-chips">${options.map(option => `<button type="button" data-chip="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('')}</div>` : '';
}

function chat() {
  const log = state.messages.map(message => `<p class="room-message ${message.from}">${escapeHtml(message.text)}</p>`).join('');
  const composer = state.photo ? `<form class="room-composer" data-room="form">
    <label class="sr-only" for="room-input">Message Waia</label>
    <input id="room-input" autocomplete="off" maxlength="400" placeholder="${state.design ? 'Ask for a change' : 'Describe what you want'}" ${state.loading ? 'disabled' : ''}>
    <button type="submit" class="round" aria-label="Send" ${state.loading ? 'disabled' : ''}>↑</button>
  </form>` : '';
  return `<div class="room-chat" aria-live="polite">${log}</div>${chips()}${composer}`;
}

function shopCta() {
  return state.design ? '<div class="room-actions"><button class="primary" data-tab="products"><strong>Shop this room</strong><span aria-hidden="true">→</span></button></div>' : '';
}

export function renderDesign() {
  return stage() + chat() + shopCta();
}

function productCard(product, itemName) {
  const isSaved = store.saved.some(saved => saved.url === product.url);
  return `<article class="room-product">
    <div><strong>${escapeHtml(product.title)}</strong><small>${product.price ? 'About ' + escapeHtml(product.price) + ' · confirm on Amazon' : 'Check price on Amazon'}</small></div>
    <div class="room-product-actions">
      <button type="button" class="room-save" data-save="${escapeHtml(product.url)}" data-title="${escapeHtml(product.title)}" data-price="${escapeHtml(product.price || '')}" data-item="${escapeHtml(itemName)}" aria-pressed="${isSaved}">${isSaved ? 'Saved' : 'Save'}</button>
      <a class="amazon-link" href="${escapeHtml(product.url)}" target="_blank" rel="noopener noreferrer">Find on Amazon ↗</a>
    </div>
  </article>`;
}

export function renderProducts() {
  if (!state.design) return '';
  return state.design.items.map(item => `<section class="room-item">
    <h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.reason)}</p>
    ${item.products.map(product => productCard(product, item.name)).join('')}
    <a class="product-detail" href="${escapeHtml(item.searchUrl)}" target="_blank" rel="noopener noreferrer">${item.products.length ? 'More options on Amazon ↗' : 'Search Amazon ↗'}</a>
  </section>`).join('');
}

export function renderProfile() {
  const rooms = store.rooms.map((room, index) => `<button type="button" class="room-thumb" data-open-room="${index}"><img src="${escapeHtml(room.imageUrl)}" alt="Saved room design"><span>${escapeHtml(room.request)}</span></button>`).join('');
  const saved = store.saved.map(product => `<li><span>${escapeHtml(product.item)}</span><a href="${escapeHtml(product.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(product.title)}${product.price ? ' · ' + escapeHtml(product.price) : ''} ↗</a></li>`).join('');
  return `<h2 class="room-heading">Your rooms</h2>${rooms ? `<div class="room-thumbs">${rooms}</div>` : '<p class="room-empty">Rooms you design will appear here.</p>'}
    <h2 class="room-heading">Saved products</h2>${saved ? `<ul class="summary-list room-saved">${saved}</ul>` : '<p class="room-empty">Save products to compare them later.</p>'}`;
}

function render() {
  root.design.innerHTML = renderDesign();
  root.products.innerHTML = renderProducts();
  root.sample.hidden = Boolean(state.design);
  root.profile.innerHTML = renderProfile();
  root.plan.textContent = state.pro ? 'Waia Plus' : 'Free plan';
  root.planNote.textContent = state.pro ? 'Unlimited room designs.' : `${Math.max(FREE_DESIGNS - store.designs, 0)} free design left.`;
  root.upgrade.hidden = state.pro;
  const log = root.design.querySelector('.room-chat');
  if (log) log.scrollTop = log.scrollHeight;
}

async function openPaywall(selected = 'annual') {
  let prices;
  try {
    prices = await planPrices();
  } catch {
    say('waia', 'Plans could not be loaded. Please try again.');
    render();
    return;
  }
  const plan = (id, label, note, period) => `<label class="plan"><input type="radio" name="room-plan" value="${id}" ${selected === id ? 'checked' : ''}><span class="plan-radio"></span><span><strong>${label}</strong><small>${note}</small></span><span class="plan-price">${prices[id]}<small>/ ${period}</small></span></label>`;
  paywallDialog.innerHTML = `<button class="round dialog-close" data-close aria-label="Close">×</button>
    <span class="eyebrow"><span class="dot"></span> WAIA PLUS</span>
    <h2 id="dialog-title">Keep designing your home</h2>
    <p>Your first design is free. Waia Plus gives you unlimited rooms and changes.</p>
    <fieldset class="plans"><legend class="sr-only">Subscription plan</legend>
      ${plan('annual', 'Yearly', 'Renews every year', 'year')}
      ${plan('weekly', 'Weekly', 'Renews every week', 'week')}
    </fieldset>
    <button class="primary" data-buy>Continue <span>→</span></button>
    <p class="shopping-note">Test mode. No real money is charged. Cancel anytime.</p>`;
  if (!paywallDialog.open) paywallDialog.showModal();
}

async function purchase(plan) {
  paywallDialog.close();
  try {
    if (await buyPlan(plan)) {
      state.pro = true;
      say('waia', 'Welcome to Waia Plus. You can keep designing.');
      const retry = state.retry;
      state.retry = null;
      render();
      if (retry) runDesign(retry);
      return;
    }
  } catch {
    say('waia', 'The payment could not be completed. Please try again.');
  }
  render();
}

async function runDesign(request) {
  if (store.designs >= FREE_DESIGNS && !state.pro) {
    state.pro = await isPro();
    if (!state.pro) {
      state.retry = request;
      state.pending = '';
      openPaywall();
      render();
      return;
    }
  }
  state.loading = true;
  state.pending = '';
  render();
  try {
    const response = await fetch('./api/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: state.current, request, budget: state.budget, context: preferences }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'We could not finish this design.');
    state.design = data;
    state.current = data.imageUrl;
    state.showBefore = false;
    say('waia', data.reply);
    say('waia', 'Your products are ready. Want to change anything else?');
    store.rooms.unshift({ imageUrl: data.imageUrl, request, reply: data.reply, items: data.items });
    store.rooms = store.rooms.slice(0, 12);
    store.designs += 1;
    saveStore();
  } catch (error) {
    say('waia', error.message + ' Please try again.');
  }
  state.loading = false;
  render();
}

function send(text) {
  const value = text.trim();
  if (!value || state.loading) return;
  say('you', value);
  if (state.pending) {
    state.budget = value === 'No limit' ? '' : value;
    runDesign(state.pending);
  } else if (!state.design) {
    state.pending = value;
    say('waia', 'What is your budget for this room?');
    render();
  } else {
    runDesign(value);
  }
}

async function useSample() {
  const blob = await (await fetch('./assets/room-before.webp')).blob();
  startRoom(await resizePhoto(blob));
}

function toggleSaved(button) {
  const url = button.dataset.save;
  const index = store.saved.findIndex(product => product.url === url);
  if (index >= 0) store.saved.splice(index, 1);
  else store.saved.unshift({ url, title: button.dataset.title, price: button.dataset.price, item: button.dataset.item });
  saveStore();
  render();
}

function openRoom(index, showTab) {
  const room = store.rooms[index];
  if (!room) return;
  Object.assign(state, { photo: room.imageUrl, current: room.imageUrl, design: room, showBefore: false, pending: '' });
  say('waia', 'Here is your saved room. What should we change?');
  render();
  showTab('design');
}

export function mountRoom({ flow, dialog, panels, context, plan, showTab }) {
  root = panels;
  preferences = context;
  paywallDialog = dialog;

  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-buy]')) purchase(dialog.querySelector('[name="room-plan"]:checked').value);
  });

  flow.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.chip) send(button.dataset.chip);
    if (button.dataset.save) toggleSaved(button);
    if (button.dataset.openRoom) openRoom(Number(button.dataset.openRoom), showTab);
    if (button.dataset.room === 'sample') useSample();
    if (button.dataset.room === 'upgrade') openPaywall();
    if (button.dataset.room === 'before' || button.dataset.room === 'after') {
      state.showBefore = button.dataset.room === 'before';
      render();
    }
  });

  flow.addEventListener('submit', event => {
    if (event.target.dataset.room !== 'form') return;
    event.preventDefault();
    const input = event.target.querySelector('input');
    send(input.value);
    input.value = '';
  });

  flow.addEventListener('change', async event => {
    if (event.target.dataset.room !== 'photo' || !event.target.files[0]) return;
    try {
      startRoom(await resizePhoto(event.target.files[0]));
    } catch (error) {
      say('waia', error.message);
      render();
    }
  });

  render();
  isPro().then(pro => {
    state.pro = pro;
    render();
    // A plan chosen during setup opens checkout here, with the same RevenueCat prices.
    if (!pro && (plan === 'weekly' || plan === 'annual')) openPaywall(plan);
  });
}
