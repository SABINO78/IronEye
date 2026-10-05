import os
from dotenv import load_dotenv

# Must run before importing any module that reads environment variables (e.g. database.py)
load_dotenv()

from flask import Flask
from flask_cors import CORS
from database import create_tables

from routes.auth_route import auth_bp
from routes.scan_route import scan_bp
from routes.profile_route import profile_bp
from routes.history_route import history_bp
from routes.subscription_route import subscription_bp

app = Flask(__name__)

# Required: allows React Native/Expo to reach Flask without network blocks
CORS(app)

# Secret key used to sign JWT tokens (can be overridden via JWT_SECRET_KEY in .env)
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "your_super_secret_key")

create_tables()

app.register_blueprint(auth_bp)
app.register_blueprint(scan_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(history_bp)
app.register_blueprint(subscription_bp)

if __name__ == "__main__":
    # Render sets PORT automatically; locally defaults to 5000
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)