import os
import psycopg2
from psycopg2.extras import RealDictCursor

# URL de conexão ao PostgreSQL (Supabase)
# Exemplo: postgresql://user:password@host:5432/postgres
DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db():
    """Estabelece ligação à base de dados PostgreSQL."""
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL não está definida. "
            "Configura a variável de ambiente DATABASE_URL "
            "com a ligação do teu Supabase."
        )
    return psycopg2.connect(DATABASE_URL)


def criar_tabela():
    """Cria as tabelas na base de dados PostgreSQL (Supabase)."""
    conn = get_db()
    c = conn.cursor()

    # =========================
    # USERS
    # =========================

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


    # =========================
    # SCANS
    # =========================

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