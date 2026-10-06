CREATE TABLE promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK(discount_type IN ('percent','fixed')),
  discount_value INTEGER NOT NULL CHECK(discount_value > 0),
  max_discount INTEGER CHECK(max_discount IS NULL OR max_discount >= 0),
  min_purchase INTEGER NOT NULL DEFAULT 0 CHECK(min_purchase >= 0),
  starts_at TEXT,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE orders ADD COLUMN voucher_code TEXT;

CREATE INDEX idx_promotions_code_active
ON promotions(code, is_active);

INSERT INTO promotions(code,name,discount_type,discount_value,max_discount,min_purchase,is_active)
VALUES('RUANG10','Voucher perkenalan','percent',10,500000,0,1);
