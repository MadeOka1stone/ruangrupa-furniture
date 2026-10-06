ALTER TABLE orders ADD COLUMN fulfillment_status TEXT NOT NULL DEFAULT 'waiting';
ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN admin_note TEXT;
ALTER TABLE orders ADD COLUMN shipped_at TEXT;
ALTER TABLE orders ADD COLUMN completed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status
ON orders(fulfillment_status);

PRAGMA optimize;
