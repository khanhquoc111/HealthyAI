-- migrations/002_add_personal_profile.sql
-- Thêm bảng lưu Chỉ Số Cá Nhân (Personal Profile) cho mỗi bệnh nhân
-- Đây là 18 chỉ số cố định dùng chung cho tất cả plugin bệnh

CREATE TABLE IF NOT EXISTS personal_profiles (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    data       TEXT    NOT NULL,  -- JSON chứa 18 chỉ số cố định
    updated_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_personal_profile_user ON personal_profiles(user_id);