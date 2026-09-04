import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from database import criar_tabela

# Importação dos teus Blueprints originais
from routes.auth_route import auth_bp
from routes.scan_route import scan_bp
from routes.profile_route import profile_bp
from routes.history_route import history_bp
from routes.subscription_route import subscription_bp

# Carrega as variáveis de ambiente do teu ficheiro .env
load_dotenv()

app = Flask(__name__)

# OBRIGATÓRIO: Permite que o React Native/Expo aceda ao Flask sem bloqueios de rede
CORS(app)

# Configuração da chave secreta para assinar os tokens JWT (podes definir JWT_SECRET_KEY no teu .env)
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "tua_chave_secreta_super_segura")

# Cria as tabelas na Base de Dados ao iniciar
criar_tabela()

# Registo de todas as tuas rotas organizadas
app.register_blueprint(auth_bp)
app.register_blueprint(scan_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(history_bp)
app.register_blueprint(subscription_bp)

if __name__ == "__main__":
    # Render define a variável PORT automaticamente.
    # Em desenvolvimento local, usa a porta 5000.
    porta = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=porta, debug=debug)