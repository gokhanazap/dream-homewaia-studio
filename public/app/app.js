import { mountRoom } from './room.js';

const flow = document.querySelector('#flow');
const dialog = document.querySelector('#dialog');

function readDemoContext() {
  try {
    return JSON.parse(sessionStorage.getItem('waia-room-demo-context')) || {};
  } catch {
    return {};
  }
}

const demoContext = readDemoContext();

const catalog = {
  clock: {
    title: 'Wall clock', icon: '◷',
    reason: 'A wall clock gives the empty wall above the sofa a focal point.',
    options: [
      ['Jomparis', 'Silent analog wall clock', 'B0CMX5HD16'],
      ['Bernhard Products', 'Classic analog wall clock', 'B01HONVHZ2'],
    ],
  },
  lamp: {
    title: 'Floor lamp', icon: '☼',
    reason: 'Soft light next to the sofa makes this corner a comfortable place to read.',
    options: [
      ['Brightech', 'Reading floor lamp', 'B0797FYNGF'],
      ['LEPOWER', 'Floor lamp with a fabric shade', 'B078YR2WYQ'],
    ],
  },
};

function shopPreview() {
  return `<div class="shop-image">
    <img src="./assets/room-after.webp" alt="Living room with a floor lamp and wall clock" width="1184" height="880">
    <button class="hotspot clock" data-product="clock" aria-label="See wall clock options">1</button>
    <button class="hotspot lamp" data-product="lamp" aria-label="See floor lamp options">2</button>
    <span class="image-tag">✦ &nbsp; SAMPLE DESIGN</span>
  </div>${productList()}`;
}

function productList() {
  return `<div class="product-list">
    <button data-product="clock"><span class="item-index">01</span><span><strong>Wall clock</strong><small>2 product options</small></span><span class="item-arrow">↗</span></button>
    <button data-product="lamp"><span class="item-index">02</span><span><strong>Floor lamp</strong><small>2 product options</small></span><span class="item-arrow">↗</span></button>
  </div>`;
}

function openProducts(id) {
  const item = catalog[id];
  const cards = item.options.map(([brand, name, asin]) => `<div class="product-card">
    <span class="choice-icon" aria-hidden="true">${item.icon}</span>
    <div><strong>${brand}</strong><small>${name}</small></div>
    <div class="product-actions">
      <a class="amazon-link" href="https://www.amazon.com/gp/aws/cart/add.html?ASIN.1=${asin}&amp;Quantity.1=1" target="_blank" rel="noopener noreferrer">Open Amazon cart ↗</a>
      <a class="product-detail" href="https://www.amazon.com/dp/${asin}" target="_blank" rel="noopener noreferrer">View product ↗</a>
    </div>
  </div>`).join('');
  dialog.innerHTML = `<button class="round dialog-close" data-close aria-label="Close">×</button>
    <span class="eyebrow"><span class="dot"></span> SIMILAR PRODUCTS</span>
    <h2 id="dialog-title">${item.title}</h2><p>${item.reason}</p>${cards}
    <p class="shopping-note">Links open on Amazon.com. Amazon may ask you to sign in to use your cart.</p>`;
  dialog.showModal();
}

function roomDemo() {
  return `<div class="demo-switch" role="group" aria-label="Living room before and after">
    <button data-view="before" aria-pressed="true" aria-controls="demo-before">Before</button>
    <button data-view="after" aria-pressed="false" aria-controls="demo-after">After</button>
  </div>
  <div id="demo-before" data-panel="before">
    <div class="shop-image">
      <img src="./assets/room-before.webp" alt="Living room with a bare wall and no floor lamp beside the sofa" width="1184" height="880">
      <span class="image-tag">LIVING ROOM · BEFORE</span>
    </div>
    <div class="hint"><span>✦</span><div><strong>Two additions can change this room.</strong><small>A clock for the bare wall and a reading lamp beside the sofa.</small></div></div>
  </div>
  <div id="demo-after" data-panel="after" hidden>${shopPreview()}</div>
  <div class="room-actions"><button class="primary demo-cta" data-view="after"><strong>Show the makeover</strong><span aria-hidden="true">→</span></button></div>`;
}

