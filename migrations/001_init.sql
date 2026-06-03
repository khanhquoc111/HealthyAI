-- migrations/001_init.sql
-- Khởi tạo schema ban đầu cho HealthyAI
-- Tạo ngày: 2025

-- Bảng tài khoản người dùng
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    full_name     TEXT,
    role          TEXT    NOT NULL DEFAULT 'patient'
                      CHECK(role IN ('patient', 'doctor', 'admin')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Bảng lịch sử kết quả phân tích
CREATE TABLE IF NOT EXISTS health_records (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile    TEXT    NOT NULL,
    result     TEXT    NOT NULL,
    note       TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Bảng lịch sử chat với AI
CREATE TABLE IF NOT EXISTS chat_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_id  INTEGER REFERENCES health_records(id) ON DELETE SET NULL,
    role       TEXT    NOT NULL CHECK(role IN ('user', 'assistant')),
    message    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Index tăng tốc truy vấn
CREATE INDEX IF NOT EXISTS idx_records_user ON health_records(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user    ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_record  ON chat_history(record_id);