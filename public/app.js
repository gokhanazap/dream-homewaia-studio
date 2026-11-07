const flow = document.querySelector('#flow');
const dialog = document.querySelector('#dialog');

const steps = [
  { id: 'welcome', label: 'Başlangıç', title: 'Odanın potansiyelini <em>gör.</em>', desc: 'Bir fotoğrafla odanı yeniden tasarla. Görünümü tamamlayan parçaları keşfet.', next: 'Başlayalım' },
  { id: 'goal', label: 'Hedefin', title: 'Neyi <em>değiştirmek</em> istersin?', desc: 'Sana en uygun başlangıç noktasını seç.', choices: [['✦', 'Mevcut odamı yenilemek'], ['⌂', 'Boş bir odayı dekore etmek'], ['◷', 'Eksik parçaları tamamlamak'], ['◇', 'Yeni fikirler keşfetmek']] },
  { id: 'room', label: 'Odan', title: 'Hangi odayı <em>tasarlayalım?</em>', desc: 'Başlamak istediğin alanı seç.', layout: 'tiles', choices: [['▰', 'Salon'], ['▥', 'Yatak odası'], ['◫', 'Mutfak'], ['◩', 'Yemek odası'], ['▤', 'Çalışma odası'], ['＋', 'Diğer']] },
  { id: 'before-after', label: 'Dönüşüm', title: 'Aynı oda. <em>Yeni bir his.</em>', desc: 'Kaydırarak küçük dokunuşların odayı nasıl değiştirdiğini gör.' },
  { id: 'mood', label: 'Havası', title: 'Odan nasıl <em>hissettirsin?</em>', desc: 'Odaya girdiğinde hissetmek istediğin havayı seç.', choices: [['☼', 'Sıcak ve rahat'], ['✧', 'Şık ve zarif'], ['◈', 'Renkli ve yaratıcı'], ['≈', 'Sakin ve ferah'], ['♡', 'Samimi ve davetkâr']] },
  { id: 'challenge', label: 'İhtiyacın', title: 'En çok neye <em>ihtiyacın var?</em>', desc: 'Birden fazla seçenek işaretleyebilirsin.', multiple: true, choices: [['₺', 'Bütçeme uygun seçenekler'], ['◷', 'Boş duvarlar için fikir'], ['☼', 'Daha iyi aydınlatma'], ['◫', 'Eşyaları odamda önceden görmek'], ['✦', 'Birbiriyle uyumlu parçalar']] },
  { id: 'style', label: 'Tarzın', title: 'Hangi tarz <em>sana yakın?</em>', desc: 'İlk tasarımın için bir stil seç.', layout: 'styles', choices: [['01', 'Minimalist'], ['02', 'Modern'], ['03', 'Bohem'], ['04', 'Klasik']] },
  { id: 'shop', label: 'Parçaları keşfet', title: 'Eksik parçaları <em>tamamla.</em>', desc: 'Boş duvara bir saat, karanlık köşeye bir lamba. Görseldeki işaretlere dokun, benzer ürünleri keşfet.', next: 'Devam et' },
  { id: 'ready', label: 'Özet', title: 'Tercihlerin <em>hazır.</em>', desc: 'Seçimlerine göz at, ardından örnek oda demosuna geç.', next: 'Planları gör' },
  { id: 'paywall', label: 'Waia Plus', title: 'Odan için <em>daha fazla fikir.</em>', desc: 'Waia Plus ile her köşe için farklı bir tasarım keşfet.' },
  { id: 'demo', label: 'Oda demosu', title: 'Bu salonu <em>tamamla.</em>', desc: 'Bu örnekte boş duvarı bir saatle, loş köşeyi bir lambayla tamamlayalım.' },
];

const storageKey = 'waia-room-answers-v1';
function readAnswers() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    if (saved && typeof saved === 'object') {
      return Object.fromEntries(steps.filter(step => step.choices).map(step => {
        const values = Array.isArray(saved[step.id]) ? saved[step.id] : [];
        const valid = values.filter(value => step.choices.some(([, label]) => label === value));
        return [step.id, [...new Set(valid)].slice(0, step.multiple ? undefined : 1)];
      }));
    }
  } catch {}
  return {};
}

