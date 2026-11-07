import { buyPlan, isPro, planPrices } from './billing.js';
import { CREDITS, REFILL_DAYS } from './config.js';

const view = document.querySelector('#view');
const nav = document.querySelector('#nav');
const dialog = document.querySelector('#dialog');

const STORE_KEY = 'waia-app-state-v1';
const MAX_SIDE = 1024;
const MIN_WAIT_MS = 5000;
const ROOMS = ['Living room', 'Bedroom', 'Kitchen', 'Dining room', 'Home office', 'Other'];
// Each style maps to one quarter of assets/styles.webp.
const STYLES = [['Minimal', '0% 0%'], ['Modern', '100% 0%'], ['Bohemian', '0% 100%'], ['Traditional', '100% 100%']];
const CHANGES = ['Better lighting', 'Wall decor', 'New furniture', 'Cozier feel', 'More storage', 'Add plants'];
const BUDGETS = [
  ['$', 'Under $250', 'A few small upgrades.'],
  ['$$', '$250 to $750', 'Refresh the main pieces.'],
  ['$$$', '$750 and up', 'A bigger makeover.'],
];
const STAGE_LINES = [
  ['Reading the light in your room…', 'Studying your layout…', 'Spotting what this space is missing…'],
  ['Hunting for pieces you will love…', 'Comparing real stores…', 'Matching products to your budget…'],
  ['Placing everything in your room…', 'Getting the details right…', 'Almost ready to reveal it…'],
];
const STAGE_PROGRESS = [28, 62, 90];
const REFINES = ['Add more plants', 'Warmer lighting', 'Try a different rug', 'Make the wall bolder'];
const QUESTIONS = ['How can I make my living room cozier?', 'What colors work well together?', 'How do I arrange a small space?', 'What lighting suits a bedroom?'];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function loadStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    return {
      designs: Array.isArray(saved?.designs) ? saved.designs : [],
      saved: Array.isArray(saved?.saved) ? saved.saved : [],
      credits: Number.isFinite(saved?.credits) ? saved.credits : CREDITS.free,
      plan: saved?.plan || null,
      refilledAt: Number(saved?.refilledAt) || 0,
    };
  } catch {
    return { designs: [], saved: [], credits: CREDITS.free, plan: null, refilledAt: 0 };
  }
}

function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    store.designs = store.designs.slice(0, 3);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
  }
}

function readContext() {
  try {
    return JSON.parse(sessionStorage.getItem('waia-room-demo-context')) || {};
  } catch {
    return {};
  }
}

// One entry point: first-time visitors go through setup before the app.
function hasOnboarded() {
  try {
    return localStorage.getItem('dream-room-onboarded') === '1';
  } catch {
    return true;
  }
}

if (!hasOnboarded()) window.location.replace('../onboarding/');

const context = readContext();
const preferences = Array.isArray(context.preferences) ? context.preferences.filter(item => typeof item?.label === 'string' && typeof item?.value === 'string') : [];
const store = loadStore();
const emptyDraft = () => ({ photo: null, room: ROOMS[0], style: 'Modern', changes: [], note: '', budget: BUDGETS[1][1] });
const state = { route: 'home', draft: emptyDraft(), stage: 0, result: null, error: '', pro: false, pendingRun: null, layout: 'grid', chat: [], chatBusy: false };

function go(route) {
  state.route = route;
  render();
  window.scrollTo(0, 0);
}

function resizeImage(source, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      if (url !== source) URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => reject(new Error('That photo could not be opened.'));
    image.src = url;
  });
}

