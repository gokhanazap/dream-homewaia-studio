const flow = document.querySelector('#flow');

const steps = [
  { id: 'welcome', label: 'Welcome', title: 'AI Interior Design<br>&amp; Remodeling' },
  { id: 'goal', label: 'Goal', title: 'What would you like <em>to change?</em>', desc: 'Choose the option that fits your project.', choices: [['✦', 'Refresh my current room', 'Mevcut odamı yenilemek'], ['⌂', 'Furnish an empty room', 'Boş bir odayı dekore etmek'], ['◷', 'Find the finishing touches', 'Eksik parçaları tamamlamak'], ['◇', 'Explore new ideas', 'Yeni fikirler keşfetmek']] },
  { id: 'room', label: 'Room', title: 'Which room are <em>you designing?</em>', desc: 'Choose a room to start with.', layout: 'tiles', choices: [['▰', 'Living room', 'Salon'], ['▥', 'Bedroom', 'Yatak odası'], ['◫', 'Kitchen', 'Mutfak'], ['◩', 'Dining room', 'Yemek odası'], ['▤', 'Home office', 'Çalışma odası'], ['＋', 'Other', 'Diğer']] },
  { id: 'mood', label: 'Mood', title: 'How should your room <em>feel?</em>', desc: 'Choose how you want to feel when you walk in.', choices: [['☼', 'Warm and cozy', 'Sıcak ve rahat'], ['✧', 'Elegant and refined', 'Şık ve zarif'], ['◈', 'Colorful and creative', 'Renkli ve yaratıcı'], ['≈', 'Calm and airy', 'Sakin ve ferah'], ['♡', 'Relaxed and inviting', 'Samimi ve davetkâr']] },
  { id: 'challenge', label: 'Priorities', title: 'What would <em>help most?</em>', desc: 'Select all that apply.', multiple: true, choices: [['$', 'Options within my budget', 'Bütçeme uygun seçenekler'], ['◷', 'Ideas for bare walls', 'Boş duvarlar için fikir'], ['☼', 'Better lighting', 'Daha iyi aydınlatma'], ['◫', 'See pieces in my room first', 'Eşyaları odamda önceden görmek'], ['✦', 'Pieces that work together', 'Birbiriyle uyumlu parçalar']] },
  { id: 'style', label: 'Style', title: 'What’s <em>your style?</em>', desc: 'Choose a style for your first design.', layout: 'styles', choices: [['01', 'Minimalist'], ['02', 'Modern'], ['03', 'Bohemian', 'Bohem'], ['04', 'Traditional', 'Klasik']] },
  { id: 'before-after', label: 'Shoppable preview', title: 'See it in the room. <em>Shop the same piece.</em>', desc: 'Slide to see a real Amazon wall clock on the blank wall. The product below is the one shown in the preview.' },
  { id: 'paywall', label: 'Waia Plus', title: 'More ideas <em>for your space.</em>', desc: 'Explore more design ideas for every corner with Waia Plus.' },
];

const storageKey = 'waia-room-answers-v1';
function readAnswers() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    if (saved && typeof saved === 'object') {
      return Object.fromEntries(steps.filter(step => step.choices).map(step => {
        const values = Array.isArray(saved[step.id]) ? saved[step.id] : [];
        // The optional third tuple value is the label saved by the previous Turkish build.
        const valid = values.map(value => step.choices.find(([, label, legacyLabel]) =>
          label === value || legacyLabel === value)?.[1]).filter(Boolean);
        return [step.id, [...new Set(valid)].slice(0, step.multiple ? undefined : 1)];
      }));
    }
  } catch {}
  return {};
}

let answers = readAnswers();
const plans = {
  weekly: { label: 'Weekly', access: '1 week of access', price: '$9.99', period: 'week' },
  annual: { label: 'Yearly', access: '12 months of access', price: '$39.99', period: 'year' },
};
let plan = 'annual';
let index = 0;

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
  if (step.id === 'welcome') return '';
  if (step.id === 'paywall') return '<div class="toolbar paywall-toolbar"><button data-action="open-app" class="round" aria-label="Close plan selection">×</button></div>';
  const count = steps.findIndex(item => item.id === 'paywall') - 1;
  const bars = Array.from({ length: count }, (_, n) => '<span class="' + (n + 1 < index ? 'done' : n + 1 === index ? 'current' : '') + '"></span>').join('');
  return '<div class="toolbar"><button class="round" data-action="back" aria-label="Back">←</button><div class="steps" aria-label="Step ' + index + ' / ' + count + '">' + bars + '</div><button class="quiet" data-action="skip">Skip</button></div>';
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

