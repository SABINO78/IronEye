from flask import Blueprint, request, jsonify
import json
from anthropic import Anthropic
import os
import re

from database import get_db
from auth import token_required


scan_bp = Blueprint("scan", __name__)


client = Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)


MODEL = "claude-haiku-4-5-20251001"


MAPA_LINGUAS = {
    "pt": "Portuguese (Português)",
    "es": "Spanish (Español)",
    "fr": "French (Français)",
    "de": "German (Deutsch)"
}


def limpar_resposta_json(texto):

    texto = texto.strip()

    if texto.startswith("```"):
        texto = re.sub(r"^```(?:json)?\s*", "", texto)
        texto = re.sub(r"\s*```$", "", texto)

    return texto.strip()


# ======================================================
# LIMITES
# ======================================================

LIMITE_BASE_FREE = 4
LIMITE_BASE_PRO = 20

# Número máximo de scans adicionais obtidos através
# de anúncios num dia.
MAX_BONUS_SCANS = 2


# ======================================================
# BONUS SCANS
# ======================================================

def obter_bonus_hoje(user_id, conn):

    c = conn.cursor()

    c.execute(
        """
        SELECT bonus_scans_hoje, bonus_scans_data
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )

    resultado = c.fetchone()

    if not resultado:
        return 0

    bonus_hoje, bonus_data = resultado

    # Data atual do PostgreSQL
    c.execute("SELECT CURRENT_DATE")

    hoje = c.fetchone()[0]

    # Se ainda não existe data ou é outro dia,
    # começa novamente com 0 bónus.
    if bonus_data != hoje:

        c.execute(
            """
            UPDATE users
            SET bonus_scans_hoje = 0,
                bonus_scans_data = %s
            WHERE id = %s
            """,
            (hoje, user_id)
        )

        conn.commit()

        return 0

    return bonus_hoje


def obter_limite_diario(user_id, is_pro, conn):

    # Pro
    if is_pro:
        return LIMITE_BASE_PRO

    # Free
    bonus_hoje = obter_bonus_hoje(
        user_id,
        conn
    )

    return LIMITE_BASE_FREE + bonus_hoje


# ======================================================
# SYSTEM PROMPT
# ======================================================

SYSTEM_PROMPT = """
És um personal trainer profissional e um especialista em biomecânica de
equipamentos de ginásio.

Vais receber uma imagem e uma instrução de idioma-alvo (indicada na
mensagem do utilizador, campo "idioma_alvo"). Todos os valores de texto
do JSON de resposta (machine_name, muscle_group, description, how_to_use,
tips, primary_muscle, secondary_muscles) devem ser escritos NESSE idioma.
As chaves do JSON mantêm-se sempre em inglês.

[REGRAS DE ANÁLISE]

Primeiro, verifica se existe UMA máquina de ginásio claramente visível.

Se não existir uma máquina de ginásio responde APENAS:

{"machine_found": false}

Se existir uma máquina de ginásio, identifica apenas UMA máquina e
responde APENAS com este JSON:

{
    "machine_found": true,
    "machine_name": "",
    "muscle_group": "",
    "description": "",
    "how_to_use": "",
    "tips": [],
    "confidence": 0,
    "primary_muscle": "",
    "secondary_muscles": []
}

[REGRAS DOS CAMPOS]

- machine_found: true apenas se houver uma máquina de ginásio claramente
  visível na imagem. Em caso de dúvida razoável, usa false.
- machine_name: nome da máquina, no idioma-alvo.
- muscle_group: principal grupo muscular trabalhado, no idioma-alvo.
- description: para que serve a máquina, em no máximo 3 frases.
- how_to_use: passo a passo de utilização correta, curto e prático.
- tips: exatamente 3 dicas importantes.
- confidence: número inteiro entre 0 e 100.
- primary_muscle: músculo principal trabalhado.
- secondary_muscles: lista de músculos secundários.

Não escrevas nada fora do JSON.
Não uses blocos de código markdown.
A resposta tem de ser JSON válido e nada mais.

[EXEMPLOS]

Exemplo 1:

{
    "machine_found": true,
    "machine_name": "Puxada Superior (Lat Pulldown)",
    "muscle_group": "Costas",
    "description": "Equipamento com polia alta desenhado para trabalhar a largura das costas.",
    "how_to_use": "1. Ajusta o suporte dos joelhos. 2. Agarra a barra. 3. Puxa a barra em direção ao peito. 4. Controla a subida.",
    "tips": [
        "Não uses o balanço.",
        "Mantém os ombros para baixo.",
        "Evita puxar por trás do pescoço."
    ],
    "confidence": 95,
    "primary_muscle": "Grande Dorsal",
    "secondary_muscles": [
        "Bíceps",
        "Redondo Maior"
    ]
}

Exemplo 2:

{"machine_found": false}
"""


# ======================================================
# SYSTEM PROMPT - MANUAL
# ======================================================

SYSTEM_PROMPT_MANUAL = """
És um personal trainer profissional e um especialista em biomecânica de
equipamentos de ginásio.

O utilizador vai escrever o nome de uma máquina de ginásio.

Também vais receber um idioma-alvo.

Primeiro decide se o texto corresponde a uma máquina de ginásio real
e reconhecível.

Se não for uma máquina válida responde APENAS:

{"machine_found": false}

Se for uma máquina válida responde APENAS:

{
    "machine_found": true,
    "machine_name": "",
    "muscle_group": "",
    "description": "",
    "how_to_use": "",
    "tips": [],
    "confidence": 0,
    "primary_muscle": "",
    "secondary_muscles": []
}

Corrige pequenos erros de escrita.

Todos os textos devem estar no idioma-alvo.

Não escrevas nada fora do JSON.
Não uses blocos de código markdown.
"""


# ======================================================
# SCAN POR IMAGEM
# ======================================================

@scan_bp.route("/scan", methods=["POST"])
@token_required
def scan(user_id):

    dados = request.json or {}

    imagem_base64 = dados.get("imagem")

    if not imagem_base64:

        return jsonify({
            "erro": "Nenhuma imagem enviada"
        }), 400

    # ==================================================
    # IDIOMA
    # ==================================================

    idioma_cliente = (
        request.headers
        .get("Accept-Language", "en")
        .split(",")[0]
        .split("-")[0]
        .strip()
        .lower()
    )

    lingua_final = MAPA_LINGUAS.get(
        idioma_cliente,
        "English"
    )

    # ==================================================
    # BASE DE DADOS
    # ==================================================

    conn = get_db()
    c = conn.cursor()

    c.execute(
        """
        SELECT is_pro
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )

    utilizador = c.fetchone()

    if not utilizador:

        conn.close()

        return jsonify({
            "erro": "Utilizador não encontrado"
        }), 404

    is_pro = utilizador[0]

    # ==================================================
    # LIMITE
    # ==================================================

    limite_diario = obter_limite_diario(
        user_id,
        is_pro,
        conn
    )

    c.execute(
        """
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = %s
        AND scanned_at::date = CURRENT_DATE
        """,
        (user_id,)
    )

    scans_hoje = c.fetchone()[0]

    if scans_hoje >= limite_diario:

        conn.close()

        return jsonify({
            "erro": "Limite diário atingido",
            "scans_restantes": 0,
            "limite_diario": limite_diario
        }), 403

    # ==================================================
    # CHAMAR IA
    # ==================================================

    try:

        resposta = client.messages.create(

            model=MODEL,

            max_tokens=800,

            system=SYSTEM_PROMPT,

            messages=[
                {
                    "role": "user",

                    "content": [

                        {
                            "type": "text",

                            "text": (
                                f'idioma_alvo: "{lingua_final}"'
                            )
                        },

                        {
                            "type": "image",

                            "source": {

                                "type": "base64",

                                "media_type": "image/jpeg",

                                "data": imagem_base64
                            }
                        }
                    ]
                }
            ]
        )

    except Exception as erro:

        print(
            "ERRO AO COMUNICAR COM A IA:",
            erro
        )

        conn.close()

        return jsonify({
            "erro": "Erro ao comunicar com a IA"
        }), 500

    # ==================================================
    # LER JSON DA IA
    # ==================================================

    try:

        texto_resposta = resposta.content[0].text

        texto_json = limpar_resposta_json(
            texto_resposta
        )

        resultado = json.loads(
            texto_json
        )

    except Exception as erro:

        print(
            "ERRO AO LER A RESPOSTA DA IA:",
            erro
        )

        conn.close()

        return jsonify({
            "erro": "Resposta inválida da IA"
        }), 500

    machine_found = resultado.get(
        "machine_found",
        False
    )

    # ==================================================
    # NÃO ENCONTROU MÁQUINA
    #
    # NÃO GASTA SCAN
    # ==================================================

    if not machine_found:

        conn.close()

        return jsonify({

            "machine_found": False,

            "erro": (
                "No gym machine found "
                "in the image."
            ),

            "scans_restantes": max(
                0,
                limite_diario - scans_hoje
            )
        }), 200

    # ==================================================
    # DADOS DA MÁQUINA
    # ==================================================

    try:

        machine_name = resultado["machine_name"]

        muscle_group = resultado["muscle_group"]

        description = resultado["description"]

        how_to_use = resultado["how_to_use"]

        tips = resultado["tips"]

        confidence = resultado["confidence"]

        primary_muscle = resultado["primary_muscle"]

        secondary_muscles = resultado[
            "secondary_muscles"
        ]

    except Exception as erro:

        print(
            "ERRO AO LER OS DADOS DA MÁQUINA:",
            erro
        )

        conn.close()

        return jsonify({
            "erro": "Dados da máquina inválidos"
        }), 500

    # ==================================================
    # GUARDAR SCAN
    # ==================================================

    c.execute(
        """
        INSERT INTO scans(
            user_id,
            machine_name,
            muscle_group,
            primary_muscle,
            secondary_muscles,
            description,
            how_to_use,
            tips,
            confidence
        )

        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,

        (
            user_id,

            machine_name,

            muscle_group,

            primary_muscle,

            json.dumps(
                secondary_muscles,
                ensure_ascii=False
            ),

            description,

            how_to_use,

            json.dumps(
                tips,
                ensure_ascii=False
            ),

            confidence
        )
    )

    scan_id = c.fetchone()[0]

    conn.commit()

    c.execute(
        """
        SELECT scanned_at
        FROM scans
        WHERE id = %s
        """,
        (scan_id,)
    )

    scan_row = c.fetchone()

    scanned_at = (
        scan_row[0]
        if scan_row
        else None
    )

    conn.close()

    # ==================================================
    # ATUALIZAR CONTADOR
    # ==================================================

    scans_hoje += 1

    scans_restantes = max(
        0,
        limite_diario - scans_hoje
    )

    return jsonify({

        "machine_found": True,

        "machine_name": machine_name,

        "muscle_group": muscle_group,

        "primary_muscle": primary_muscle,

        "secondary_muscles": secondary_muscles,

        "description": description,

        "how_to_use": how_to_use,

        "tips": tips,

        "confidence": confidence,

        "scanned_at": scanned_at,

        "scans_restantes": scans_restantes,

        "limite_diario": limite_diario

    }), 200


# ======================================================
# SCAN MANUAL
# ======================================================

@scan_bp.route("/scan/manual", methods=["POST"])
@token_required
def scan_manual(user_id):

    dados = request.json or {}

    machine_name_input = (
        dados.get("machine_name") or ""
    ).strip()

    if not machine_name_input:

        return jsonify({
            "erro": "Nenhum nome de máquina enviado"
        }), 400

    # ==================================================
    # IDIOMA
    # ==================================================

    idioma_cliente = (
        request.headers
        .get("Accept-Language", "en")
        .split(",")[0]
        .split("-")[0]
        .strip()
        .lower()
    )

    lingua_final = MAPA_LINGUAS.get(
        idioma_cliente,
        "English"
    )

    # ==================================================
    # BD
    # ==================================================

    conn = get_db()
    c = conn.cursor()

    c.execute(
        """
        SELECT is_pro
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )

    utilizador = c.fetchone()

    if not utilizador:

        conn.close()

        return jsonify({
            "erro": "Utilizador não encontrado"
        }), 404

    is_pro = utilizador[0]

    limite_diario = obter_limite_diario(
        user_id,
        is_pro,
        conn
    )

    c.execute(
        """
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = %s
        AND scanned_at::date = CURRENT_DATE
        """,
        (user_id,)
    )

    scans_hoje = c.fetchone()[0]

    if scans_hoje >= limite_diario:

        conn.close()

        return jsonify({

            "erro": "Limite diário atingido",

            "scans_restantes": 0,

            "limite_diario": limite_diario

        }), 403

    # ==================================================
    # IA
    # ==================================================

    try:

        resposta = client.messages.create(

            model=MODEL,

            max_tokens=800,

            system=SYSTEM_PROMPT_MANUAL,

            messages=[

                {
                    "role": "user",

                    "content": [

                        {
                            "type": "text",

                            "text": (
                                f'idioma_alvo: "{lingua_final}"\n'
                                f'nome_escrito_pelo_utilizador: '
                                f'"{machine_name_input}"'
                            )
                        }
                    ]
                }
            ]
        )

    except Exception as erro:

        print(
            "ERRO AO COMUNICAR COM A IA:",
            erro
        )

        conn.close()

        return jsonify({
            "erro": "Erro ao comunicar com a IA"
        }), 500

    # ==================================================
    # JSON
    # ==================================================

    try:

        texto_resposta = resposta.content[0].text

        texto_json = limpar_resposta_json(
            texto_resposta
        )

        resultado = json.loads(
            texto_json
        )

    except Exception as erro:

        print(
            "ERRO AO LER A RESPOSTA DA IA:",
            erro
        )

        conn.close()

        return jsonify({
            "erro": "Resposta inválida da IA"
        }), 500

    machine_found = resultado.get(
        "machine_found",
        False
    )

    # ==================================================
    # MÁQUINA INVÁLIDA
    #
    # NÃO GASTA SCAN
    # ==================================================

    if not machine_found:

        conn.close()

        return jsonify({

            "machine_found": False,

            "erro": (
                "Não foi possível reconhecer "
                "essa máquina"
                "Could not recognize "
                "this machine."
            ),

            "scans_restantes": max(
                0,
                limite_diario - scans_hoje
            )

        }), 200

    # ==================================================
    # DADOS
    # ==================================================

    try:

        machine_name = resultado["machine_name"]

        muscle_group = resultado["muscle_group"]

        description = resultado["description"]

        how_to_use = resultado["how_to_use"]

        tips = resultado["tips"]

        confidence = resultado["confidence"]

        primary_muscle = resultado[
            "primary_muscle"
        ]

        secondary_muscles = resultado[
            "secondary_muscles"
        ]

    except Exception as erro:

        print(
            "ERRO AO LER OS DADOS DA MÁQUINA:",
            erro
        )

        conn.close()

        return jsonify({
            "erro": "Dados da máquina inválidos"
        }), 500

    # ==================================================
    # GUARDAR
    # ==================================================

    c.execute(
        """
        INSERT INTO scans(
            user_id,
            machine_name,
            muscle_group,
            primary_muscle,
            secondary_muscles,
            description,
            how_to_use,
            tips,
            confidence
        )

        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,

        (
            user_id,

            machine_name,

            muscle_group,

            primary_muscle,

            json.dumps(
                secondary_muscles,
                ensure_ascii=False
            ),

            description,

            how_to_use,

            json.dumps(
                tips,
                ensure_ascii=False
            ),

            confidence
        )
    )

    scan_id = c.fetchone()[0]

    conn.commit()

    c.execute(
        """
        SELECT scanned_at
        FROM scans
        WHERE id = %s
        """,
        (scan_id,)
    )

    scan_row = c.fetchone()

    scanned_at = (
        scan_row[0]
        if scan_row
        else None
    )

    conn.close()

    scans_hoje += 1

    scans_restantes = max(
        0,
        limite_diario - scans_hoje
    )

    return jsonify({

        "machine_found": True,

        "machine_name": machine_name,

        "muscle_group": muscle_group,

        "primary_muscle": primary_muscle,

        "secondary_muscles": secondary_muscles,

        "description": description,

        "how_to_use": how_to_use,

        "tips": tips,

        "confidence": confidence,

        "scanned_at": scanned_at,

        "scans_restantes": scans_restantes,

        "limite_diario": limite_diario

    }), 200


# ======================================================
# GANHAR +1 SCAN ATRAVÉS DE ANÚNCIO
# ======================================================

@scan_bp.route("/scan/bonus", methods=["POST"])
@token_required
def scan_bonus(user_id):

    conn = get_db()
    c = conn.cursor()

    # ==================================================
    # VERIFICAR UTILIZADOR
    # ==================================================

    c.execute(
        """
        SELECT is_pro
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )

    utilizador = c.fetchone()

    if not utilizador:

        conn.close()

        return jsonify({
            "erro": "Utilizador não encontrado"
        }), 404

    is_pro = utilizador[0]

    # ==================================================
    # PRO NÃO PRECISA DE ANÚNCIOS
    # ==================================================

    if is_pro:

        conn.close()

        return jsonify({
            "erro": "Contas Pro já têm 20 scans por dia"
        }), 400

    # ==================================================
    # BONUS DE HOJE
    # ==================================================

    bonus_hoje = obter_bonus_hoje(
        user_id,
        conn
    )

    # ==================================================
    # MÁXIMO DE 2 ANÚNCIOS
    # ==================================================

    if bonus_hoje >= MAX_BONUS_SCANS:

        conn.close()

        return jsonify({

            "erro": (
                "Já atingiste os 2 scans "
                "bónus de hoje"
            ),

            "bonus_scans_hoje": bonus_hoje,

            "limite_diario": (
                LIMITE_BASE_FREE +
                MAX_BONUS_SCANS
            )

        }), 403

    # ==================================================
    # DAR +1 SCAN
    # ==================================================

    novo_bonus = bonus_hoje + 1

    c.execute(
        """
        UPDATE users
        SET bonus_scans_hoje = %s,
            bonus_scans_data = CURRENT_DATE
        WHERE id = %s
        """,
        (
            novo_bonus,
            user_id
        )
    )

    conn.commit()

    # ==================================================
    # CONTAR SCANS
    # ==================================================

    c.execute(
        """
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = %s
        AND scanned_at::date = CURRENT_DATE
        """,
        (user_id,)
    )

    scans_hoje = c.fetchone()[0]

    conn.close()

    limite_diario = (
        LIMITE_BASE_FREE +
        novo_bonus
    )

    scans_restantes = max(
        0,
        limite_diario - scans_hoje
    )

    return jsonify({

        "sucesso": True,

        "bonus_scans_hoje": novo_bonus,

        "limite_diario": limite_diario,

        "scans_restantes": scans_restantes

    }), 200