function showDemoView(view) {
  for (const tab of flow.querySelectorAll('.demo-switch button')) {
    tab.setAttribute('aria-pressed', String(tab.dataset.view === view));
  }
  for (const panel of flow.querySelectorAll('[data-panel]')) {
    panel.hidden = panel.dataset.panel !== view;
  }
  const cta = flow.querySelector('.demo-cta');
  cta.dataset.view = view === 'before' ? 'after' : 'before';
  cta.firstElementChild.textContent = view === 'before' ? 'Show the makeover' : 'See the original';
}

function appScreen() {
  const tabs = [
    ['design', 'Design', '⌂'],
    ['products', 'Products', '◇'],
    ['profile', 'Profile', '◉'],
  ];
  const navigation = tabs.map(([id, label, icon]) => `<button data-tab="${id}" aria-controls="app-${id}" aria-pressed="${id === 'design'}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('');
  return `<div class="flow-body app-body">
    <section id="app-design" data-app-panel="design">
      <header class="intro"><h1 tabindex="-1">Complete <em>your room.</em></h1><div class="ornament" aria-hidden="true">✦</div><p>Show us the room, tell us what you want, and shop the pieces.</p></header>
      <div id="room-design"></div>
    </section>
    <section id="app-products" data-app-panel="products" hidden>
      <header class="intro"><h1 tabindex="-1">Shop <em>the room.</em></h1><div class="ornament" aria-hidden="true">✦</div><p>Products for the pieces in your latest design.</p></header>
      <div id="room-products"></div>
      <div id="sample-products"><div class="hint"><span>✦</span><div><strong>No design yet.</strong><small>Here are picks from our sample room.</small></div></div>${productList()}</div>
    </section>
    <section id="app-profile" data-app-panel="profile" hidden>
      <header class="intro"><h1 tabindex="-1">Your profile</h1><div class="ornament" aria-hidden="true">✦</div></header>
      <div class="hint"><span>✦</span><div><strong id="plan-label">Free plan</strong><small id="plan-note"></small></div></div>
      <button class="primary" id="plan-upgrade" data-room="upgrade">Upgrade to Waia Plus <span>→</span></button>
      <ul class="summary-list" id="profile-preferences"></ul>
      <div id="room-profile"></div>
      <a class="quiet demo-link" href="../onboarding/">Back to setup</a>
    </section>
  </div><nav class="app-nav" aria-label="App tabs">${navigation}</nav>`;
}

function showAppTab(id) {
  for (const button of flow.querySelectorAll('[data-tab]')) {
    button.setAttribute('aria-pressed', String(button.dataset.tab === id));
  }
  for (const panel of flow.querySelectorAll('[data-app-panel]')) {
    panel.hidden = panel.dataset.appPanel !== id;
  }
  window.scrollTo(0, 0);
  flow.querySelector('[data-app-panel]:not([hidden]) h1').focus({ preventScroll: true });
}

flow.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.product) openProducts(button.dataset.product);
  if (button.dataset.view) showDemoView(button.dataset.view);
  if (button.dataset.tab) showAppTab(button.dataset.tab);
});

dialog.addEventListener('click', event => {
  if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
});

flow.innerHTML = appScreen();
const contextText = Array.isArray(demoContext.preferences)
  ? demoContext.preferences.map(item => `${item?.label}: ${item?.value}`).join('; ')
  : '';
mountRoom({
  flow,
  dialog,
  plan: demoContext.plan,
  context: contextText,
  showTab: showAppTab,
  panels: {
    design: document.querySelector('#room-design'),
    products: document.querySelector('#room-products'),
    sample: document.querySelector('#sample-products'),
    profile: document.querySelector('#room-profile'),
    plan: document.querySelector('#plan-label'),
    planNote: document.querySelector('#plan-note'),
    upgrade: document.querySelector('#plan-upgrade'),
  },
});
const preferenceList = document.querySelector('#profile-preferences');
if (Array.isArray(demoContext.preferences)) {
  for (const preference of demoContext.preferences) {
    if (typeof preference?.label !== 'string' || typeof preference.value !== 'string') continue;
    const item = document.createElement('li');
    const label = document.createElement('span');
    const value = document.createElement('strong');
    label.textContent = preference.label;
    value.textContent = preference.value;
    item.append(label, value);
    preferenceList.append(item);
  }
}
