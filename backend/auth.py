from functools import wraps
from flask import request, jsonify
import jwt
import os

def token_required(f):
    @wraps(f)
    def decorator(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"erro": "Token not provided"}), 401

        parts = auth_header.split(" ")
        if len(parts) != 2 or parts[0] != "Bearer":
            return jsonify({"erro": "Invalid token format"}), 401

        token = parts[1]

        try:
            data = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
            user_id = data["user_id"]
        except jwt.ExpiredSignatureError:
            return jsonify({"erro": "Session expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"erro": "Invalid session"}), 401

        return f(user_id, *args, **kwargs)
    return decorator