# ======================================================
# DASHBOARD
# ======================================================

@scan_bp.route("/dashboard", methods=["GET"])
@token_required
def dashboard(user_id):

    conn = get_db()
    c = conn.cursor()

    # ==================================================
    # UTILIZADOR
    # ==================================================

    c.execute(
        """
        SELECT is_pro
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )

    utilizador = c.fetchone()

    if not utilizador:

        conn.close()

        return jsonify({
            "erro": "Utilizador não encontrado"
        }), 404

    is_pro = utilizador[0]

    # ==================================================
    # LIMITE
    # ==================================================

    limite_diario = obter_limite_diario(
        user_id,
        is_pro,
        conn
    )

    # ==================================================
    # SCANS HOJE
    # ==================================================

    c.execute(
        """
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = %s
        AND scanned_at::date = CURRENT_DATE
        """,
        (user_id,)
    )

    scans_hoje = c.fetchone()[0]

    # ==================================================
    # SCANS SEMANA
    # ==================================================

    c.execute(
        """
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = %s
        AND scanned_at >= NOW() - INTERVAL '7 days'
        """,
        (user_id,)
    )

    scans_semana = c.fetchone()[0]

    # ==================================================
    # BONUS
    # ==================================================

    bonus_hoje = 0

    if not is_pro:

        bonus_hoje = obter_bonus_hoje(
            user_id,
            conn
        )

    conn.close()

    # ==================================================
    # RESPOSTA
    # ==================================================

    return jsonify({

        "scans_restantes": max(
            0,
            limite_diario - scans_hoje
        ),

        "scans_hoje": scans_hoje,

        "scans_semana": scans_semana,

        "limite_diario": limite_diario,

        "bonus_scans_hoje": bonus_hoje,

        "bonus_scans_restantes": max(
            0,
            MAX_BONUS_SCANS - bonus_hoje
        ),

        "is_pro": bool(is_pro)

    }), 200