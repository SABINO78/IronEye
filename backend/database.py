import sqlite3

def get_db():
    return sqlite3.connect("ironeye.db")

def criar_tabela():
    conn = get_db()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            is_pro INTEGER DEFAULT 0
        )
    """)

    c.execute("""
CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    machine_name TEXT NOT NULL,
    muscle_group TEXT,
    primary_muscle TEXT,
    secondary_muscles TEXT,

    description TEXT,
    how_to_use TEXT,
    tips TEXT,

    confidence INTEGER,

    scanned_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
)
""")