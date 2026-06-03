"""
modules/database.py
-------------------
Quản lý SQLite database cho HealthyAI.
Schema được quản lý bởi modules/migration.py — không định nghĩa bảng ở đây.

Các hàm CRUD:
    users          — tạo, xác thực, tra cứu tài khoản
    health_records — lưu/lấy lịch sử phân tích
    chat_history   — lưu/lấy lịch sử chat AI
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
from pathlib import Path

# ── Cấu hình ─────────────────────────────────────────────────────────────────

DB_PATH = Path(__file__).parent.parent / "healthyai.db"

# Thread-local connection — mỗi thread dùng connection riêng
_local = threading.local()


# ── Connection management ─────────────────────────────────────────────────────

def get_conn() -> sqlite3.Connection:
    """Trả về connection cho thread hiện tại, tạo mới nếu chưa có."""
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute("PRAGMA foreign_keys=ON")
    return _local.conn


def close_conn():
    """Đóng connection của thread hiện tại."""
    if hasattr(_local, "conn") and _local.conn:
        _local.conn.close()
        _local.conn = None


# ── Users ─────────────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_user(username: str, password: str,
                full_name: str = "", role: str = "patient") -> dict | None:
    """
    Tạo tài khoản mới.
    Trả về user dict nếu thành công, None nếu username đã tồn tại.
    """
    try:
        conn = get_conn()
        conn.execute(
            "INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
            (username, _hash_password(password), full_name, role)
        )
        conn.commit()
        return get_user_by_username(username)
    except sqlite3.IntegrityError:
        return None


def get_user_by_username(username: str) -> dict | None:
    """Lấy thông tin user theo username (không có password_hash)."""
    conn = get_conn()
    row = conn.execute(
        "SELECT id, username, full_name, role, created_at FROM users WHERE username = ?",
        (username,)
    ).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> dict | None:
    """Lấy thông tin user theo id."""
    conn = get_conn()
    row = conn.execute(
        "SELECT id, username, full_name, role, created_at FROM users WHERE id = ?",
        (user_id,)
    ).fetchone()
    return dict(row) if row else None


def verify_login(username: str, password: str) -> dict | None:
    """
    Xác thực đăng nhập.
    Trả về user dict nếu đúng, None nếu sai.
    """
    conn = get_conn()
    row = conn.execute(
        "SELECT id, username, full_name, role, created_at FROM users "
        "WHERE username = ? AND password_hash = ?",
        (username, _hash_password(password))
    ).fetchone()
    return dict(row) if row else None


def update_password(user_id: int, new_password: str) -> bool:
    """Đổi mật khẩu. Trả về True nếu thành công."""
    conn = get_conn()
    cursor = conn.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (_hash_password(new_password), user_id)
    )
    conn.commit()
    return cursor.rowcount > 0


def list_users(role: str | None = None) -> list[dict]:
    """Lấy danh sách user, lọc theo role nếu cần."""
    conn = get_conn()
    if role:
        rows = conn.execute(
            "SELECT id, username, full_name, role, created_at "
            "FROM users WHERE role = ? ORDER BY created_at DESC",
            (role,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id, username, full_name, role, created_at "
            "FROM users ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


# ── Health Records ────────────────────────────────────────────────────────────

def _parse_record(row: sqlite3.Row) -> dict:
    """Parse JSON fields trong record row."""
    rec = dict(row)
    rec["profile"] = json.loads(rec["profile"])
    rec["result"]  = json.loads(rec["result"])
    return rec


def save_health_record(user_id: int, profile: dict,
                       result: dict, note: str = "") -> int:
    """
    Lưu kết quả phân tích sức khoẻ.
    Trả về id của record vừa tạo.
    """
    conn = get_conn()
    cursor = conn.execute(
        "INSERT INTO health_records (user_id, profile, result, note) VALUES (?, ?, ?, ?)",
        (user_id,
         json.dumps(profile, ensure_ascii=False),
         json.dumps(result,  ensure_ascii=False),
         note)
    )
    conn.commit()
    return cursor.lastrowid


def get_health_records(user_id: int, limit: int = 20) -> list[dict]:
    """Lấy lịch sử phân tích của 1 user, mới nhất trước."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, user_id, profile, result, note, created_at "
        "FROM health_records WHERE user_id = ? "
        "ORDER BY created_at DESC LIMIT ?",
        (user_id, limit)
    ).fetchall()
    return [_parse_record(r) for r in rows]


