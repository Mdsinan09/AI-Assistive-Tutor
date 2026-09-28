import sqlite3
import hashlib
import secrets
from pathlib import Path
from datetime import datetime, timedelta

DB_PATH = Path(__file__).resolve().parent / "app.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000
    ).hex()
    return hashed, salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    hashed, _ = hash_password(password, salt)
    return secrets.compare_digest(hashed, stored_hash)


def init_db():
    conn = get_connection()
    c = conn.cursor()

    # Users table
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        full_name TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # User Auth Sessions
    c.execute("""
    CREATE TABLE IF NOT EXISTS user_sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # Interactive Study Sessions
    c.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        timestamp TEXT NOT NULL
    )
    """)

    # Detections table
    c.execute("""
    CREATE TABLE IF NOT EXISTS detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        user_id INTEGER,
        label TEXT NOT NULL,
        confidence REAL NOT NULL,
        timestamp TEXT NOT NULL
    )
    """)

    # OCR History
    c.execute("""
    CREATE TABLE IF NOT EXISTS ocr_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        user_id INTEGER,
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    """)

    # QA History
    c.execute("""
    CREATE TABLE IF NOT EXISTS qa_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        user_id INTEGER,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    """)

    # Safe migrations for existing databases missing user_id
    for table in ["sessions", "detections", "ocr_history", "qa_history"]:
        cols = [r["name"] for r in c.execute(f"PRAGMA table_info({table})").fetchall()]
        if "user_id" not in cols:
            try:
                c.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER")
            except Exception:
                pass

    conn.commit()

    # Seed default demo account if no users exist
    seed_default_user(c)
    conn.commit()
    conn.close()
    print("[Database] SQLite tables initialized with authentication support.")


def seed_default_user(cursor):
    existing = cursor.execute("SELECT id FROM users WHERE username = 'student'").fetchone()
    if not existing:
        pwd_hash, salt = hash_password("student123")
        cursor.execute(
            "INSERT INTO users (username, password_hash, salt, full_name, created_at) VALUES (?, ?, ?, ?, ?)",
            ("student", pwd_hash, salt, "College Student", datetime.now().isoformat())
        )
        print("[Database] Seeded demo user: 'student' / 'student123'")


def create_user(username: str, password: str, full_name: str) -> dict:
    username = username.strip().lower()
    if len(username) < 3:
        raise ValueError("Username must be at least 3 characters long.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long.")

    conn = get_connection()
    c = conn.cursor()
    pwd_hash, salt = hash_password(password)
    try:
        c.execute(
            "INSERT INTO users (username, password_hash, salt, full_name, created_at) VALUES (?, ?, ?, ?, ?)",
            (username, pwd_hash, salt, full_name.strip() or username, datetime.now().isoformat())
        )
        uid = c.lastrowid
        conn.commit()
        return {"id": uid, "username": username, "full_name": full_name}
    except sqlite3.IntegrityError:
        raise ValueError("A user with this username already exists.")
    finally:
        conn.close()


def authenticate_user(username: str, password: str) -> dict | None:
    username = username.strip().lower()
    conn = get_connection()
    c = conn.cursor()
    row = c.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    if not row:
        return None
    if verify_password(password, row["password_hash"], row["salt"]):
        return {
            "id": row["id"],
            "username": row["username"],
            "full_name": row["full_name"],
            "created_at": row["created_at"]
        }
    return None


def create_user_session(user_id: int, duration_hours: int = 72) -> str:
    token = secrets.token_urlsafe(32)
    now = datetime.now()
    expires = now + timedelta(hours=duration_hours)
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token, user_id, now.isoformat(), expires.isoformat())
    )
    conn.commit()
    conn.close()
    return token


def validate_session_token(token: str) -> dict | None:
    if not token:
        return None
    conn = get_connection()
    c = conn.cursor()
    row = c.execute("""
        SELECT u.id, u.username, u.full_name, s.expires_at
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
    """, (token,)).fetchone()
    conn.close()

    if not row:
        return None

    # Check expiration
    try:
        exp = datetime.fromisoformat(row["expires_at"])
        if datetime.now() > exp:
            invalidate_session_token(token)
            return None
    except Exception:
        pass

    return {
        "id": row["id"],
        "username": row["username"],
        "full_name": row["full_name"]
    }


