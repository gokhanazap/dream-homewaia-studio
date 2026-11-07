import { ENTITLEMENT, RC_PUBLIC_KEY } from './config.js';

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@revenuecat/purchases-js@1.74.0/dist/Purchases.es.js';
const USER_KEY = 'waia-user-id';

let sdkPromise;

function loadSdk() {
  sdkPromise ??= import(SDK_URL);
  return sdkPromise;
}

async function client() {
  const { Purchases } = await loadSdk();
  if (Purchases.isConfigured()) return Purchases.getSharedInstance();
  let appUserId = null;
  try { appUserId = localStorage.getItem(USER_KEY); } catch {}
  if (!appUserId) {
    appUserId = Purchases.generateRevenueCatAnonymousAppUserId();
    try { localStorage.setItem(USER_KEY, appUserId); } catch {}
  }
  return Purchases.configure({ apiKey: RC_PUBLIC_KEY, appUserId });
}

function usd(rcPackage) {
  const { amountMicros, currency } = rcPackage.webBillingProduct.price;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountMicros / 1_000_000);
}

export async function isPro() {
  try {
    return await (await client()).isEntitledTo(ENTITLEMENT);
  } catch {
    return false;
  }
}

export async function annualPlanPrice() {
  const { annual } = await packages();
  return usd(annual);
}

async function packages() {
  const offering = (await (await client()).getOfferings({ currency: 'USD' })).current;
  if (!offering?.weekly || !offering?.annual || !offering?.lifetime) throw new Error('Plans are not available.');
  // The one-time credit pack sits in the offering's lifetime slot.
  return { weekly: offering.weekly, annual: offering.annual, pack: offering.lifetime };
}

// Prices shown on the paywall come from RevenueCat so they always match checkout.
export async function planPrices() {
  const { weekly, annual, pack } = await packages();
  return { weekly: usd(weekly), annual: usd(annual), pack: usd(pack) };
}

// Returns true when the purchase completes, false when the customer cancels.
export async function buyPlan(plan) {
  const { ErrorCode, PurchasesError } = await loadSdk();
  const purchases = await client();
  const rcPackage = (await packages())[plan];
  try {
    await purchases.purchase({ rcPackage });
  } catch (error) {
    if (error instanceof PurchasesError && error.errorCode === ErrorCode.UserCancelledError) return false;
    throw error;
  }
  return true;
}