function preview() {
  const clockImage = './bernhard-wall-clock.jpg';
  return `<div class="compare" style="--split: 48%">
    <img src="./assets/room-before.webp" alt="Sample living room" width="1184" height="880">
    <img class="preview-clock" src="${clockImage}" alt="Bernhard Products wall clock placed above the sofa" width="357" height="355">
    <img class="compare-before" src="./assets/room-before.webp" alt="Living room before the makeover" width="1184" height="880">
    <span class="image-tag compare-left">BEFORE</span><span class="image-tag compare-right">AFTER</span>
    <span class="compare-line"><span>‹ ›</span></span>
    <input type="range" min="0" max="100" value="48" aria-label="Compare the room with and without the wall clock">
  </div>
  <div class="preview-product">
    <img src="${clockImage}" alt="" width="48" height="48">
    <div><span class="eyebrow">PRODUCT SHOWN</span><strong>Bernhard Products Wall Clock</strong><small>10-inch black frame · Amazon.com</small></div>
    <a href="https://www.amazon.com/dp/B01HONVHZ2" target="_blank" rel="noopener noreferrer">View on Amazon ↗</a>
  </div>`;
}

function paywall() {
  const cards = Object.entries(plans).map(([id, option]) => `
    <label class="plan"><input type="radio" name="plan" value="${id}" ${plan === id ? 'checked' : ''}><span class="plan-radio"></span><span><strong>${option.label}</strong><small>${option.access}</small></span><span class="plan-price">${option.price}<small>/ ${option.period}</small></span></label>`).join('');
  return `<div class="paywall-image"><img src="./assets/bedroom.webp" alt="Bedroom with linen bedding and warm wood finishes" width="1024" height="640"><span class="image-tag">WAIA PLUS</span></div>
  <ul class="benefits"><li><span>✦</span> More designs</li><li><span>◫</span> More styles</li><li><span>◈</span> Product picks</li></ul>
  <fieldset class="plans"><legend class="sr-only">Subscription plan</legend>${cards}</fieldset><p class="demo-note">Demo pricing · No charge</p>`;
}

function preferences() {
  return steps.flatMap(step => (answers[step.id] || []).map(value => ({ label: step.label, value })));
}

function openApp(chosenPlan) {
  try {
    sessionStorage.setItem('waia-room-demo-context', JSON.stringify({
      plan: chosenPlan,
      preferences: preferences(),
    }));
  } catch {}
  window.location.assign('../app/');
}

function content(step) {
  if (step.choices) return choices(step);
  switch (step.id) {
    case 'welcome': return `<div class="compare makeover" style="--split: 50%">
      <img src="./assets/makeover-after.jpg" alt="Renovated entryway with blue walls and patterned tiles" width="832" height="1248" fetchpriority="high">
      <div class="makeover-prices" role="group" aria-label="Illustrative product prices">
        <span class="makeover-price pendant-price"><span class="sr-only">Pendant light, </span>$47</span>
        <span class="makeover-price bench-price"><span class="sr-only">Entryway bench, </span>$78</span>
      </div>
      <img class="compare-before" src="./assets/makeover-before.jpg" alt="The same entryway before renovation, with peeling plaster and a bare floor" width="768" height="1152" fetchpriority="high">
      <span class="image-tag compare-left">Before</span><span class="image-tag compare-right">After</span>
      <span class="compare-line" aria-hidden="true"><span>‹ ›</span></span>
      <input type="range" min="0" max="100" value="50" aria-label="Compare the entryway before and after renovation">
    </div>`;
    case 'before-after': return preview();
    case 'paywall': return paywall();
    default: return '';
  }
}

function actions(step) {
  if (step.id === 'paywall') return '<div class="actions"><button class="primary" data-action="select-plan">Continue</button><button class="quiet footer-skip" data-action="open-app">Continue to free demo</button></div>';
  const disabled = step.choices && !answers[step.id]?.length ? 'disabled' : '';
  const note = step.choices ? '<p class="action-note">✧ &nbsp; You can change your choices anytime.</p>' : '';
  return `<div class="actions"><button class="primary" data-action="next" ${disabled}>Continue</button>
    ${note}</div>`;
}

function updateSplit(slider) {
  slider.closest('.compare').style.setProperty('--split', slider.value + '%');
}

function animateMakeover() {
  const slider = flow.querySelector('.makeover input');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const start = performance.now();
  let frame;

  function tick(now) {
    if (!slider.isConnected || motion.matches) return;
    slider.value = 50 + 32 * Math.sin((now - start) * Math.PI / 2200);
    updateSplit(slider);
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(frame);
  }

  slider.addEventListener('pointerdown', stop);
  slider.addEventListener('focus', stop);
  if (!motion.matches) frame = requestAnimationFrame(tick);
}

function render() {
  const step = steps[index];
  flow.dataset.step = step.id;
  flow.innerHTML = `<div class="flow-body">
      <header class="intro"><h1 tabindex="-1">${step.title}</h1>${step.desc ? `<p>${step.desc}</p>` : ''}</header>
      ${toolbar(step)}
      ${content(step)}
    </div>${actions(step)}`;
  if (step.id === 'welcome') animateMakeover();
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
  if (event.target.type === 'range') updateSplit(event.target);
});

flow.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  switch (button.dataset.action) {
    case 'back': go(index - 1); break;
    case 'next': go(index + 1); break;
    case 'skip':
      delete answers[steps[index].id];
      saveAnswers();
      go(index + 1);
      break;
    case 'select-plan': openApp(plan); break;
    case 'open-app': openApp(null); break;
  }
});

render();
