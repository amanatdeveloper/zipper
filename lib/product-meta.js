const PRODUCT_META_IDENTIFIER = 'ProductMeta';

export function normalizeSku(sku) {
  if (!sku || typeof sku !== 'string') {
    return '';
  }

  return sku.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function sanitizeFloatValue(value, fallback = 0) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.max(0, Math.round(parsedValue * 100) / 100);
}

export function sanitizeIntValue(value, fallback = 0) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.max(0, Math.round(parsedValue));
}

export function isMissingProductMetaStorage(error) {
  const message = String(error?.message || '');
  const table = String(error?.meta?.table || '');
  const column = String(error?.meta?.column || '');

  return (
    (error?.code === 'P2021' && (table.includes(PRODUCT_META_IDENTIFIER) || message.includes(PRODUCT_META_IDENTIFIER))) ||
    (error?.code === 'P2022' && (column.includes(PRODUCT_META_IDENTIFIER) || message.includes(PRODUCT_META_IDENTIFIER)))
  );
}
