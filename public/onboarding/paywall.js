import { annualPlanPrice } from '../app/billing.js';
import { CREDITS } from '../app/config.js';

const slides = [
  ['room-after.webp', 'Interior design', 'Living room styled with warm lighting and natural textures'],
  ['makeover-after.jpg', 'Home transformations', 'Renovated entryway with blue walls and patterned tiles'],
  ['bedroom.webp', 'Explore new styles', 'Bedroom with linen bedding and warm wood finishes'],
  ['styles.webp', 'Find your look', 'Four distinct living room styles'],
];

const plans = [
  ['lifetime', 'Lifetime', '$129.99', 'One-time payment'],
  ['annual', 'Yearly', '$39.99', 'Renews yearly'],
  ['monthly', 'Monthly', '$9.99', 'Renews monthly'],
];

export function paywallMarkup() {
  return `<section class="plus-paywall" aria-label="Dream Room Plus">
    <div class="plus-gallery" role="region" aria-label="Design examples">
      <div class="plus-slides" tabindex="0" aria-label="Scroll horizontally to see four design examples">
        ${slides.map(([image, title, alt]) => `<figure><img src="./assets/${image}" alt="${alt}"><figcaption>${title}</figcaption></figure>`).join('')}
      </div>
      <div class="plus-dots">${slides.map(([, title], index) => `<button type="button" aria-label="${title}" aria-current="${index === 0}"></button>`).join('')}</div>
    </div>
    <h3>What’s included</h3>
    <ul class="plus-benefits">
      <li>${CREDITS.annual} home transformations right away</li>
      <li>Access to all design features</li>
      <li>Explore different styles in your own room</li>
      <li>Shop product picks and save your favorite designs</li>
    </ul>
    <fieldset class="plus-plans">
      <legend class="sr-only">Dream Room Plus plan</legend>
      ${plans.map(([id, title, price, terms]) => `<label class="plus-plan">
        <input type="radio" name="plus-plan" value="${id}" disabled>
        <strong>${title}</strong><b data-price>${price}</b><small>${terms}</small><small data-availability>${id === 'annual' ? 'Checking availability…' : 'Demo preview'}</small>
      </label>`).join('')}
    </fieldset>
    <button type="button" class="primary plus-continue" disabled>Continue</button>
    <p class="plus-note">RevenueCat test checkout · No real charge</p>
    <p class="plus-status" role="status"></p>
  </section>`;
}

export async function mountPaywall(root, openCheckout) {
  const track = root.querySelector('.plus-slides');
  const dots = [...root.querySelectorAll('.plus-dots button')];
  dots.forEach((dot, index) => dot.addEventListener('click', () => {
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    track.scrollTo({ left: index * track.clientWidth, behavior });
  }));
  track.addEventListener('scroll', () => {
    const index = Math.round(track.scrollLeft / track.clientWidth);
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
  }, { passive: true });

  const button = root.querySelector('.plus-continue');
  const status = root.querySelector('.plus-status');
  const annual = root.querySelector('input[value="annual"]');
  const card = annual.closest('label');
  try {
    const price = await annualPlanPrice();
    card.querySelector('[data-price]').textContent = price;
    card.querySelector('[data-availability]').textContent = '';
    annual.disabled = false;
    annual.checked = true;
    button.disabled = false;
    button.addEventListener('click', () => {
      button.disabled = true;
      openCheckout();
    });
  } catch {
    card.querySelector('[data-availability]').textContent = 'Temporarily unavailable';
    status.textContent = 'Plans could not be loaded. You can still continue to the free demo.';
  }
}
