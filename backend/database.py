import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Read inside get_db() rather than at import time to ensure load_dotenv()
# has already been called before this value is consumed.

def get_db():
    """Opens a connection to the PostgreSQL database."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not set. "
            "Configure the DATABASE_URL environment variable "
            "with your Supabase connection string."
        )
    return psycopg2.connect(database_url)


def create_tables():
    """Creates tables in the PostgreSQL database."""
    conn = get_db()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            is_pro INTEGER DEFAULT 0,
            bonus_scans_hoje INTEGER DEFAULT 0,
            bonus_scans_data DATE
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            machine_name TEXT NOT NULL,
            muscle_group TEXT,
            primary_muscle TEXT,
            secondary_muscles TEXT,
            description TEXT,
            how_to_use TEXT,
            tips TEXT,
            confidence INTEGER,
            scanned_at TIMESTAMPTZ DEFAULT NOW(),
            FOREIGN KEY (user_id)
            REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()