const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = process.env.DB_DIR || __dirname;
const dbPath = path.join(dbDir, 'market.db');

// 如果指定的数据库路径不存在但项目自带了 market.db，先复制过去
const bundledDbPath = path.join(__dirname, 'market.db');
if (!fs.existsSync(dbPath) && fs.existsSync(bundledDbPath) && bundledDbPath !== dbPath) {
  fs.copyFileSync(bundledDbPath, dbPath);
}

function syncBack() {
  // 生产环境无需同步回临时目录
  try {
    if (dbDir !== __dirname && fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, bundledDbPath);
    }
  } catch (e) {
    // 忽略同步失败
  }
}

const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;
  `);

  // Ensure base users table exists before altering it. On fresh volumes the bundled
  // db may be empty / missing, so we create the table with the schema expected by routes.
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      password_hash TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'user',
      goal TEXT,
      goal_target_date TEXT,
      identity TEXT,
      profession TEXT,
      nickname TEXT,
      school TEXT,
      region TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const userColumns = db.prepare(`PRAGMA table_info(users)`).all().map((row) => row.name);
  if (!userColumns.includes('goal_target_date')) {
    db.exec(`ALTER TABLE users ADD COLUMN goal_target_date TEXT`);
  }
  if (!userColumns.includes('nickname')) {
    db.exec(`ALTER TABLE users ADD COLUMN nickname TEXT`);
  }
  if (!userColumns.includes('school')) {
    db.exec(`ALTER TABLE users ADD COLUMN school TEXT`);
  }
  if (!userColumns.includes('region')) {
    db.exec(`ALTER TABLE users ADD COLUMN region TEXT`);
  }
  if (!userColumns.includes('identity')) {
    db.exec(`ALTER TABLE users ADD COLUMN identity TEXT`);
  }
  if (!userColumns.includes('profession')) {
    db.exec(`ALTER TABLE users ADD COLUMN profession TEXT`);
  }
  if (!userColumns.includes('goal')) {
    db.exec(`ALTER TABLE users ADD COLUMN goal TEXT`);
  }

  const knowledgeDocumentColumns = db.prepare(`PRAGMA table_info(knowledge_documents)`).all().map((row) => row.name);
  if (knowledgeDocumentColumns.length && !knowledgeDocumentColumns.includes('display_name')) {
    db.exec(`ALTER TABLE knowledge_documents ADD COLUMN display_name TEXT`);
  }

  const taskColumns = db.prepare(`PRAGMA table_info(tasks)`).all().map((row) => row.name);
  if (taskColumns.length) {
    if (!taskColumns.includes('task_order')) db.exec(`ALTER TABLE tasks ADD COLUMN task_order INTEGER DEFAULT 0`);
    if (!taskColumns.includes('source_chunk_id')) db.exec(`ALTER TABLE tasks ADD COLUMN source_chunk_id TEXT`);
    if (!taskColumns.includes('file_name')) db.exec(`ALTER TABLE tasks ADD COLUMN file_name TEXT`);
    if (!taskColumns.includes('knowledge_point_id')) db.exec(`ALTER TABLE tasks ADD COLUMN knowledge_point_id TEXT`);
    if (!taskColumns.includes('knowledge_point_title')) db.exec(`ALTER TABLE tasks ADD COLUMN knowledge_point_title TEXT`);
    if (!taskColumns.includes('source_type')) db.exec(`ALTER TABLE tasks ADD COLUMN source_type TEXT DEFAULT 'plan'`);
    if (!taskColumns.includes('query_text')) db.exec(`ALTER TABLE tasks ADD COLUMN query_text TEXT`);
    if (!taskColumns.includes('completed_at')) db.exec(`ALTER TABLE tasks ADD COLUMN completed_at TEXT`);
    if (!taskColumns.includes('rescheduled_at')) db.exec(`ALTER TABLE tasks ADD COLUMN rescheduled_at TEXT`);
  }

  const studyPlanColumns = db.prepare(`PRAGMA table_info(study_plans)`).all().map((row) => row.name);
  if (studyPlanColumns.length) {
    if (!studyPlanColumns.includes('knowledge_base_id')) db.exec(`ALTER TABLE study_plans ADD COLUMN knowledge_base_id TEXT`);
    if (!studyPlanColumns.includes('knowledge_points_json')) db.exec(`ALTER TABLE study_plans ADD COLUMN knowledge_points_json TEXT`);
    if (!studyPlanColumns.includes('learning_route_json')) db.exec(`ALTER TABLE study_plans ADD COLUMN learning_route_json TEXT`);
    if (!studyPlanColumns.includes('daily_plan_json')) db.exec(`ALTER TABLE study_plans ADD COLUMN daily_plan_json TEXT`);
    if (!studyPlanColumns.includes('review_plan_json')) db.exec(`ALTER TABLE study_plans ADD COLUMN review_plan_json TEXT`);
    if (!studyPlanColumns.includes('exercises_json')) db.exec(`ALTER TABLE study_plans ADD COLUMN exercises_json TEXT`);
  }

  db.exec(`

    CREATE TABLE IF NOT EXISTS user_daily_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      source TEXT DEFAULT 'open_app',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, activity_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_memory (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT,
      importance INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      study_plan_id TEXT,
      node_id TEXT,
      knowledge_point_id TEXT,
      source_chunk_id TEXT,
      question TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT,
      explanation TEXT,
      difficulty TEXT DEFAULT 'medium',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercise_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      answer TEXT,
      is_correct INTEGER DEFAULT 0,
      mastery_delta INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      source_type TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id TEXT PRIMARY KEY,
      knowledge_base_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      display_name TEXT,
      file_type TEXT,
      file_path TEXT NOT NULL,
      content TEXT,
      summary TEXT,
      tags TEXT,
      source_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      source TEXT,
      task_order INTEGER DEFAULT 0,
      source_chunk_id TEXT,
      file_name TEXT,
      knowledge_point_id TEXT,
      knowledge_point_title TEXT,
      source_type TEXT DEFAULT 'plan',
      query_text TEXT,
      completed_at TEXT,
      rescheduled_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      knowledge_base_id TEXT,
      knowledge_points_json TEXT,
      learning_route_json TEXT,
      daily_plan_json TEXT,
      review_plan_json TEXT,
      exercises_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      mastery INTEGER DEFAULT 0,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meeting_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      transcript TEXT,
      summary TEXT,
      action_items TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      category TEXT,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ppt_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      ppt_type TEXT,
      template_name TEXT,
      slide_count INTEGER DEFAULT 0,
      outline TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS resume_analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ats_score INTEGER,
      job_match_rate INTEGER,
      file_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analytics_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      file_name TEXT,
      sheet_name TEXT,
      row_count INTEGER DEFAULT 0,
      summary_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initDatabase();

process.on('exit', syncBack);
process.on('SIGINT', () => { syncBack(); process.exit(0); });
process.on('SIGTERM', () => { syncBack(); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('[db] uncaughtException:', err?.message || err); syncBack(); process.exit(1); });

module.exports = {
  db,
  initDatabase,
  syncBack
};
