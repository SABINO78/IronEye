from flask import Blueprint, request, jsonify
import psycopg2
import jwt
import os
import requests as req_lib
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from database import get_db

auth_bp = Blueprint("auth", __name__)

GOOGLE_WEB_CLIENT_ID = "609585601175-nue1jb7oui1thg0iqdtq74k7anej2p80.apps.googleusercontent.com"


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"erro": "Email and password are required"}), 400

    password_hash = generate_password_hash(password)
    conn = get_db()
    c = conn.cursor()

    try:
        c.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
            (email, password_hash)
        )
        new_id = c.fetchone()[0]
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({"erro": "Email already registered"}), 400
    finally:
        conn.close()

    token = jwt.encode(
        {"user_id": new_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        os.getenv("SECRET_KEY"),
        algorithm="HS256"
    )
    return jsonify({"mensagem": "Account created successfully", "token": token}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email")
    password = data.get("password")

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, password_hash FROM users WHERE email = %s", (email,))
    user = c.fetchone()
    conn.close()

    if not user:
        return jsonify({"erro": "Incorrect email or password"}), 401

    user_id, password_hash = user

    if not check_password_hash(password_hash, password):
        return jsonify({"erro": "Incorrect email or password"}), 401

    token = jwt.encode(
        {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        os.getenv("SECRET_KEY"),
        algorithm="HS256"
    )
    return jsonify({"token": token}), 200


@auth_bp.route("/login-google-direct", methods=["POST"])
def login_google_direct():
    data = request.json or {}
    google_token = data.get("token")

    if not google_token:
        return jsonify({"erro": "Google token is missing."}), 400

    try:
        id_info = id_token.verify_oauth2_token(
            google_token,
            google_requests.Request(),
            GOOGLE_WEB_CLIENT_ID
        )

        email = id_info.get("email")
        if not email:
            return jsonify({"erro": "Email not provided by Google."}), 400

        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = c.fetchone()

        if user:
            user_id = user[0]
        else:
            # Register new user coming from Google (no password hash needed)
            c.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
                (email, "")
            )
            user_id = c.fetchone()[0]
            conn.commit()

        conn.close()

        token = jwt.encode(
            {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)},
            os.getenv("SECRET_KEY"),
            algorithm="HS256"
        )

        return jsonify({"token": token}), 200

    except ValueError:
        print(f"--- GOOGLE VALIDATION ERROR: {e} ---", flush=True)
        return jsonify({"erro": "Invalid or expired Google token."}), 401
    except Exception as e:
        return jsonify({"erro": "Internal server error processing Google sign-in."}), 500