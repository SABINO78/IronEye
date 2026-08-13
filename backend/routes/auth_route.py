from flask import Blueprint, request, jsonify
import sqlite3
import jwt
import os
import requests as req_lib
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    dados = request.json
    email = dados.get("email")
    password = dados.get("password")

    if not email or not password:
        return jsonify({"erro": "Email e password são obrigatórios"}), 400

    password_hash = generate_password_hash(password)
    conn = get_db()
    c = conn.cursor()

    try:
        c.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, password_hash))
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({"erro": "Email já registado"}), 400
    finally:
        conn.close()

    return jsonify({"mensagem": "Conta criada com sucesso"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    dados = request.json
    email = dados.get("email")
    password = dados.get("password")

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, password_hash FROM users WHERE email = ?", (email,))
    utilizador = c.fetchone()
    conn.close()

    if not utilizador:
        return jsonify({"erro": "Email ou password incorretos"}), 401

    user_id, password_hash = utilizador

    if not check_password_hash(password_hash, password):
        return jsonify({"erro": "Email ou password incorretos"}), 401

    token = jwt.encode({"user_id": user_id}, os.getenv("SECRET_KEY"), algorithm="HS256")
    return jsonify({"token": token}), 200


@auth_bp.route("/login-google", methods=["POST"])
def login_google():
    dados = request.json
    code = dados.get("code")
    redirect_uri = dados.get("redirect_uri")

    if not code or not redirect_uri:
        return jsonify({"erro": "Código ou redirect_uri em falta"}), 400

    # 1. Trocar o "code" por um access_token junto da Google
    token_resposta = req_lib.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    )

    if token_resposta.status_code != 200:
        return jsonify({"erro": "Falha ao trocar código com a Google"}), 401

    token_dados = token_resposta.json()
    access_token = token_dados.get("access_token")

    # 2. Usar o access_token para obter os dados do utilizador
    resposta_google = req_lib.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    if resposta_google.status_code != 200:
        return jsonify({"erro": "Token da Google inválido"}), 401

    info_google = resposta_google.json()
    email = info_google.get("email")

    # 3. Procurar ou criar o utilizador
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (email,))
    utilizador = c.fetchone()

    if utilizador:
        user_id = utilizador[0]
    else:
        c.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, ""))
        conn.commit()
        user_id = c.lastrowid

    conn.close()

    # 4. Gerar o teu próprio token JWT
    token = jwt.encode({"user_id": user_id}, os.getenv("SECRET_KEY"), algorithm="HS256")
    return jsonify({"token": token}), 200