from flask import Blueprint, request, jsonify
import psycopg2
import jwt
import os
import requests as req_lib
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    dados = request.json or {}
    email = dados.get("email")
    password = dados.get("password")

    if not email or not password:
        return jsonify({"erro": "Email e password são obrigatórios"}), 400

    password_hash = generate_password_hash(password)
    conn = get_db()
    c = conn.cursor()

    try:
        c.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
            (email, password_hash)
        )
        novo_id = c.fetchone()[0]
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({"erro": "Email já registado"}), 400
    finally:
        conn.close()

    # Gera logo o token JWT para entrar direto na app
    token = jwt.encode({"user_id": novo_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)}, os.getenv("SECRET_KEY"), algorithm="HS256")
    return jsonify({"mensagem": "Conta criada com sucesso", "token": token}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    dados = request.json or {}
    email = dados.get("email")
    password = dados.get("password")

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, password_hash FROM users WHERE email = %s", (email,))
    utilizador = c.fetchone()
    conn.close()

    if not utilizador:
        return jsonify({"erro": "Email ou password incorretos"}), 401

    user_id, password_hash = utilizador

    if not check_password_hash(password_hash, password):
        return jsonify({"erro": "Email ou password incorretos"}), 401

    token = jwt.encode({"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)}, os.getenv("SECRET_KEY"), algorithm="HS256")
    return jsonify({"token": token}), 200


@auth_bp.route("/login-google", methods=["POST"])
def login_google():
    dados = request.json or {}
    code = dados.get("code")
    redirect_uri = dados.get("redirect_uri")

    if not code or not redirect_uri:
        return jsonify({"erro": "Código ou redirect_uri em falta"}), 400

    # 1. Troca o código pelo token
    payload = {
        "code": code,
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    token_resposta = req_lib.post("https://oauth2.googleapis.com/token", data=payload)
    if token_resposta.status_code != 200:
        return jsonify({"erro": "Falha ao trocar código com a Google", "detalhe": token_resposta.json()}), 401

    access_token = token_resposta.json().get("access_token")

    # 2. Obtém os dados da conta Google
    resposta_google = req_lib.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    if resposta_google.status_code != 200:
        return jsonify({"erro": "Token da Google inválido"}), 401

    email = resposta_google.json().get("email")

    # 3. Verifica o utilizador na BD
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, password_hash FROM users WHERE email = %s", (email,))
    utilizador = c.fetchone()

    if utilizador:
        user_id, password_hash = utilizador
        # Se tem password_hash preenchida, criou conta manual com email/password
        if password_hash and password_hash.strip() != "":
            conn.close()
            return jsonify({
                "erro": "Este email já está registado com password. Inicie sessão usando email e password."
            }), 400
    else:
        # Novo utilizador registado via Google (sem password hash)
        c.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
            (email, "")
        )
        user_id = c.fetchone()[0]
        conn.commit()

    conn.close()

    # 4. Gera o token JWT da tua aplicação
    token = jwt.encode(
        {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        os.getenv("SECRET_KEY"),
        algorithm="HS256"
    )

    return jsonify({"token": token}), 200