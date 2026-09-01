from functools import wraps
from flask import request, jsonify
import jwt
import os

def token_required(f):
    @wraps(f)
    def decorador(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"erro": "Token não fornecido"}), 401

        partes = auth_header.split(" ")
        if len(partes) != 2 or partes[0] != "Bearer":
            return jsonify({"erro": "Formato de token inválido"}), 401

        token = partes[1]

        try:
            dados = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
            user_id = dados["user_id"]
        except jwt.ExpiredSignatureError:
            return jsonify({"erro": "Sessão expirada"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"erro": "Sessão inválida"}), 401

        return f(user_id, *args, **kwargs)
    return decorador