async function post(path, body) {
  const response = await fetch('./api/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

function compare(before, after) {
  return `<div class="compare" style="--split: 50%">
    <img src="${escapeHtml(after)}" alt="Room after the redesign">
    <img class="before" src="${escapeHtml(before)}" alt="Room before the redesign">
    <span class="compare-line"></span><span class="tag left">Before</span><span class="tag right">After</span>
    <input type="range" min="0" max="100" value="50" aria-label="Compare before and after">
  </div>`;
}

function creditLabel() {
  return `${store.credits} credit${store.credits === 1 ? '' : 's'}`;
}

function homeView() {
  return `<header class="topbar">
      <button class="pill" data-act="upgrade">${creditLabel()}</button>
      <span class="topbar-title">Dream Room</span>
      <button class="icon-button" data-go="settings" aria-label="Settings">⚙</button>
    </header>
    <section class="hero"><h1>Complete the room <em>you already have.</em></h1></section>
    <button class="tool" data-act="start"><span class="tool-icon" aria-hidden="true">⌂</span><span><strong>Room Designer</strong><small>Your room, your budget, real products.</small></span><span class="tool-arrow" aria-hidden="true">→</span></button>
    <article class="feature">
      <img src="./assets/home-after.webp" alt="Bright renovated living room with a cream sofa and oak floor">
      <span class="tag">Start here</span>
      <div class="feature-body"><h2>See it in your room</h2><button class="primary" data-act="start">Try now <span aria-hidden="true">→</span></button></div>
    </article>
    <section class="item"><h2>From tired to beautiful</h2>${compare('./assets/home-before.webp', './assets/home-after.webp')}</section>`;
}

function section(number, title, tag, body) {
  return `<section class="create-section">
    <div class="section-head"><span class="section-number">${number}</span><h2>${title}</h2><span class="section-tag">${tag}</span></div>
    ${body}
  </section>`;
}

function chipRow(name, values, selected) {
  const chips = values.map(value => {
    const pressed = Array.isArray(selected) ? selected.includes(value) : selected === value;
    return `<button class="pick-chip" data-pick="${name}" data-value="${escapeHtml(value)}" aria-pressed="${pressed}">${escapeHtml(value)}</button>`;
  }).join('');
  return `<div class="scroll-row">${chips}</div>`;
}

function budgetHint(value) {
  return BUDGETS.find(([, label]) => label === value)?.[2] || '';
}

function createView() {
  const { draft } = state;
  const photo = draft.photo
    ? `<label class="dropzone filled"><input type="file" accept="image/*" data-file><img src="${draft.photo}" alt="Your room"><span class="tag">Change photo</span></label>`
    : '<label class="dropzone"><input type="file" accept="image/*" data-file><span aria-hidden="true">＋</span><strong>Tap to upload a photo</strong><small>Use good light and a wide angle</small></label>';
  const styles = STYLES.map(([label, position]) => `<button class="style-card" data-pick="style" data-value="${label}" aria-pressed="${draft.style === label}"><span class="style-image" style="background-position: ${position}"></span><strong>${label}</strong></button>`).join('');
  const budgets = BUDGETS.map(([symbol, label]) => `<button data-pick="budget" data-value="${escapeHtml(label)}" aria-pressed="${draft.budget === label}" aria-label="${escapeHtml(label)}">${symbol}</button>`).join('');
  return `<header class="topbar">
      <button class="icon-button" data-go="home" aria-label="Back">←</button>
      <span class="topbar-title">Design your room</span>
      <span class="pill quiet">${creditLabel()}</span>
    </header>
    <section class="create-section">
      ${photo}
      <div class="photo-actions"><button class="text-button" data-act="sample">Use a sample room</button><button class="text-button" data-act="tips">Photo tips</button></div>
    </section>
    ${section(1, 'Room type', 'Required', chipRow('room', ROOMS, draft.room))}
    ${section(2, 'Style', 'Required', `<div class="scroll-row">${styles}</div>`)}
    ${section(3, 'Budget', 'Required', `<div class="segmented">${budgets}</div><p class="muted" data-budget-hint>${escapeHtml(draft.budget)}. ${escapeHtml(budgetHint(draft.budget))}</p>`)}
    ${section(4, 'What should change?', 'Optional', `${chipRow('changes', CHANGES, draft.changes)}<label><span class="sr-only">Anything specific?</span><textarea class="note" data-note maxlength="300" placeholder="Anything specific? For example, a clock on the empty wall.">${escapeHtml(draft.note)}</textarea></label>`)}
    ${state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : ''}
    <div class="footer-action"><button class="primary" data-act="generate" ${draft.photo ? '' : 'disabled'}>${draft.photo ? 'Design my room' : 'Add a photo to continue'} <span aria-hidden="true">→</span></button><p class="fineprint center">Uses 1 credit</p></div>`;
}

function generatingView() {
  return `<div class="reveal">
      <div class="scan"><img src="${escapeHtml(state.draft.photo)}" alt="Your room being redesigned"><span class="scan-line"></span></div>
      <h1>Your dream room is on its way</h1>
      <p class="reveal-line" data-line role="status">${STAGE_LINES[0][0]}</p>
      <div class="meter" aria-hidden="true"><span data-meter style="width: ${STAGE_PROGRESS[state.stage]}%"></span></div>
    </div>`;
}

function productCard(product, item) {
  const saved = store.saved.some(entry => entry.url === product.url);
  return `<article class="product">
    <div><strong>${escapeHtml(product.title)}</strong><small>${escapeHtml(product.store)}${product.price ? ' · about ' + escapeHtml(product.price) : ''}</small></div>
    <div class="product-actions">
      <button class="save" data-save="${escapeHtml(product.url)}" data-title="${escapeHtml(product.title)}" data-price="${escapeHtml(product.price || '')}" data-store="${escapeHtml(product.store)}" data-item="${escapeHtml(item)}" aria-pressed="${saved}">${saved ? 'Saved' : 'Save'}</button>
      <a class="link" href="${escapeHtml(product.url)}" target="_blank" rel="noopener noreferrer">${product.direct ? 'View at ' + escapeHtml(product.store) : 'Find this product'} ↗</a>
    </div>
  </article>`;
}

function resultView() {
  const { result } = state;
  const items = result.items.map(item => `<section class="item">
    <h2>${escapeHtml(item.name)}</h2><p class="muted">${escapeHtml(item.reason)}</p>
    ${item.products.map(product => productCard(product, item.name)).join('')}
    <a class="link plain" href="${escapeHtml(item.searchUrl)}" target="_blank" rel="noopener noreferrer">${item.products.length ? 'More options ↗' : 'Search stores ↗'}</a>
  </section>`).join('');
  return `<header class="topbar"><button class="icon-button" data-go="designs" aria-label="Back to designs">←</button><span class="topbar-title">Your design</span><span class="pill quiet">${creditLabel()}</span></header>
    ${compare(result.before, result.imageUrl)}
    <p>${escapeHtml(result.summary)}</p>
    ${state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : ''}
    <section class="card"><h2>Change this room</h2><p class="muted">Each new image uses 1 credit.</p>
      <div class="chips">${REFINES.map(text => `<button class="chip" data-refine="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join('')}</div>
      <form class="composer" data-refine-form><label class="sr-only" for="refine-input">Describe a change</label><input id="refine-input" autocomplete="off" maxlength="300" placeholder="Describe a change"><button aria-label="Create new version">↑</button></form>
    </section>
    <div class="step-title"><h2>Shop this room</h2><p class="muted">Similar products from online stores. The image is a preview, so the exact item can differ.</p></div>
    ${items}
    <button class="primary" data-act="start">Design another room <span aria-hidden="true">→</span></button>`;
}

function designsView() {
  const header = `<header class="topbar"><button class="icon-button" data-go="home" aria-label="Back">←</button><span class="topbar-title">My Designs</span><span></span></header>`;
  if (!store.designs.length) {
    return `${header}<div class="center"><h1>No saved designs</h1><p class="muted">Your room designs will appear here.</p></div>
      <div class="steps-card"><div><b>1</b>Upload a room photo</div><div><b>2</b>Answer a few questions</div><div><b>3</b>Shop your design</div></div>
      <button class="primary" data-act="start">＋ Create your first design</button>`;
  }
  const cards = store.designs.map((design, index) => `<button class="design-card" data-open="${index}"><img src="${escapeHtml(design.imageUrl)}" alt="Saved room design"><span>${escapeHtml(design.title)}</span></button>`).join('');
  return `${header}<div class="topbar">
      <div class="view-toggle"><button data-layout="grid" aria-pressed="${state.layout === 'grid'}" aria-label="Grid view">▦</button><button data-layout="list" aria-pressed="${state.layout === 'list'}" aria-label="List view">☰</button></div>
      <button class="pill quiet" data-act="clear">Delete all</button>
    </div>
    <div class="designs ${state.layout}">${cards}</div>`;
}

function chatView() {
  const log = state.chat.map(message => `<p class="bubble ${message.from}">${escapeHtml(message.text)}</p>`).join('');
  const suggestions = state.chat.length ? '' : `<div class="card"><h2>Hi, I'm your design assistant.</h2><p class="muted">How can I help with your space?</p>${QUESTIONS.map(question => `<button class="suggestion" data-ask="${escapeHtml(question)}"><span>${escapeHtml(question)}</span><span aria-hidden="true">›</span></button>`).join('')}</div>`;
  return `<header class="topbar"><button class="icon-button" data-go="home" aria-label="Back">←</button><span class="topbar-title">Ask Dream Room</span><span></span></header>
    ${suggestions}<div class="chat-log">${log}${state.chatBusy ? '<p class="bubble waia" role="status">Thinking…</p>' : ''}</div>
    <form class="composer" data-chat><label class="sr-only" for="chat-input">Ask Dream Room</label><input id="chat-input" autocomplete="off" maxlength="400" placeholder="Ask Dream Room anything" ${state.chatBusy ? 'disabled' : ''}><button aria-label="Send" ${state.chatBusy ? 'disabled' : ''}>↑</button></form>`;
}

function settingsView() {
  const prefs = preferences.map(item => `<li><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></li>`).join('');
  const saved = store.saved.map(item => `<li><span>${escapeHtml(item.item)}</span><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}${item.store ? ' · ' + escapeHtml(item.store) : ''} ↗</a></li>`).join('');
  return `<header class="topbar"><button class="icon-button" data-go="home" aria-label="Back">←</button><span class="topbar-title">Settings</span><span></span></header>
    <section class="card"><h2>${state.pro ? 'Dream Room Plus' : 'Free plan'}</h2><p class="muted">${creditLabel()} left. Each new room image uses 1 credit.</p><button class="primary" data-act="upgrade">${state.pro ? 'Buy more credits' : 'Get more credits'}</button></section>
    <section class="item"><h2>Saved products</h2>${saved ? `<ul class="list">${saved}</ul>` : '<p class="muted">Save products from a design to compare them later.</p>'}</section>
    ${prefs ? `<section class="item"><h2>Your preferences</h2><ul class="list">${prefs}</ul></section>` : ''}
    <a class="link plain" href="../onboarding/">Back to setup</a>`;
}

const views = { home: homeView, create: createView, generating: generatingView, result: resultView, designs: designsView, chat: chatView, settings: settingsView };

function renderNav() {
  nav.hidden = state.route === 'create' || state.route === 'generating';
  const item = (route, icon, label) => `<button data-go="${route}" ${state.route === route ? 'aria-current="page"' : ''}><span aria-hidden="true">${icon}</span>${label}</button>`;
  nav.innerHTML = `<div class="nav-group">${item('home', '⌂', 'Home')}${item('chat', '✦', 'Chat')}${item('designs', '▤', 'Designs')}</div><button class="nav-add" data-act="start" aria-label="New design">＋</button>`;
}

function render() {
  view.innerHTML = views[state.route]();
  renderNav();
}

function startDesign() {
  state.draft = emptyDraft();
  state.error = '';
  go('create');
}


function refill() {
  const days = REFILL_DAYS[store.plan];
  if (!state.pro || !days || Date.now() - store.refilledAt < days * 86_400_000) return;
  store.credits += CREDITS[store.plan];
  store.refilledAt = Date.now();
  saveStore();
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(ms, 0)));
}

