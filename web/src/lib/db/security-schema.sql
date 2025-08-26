-- Security関連のテーブルを追加

-- ブロックされたユーザー
CREATE TABLE IF NOT EXISTS blocked_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_key TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_owner_key ON blocked_users(owner_key);

-- ブロックされたIPアドレス
CREATE TABLE IF NOT EXISTS blocked_ips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address);

-- レート制限ログ
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_identifier ON rate_limit_logs(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created_at ON rate_limit_logs(created_at);

-- postsテーブルに欠けているカラムを追加（存在しない場合のみ）
-- SQLiteのALTER TABLEは制限があるため、カラムが存在しない場合のみ追加
-- これはマイグレーションスクリプトで実行する