INSERT INTO stock_movements (
  product_id,
  change_qty,
  stock_before,
  stock_after,
  reason,
  note
)
SELECT
  p.id,
  p.stock,
  0,
  p.stock,
  'inventory_baseline',
  'Saldo stok saat fitur riwayat diaktifkan'
FROM products p
WHERE p.stock > 0
  AND NOT EXISTS (
    SELECT 1 FROM stock_movements sm WHERE sm.product_id = p.id
  );