let answers = readAnswers();
let plan = 'annual';
const demoIndex = steps.length - 1;
let index = new URLSearchParams(window.location.search).has('demo') ? demoIndex : 0;

function updateAnswer(step, value, selected) {
  const values = answers[step.id] || [];
  answers[step.id] = step.multiple
    ? selected ? [...values, value] : values.filter(option => option !== value)
    : [value];
  saveAnswers();
}

function saveAnswers() {
  try { sessionStorage.setItem(storageKey, JSON.stringify(answers)); } catch {}
}

function go(next) {
  index = Math.max(0, Math.min(next, steps.length - 1));
  render();
  window.scrollTo(0, 0);
  flow.querySelector('h1').focus({ preventScroll: true });
}

function toolbar(step) {
  if (step.id === 'welcome') return '<div class="toolbar welcome-toolbar"><span class="eyebrow"><span class="dot"></span> YAPAY ZEKÂ İLE İÇ TASARIM</span><button data-action="skip-all" class="quiet">Atla</button></div>';
  if (step.id === 'demo') return '<div class="toolbar"><span class="eyebrow"><span class="dot"></span> ÖRNEK TASARIM</span><a href="./" class="quiet">Onboarding’e dön</a></div>';
  if (step.id === 'paywall') return '<div class="toolbar"><span class="eyebrow"><span class="dot"></span> WAIA PLUS</span><button data-action="next" class="round" aria-label="Paywall ekranını kapat">×</button></div>';
  const count = steps.findIndex(item => item.id === 'paywall') - 1;
  const bars = Array.from({ length: count }, (_, n) => '<span class="' + (n + 1 < index ? 'done' : n + 1 === index ? 'current' : '') + '"></span>').join('');
  return '<div class="toolbar"><button class="round" data-action="back" aria-label="Geri">←</button><div class="steps" aria-label="Adım ' + index + ' / ' + count + '">' + bars + '</div><button class="quiet" data-action="skip">Atla</button></div>';
}

function choices(step) {
  const type = step.multiple ? 'checkbox' : 'radio';
  const selected = answers[step.id] || [];
  const options = step.choices.map(([icon, label], i) => `
    <label class="choice">
      <input type="${type}" name="${step.id}" value="${label}" ${selected.includes(label) ? 'checked' : ''}>
      ${step.layout === 'styles' ? `<span class="style-image style-${i}"></span>` : `<span class="choice-icon" aria-hidden="true">${icon}</span>`}
      <span class="choice-label">${label}</span><span class="choice-check" aria-hidden="true"></span>
    </label>`).join('');
  return `<fieldset class="choices ${step.layout || 'list'}"><legend class="sr-only">${step.label}</legend>${options}</fieldset>`;
}

const catalog = {
  clock: {
    title: 'Duvar saati', icon: '◷',
    reason: 'Koltuk üzerindeki boş duvara işlevsel bir odak noktası.',
    options: [
      ['Jomparis', 'Sessiz analog duvar saati', 'B0CMX5HD16'],
      ['Bernhard Products', 'Klasik analog duvar saati', 'B01HONVHZ2'],
    ],
  },
  lamp: {
    title: 'Köşe aydınlatması', icon: '☼',
    reason: 'Koltuk yanına yumuşak ışık ekleyip bir okuma köşesi oluşturur.',
    options: [
      ['Brightech', 'Ayaklı okuma lambası', 'B0797FYNGF'],
      ['LEPOWER', 'Kumaş şapkalı ayaklı lamba', 'B078YR2WYQ'],
    ],
  },
};

function shopPreview() {
  return `<div class="shop-image">
    <img src="./assets/room-after.webp" alt="Köşesinde lamba ve duvarında saat olan salon" width="1184" height="880">
    <button class="hotspot clock" data-product="clock" aria-label="Duvar saati seçeneklerini aç">1</button>
    <button class="hotspot lamp" data-product="lamp" aria-label="Aydınlatma seçeneklerini aç">2</button>
    <span class="image-tag">✦ &nbsp; ÖRNEK TASARIM</span>
  </div>
  <div class="product-list">
    <button data-product="clock"><span class="item-index">01</span><span><strong>Duvar saati</strong><small>2 ürün seçeneği</small></span><span class="item-arrow">↗</span></button>
    <button data-product="lamp"><span class="item-index">02</span><span><strong>Köşe lambası</strong><small>2 ürün seçeneği</small></span><span class="item-arrow">↗</span></button>
  </div>`;
}

