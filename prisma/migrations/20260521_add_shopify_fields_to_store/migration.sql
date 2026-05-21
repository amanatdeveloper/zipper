ALTER TABLE "Store"
  ADD COLUMN IF NOT EXISTS "platform" TEXT NOT NULL DEFAULT 'woocommerce',
  ADD COLUMN IF NOT EXISTS "shopifyShopDomain" TEXT,
  ADD COLUMN IF NOT EXISTS "shopifyAccessToken" TEXT;
