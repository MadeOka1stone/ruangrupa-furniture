CREATE TABLE stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  order_id TEXT REFERENCES orders(id),
  change_qty INTEGER NOT NULL CHECK (change_qty != 0),
  stock_before INTEGER NOT NULL CHECK (stock_before >= 0),
  stock_after INTEGER NOT NULL CHECK (stock_after >= 0),
  reason TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movements_product_created
  ON stock_movements(product_id, created_at DESC);

CREATE INDEX idx_stock_movements_order
  ON stock_movements(order_id);
