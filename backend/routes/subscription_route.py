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
    The frontend calls this endpoint after a purchase on RevenueCat.
    The backend verifies with the RevenueCat API whether the user has the
    'IronEye Pro' entitlement active and updates is_pro in the database.
    """

    revenuecat_api_key = os.getenv("REVENUECAT_API_KEY")

    # Change this after development
    if not revenuecat_api_key:
        # If the key is not configured, accept the request
        # from the frontend directly (development mode)
        conn = get_db()
        c = conn.cursor()
        c.execute("UPDATE users SET is_pro = 1 WHERE id = %s", (user_id,))
        conn.commit()
        conn.close()
        return jsonify({"is_pro": True, "modo": "dev"}), 200

    try:
        response = req_lib.get(
            f"https://api.revenuecat.com/v1/subscribers/{user_id}",
            headers={
                "Authorization": f"Bearer {revenuecat_api_key}",
                "Content-Type": "application/json"
            }
        )

        if response.status_code != 200:
            print("ERROR RevenueCat API:", response.status_code, response.text)
            return jsonify({"erro": "Could not verify subscription"}), 500

        data = response.json()
        subscriber = data.get("subscriber", {})
        entitlements = subscriber.get("entitlements", {})

        is_pro = "IronEye Pro" in entitlements and \
                 entitlements["IronEye Pro"].get("expires_date") is not None

        conn = get_db()
        c = conn.cursor()
        c.execute(
            "UPDATE users SET is_pro = %s WHERE id = %s",
            (1 if is_pro else 0, user_id)
        )
        conn.commit()
        conn.close()

        return jsonify({"is_pro": is_pro}), 200

    except Exception as error:
        print("ERROR verifying subscription:", error)
        return jsonify({"erro": "Error verifying subscription"}), 500