// The waiting line always follows the real stage of the work.
function rotateLines() {
  let index = 0;
  const timer = setInterval(() => {
    const line = view.querySelector('[data-line]');
    if (!line) return;
    const lines = STAGE_LINES[state.stage];
    index += 1;
    line.textContent = lines[index % lines.length];
  }, 1700);
  return () => clearInterval(timer);
}

async function runDesign({ image, answers, previous = null }) {
  if (store.credits < 1) {
    state.pendingRun = { image, answers, previous };
    openPaywall();
    return;
  }
  state.error = '';
  state.stage = 0;
  state.draft.photo = image;
  go('generating');
  const startedAt = Date.now();
  const stopLines = rotateLines();
  const setStage = stage => {
    state.stage = stage;
    view.querySelector('[data-meter]')?.style.setProperty('width', STAGE_PROGRESS[stage] + '%');
  };
  try {
    const plan = await post('plan', { image, context: preferences.map(item => `${item.label}: ${item.value}`).join('; '), answers });
    setStage(1);
    const { items } = await post('products', { items: plan.items, budget: answers.budget });
    setStage(2);
    const picks = items.map(item => item.products[0]?.title || item.name);
    const { imageUrl } = await post('render', { image, editPrompt: plan.editPrompt, products: picks });
    store.credits -= 1;
    const before = previous ? previous.before : await resizeImage(image, 480, 0.7);
    const title = previous ? previous.title : `${answers.style} ${answers.room}`.toLowerCase().replace(/^./, char => char.toUpperCase());
    const design = { id: previous?.id || Date.now(), imageUrl, before, summary: plan.summary, items, title, answers };
    store.designs = [design, ...store.designs.filter(entry => entry.id !== design.id)].slice(0, 8);
    saveStore();
    state.result = previous ? design : { ...design, before: image };
    await wait(MIN_WAIT_MS - (Date.now() - startedAt));
    stopLines();
    go('result');
  } catch (error) {
    stopLines();
    state.error = error.message;
    if (previous) {
      state.result = previous;
      go('result');
    } else {
      go('create');
    }
  }
}