function openProducts(id) {
  const item = catalog[id];
  const cards = item.options.map(([brand, name, asin]) => `<div class="product-card">
    <span class="choice-icon" aria-hidden="true">${item.icon}</span>
    <div><strong>${brand}</strong><small>${name}</small></div>
    <div class="product-actions">
      <a class="amazon-link" href="https://www.amazon.com/gp/aws/cart/add.html?ASIN.1=${asin}&amp;Quantity.1=1" target="_blank" rel="noopener noreferrer">Sepete git ↗</a>
      <a class="product-detail" href="https://www.amazon.com/dp/${asin}" target="_blank" rel="noopener noreferrer">Ürünü gör ↗</a>
    </div>
  </div>`).join('');
  dialog.innerHTML = `<button class="round dialog-close" data-close aria-label="Kapat">×</button>
    <span class="eyebrow"><span class="dot"></span> BENZER ÜRÜNLER</span>
    <h2 id="dialog-title">${item.title}</h2><p>${item.reason}</p>${cards}
    <p class="shopping-note">Bağlantılar Amazon.com’da açılır. Sepet için Amazon oturumu gerekebilir.</p>`;
  dialog.showModal();
}

function preview() {
  return `<div class="compare" style="--split: 48%">
    <img src="./assets/room-after.webp" alt="Salonun yenilenmiş hâli" width="1184" height="880">
    <img class="compare-before" src="./assets/room-before.webp" alt="Salonun ilk hâli" width="1184" height="880">
    <span class="image-tag compare-left">ÖNCE</span><span class="image-tag compare-right">SONRA</span>
    <span class="compare-line"><span>‹ ›</span></span>
    <input type="range" min="0" max="100" value="48" aria-label="Önce ve sonra görselini karşılaştır">
  </div><div class="hint"><span>✦</span> Bu örnekte mevcut mobilyalar korunup duvar ve ışık tamamlandı.</div>`;
}

function demo() {
  return `<div class="demo-switch" role="group" aria-label="Salonun önce ve sonra hâli">
    <button data-view="before" aria-pressed="true" aria-controls="demo-before">Önce</button>
    <button data-view="after" aria-pressed="false" aria-controls="demo-after">Sonra</button>
  </div>
  <div id="demo-before" data-panel="before">
    <div class="shop-image">
      <img src="./assets/room-before.webp" alt="Duvarı boş ve koltuk yanında lamba olmayan örnek salon" width="1184" height="880">
      <span class="image-tag">SALON · ÖNCE</span>
    </div>
    <div class="hint"><span>✦</span><div><strong>Bu odaya iki dokunuş yeter.</strong><small>Boş duvara saat, koltuğun yanına bir okuma lambası.</small></div></div>
  </div>
  <div id="demo-after" data-panel="after" hidden>${shopPreview()}</div>`;
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
  cta.firstElementChild.textContent = view === 'before' ? 'Dönüşümü göster' : 'İlk hâline dön';
}

function paywall() {
  return `<div class="paywall-image"><img src="./assets/bedroom.webp" alt="Keten ve ahşap tonlarında yatak odası" width="1024" height="640"><span class="image-tag">WAIA PLUS</span></div>
  <ul class="benefits"><li><span>✦</span> Daha fazla tasarım</li><li><span>◫</span> Alternatif stiller</li><li><span>◈</span> Ürün seçenekleri</li></ul>
  <fieldset class="plans"><legend class="sr-only">Üyelik planı</legend>
    <label class="plan"><input type="radio" name="plan" value="annual" ${plan === 'annual' ? 'checked' : ''}><span class="plan-radio"></span><span><strong>Yıllık</strong><small>12 aylık erişim</small></span><span class="plan-price">₺999,99<small>/ yıl</small></span></label>
    <label class="plan"><input type="radio" name="plan" value="monthly" ${plan === 'monthly' ? 'checked' : ''}><span class="plan-radio"></span><span><strong>Aylık</strong><small>1 aylık erişim</small></span><span class="plan-price">₺149,99<small>/ ay</small></span></label>
  </fieldset><p class="demo-note">Demo fiyatları · Ödeme alınmaz</p>`;
}

