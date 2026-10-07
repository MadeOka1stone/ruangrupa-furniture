CREATE TABLE product_reviews (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 product_id INTEGER NOT NULL REFERENCES products(id),
 customer_id INTEGER NOT NULL REFERENCES customers(id),
 order_id TEXT NOT NULL REFERENCES orders(id),
 rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment TEXT NOT NULL CHECK(length(comment) BETWEEN 5 AND 1000),
 is_hidden INTEGER NOT NULL DEFAULT 0 CHECK(is_hidden IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(product_id,customer_id)
);
CREATE INDEX idx_reviews_product_visible ON product_reviews(product_id,is_hidden,created_at);