function generate() {
  const { photo, room, style, changes, note, budget } = state.draft;
  runDesign({ image: photo, answers: { room, style, changes, note, budget } });
}

function refine(text) {
  const value = text.trim();
  if (!value || !state.result) return;
  const { answers = {}, imageUrl } = state.result;
  runDesign({ image: imageUrl, answers: { ...answers, changes: [], note: value }, previous: state.result });
}

async function openPaywall(selected = 'annual') {
  let prices;
  try {
    prices = await planPrices();
  } catch {
    state.error = 'Plans could not be loaded. Please try again.';
    render();
    return;
  }
  const option = (id, label, note, price, period) => `<label class="plan"><input type="radio" name="plan" value="${id}" ${selected === id ? 'checked' : ''}><span><strong>${label}</strong><small>${note}</small></span><span class="plan-price">${price}<small>${period}</small></span></label>`;
  const plans = state.pro ? '' : option('annual', 'Yearly', `${CREDITS.annual} credits right away · best value`, prices.annual, '/ year') + option('weekly', 'Weekly', `${CREDITS.weekly} credits every week`, prices.weekly, '/ week');
  dialog.innerHTML = `<button class="dialog-close" data-close aria-label="Close">×</button>
    <div class="dialog-body">
      <h2 id="dialog-title">${store.credits < 1 ? 'You are out of credits' : 'Get more credits'}</h2>
      <p class="muted">Each new room image uses 1 credit.</p>
      ${plans}
      ${option('pack', 'Credit pack', `${CREDITS.pack} extra credits, no renewal`, prices.pack, 'one time')}
      <button class="primary" data-buy>Continue <span aria-hidden="true">→</span></button>
      <p class="fineprint">Test mode. No real money is charged. Subscriptions renew until canceled.</p>
    </div>`;
  if (state.pro) dialog.querySelector('[value="pack"]').checked = true;
  if (!dialog.open) dialog.showModal();
}

