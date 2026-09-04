from flask import Blueprint, request, jsonify
import os
import requests as req_lib
from database import get_db
from auth import token_required

subscription_bp = Blueprint("subscription", __name__)


@subscription_bp.route("/subscription/verify", methods=["POST"])
@token_required
def verify_subscription(user_id):
    """
    O frontend chama este endpoint depois de uma compra no RevenueCat.
    O backend verifica com a API do RevenueCat se o user tem o entitlement
    'IronEye Pro' ativo e atualiza is_pro na base de dados.
    """

    revenuecat_api_key = os.getenv("REVENUECAT_API_KEY")

    # depois do desenvolvimento alterar isto
    if not revenuecat_api_key:
        # Se a chave não está configurada, aceitar o pedido
        # do frontend diretamente (modo desenvolvimento)
        conn = get_db()
        c = conn.cursor()
        c.execute("UPDATE users SET is_pro = 1 WHERE id = %s", (user_id,))
        conn.commit()
        conn.close()
        return jsonify({"is_pro": True, "modo": "dev"}), 200

    # Em produção, verificar com a API do RevenueCat
    try:
        resposta = req_lib.get(
            f"https://api.revenuecat.com/v1/subscribers/{user_id}",
            headers={
                "Authorization": f"Bearer {revenuecat_api_key}",
                "Content-Type": "application/json"
            }
        )

        if resposta.status_code != 200:
            print("ERRO RevenueCat API:", resposta.status_code, resposta.text)
            return jsonify({"erro": "Não foi possível verificar a subscrição"}), 500

        dados = resposta.json()
        subscriber = dados.get("subscriber", {})
        entitlements = subscriber.get("entitlements", {})

        is_pro = "IronEye Pro" in entitlements and \
                 entitlements["IronEye Pro"].get("expires_date") is not None

        # Atualizar na base de dados
        conn = get_db()
        c = conn.cursor()
        c.execute(
            "UPDATE users SET is_pro = %s WHERE id = %s",
            (1 if is_pro else 0, user_id)
        )
        conn.commit()
        conn.close()

        return jsonify({"is_pro": is_pro}), 200

    except Exception as erro:
        print("ERRO ao verificar subscrição:", erro)
        return jsonify({"erro": "Erro ao verificar subscrição"}), 500