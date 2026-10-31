CREATE TABLE IF NOT EXISTS stickers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template TEXT NOT NULL CHECK (length(template) BETWEEN 1 AND 32),
  strokes TEXT NOT NULL CHECK (length(strokes) BETWEEN 2 AND 60000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  decided_at INTEGER,
  ip_hash TEXT NOT NULL,
  net_hash TEXT NOT NULL,
  asn INTEGER,
  x REAL CHECK (x BETWEEN 0 AND 1),
  y REAL CHECK (y BETWEEN 0 AND 1),
  rot REAL NOT NULL DEFAULT 0 CHECK (rot BETWEEN -30 AND 30),
  country TEXT CHECK (country IS NULL OR length(country) = 2)
);

CREATE INDEX IF NOT EXISTS stickers_status_id ON stickers (status, id);
CREATE INDEX IF NOT EXISTS stickers_ip_created ON stickers (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS stickers_net_created ON stickers (net_hash, created_at);
CREATE INDEX IF NOT EXISTS stickers_decided ON stickers (decided_at);
