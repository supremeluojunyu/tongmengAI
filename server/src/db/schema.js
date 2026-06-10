export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'parent',
      membership TEXT NOT NULL DEFAULT 'basic',
      avatar TEXT,
      org_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL,
      special_needs TEXT,
      avatar TEXT,
      class_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      child_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      mac_address TEXT,
      battery INTEGER DEFAULT 100,
      status TEXT DEFAULT 'offline',
      last_seen TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monitoring_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id TEXT NOT NULL,
      emotion TEXT NOT NULL,
      sleep_stage TEXT NOT NULL,
      heart_rate INTEGER NOT NULL,
      breath_rate INTEGER NOT NULL,
      body_movement INTEGER DEFAULT 0,
      exoskeleton_mode TEXT,
      exoskeleton_force TEXT,
      exoskeleton_battery INTEGER,
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    CREATE TABLE IF NOT EXISTS soothe_records (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      sound_type TEXT,
      light_brightness INTEGER,
      light_color TEXT,
      posture TEXT,
      force_level TEXT,
      duration_min INTEGER,
      effect_minutes_saved INTEGER,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      age_group TEXT NOT NULL,
      special_type TEXT,
      content TEXT NOT NULL,
      cover_url TEXT,
      video_url TEXT,
      is_premium INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      class_id TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      resolved INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    CREATE TABLE IF NOT EXISTS orgs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_phone TEXT,
      created_at TEXT NOT NULL
    );
  `);
}
