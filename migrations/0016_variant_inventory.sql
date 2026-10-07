ALTER TABLE products ADD COLUMN variant_stock INTEGER NOT NULL DEFAULT 0 CHECK(variant_stock IN (0,1));
ALTER TABLE products ADD COLUMN inventory_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE product_variants (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 product_id INTEGER NOT NULL REFERENCES products(id),
 name TEXT NOT NULL,
 hex TEXT NOT NULL,
 image_url TEXT,
 stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
 is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))
);
CREATE INDEX idx_product_variants_active ON product_variants(product_id,is_active);
ALTER TABLE order_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id);
CREATE TABLE inventory_checks (
 id TEXT PRIMARY KEY,
 valid INTEGER NOT NULL CHECK(valid = 1)
);
