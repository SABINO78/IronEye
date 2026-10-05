from flask import Blueprint, jsonify
from database import get_db
from auth import token_required

profile_bp = Blueprint("profile", __name__)


@profile_bp.route("/profile", methods=["GET"])
@token_required
def profile(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT email, created_at FROM users WHERE id = %s", (user_id,))
    user = c.fetchone()
    conn.close()

    if not user:
        return jsonify({"erro": "User not found"}), 404

    email, created_at = user
    return jsonify({"email": email, "created_at": created_at})