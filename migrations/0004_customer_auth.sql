ALTER TABLE customers ADD COLUMN password_salt TEXT;
ALTER TABLE customers ADD COLUMN password_hash TEXT;
ALTER TABLE customers ADD COLUMN last_login_at TEXT;

PRAGMA optimize;
