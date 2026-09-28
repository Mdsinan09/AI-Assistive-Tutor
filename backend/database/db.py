import sqlite3
import json
from datetime import datetime
from backend.config import DATABASE_PATH

def init_db():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        ended_at TEXT
    )
    """)
    
    # OCR extraction history
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ocr_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        cleaned_text TEXT NOT NULL
    )
    """)
    
    # Detected objects history
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        objects_json TEXT NOT NULL,
        spatial_summary TEXT NOT NULL
    )
    """)
    
    # AI Tutor Q&A interactions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS qa_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        question TEXT NOT NULL,
        context TEXT,
        answer TEXT NOT NULL
    )
    """)
    
    conn.commit()
    conn.close()

def log_ocr(raw_text: str, cleaned_text: str):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO ocr_history (timestamp, raw_text, cleaned_text) VALUES (?, ?, ?)",
        (datetime.now().isoformat(), raw_text, cleaned_text)
    )
    conn.commit()
    conn.close()

def log_detections(objects: list, spatial_summary: str):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO detections (timestamp, objects_json, spatial_summary) VALUES (?, ?, ?)",
        (datetime.now().isoformat(), json.dumps(objects), spatial_summary)
    )
    conn.commit()
    conn.close()

def log_qa(question: str, context: str, answer: str):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO qa_history (timestamp, question, context, answer) VALUES (?, ?, ?, ?)",
        (datetime.now().isoformat(), question, context, answer)
    )
    conn.commit()
    conn.close()

def get_recent_history(limit: int = 10):
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    ocr = [dict(r) for r in cursor.execute("SELECT * FROM ocr_history ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]
    dets = [dict(r) for r in cursor.execute("SELECT * FROM detections ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]
    qa = [dict(r) for r in cursor.execute("SELECT * FROM qa_history ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]
    
    conn.close()
    return {"ocr": ocr, "detections": dets, "qa": qa}
