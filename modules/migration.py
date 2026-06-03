"""
modules/migration.py
--------------------
Hệ thống migration đơn giản cho HealthyAI.

Cách hoạt động:
    - Mỗi thay đổi schema là 1 file .sql trong thư mục migrations/
    - File đặt tên theo dạng: 001_init.sql, 002_add_avatar.sql, ...
    - DB tự theo dõi migration nào đã chạy qua bảng _migrations
    - Mỗi lần server khởi động: chỉ chạy các file mới, bỏ qua file cũ
    - Không bao giờ sửa file migration cũ — chỉ thêm file mới

Cách dùng:
    from modules.migration import run_migrations
    run_migrations()   # gọi trong main() trước init_db()

Cách thêm thay đổi schema:
    1. Tạo file migrations/002_ten_thay_doi.sql
    2. Viết câu SQL vào đó (ALTER TABLE, CREATE TABLE, ...)
    3. Chạy lại server — migration tự chạy
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from modules.database import get_conn, DB_PATH

MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


# ── Bảng theo dõi migration ───────────────────────────────────────────────────

def _ensure_migrations_table(conn: sqlite3.Connection):
    """Tạo bảng _migrations nếu chưa có."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            filename   TEXT    NOT NULL UNIQUE,
            applied_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    """)
    conn.commit()


def _get_applied(conn: sqlite3.Connection) -> set[str]:
    """Trả về set tên file migration đã chạy."""
    rows = conn.execute("SELECT filename FROM _migrations").fetchall()
    return {row[0] for row in rows}


def _mark_applied(conn: sqlite3.Connection, filename: str):
    """Đánh dấu migration đã chạy thành công."""
    conn.execute(
        "INSERT INTO _migrations (filename) VALUES (?)", (filename,)
    )
    conn.commit()


# ── Chạy migration ────────────────────────────────────────────────────────────

def run_migrations():
    """
    Quét thư mục migrations/, chạy các file .sql chưa được apply.
    Gọi 1 lần khi server khởi động, trước init_db().
    """
    MIGRATIONS_DIR.mkdir(exist_ok=True)

    conn = get_conn()
    _ensure_migrations_table(conn)
    applied = _get_applied(conn)

    # Lấy tất cả file .sql, sort theo tên (001, 002, ...)
    sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

    if not sql_files:
        print("[Migration] Không có file migration nào.")
        return

    pending = [f for f in sql_files if f.name not in applied]

    if not pending:
        print(f"[Migration] Đã cập nhật — {len(applied)} migration đã apply.")
        return

    print(f"[Migration] Tìm thấy {len(pending)} migration mới:")

    for sql_file in pending:
        sql = sql_file.read_text(encoding="utf-8").strip()
        if not sql:
            print(f"  ⚠ Bỏ qua file rỗng: {sql_file.name}")
            continue

        try:
            conn.executescript(sql)
            _mark_applied(conn, sql_file.name)
            print(f"  ✅ {sql_file.name}")
        except Exception as e:
            print(f"  ❌ {sql_file.name}: {e}")
            raise RuntimeError(
                f"Migration thất bại tại {sql_file.name}. "
                "Kiểm tra lại file SQL và thử lại."
            ) from e

    print(f"[Migration] Hoàn tất — đã apply {len(pending)} migration mới.")


# ── Tiện ích xem trạng thái ───────────────────────────────────────────────────

def migration_status() -> list[dict]:
    """
    Trả về trạng thái tất cả migration.
    Dùng để debug hoặc hiển thị trong admin panel.
    """
    MIGRATIONS_DIR.mkdir(exist_ok=True)
    conn = get_conn()
    _ensure_migrations_table(conn)
    applied = _get_applied(conn)

    sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    result = []
    for f in sql_files:
        result.append({
            "filename":   f.name,
            "applied":    f.name in applied,
            "size_bytes": f.stat().st_size,
        })
    return result