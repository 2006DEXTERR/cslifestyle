// Deterministic number / price formatting.
//
// `Number.prototype.toLocaleString()` and `new Intl.NumberFormat()` *without an
// explicit locale* fall back to the runtime's default locale, which differs
// between the Node server (often resolves Indian grouping → "1,34,900") and the
// browser (often "134,900"). Rendering that during SSR causes React hydration
// mismatches. These shared formatters pin an EXPLICIT 'en-IN' locale, so the
// server and client always produce byte-identical output.

const inrNumber = new Intl.NumberFormat('en-IN');
const inrCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const inrDate = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

/** Indian digit grouping, no currency symbol (e.g. 134900 → "1,34,900"). */
export function formatNumber(value: number): string {
  return inrNumber.format(value);
}

/** INR price with the ₹ symbol (e.g. 134900 → "₹1,34,900"). */
export function formatPrice(value: number): string {
  return inrCurrency.format(value);
}

/**
 * Deterministic date (explicit 'en-IN' locale → identical on server and client,
 * e.g. "15 Jan 2024"). Accepts a Date, ISO string, or epoch ms; '' for invalid.
 */
export function formatDate(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return inrDate.format(d);
}