function summary() {
  const selected = steps.flatMap(step => (answers[step.id] || []).map(answer => `<li><span>${step.label}</span><strong>${answer}</strong></li>`));
  return `<div class="summary-art"><img src="./assets/mark.svg" alt="" width="58" height="58"></div>` +
    (selected.length ? `<ul class="summary-list">${selected.join('')}</ul>` : '<div class="hint">Tercih belirtmeden devam edebilirsin.</div>');
}

function content(step) {
  if (step.choices) return choices(step);
  switch (step.id) {
    case 'welcome': return `<div class="welcome-image"><img src="./assets/room-after.webp" alt="Duvar saati ve aydınlatmayla tamamlanan salon" width="1184" height="880"><span class="image-tag">✦ &nbsp; WAIA İLE TASARLANDI</span></div><div class="hint"><span>◷</span><div><strong>Gör, dokun, keşfet</strong><small>Saat, lamba ve daha fazlası için alışveriş seçenekleri.</small></div></div>`;
    case 'before-after': return preview();
    case 'shop': return shopPreview();
    case 'demo': return demo();
    case 'ready': return summary();
    case 'paywall': return paywall();
    default: return '';
  }
}

function actions(step) {
  if (step.id === 'demo') return '<div class="actions"><button class="primary demo-cta" data-view="after"><strong>Dönüşümü göster</strong><span aria-hidden="true">→</span></button></div>';
  if (step.id === 'paywall') return '<div class="actions"><button class="primary" data-action="preview-plan">Planı seç <span>→</span></button><button class="quiet footer-skip" data-action="next">Ücretsiz demoya devam et</button></div>';
  const disabled = step.choices && !answers[step.id]?.length ? 'disabled' : '';
  return `<div class="actions"><button class="primary" data-action="next" ${disabled}>${step.next || 'Devam et'} <span>→</span></button>
    ${step.id === 'welcome' ? '<a class="quiet footer-skip demo-link" href="?demo">Örnek odayı dene</a>' : '<p class="action-note">✧ &nbsp; Seçimlerini dilediğin zaman değiştirebilirsin.</p>'}</div>`;
}

function render() {
  const step = steps[index];
  flow.dataset.step = step.id;
  flow.innerHTML = `${toolbar(step)}
    <div class="flow-body">
      <header class="intro"><h1 tabindex="-1">${step.title}</h1><div class="ornament" aria-hidden="true">✦</div><p>${step.desc}</p></header>
      ${content(step)}
    </div>${actions(step)}`;
}

flow.addEventListener('change', event => {
  const step = steps[index];
  const input = event.target;
  if (input.name === 'plan') {
    plan = input.value;
  } else if (step.choices && input.name === step.id) {
    updateAnswer(step, input.value, input.checked);
    flow.querySelector('.primary').disabled = !answers[step.id].length;
  }
});

flow.addEventListener('input', event => {
  if (event.target.type === 'range') event.target.closest('.compare').style.setProperty('--split', event.target.value + '%');
});

flow.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.product) openProducts(button.dataset.product);
  if (button.dataset.view) showDemoView(button.dataset.view);
  switch (button.dataset.action) {
    case 'back': go(index - 1); break;
    case 'next': go(index + 1); break;
    case 'skip':
      delete answers[steps[index].id];
      saveAnswers();
      go(index + 1);
      break;
    case 'skip-all': go(steps.findIndex(step => step.id === 'paywall')); break;
    case 'preview-plan':
      dialog.innerHTML = `<button class="round dialog-close" data-close aria-label="Kapat">×</button>
        <span class="eyebrow"><span class="dot"></span> HACKATHON DEMOSU</span>
        <h2 id="dialog-title">${plan === 'annual' ? 'Yıllık' : 'Aylık'} plan seçildi</h2>
        <p>Bu ekran ödeme almadan üyelik akışını gösterir.</p>
        <button class="primary" data-finish>Demoyu aç <span>→</span></button>`;
      dialog.showModal();
      break;
  }
});

dialog.addEventListener('click', event => {
  if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
  if (event.target.closest('[data-finish]')) {
    dialog.close();
    go(demoIndex);
  }
});

render();
