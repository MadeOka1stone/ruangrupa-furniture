CREATE TABLE admin_accounts (
 id INTEGER PRIMARY KEY CHECK(id=1),
 email TEXT NOT NULL UNIQUE,
 password_salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 session_version INTEGER NOT NULL DEFAULT 1,
 last_login_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE admin_rate_limits (
 key TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL DEFAULT 1,
 expires_at INTEGER NOT NULL
);
CREATE TABLE admin_password_resets (
 token_hash TEXT PRIMARY KEY,
 admin_id INTEGER NOT NULL REFERENCES admin_accounts(id),
 expires_at INTEGER NOT NULL,
 used_at TEXT
);