def invalidate_session_token(token: str) -> bool:
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
    affected = c.rowcount
    conn.commit()
    conn.close()
    return affected > 0


def create_session(user_id: int | None = None) -> int:
    conn = get_connection()
    c = conn.cursor()
    c.execute("INSERT INTO sessions (user_id, timestamp) VALUES (?, ?)", (user_id, datetime.now().isoformat()))
    sid = c.lastrowid
    conn.commit()
    conn.close()
    return sid


def log_detection(session_id: int, label: str, confidence: float, user_id: int | None = None):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO detections (session_id, user_id, label, confidence, timestamp) VALUES (?, ?, ?, ?, ?)",
        (session_id, user_id, label, confidence, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


def log_ocr(session_id: int, text: str, user_id: int | None = None):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO ocr_history (session_id, user_id, text, timestamp) VALUES (?, ?, ?, ?)",
        (session_id, user_id, text, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


def log_qa(session_id: int, question: str, answer: str, user_id: int | None = None):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO qa_history (session_id, user_id, question, answer, timestamp) VALUES (?, ?, ?, ?, ?)",
        (session_id, user_id, question, answer, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


def get_history(user_id: int | None = None, limit: int = 30) -> dict:
    conn = get_connection()
    c = conn.cursor()
    if user_id:
        dets = [dict(r) for r in c.execute("SELECT * FROM detections WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC LIMIT ?", (user_id, limit)).fetchall()]
        ocr = [dict(r) for r in c.execute("SELECT * FROM ocr_history WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC LIMIT ?", (user_id, limit)).fetchall()]
        qa = [dict(r) for r in c.execute("SELECT * FROM qa_history WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC LIMIT ?", (user_id, limit)).fetchall()]
    else:
        dets = [dict(r) for r in c.execute("SELECT * FROM detections ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]
        ocr = [dict(r) for r in c.execute("SELECT * FROM ocr_history ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]
        qa = [dict(r) for r in c.execute("SELECT * FROM qa_history ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]
    conn.close()
    return {"detections": dets, "ocr_history": ocr, "qa_history": qa}


def clear_history(user_id: int | None = None) -> bool:
    conn = get_connection()
    c = conn.cursor()
    if user_id:
        c.execute("DELETE FROM detections WHERE user_id = ? OR user_id IS NULL", (user_id,))
        c.execute("DELETE FROM ocr_history WHERE user_id = ? OR user_id IS NULL", (user_id,))
        c.execute("DELETE FROM qa_history WHERE user_id = ? OR user_id IS NULL", (user_id,))
    else:
        c.execute("DELETE FROM detections")
        c.execute("DELETE FROM ocr_history")
        c.execute("DELETE FROM qa_history")
    conn.commit()
    conn.close()
    return True


def get_statistics(user_id: int | None = None) -> dict:
    conn = get_connection()
    c = conn.cursor()
    
    if user_id:
        filter_clause = "WHERE user_id = ? OR user_id IS NULL"
        params = (user_id,)
    else:
        filter_clause = ""
        params = ()

    det_count = c.execute(f"SELECT COUNT(*) as count FROM detections {filter_clause}", params).fetchone()["count"]
    ocr_count = c.execute(f"SELECT COUNT(*) as count FROM ocr_history {filter_clause}", params).fetchone()["count"]
    qa_count = c.execute(f"SELECT COUNT(*) as count FROM qa_history {filter_clause}", params).fetchone()["count"]
    session_count = c.execute(f"SELECT COUNT(*) as count FROM sessions {filter_clause}", params).fetchone()["count"]

    # Top detected objects
    top_objects = [
        dict(r) for r in c.execute(f"""
            SELECT label, COUNT(*) as count 
            FROM detections {filter_clause}
            GROUP BY label 
            ORDER BY count DESC 
            LIMIT 5
        """, params).fetchall()
    ]

    conn.close()

    total_actions = det_count + ocr_count + qa_count

    return {
        "detections_count": det_count,
        "ocr_count": ocr_count,
        "qa_count": qa_count,
        "session_count": max(1, session_count),
        "total_actions": total_actions,
        "top_objects": top_objects
    }
