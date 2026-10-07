ALTER TABLE products ADD COLUMN color_options TEXT NOT NULL DEFAULT '[]';
ALTER TABLE order_items ADD COLUMN color_name TEXT;
UPDATE products SET color_options = CASE id
WHEN 1 THEN '[{"name":"Krem","hex":"#e7ded0"},{"name":"Cokelat","hex":"#9b7a5b"},{"name":"Hijau","hex":"#516052"}]'
WHEN 2 THEN '[{"name":"Hijau tua","hex":"#334239"},{"name":"Cokelat","hex":"#9a6844"},{"name":"Natural","hex":"#d2b48c"}]'
WHEN 3 THEN '[{"name":"Cokelat tua","hex":"#815336"},{"name":"Cokelat muda","hex":"#a87952"}]'
WHEN 4 THEN '[{"name":"Cokelat tua","hex":"#74472d"},{"name":"Cokelat muda","hex":"#9b7454"}]'
WHEN 5 THEN '[{"name":"Abu muda","hex":"#c9c6bd"},{"name":"Abu tua","hex":"#837f75"},{"name":"Terakota","hex":"#b77958"}]'
WHEN 6 THEN '[{"name":"Natural","hex":"#8a5a3b"},{"name":"Cokelat tua","hex":"#68432c"}]'
WHEN 7 THEN '[{"name":"Cokelat","hex":"#a47b58"},{"name":"Krem","hex":"#d7c5b1"}]'
WHEN 8 THEN '[{"name":"Krem","hex":"#efe8dc"},{"name":"Cokelat tua","hex":"#5a5047"}]'
ELSE '[]' END WHERE id BETWEEN 1 AND 8;
