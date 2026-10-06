CREATE TABLE IF NOT EXISTS store_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO store_settings(setting_key,setting_value) VALUES
  ('storeName','RuangRupa'),
  ('tagline','Mebel modern untuk rumah Indonesia'),
  ('whatsapp',''),
  ('address','Alamat usaha belum ditentukan'),
  ('heroTitle','Ruang nyaman, dimulai dari pilihan yang tepat.'),
  ('heroText','Mebel dengan material jujur, bentuk yang tenang, dan kenyamanan untuk menemani keseharian Anda.'),
  ('primaryColor','#2c3a31'),
  ('logoUrl','');

PRAGMA optimize;
