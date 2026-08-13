from flask import Blueprint, jsonify
from database import get_db
from auth import token_required
import json

history_bp = Blueprint("history", __name__)

@history_bp.route("/history", methods=["GET"])
@token_required
def history(user_id):

    conn = get_db()
    c = conn.cursor()

    # Verifica se o utilizador é Pro
    c.execute("SELECT is_pro FROM users WHERE id = ?", (user_id,))
    is_pro = c.fetchone()[0]

    dias = 3 if is_pro else 1

    c.execute("""
        SELECT
            id,
            machine_name,
            muscle_group,
            primary_muscle,
            secondary_muscles,
            description,
            how_to_use,
            tips,
            confidence,
            scanned_at
        FROM scans
        WHERE user_id = ?
        AND scanned_at >= datetime('now', ?)
        ORDER BY scanned_at DESC
    """, (user_id, f"-{dias} days"))

    scans = c.fetchall()

    conn.close()

    return jsonify([
        {
            "id": scan[0],
            "machine_name": scan[1],
            "muscle_group": scan[2],
            "primary_muscle": scan[3],
            "secondary_muscles": json.loads(scan[4]),
            "description": scan[5],
            "how_to_use": scan[6],
            "tips": json.loads(scan[7]),
            "confidence": scan[8],
            "scanned_at": scan[9]
        }
        for scan in scans
    ])