async function purchase(plan) {
  dialog.close();
  try {
    if (!(await buyPlan(plan))) return;
    store.credits += CREDITS[plan];
    if (plan !== 'pack') {
      store.plan = plan;
      store.refilledAt = Date.now();
      state.pro = true;
    }
    saveStore();
    const pending = state.pendingRun;
    state.pendingRun = null;
    render();
    if (pending) runDesign(pending);
  } catch {
    state.error = 'The payment could not be completed. Please try again.';
    render();
  }
}

function toggleSaved(button) {
  const index = store.saved.findIndex(entry => entry.url === button.dataset.save);
  if (index >= 0) store.saved.splice(index, 1);
  else store.saved.unshift({ url: button.dataset.save, title: button.dataset.title, price: button.dataset.price, store: button.dataset.store, item: button.dataset.item });
  saveStore();
  render();
}

// Updates in place so the page and the side-scrolling rows keep their position.
function pick(button) {
  const { draft } = state;
  const { pick: name, value } = button.dataset;
  if (name === 'changes') {
    draft.changes = draft.changes.includes(value) ? draft.changes.filter(item => item !== value) : [...draft.changes, value];
    button.setAttribute('aria-pressed', String(draft.changes.includes(value)));
    return;
  }
  draft[name] = value;
  for (const option of view.querySelectorAll(`[data-pick="${name}"]`)) {
    option.setAttribute('aria-pressed', String(option === button));
  }
  if (name === 'budget') view.querySelector('[data-budget-hint]').textContent = `${value}. ${budgetHint(value)}`;
}

