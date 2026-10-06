ALTER TABLE payments ADD COLUMN snap_token TEXT;
ALTER TABLE payments ADD COLUMN snap_redirect_url TEXT;

PRAGMA optimize;