def get_health_record_by_id(record_id: int) -> dict | None:
    """Lấy 1 record theo id."""
    conn = get_conn()
    row = conn.execute(
        "SELECT id, user_id, profile, result, note, created_at "
        "FROM health_records WHERE id = ?",
        (record_id,)
    ).fetchone()
    return _parse_record(row) if row else None


def update_record_note(record_id: int, user_id: int, note: str) -> bool:
    """Cập nhật ghi chú của 1 record. Trả về True nếu thành công."""
    conn = get_conn()
    cursor = conn.execute(
        "UPDATE health_records SET note = ? WHERE id = ? AND user_id = ?",
        (note, record_id, user_id)
    )
    conn.commit()
    return cursor.rowcount > 0


def delete_health_record(record_id: int, user_id: int) -> bool:
    """
    Xoá record theo id.
    user_id đảm bảo chỉ xoá record của chính mình.
    """
    conn = get_conn()
    cursor = conn.execute(
        "DELETE FROM health_records WHERE id = ? AND user_id = ?",
        (record_id, user_id)
    )
    conn.commit()
    return cursor.rowcount > 0


# ── Chat History ──────────────────────────────────────────────────────────────

def save_chat_message(user_id: int, role: str, message: str,
                      record_id: int | None = None) -> int:
    """
    Lưu 1 tin nhắn.
    role: 'user' hoặc 'assistant'
    Trả về id của message vừa tạo.
    """
    conn = get_conn()
    cursor = conn.execute(
        "INSERT INTO chat_history (user_id, record_id, role, message) VALUES (?, ?, ?, ?)",
        (user_id, record_id, role, message)
    )
    conn.commit()
    return cursor.lastrowid


def get_chat_history(user_id: int, record_id: int | None = None,
                     limit: int = 50) -> list[dict]:
    """
    Lấy lịch sử chat của 1 user.
    Nếu có record_id thì lọc theo phiên khám đó.
    """
    conn = get_conn()
    if record_id is not None:
        rows = conn.execute(
            "SELECT id, user_id, record_id, role, message, created_at "
            "FROM chat_history WHERE user_id = ? AND record_id = ? "
            "ORDER BY created_at ASC LIMIT ?",
            (user_id, record_id, limit)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id, user_id, record_id, role, message, created_at "
            "FROM chat_history WHERE user_id = ? "
            "ORDER BY created_at DESC LIMIT ?",
            (user_id, limit)
        ).fetchall()
    return [dict(r) for r in rows]


def clear_chat_history(user_id: int, record_id: int | None = None) -> int:
    """Xoá lịch sử chat. Trả về số dòng đã xoá."""
    conn = get_conn()
    if record_id is not None:
        cursor = conn.execute(
            "DELETE FROM chat_history WHERE user_id = ? AND record_id = ?",
            (user_id, record_id)
        )
    else:
        cursor = conn.execute(
            "DELETE FROM chat_history WHERE user_id = ?", (user_id,)
        )
    conn.commit()
    return cursor.rowcount


# ── Seed data ─────────────────────────────────────────────────────────────────

def seed_default_accounts():
    """
    Tạo tài khoản mặc định nếu DB mới tạo (chưa có user nào).
    Gọi sau run_migrations() trong main().
    """
    conn = get_conn()
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count > 0:
        return

    defaults = [
        ("admin",    "admin123",   "Quản trị viên", "admin"),
        ("doctor1",  "doctor123",  "Bác sĩ Nguyễn", "doctor"),
        ("patient1", "patient123", "Bệnh nhân A",    "patient"),
    ]
    for username, password, full_name, role in defaults:
        create_user(username, password, full_name, role)

    print("[DB] Đã tạo tài khoản mặc định: admin / doctor1 / patient1")
    print("[DB] ⚠ Nhớ đổi mật khẩu trước khi deploy!")