async function ask(text) {
  const value = text.trim();
  if (!value || state.chatBusy) return;
  state.chat.push({ from: 'you', text: value });
  state.chatBusy = true;
  render();
  try {
    const { reply } = await post('chat', { messages: state.chat });
    state.chat.push({ from: 'waia', text: reply });
  } catch (error) {
    state.chat.push({ from: 'waia', text: error.message });
  }
  state.chatBusy = false;
  render();
}

function showTips() {
  dialog.innerHTML = `<button class="dialog-close" data-close aria-label="Close">×</button>
    <div class="dialog-body"><h2 id="dialog-title">Photo tips</h2>
    <ul class="list"><li>Stand in a corner to show more of the room.</li><li>Turn on the lights or open the curtains.</li><li>Keep the phone level.</li></ul></div>`;
  dialog.showModal();
}

const actions = {
  start: startDesign,
  upgrade: () => openPaywall(),
  settings: () => go('settings'),
  tips: showTips,
  generate,
  async sample() {
    const blob = await (await fetch('./assets/home-before.webp')).blob();
    state.draft.photo = await resizeImage(blob, MAX_SIDE, 0.82);
    render();
  },
  clear() {
    store.designs = [];
    saveStore();
    render();
  },
};

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.go) go(button.dataset.go);
  if (button.dataset.act) actions[button.dataset.act]();
  if (button.dataset.pick) pick(button);
  if (button.dataset.save) toggleSaved(button);
  if (button.dataset.ask) ask(button.dataset.ask);
  if (button.dataset.buy !== undefined) purchase(dialog.querySelector('[name="plan"]:checked').value);
  if (button.dataset.refine) refine(button.dataset.refine);
  if (button.dataset.close !== undefined) {
    state.pendingRun = null;
    dialog.close();
  }
  if (button.dataset.layout) {
    state.layout = button.dataset.layout;
    render();
  }
  if (button.dataset.open) {
    state.result = store.designs[Number(button.dataset.open)];
    go('result');
  }
});

view.addEventListener('input', event => {
  if (event.target.type === 'range') event.target.closest('.compare').style.setProperty('--split', event.target.value + '%');
  if (event.target.dataset.note !== undefined) {
    state.draft.note = event.target.value;
  }
});

view.addEventListener('change', async event => {
  if (event.target.dataset.file === undefined || !event.target.files[0]) return;
  try {
    state.draft.photo = await resizeImage(event.target.files[0], MAX_SIDE, 0.82);
    state.error = '';
  } catch (error) {
    state.error = error.message;
  }
  render();
});

view.addEventListener('submit', event => {
  event.preventDefault();
  const { value } = event.target.querySelector('input');
  if (event.target.dataset.chat !== undefined) ask(value);
  if (event.target.dataset.refineForm !== undefined) refine(value);
});

render();
isPro().then(pro => {
  state.pro = pro;
  refill();
  render();
  // The onboarding CTA starts checkout once, even if the app is reloaded.
  const { checkoutPlan } = context;
  if (checkoutPlan) {
    delete context.checkoutPlan;
    try { sessionStorage.setItem('waia-room-demo-context', JSON.stringify(context)); } catch {}
    if (checkoutPlan === 'pack' || !pro) purchase(checkoutPlan);
  }
});
