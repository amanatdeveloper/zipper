// Shared helpers for Google Ads customer IDs. Safe to import from client
// components because this module has no server-only dependencies.

export function normalizeCustomerId(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

export function formatCustomerId(value) {
  const digits = normalizeCustomerId(value);

  if (digits.length !== 10) {
    return digits;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
