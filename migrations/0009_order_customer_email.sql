ALTER TABLE orders ADD COLUMN customer_email TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email
ON orders(customer_email);
