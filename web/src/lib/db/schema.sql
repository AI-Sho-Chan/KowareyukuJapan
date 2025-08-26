-- Posts table (main content)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT,
  url TEXT,
  comment TEXT,
  handle TEXT DEFAULT '@guest',
  owner_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_published BOOLEAN DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Post tags relation
CREATE TABLE IF NOT EXISTS post_tags (
  post_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('image', 'video')),
  url TEXT NOT NULL,
  r2_key TEXT,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- for videos, in seconds
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  admin_id TEXT,
  metadata TEXT, -- JSON string
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL,
  reason TEXT,
  reporter_ip TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  resolved_by TEXT,
  action_taken TEXT,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Auto-collection sources
CREATE TABLE IF NOT EXISTS collection_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('rss', 'youtube', 'twitter', 'api')),
  url TEXT NOT NULL,
  config TEXT, -- JSON configuration
  is_active BOOLEAN DEFAULT 1,
  last_fetched_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Collected items queue
CREATE TABLE IF NOT EXISTS collection_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  content TEXT,
  metadata TEXT, -- JSON
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'published')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (source_id) REFERENCES collection_sources(id) ON DELETE CASCADE
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_owner_key ON posts(owner_key);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_post_id ON media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_reports_post_id ON reports(post_id);
CREATE INDEX IF NOT EXISTS idx_collection_queue_status ON collection_queue(status, created_at);

-- Insert default tags
INSERT OR IGNORE INTO tags (name, slug) VALUES 
  ('治安/マナー', 'security-manners'),
  ('ニュース', 'news'),
  ('政治/制度', 'politics-system'),
  ('動画', 'video'),
  ('画像', 'image'),
  ('外国人犯罪', 'foreign-crime'),
  ('中国人', 'chinese'),
  ('クルド人', 'kurdish'),
  ('媚中政治家', 'pro-china-politicians'),
  ('財務省', 'ministry-of-finance'),
  ('官僚', 'bureaucrats'),
  ('左翼', 'leftist'),
  ('保守', 'conservative'),
  ('日本', 'japan'),
  ('帰化人', 'naturalized'),
  ('帰化人政治家', 'naturalized-politicians'),
  ('歴史捏造', 'history-falsification');